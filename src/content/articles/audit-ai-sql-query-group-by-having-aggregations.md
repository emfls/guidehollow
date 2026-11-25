---
title: "How to Verify AI-Generated SQL Queries: Group By Filtering, NULL Pitfalls, and Date Truncation"
description: "Audit AI-generated SQL queries for silent aggregation errors: WHERE vs HAVING misplacements, COUNT(column) NULL drops, integer division truncation, and date drift."
slug: "audit-ai-sql-query-group-by-having-aggregations"
category: "guides"
tags: ["verification", "sql", "database"]
publishedDate: "2026-11-25"
updatedDate: "2026-11-25"
sources: [{"title":"PostgreSQL Documentation: Aggregate Functions and GROUP BY Processing","url":"https://www.postgresql.org/docs/current/tutorial-agg.html"},{"title":"SQLite Query Language: Aggregate Functions and the HAVING Clause","url":"https://www.sqlite.org/lang_select.html#bareagg"},{"title":"ISO/IEC 9075: Information Technology — Database Languages — SQL — Foundation","url":"https://www.iso.org/standard/63555.html"}]
draft: false
author: "GuideHollow Editorial"
featured: false
---

When software engineers, business analysts, and analytics engineers ask AI coding assistants to draft complex database queries, the generated SQL code almost always compiles without syntax errors. Modern large language models have thoroughly memorized the keyword order of structured query language: `SELECT`, `FROM`, `JOIN`, `WHERE`, `GROUP BY`, `HAVING`, and `ORDER BY`. Because the query executes and returns a clean tabular grid in your database GUI, stakeholders frequently assume the underlying reporting numbers are mathematically sound.

In production business reporting, however, syntactically legal SQL is routinely mathematically catastrophic. AI assistants regularly place row-level filters inside `HAVING` clauses, destroy index optimization, silently drop missing data rows through misunderstood `COUNT(column)` rules, truncate floating-point fractions to zero via integer division, and group financial revenue across midnight borders without timezone conversions.

To audit AI-generated SQL queries and ensure your business intelligence dashboards remain truthful, you must evaluate query structures against the formal processing order of the [ANSI SQL Foundation standard (ISO/IEC 9075)](https://www.iso.org/standard/63555.html), master grouping semantics documented in the [PostgreSQL Aggregate Documentation](https://www.postgresql.org/docs/current/tutorial-agg.html) and [SQLite Query Language Specification](https://www.sqlite.org/lang_select.html#bareagg), and execute deterministic query assertions against controlled synthetic seed datasets.

> **Key takeaways**
> - `WHERE` filters individual rows *before* aggregation occurs; `HAVING` filters summary groups *after* aggregation is calculated. Never allow non-aggregated row filters into the `HAVING` clause.
> - `COUNT(*)` counts all rows in the group, including those containing `NULL` values; `COUNT(column_name)` counts only rows where the specified column is explicitly non-null.
> - Integer division truncates remainders in engines like PostgreSQL and SQLite: `SUM(a) / SUM(b)` evaluates to `0` if `a < b` unless explicitly cast to numeric or floating-point types.
> - Never group timestamps using raw string truncation (`LEFT(created_at, 7)`) on UTC fields without converting to the relevant business operational timezone first.

## 1. The Real Lifecycle of an SQL Query: Execution Order vs. Lexical Order

To understand how generative models introduce silent aggregation bugs, one must recognize that SQL does not execute in the order it is written. While a human or an AI drafts a query starting with the `SELECT` clause, the database query planner evaluates clauses in an entirely different sequence:

```text
Lexical Order (Written):     Execution Order (Evaluated):
1. SELECT                    1. FROM & JOINs (Build the raw virtual table)
2. FROM & JOINs              2. WHERE (Filter individual rows)
3. WHERE                     3. GROUP BY (Collapse rows into summary buckets)
4. GROUP BY                  4. HAVING (Filter aggregated group rows)
5. HAVING                    5. SELECT & Window Functions (Compute column expressions)
6. ORDER BY                  6. DISTINCT (Remove duplicates)
7. LIMIT / OFFSET            7. ORDER BY (Sort final output rows)
                             8. LIMIT / OFFSET (Truncate output slice)
```

Because an AI model generates tokens from top to bottom, it often decides what to filter while composing the `SELECT` and `HAVING` blocks, conflating row-level preconditions with group-level post-conditions. When a row filter (such as `country = 'USA'`) is mistakenly placed inside `HAVING`, the database is forced to ingest millions of global records into memory, perform expensive hash-grouping across every territory on earth, and only then discard 95% of the grouped results. Beyond crippling query performance, misplacing filters frequently alters calculations that depend on population totals, such as window functions and group percentages.

## 2. Five Critical Aggregation Defects in Generative SQL

To demonstrate these risks in concrete terms, we established a benchmark testing suite featuring an ecommerce database with two tables: `customers` and `orders`. Download the complete [SQL schema and seed fixture (.sql)](/examples/sql-aggregation-audit/sql-aggregation-audit-schema.sql) and the [structured discrepancy matrix (.csv)](/examples/sql-aggregation-audit/sql-aggregation-comparison.csv) to test your own database models.

The table below summarizes the five most frequent failure modes encountered when auditing generative SQL queries:

| Test ID | Business Reporting Request | Flawed AI SQL Construction | Defect Classification | Validated Production SQL Solution | Consequence of AI Error |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SQL-01** | Total orders and discounted order count per tier | `SELECT tier, COUNT(*) as total, COUNT(*) as disc FROM ... WHERE discount IS NOT NULL` | Scope Reduction in WHERE | `SELECT tier, COUNT(*) as total, COUNT(discount) as disc FROM ...` | Non-discounted rows are eliminated; base total count is falsely depressed. |
| **SQL-02** | Customers with over $1,000 in completed sales | `SELECT customer, SUM(subtotal) FROM ... WHERE SUM(subtotal) > 1000 GROUP BY customer` | Aggregate in WHERE Clause | `SELECT customer, SUM(subtotal) FROM ... GROUP BY customer HAVING SUM(subtotal) > 1000` | Syntax failure in strict engines, or invalid runtime error. |
| **SQL-03** | US orders with total revenue exceeding $500 | `SELECT country, SUM(subtotal) FROM ... GROUP BY country HAVING country = 'USA' AND SUM(subtotal) > 500` | Row Filter in HAVING | `SELECT country, SUM(subtotal) FROM ... WHERE country = 'USA' GROUP BY country HAVING SUM(subtotal) > 500` | Destroys table index scans; degrades performance by 10x to 100x. |
| **SQL-04** | Average discount rate across all orders | `SELECT AVG(discount / subtotal) * 100 FROM orders` | NULL Propagation & Int Truncation | `SELECT AVG(COALESCE(discount, 0.0) / subtotal) * 100.0 FROM orders` | NULL discounts cause rows to be excluded; integer division yields 0%. |
| **SQL-05** | Monthly revenue grouped by calendar month | `SELECT strftime('%Y-%m', order_date), SUM(subtotal) FROM orders GROUP BY 1` | Timezone-Blind Date Truncation | `SELECT strftime('%Y-%m', datetime(order_date, 'localtime')), SUM(subtotal) FROM orders GROUP BY 1` | Orders placed near midnight UTC shift into the wrong financial billing month. |

### Deep Dive: The NULL Trap in COUNT and AVG

One of the most insidious errors in AI-generated SQL involves the interaction between `NULL` values and aggregate functions. Consider Test Case **SQL-01**. The business stakeholder asks: *"For each customer tier, how many total orders were placed, and how many of those orders received a promotional discount?"*

An AI model will frequently generate:
```sql
SELECT c.account_tier,
       COUNT(*) AS total_orders,
       COUNT(*) AS discounted_orders
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
WHERE o.discount_amount IS NOT NULL
GROUP BY c.account_tier;
```
Look closely at what happens: because the model placed `WHERE o.discount_amount IS NOT NULL` in the query, the database filters out every single order that did not receive a discount *before* the grouping stage begins. Consequently, `total_orders` will exactly equal `discounted_orders`! The report falsely informs executive management that 100% of orders received discounts, masking thousands of full-price purchases.

The correct, production-grade ANSI SQL implementation uses column-specific aggregate semantics:
```sql
SELECT c.account_tier,
       COUNT(*) AS total_orders,
       COUNT(o.discount_amount) AS discounted_orders
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.account_tier;
```
Under ANSI SQL rules, `COUNT(*)` counts every row returned by the join, accurately reflecting total volume. Simultaneously, `COUNT(o.discount_amount)` automatically ignores `NULL` values, giving an exact, trustworthy count of discounted transactions without filtering the underlying dataset.

## 3. Automated Verification with Python and SQLite

To prevent corrupted queries from reaching production reporting pipelines, write automated test runners that execute AI-generated queries against an in-memory SQLite database populated with controlled edge-case records.

The following Python script initializes the synthetic benchmark database, runs both the flawed AI query and the validated query, and asserts the discrepancy:

```python
import sqlite3

def run_sql_audit():
    # Connect to an isolated in-memory database
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()
    
    # 1. Create Tables
    cursor.execute("""
    CREATE TABLE customers (
        customer_id INTEGER PRIMARY KEY,
        name TEXT,
        account_tier TEXT
    );
    """)
    cursor.execute("""
    CREATE TABLE orders (
        order_id INTEGER PRIMARY KEY,
        customer_id INTEGER,
        subtotal REAL,
        discount_amount REAL
    );
    """)
    
    # 2. Insert Seed Data
    customers = [
        (1, "Acme Corp", "Enterprise"),
        (2, "Globex Logistics", "Standard"),
    ]
    orders = [
        (101, 1, 1200.0, 100.0), # Discounted
        (102, 1, 800.0, None),   # Full price
        (103, 2, 450.0, None),   # Full price
        (104, 2, 300.0, 25.0),   # Discounted
    ]
    cursor.executemany("INSERT INTO customers VALUES (?, ?, ?)", customers)
    cursor.executemany("INSERT INTO orders VALUES (?, ?, ?, ?)", orders)
    conn.commit()
    
    # 3. Test Flawed AI Query (WHERE filter drops base rows)
    flawed_sql = """
    SELECT c.account_tier,
           COUNT(*) as total_orders,
           COUNT(*) as discounted_orders
    FROM customers c
    JOIN orders o ON c.customer_id = o.customer_id
    WHERE o.discount_amount IS NOT NULL
    GROUP BY c.account_tier
    ORDER BY c.account_tier;
    """
    cursor.execute(flawed_sql)
    flawed_rows = cursor.fetchall()
    
    # 4. Test Validated Production Query
    valid_sql = """
    SELECT c.account_tier,
           COUNT(*) as total_orders,
           COUNT(o.discount_amount) as discounted_orders
    FROM customers c
    JOIN orders o ON c.customer_id = o.customer_id
    GROUP BY c.account_tier
    ORDER BY c.account_tier;
    """
    cursor.execute(valid_sql)
    valid_rows = cursor.fetchall()
    
    print("=== FLAWED AI QUERY OUTPUT ===")
    for row in flawed_rows:
        print(f"Tier: {row[0]:<12} Total: {row[1]} | Discounted: {row[2]}")
        
    print("\n=== VALIDATED QUERY OUTPUT ===")
    for row in valid_rows:
        print(f"Tier: {row[0]:<12} Total: {row[1]} | Discounted: {row[2]}")
        
    # Programmatic assertion
    for f, v in zip(flawed_rows, valid_rows):
        assert f[1] != v[1], f"Flawed query failed to expose total discrepancy on tier {f[0]}"
    print("\nAUDIT SUCCESS: Edge-case test successfully caught silent row reduction!")

if __name__ == "__main__":
    run_sql_audit()
```

Executing this test produces immediate proof of the AI defect:
```text
=== FLAWED AI QUERY OUTPUT ===
Tier: Enterprise   Total: 1 | Discounted: 1
Tier: Standard     Total: 1 | Discounted: 1

=== VALIDATED QUERY OUTPUT ===
Tier: Enterprise   Total: 2 | Discounted: 1
Tier: Standard     Total: 2 | Discounted: 1

AUDIT SUCCESS: Edge-case test successfully caught silent row reduction!
```
The flawed query underreported Enterprise order volume by 50% because the model conflated filtering conditions with counting semantics.

## 4. Prompt Engineering for Deterministic SQL Generation

When directing generative models to write database queries, structure your prompts to forbid lazy aggregation shortcuts. Include schema declarations, explicitly state how `NULL` values should be counted, and mandate proper clause separation:

```text
You are an expert database architect writing ANSI SQL for PostgreSQL 16.
Write a reporting query for the following business requirement:
- Report: Monthly sales performance by customer region
- Required columns: country, order_month (YYYY-MM), gross_revenue, completed_orders, discounted_orders

Mandatory Query Construction Rules:
1. Clause Separation: Place ALL row-level filtering conditions (such as order status or date boundaries) in the WHERE clause. Do NOT place non-aggregate conditions in the HAVING clause.
2. NULL Safety: Use COUNT(*) for total transactions and COUNT(column_name) or conditional COUNT(CASE WHEN ...) for subsets. Never filter out non-null rows in WHERE if they represent part of the total population.
3. Timezone Anchoring: Convert UTC timestamps to 'America/New_York' prior to calling DATE_TRUNC('month', order_date).
4. Division Safety: Cast all division operands to NUMERIC(12, 4) and use NULLIF(divisor, 0) to prevent division-by-zero crashes.
```

## Related Financial Aggregation and Arithmetic Verification Guides

When deploying automated reporting queries that drive financial dashboards and data warehousing:
- **Numerical Precision & Conversions:** Prevent subtle floating-point drift and rounding traps by referencing the [auditing AI number rounding and unit conversions guide](/guides/audit-ai-number-rounding-and-unit-conversions/).
- **Interactive Price & Volume Calculations:** Validate volume-weighted aggregations and multi-tier pricing queries with the [Weighted Price Checker tool](/tools/weighted-price-checker/).
- **Timestamp & Period Boundary Audits:** Ensure transactional date ranges and timezone boundaries align with the [auditing monthly totals with timestamps protocol](/guides/audit-ai-monthly-totals-with-timestamps/).

## 5. The Five-Point Pre-Deployment SQL Verification Gate

Before committing any AI-generated SQL query to a production analytics repository or dbt model, run through this five-point audit gate:

- [ ] **Gate 1: WHERE vs. HAVING Integrity:** Inspect every condition in the `HAVING` clause. If a condition does not contain an aggregate function (`SUM`, `AVG`, `COUNT`, `MIN`, `MAX`), it MUST be moved to the `WHERE` clause.
- [ ] **Gate 2: NULL Column Counting Audit:** Check all `COUNT` expressions. If the query measures total volume, verify it uses `COUNT(*)`. If it measures a specific optional attribute, confirm whether `NULL` rows should be counted or excluded.
- [ ] **Gate 3: Numeric Type Casting:** Search for the division operator `/`. Verify that integer columns are explicitly cast to numeric or float types (e.g., `CAST(numerator AS FLOAT) / denominator`), and verify that the denominator is protected by `NULLIF(denominator, 0)`.
- [ ] **Gate 4: Timezone Grouping Audit:** If the query aggregates by day, week, or month, confirm that timestamp columns are converted from UTC storage into the business reporting timezone before date truncation functions are applied.
- [ ] **Gate 5: Group By Key Completeness:** Verify that every non-aggregated column appearing in the `SELECT` list is explicitly included in the `GROUP BY` clause, avoiding implicit or vendor-specific bare-column grouping behaviors.

## Frequently Asked Questions

### Can I use column aliases in the WHERE or GROUP BY clause?
In standard ANSI SQL, column aliases declared in the `SELECT` clause cannot be referenced in the `WHERE` or `GROUP BY` clauses because `WHERE` and `GROUP BY` are evaluated *before* the `SELECT` list is parsed. While some database engines (such as MySQL or Snowflake) allow referencing aliases in `GROUP BY` as an extension, portable enterprise SQL requires repeating the expression or wrapping the calculation in a Common Table Expression (CTE) or subquery.

### Why does SUM() return NULL instead of 0 when no rows match?
Under ANSI SQL rules, aggregate functions other than `COUNT` return `NULL` when operating over an empty set of rows or when all values in the column are `NULL`. If your reporting user interface expects a numeric zero, wrap the aggregate call with `COALESCE`: `COALESCE(SUM(subtotal), 0.0)`. Failing to use `COALESCE` can cause downstream application crashes or blank dashboard cards.

### What is the difference between COUNT(DISTINCT column) and APPROX_COUNT_DISTINCT()?
`COUNT(DISTINCT column)` scans every single value in the group, builds a deduplicated set, and returns an exact mathematical count. On massive tables with billions of rows, this operation consumes significant memory and CPU time. Distributed cloud data warehouses (such as Snowflake, BigQuery, and AWS Redshift) provide approximate counting functions like `APPROX_COUNT_DISTINCT()` using HyperLogLog algorithms, returning results within 1% to 2% error in a fraction of the execution time. For financial reporting, always use exact `COUNT(DISTINCT)`.

### How does GROUP BY treat NULL values?
In standard SQL, all rows where the grouping column is `NULL` are grouped together into a single summary row. If multiple columns contain `NULL` values, they are treated as matching each other for the purpose of grouping, even though in standard Boolean comparisons `NULL = NULL` evaluates to `UNKNOWN`. If you need to separate unassigned records, assign them an explicit fallback label using `COALESCE(category, 'Unassigned')` in both the `SELECT` and `GROUP BY` clauses.
