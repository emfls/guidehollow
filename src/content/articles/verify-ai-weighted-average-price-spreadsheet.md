---
title: "How to Verify AI-Calculated Average Prices with Weighted Averages"
description: "Verify AI-generated average selling prices in Excel and Google Sheets using a weighted-average formula, eight-row dataset, pivot reconciliation, and negative tests."
slug: "verify-ai-weighted-average-price-spreadsheet"
category: "guides"
tags: ["ai", "spreadsheets", "excel", "google-sheets", "weighted-average", "sumproduct", "pivot-tables", "data-validation"]
publishedDate: "2026-10-31"
updatedDate: "2026-10-31"
sources: [{"title": "support.microsoft.com — reference", "url": "https://support.microsoft.com/en-us/excel/functions/sumproduct-function"}, {"title": "support.microsoft.com — reference", "url": "https://support.microsoft.com/en-us/excel/functions/count-function"}, {"title": "support.microsoft.com — reference", "url": "https://support.microsoft.com/en-us/excel/get-started/create-a-pivottable-to-analyze-worksheet-data"}, {"title": "support.google.com — reference", "url": "https://support.google.com/docs/answer/3094294?hl=en"}, {"title": "support.google.com — reference", "url": "https://support.google.com/docs/answer/3093583?hl=en"}, {"title": "support.google.com — reference", "url": "https://support.google.com/docs/answer/1272900?hl=en"}, {"title": "support.google.com — reference", "url": "https://support.google.com/docs/answer/3093403?hl=en"}, {"title": "support.google.com — reference", "url": "https://support.google.com/docs/answer/3093620?hl=en"}]
draft: false
author: "GuideHollow Editorial"
featured: false
---

## The average that looks right but is wrong

An AI assistant receives a sales spreadsheet and reports an "average selling price" of 153.25. The figure is arithmetically plausible: it is the average of eight listed prices. Yet the business actually sold 27 units for 530, making the **realized revenue per unit about 19.63**. The difference comes from treating every spreadsheet row as equally important instead of weighting each price by the quantity sold.

This guide gives you a reproducible way to review AI-generated price analysis. You will use an original eight-row CSV, derive a unit-weighted average in Excel or Google Sheets, reconcile channel totals, and deliberately break the input to see whether your validation catches the problem.

The goal is not to prove that one formula fits every pricing question. It is to define the **metric, denominator, zero-value rules, and completeness checks** before accepting an AI-written narrative, formula, or chart. All data below is fictional; none of the figures represent a real shop or a measured AI benchmark.

## Define the question before calculating

"Average price" can mean different things. Three common definitions are:

- **Average listed line price:** add each row's UnitPrice and divide by the number of priced rows. This gives each row one vote, even if one row sold 10 units and another sold none.
- **Average realized price per sold unit:** add Units × UnitPrice across valid rows, then divide by the total Units sold. Each sold unit receives equal weight. This is the metric used in this guide.
- **Average order value:** divide order revenue by the number of distinct orders. Our fixture has line IDs rather than verified order IDs, so it cannot support that calculation.

Tell the AI which metric you want and what to do with zero-unit lines, zero-price units, blanks, refunds, taxes, and discounts. If you have not defined these rules, stop before generating a dashboard. A colorful chart will not resolve an ambiguous denominator.

## Copy the fictional sales CSV

Create a UTF-8 text file called **weighted-price-sample.csv** containing the following data. Import it into an empty Excel or Google Sheets worksheet. The expected range is **A1:D9**.

```javascript
LineID,Channel,Units,UnitPrice
L-101,Web,1,100
L-102,Web,4,25
L-103,Store,10,12
L-104,Web,2,40
L-105,Store,3,30
L-106,Web,0,999
L-107,Store,5,0
L-108,Store,2,20
```

The **Units** and **UnitPrice** columns must be numeric. All eight LineIDs are fictional. The line with zero units and price 999 is intentional: its price should not contribute to revenue or the per-unit average. The line with five units at a numeric zero price is also intentional: its units **do** belong in the denominator. This exercise treats them as units transferred at no charge, without trying to infer why that happened.

The dataset has no dates, returns, shipping, discounts, tax, or currency conversion. Treat UnitPrice as a hypothetical consistent price unit; do not infer actual profit or margin.

Before asking AI to analyze a real workbook, replace confidential identifiers and transactions with a small approved sample whenever possible. Check hidden sheets and file metadata if you plan to upload a workbook.

## Ask AI for auditable intermediate results

An AI assistant can draft a spreadsheet procedure or explanation, but the prompt should require intermediate values, not only a polished headline. Try this request with the fictional CSV:

```plain
You are reviewing a fictional eight-row sales CSV.
Do not modify, delete, or invent any row.

Calculate average realized price per sold unit, defined as:
SUM(Units * UnitPrice) / SUM(Units).

Show:
1. Original input row count and numeric input checks.
2. Units and revenue for every row.
3. Total units, total revenue, and weighted average.
4. Web and Store totals, plus a reconciliation to the grand total.
5. The simple average of row prices, labeled as a different metric.
6. Which rows have zero units and zero price.
7. Formulas a reader can verify in Excel or Google Sheets.
8. Any calculation that requires a rule not specified here.

Do not claim that an Excel or Sheets formula was executed unless
it was actually run in that application.
Do not interpret zero as blank or replace it with a guess.
```

Check the answer against the reference output below. If the model says that the 999 price makes the weighted average extremely high, it has likely confused line prices with unit-weighted revenue. If it averages Web's and Store's averages equally, it has made a different weighting error.

## Calculate the row revenue and control totals

In **E1**, enter **LineRevenue**. In E2, enter this ordinary multiplication formula and fill down to E9.

```javascript
=C2*D2
```

The expected output for E2:E9 is **100, 100, 120, 80, 90, 0, 0, 40**. Compare the numbers before computing any average.

Use these independent summary formulas in unused cells:

```javascript
=COUNTA(A2:A9)
=COUNT(C2:C9)
=COUNT(D2:D9)
=COUNTBLANK(D2:D9)
=SUM(C2:C9)
=SUM(E2:E9)
=SUMPRODUCT(C2:C9,D2:D9)
=SUMPRODUCT(C2:C9,D2:D9)/SUM(C2:C9)
=AVERAGE(D2:D9)
```

For this fixture, the results in order are **8, 8, 8, 0, 27, 530, 530, 19.62962963..., and 153.25**. Displaying the weighted average to two decimals gives **19.63**, but keep the full value for comparisons until the final presentation.

**SUMPRODUCT** multiplies corresponding entries in equal-sized ranges and sums the products. Microsoft and Google both document that functionality. The denominator **SUM(C2:C9)** measures actual quantity rather than the number of spreadsheet rows. The separate **SUM(E2:E9)** check proves that the row-level revenue agrees with the independently expressed SUMPRODUCT result.

The very different value **153.25** comes from the unweighted mean of 100, 25, 12, 40, 30, 999, 0, and 20. Its arithmetic is valid for the question "What is the average of these eight row prices?" It is not the realized price for 27 units. Even dropping the zero-unit row's 999 price gives an unweighted seven-row average of approximately **32.43**, which is still not the desired per-unit result.

## Read the reference output row by row

The following table provides the expected intermediate values. This table is the test oracle: compare it with both AI output and worksheet cells.

| LineID | Channel | Units | Price | Revenue |
| --- | --- | --- | --- | --- |
| L-101 | Web | 1 | 100 | 100 |
| L-102 | Web | 4 | 25 | 100 |
| L-103 | Store | 10 | 12 | 120 |
| L-104 | Web | 2 | 40 | 80 |
| L-105 | Store | 3 | 30 | 90 |
| L-106 | Web | 0 | 999 | 0 |
| L-107 | Store | 5 | 0 | 0 |
| L-108 | Store | 2 | 20 | 40 |

The row contributions demonstrate the two important zero cases. **L-106** adds no units and no revenue, regardless of its listed price. **L-107** adds five units and no revenue; it lowers the realized revenue per unit. Neither row is automatically wrong, although production data may require review of unusually high prices or giveaways.

## Reconcile by channel before making a chart

To audit the result by sales channel, enter **Web** in G2 and **Store** in G3. Label H1 **Units**, I1 **Revenue**, and J1 **RevenuePerUnit**. Use:

```javascript
H2: =SUMIF($B$2:$B$9,G2,$C$2:$C$9)
I2: =SUMIF($B$2:$B$9,G2,$E$2:$E$9)
J2: =IF(H2=0,"N/A",I2/H2)
```

Enter the formulas in their indicated cells without the leading address labels, then fill H2:J2 down to row 3. **SUMIF** adds the requested numeric range for one channel; this function is documented for Google Sheets, and the same basic three-argument construction is available in Excel. The conditional J formula avoids displaying a divide-by-zero error if a channel has no sold units.

| Channel | Units | Revenue | Revenue/unit |
| --- | --- | --- | --- |
| Web | 7 | 280 | 40.00 |
| Store | 20 | 250 | 12.50 |
| Total | 27 | 530 | 19.63 |

Two independent consistency identities must hold:

**7 + 20 = 27 units**, and **280 + 250 = 530 revenue**.

For the overall weighted average, compute **(7 × 40 + 20 × 12.5) / 27 = 530 / 27 = 19.62962963...**. This agrees with the original-row calculation. But **(40 + 12.5) / 2 = 26.25** is wrong as an overall per-unit average because it gives the two channels equal weight despite very different unit volumes.

A useful chart here is channel revenue or channel unit count, with the metric and units labeled. If you chart channel averages, label them as **revenue per unit**, not "average order value." Do not put the raw sum of UnitPrice or an average of channel averages in a chart labeled "realized price."

## Build a pivot-table cross-check

A pivot table can provide another route to the channel totals. In Excel, select your headers and complete source range, insert a PivotTable, place **Channel** in Rows, then add **Units** and **LineRevenue** to Values as **Sum**. If Excel recognizes a value column as text, its default may be **Count** rather than Sum; inspect the Value Field Settings. Microsoft documents this distinction.

In Google Sheets, select all five columns with their headers, choose **Insert → Pivot table**, add Channel to Rows and Units plus LineRevenue to Values, and set each aggregation to **SUM**. Google's help documentation requires headers for source columns and describes the pivot editor controls.

Compare the pivot output to the table above. A conventional "Average of UnitPrice" field is **not** the weighted average you want. Calculate revenue divided by units from the aggregated totals instead. Where a pivot's calculated-field behavior is unfamiliar or unavailable, use adjacent worksheet cells rather than inventing a feature.

This pivot exercise was not run inside either commercial spreadsheet application for this article. The expected totals were computed from the fixture by an independent script.

## Negative test A: a quantity typo changes the answer

Restore the original fixture, then change **C3** from 4 units to **40**, leaving the unit price at 25.

The new results should be:

- Input rows: still 8.
- Total units: **63**.
- Total revenue: **1,430**.
- Weighted average: **1,430 / 63 = approximately 22.70**.
- Web: **43 units**, **1,180 revenue**.
- Store: unchanged at **20 units**, **250 revenue**.

The unweighted list-price average remains **153.25**, revealing why that calculation cannot catch this quantity error. An AI summary reporting unchanged revenue and unchanged weighted average has missed the data change or reused stale numbers.

## Negative test B: missing and zero must remain distinct

Restore the original data again. Now **clear D8**, replacing the numeric zero price on L-107 with a truly blank cell. Do not change the five units.

A naive multiplication may still produce row revenue zero. Your grand totals may still appear to be **27 units** and **530 revenue**, and the weighted result may still appear to be **19.63**. That does **not** mean the data is valid. The price for five units is now unknown, not confirmed free.

Re-run the input checks: **COUNT(D2:D9)** should fall from 8 to **7**, while **COUNTBLANK(D2:D9)** should rise from 0 to **1**. The unweighted AVERAGE of populated prices also changes, showing that blanks affect different metrics differently. In this case, block the report and ask for an authoritative price. Do not silently impute a zero because the math stays visually consistent.

For a simple preflight gate in either application, use:

```javascript
=IF(OR(COUNT(C2:C9)<>8,COUNT(D2:D9)<>8,COUNTBLANK(D2:D9)>0),"STOP: incomplete or nonnumeric inputs","READY FOR TOTALS")
```

This gate is specific to the eight-row teaching fixture. In production, adapt expected row counts, business rules, and error handling; also check negative quantities, returns, and any duplicate line IDs separately.

## Checklist before trusting an AI spreadsheet summary

- [ ] The requested metric has a clear numerator and denominator.
- [ ] The input has eight distinct source lines, all preserved.
- [ ] Units and UnitPrice contain eight numeric cells each, with no blank prices.
- [ ] The 999 price on the zero-unit line is not treated as sold revenue.
- [ ] The zero-price line contributes five units, not a missing value.
- [ ] All row revenue values match the eight-row reference.
- [ ] Total units and revenue are 27 and 530.
- [ ] Overall weighted average is 530/27, displayed as about 19.63.
- [ ] Web and Store totals reconcile independently to the grand totals.
- [ ] A pivot groups revenue and units using Sum, not Average of prices.
- [ ] The two mutation tests are checked from fresh original copies.
- [ ] No live AI model or spreadsheet-engine test is claimed unless actually performed.

## Official sources and what was verified

- [Microsoft Support — SUMPRODUCT](https://support.microsoft.com/en-us/excel/functions/sumproduct-function): pairwise multiplication and sum, same-sized array requirement, and treatment of nonnumeric entries.
- [Microsoft Support — COUNT](https://support.microsoft.com/en-us/excel/functions/count-function): numeric-cell detection.
- [Microsoft Support — PivotTable analysis](https://support.microsoft.com/en-us/excel/get-started/create-a-pivottable-to-analyze-worksheet-data): fields, summary choices, and text-as-count caveat.
- [Google Docs Editors Help — SUMPRODUCT](https://support.google.com/docs/answer/3094294?hl=en): equivalent array-product aggregation.
- [Google Docs Editors Help — SUMIF](https://support.google.com/docs/answer/3093583?hl=en): criteria-based sums used for channel reconciliation.
- [Google Docs Editors Help — Pivot tables](https://support.google.com/docs/answer/1272900?hl=en): source headers and pivot configuration.
- [Google Docs Editors Help — COUNTBLANK](https://support.google.com/docs/answer/3093403?hl=en) and [COUNT](https://support.google.com/docs/answer/3093620?hl=en): missing/numeric checks.

**Executed verification:** The fictional CSV was parsed in Python with the built-in CSV module. Decimal arithmetic independently produced the eight row revenues, 27 units, 530 revenue, channel subtotals 7/280 and 20/250, weighted price 530/27, simple mean 153.25, and the mutated results 63/1430 and blank-price 7 numeric cells. A further zero-quantity mutation was checked privately but is not needed to complete the reader exercise.

**Not executed:** No live AI request, Excel workbook calculation, Google Sheets calculation, or site deployment was performed. The reader should execute the stated formulas inside the intended spreadsheet application before applying the method to actual business decisions.
