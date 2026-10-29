---
title: "How to Audit AI CSV Deduplication Without Losing Orders"
description: "Audit AI-suggested CSV duplicate removal in Excel or Google Sheets with a nine-row test file, checkable formulas, exception flags, and total reconciliation."
slug: "audit-ai-csv-duplicate-removal-without-losing-rows"
category: "guides"
tags: ["ai", "csv", "data-cleaning", "spreadsheets", "excel", "google-sheets", "deduplication", "data-validation"]
publishedDate: "2026-10-29"
updatedDate: "2026-10-29"
sources: [{"title": "support.microsoft.com — reference", "url": "https://support.microsoft.com/en-gb/excel/functions/countifs-function"}, {"title": "support.microsoft.com — reference", "url": "https://support.microsoft.com/en-us/excel/get-started/use-the-countif-function-in-microsoft-excel"}, {"title": "support.microsoft.com — reference", "url": "https://support.microsoft.com/en-us/excel/get-started/import-or-export-text-txt-or-csv-files"}, {"title": "support.microsoft.com — reference", "url": "https://support.microsoft.com/en-us/excel/keep-or-remove-duplicate-rows-power-query"}, {"title": "support.google.com — reference", "url": "https://support.google.com/docs/answer/3256550?hl=en"}, {"title": "support.google.com — reference", "url": "https://support.google.com/docs/answer/3093480?hl=en"}, {"title": "support.google.com — reference", "url": "https://support.google.com/docs/answer/6325535?hl=en-2"}, {"title": "support.google.com — reference", "url": "https://support.google.com/docs/answer/12236443?hl=en"}]
draft: false
author: "GuideHollow Editorial"
featured: false
---

## A tidy CSV can still contain the wrong orders

Imagine asking an AI assistant to clean a small order export. It returns a shorter file and says, "Duplicates removed." The table looks better, but what did "duplicate" mean? Two rows with the same order ID might be an accidental repeated export, or they might contain different amounts that need investigation. Removing both, or arbitrarily keeping one, changes the business record.

This guide shows a safer workflow: ask AI to **propose** a cleaning rule, check it with spreadsheet formulas, reconcile every input amount, and quarantine unresolved records instead of silently deleting them. You can reproduce this exercise in Excel or Google Sheets without uploading any private data. The nine-row CSV is fictional, and the totals are deliberately small enough to audit by hand.

**Goal:** remove only one verified repeated row, preserve one copy, and flag a conflicting order ID and a missing ID for human review. We are not trying to guess which conflicting transaction is correct.

## Start with a fixed test CSV

Save the following as **sample-orders.csv**, using UTF-8 text. It contains one header and nine data rows. Columns A through D are OrderID, Region, OrderDate, and Amount.

```javascript
OrderID,Region,OrderDate,Amount
O-101,North,2026-10-01,120
O-102,South,2026-10-01,80
O-103,North,2026-10-02,45
O-102,South,2026-10-01,80
O-104,East,2026-10-03,60
O-103,North,2026-10-02,50
,West,2026-10-04,30
O-105,West,2026-10-05,25
O-106,North,2026-10-05,0
```

Read the file before opening an AI chat. Rows 3 and 5 describe the **same four-field record** for O-102. Rows 4 and 7 use O-103 but disagree on Amount (45 versus 50). Row 8 lacks an OrderID. The zero in row 10 is not a missing amount; it is a numeric zero.

Import the file into a new, disposable workbook. In Excel, Microsoft's documented path includes **Data → From Text/CSV**, with preview and transformation options. In Google Sheets, Google's workflow includes **File → Import → Upload**, followed by import-location and separator choices. Menus can vary by version. Check the preview before loading. Treat OrderID as an identifier, not a number. Use a consistent interpretation for ISO-style OrderDate values; ensure Amount cells are numeric. Never overwrite the original export.

The example assumes A1:D10 after import and uses commas as formula separators. Some locales use a different argument separator; adapt that setting rather than changing source values.

## Ask AI to classify, not delete

For this pass, paste only the fictional CSV into an assistant. Ask it to propose categories and an audit plan. Try the following request:

```plain
Audit this fictional CSV. Do not delete or rewrite any row.
Return:
1. Definition of exact duplicate across all four fields.
2. OrderIDs appearing with conflicting non-ID fields.
3. Rows with blank OrderID.
4. Original row number and classification for each row.
5. Expected input row count and numeric Amount total.
6. Decisions requiring a human.
Do not choose a winning value for inconsistent IDs.
Do not invent missing IDs or transaction statuses.
Treat numeric zero as a valid amount.
```

This prompt limits the requested task, but cannot prove that an assistant followed it. AI may still miscount, omit a row, or merge two records that only look similar. The next steps provide independent checks.

For a real export, use a sanitized fixture whenever possible. Do not upload customer names, payment records, or confidential IDs without the required authorization and data-handling review.

## Classify every row with spreadsheet formulas

Add **AuditFlag** in E1. In E2, enter this formula and fill it down through E10:

```javascript
=IF(A2="","MISSING_ID",IF(COUNTIF($A$2:$A$10,A2)=1,"UNIQUE_ID",IF(COUNTIFS($A$2:$A$10,A2,$B$2:$B$10,B2,$C$2:$C$10,C2,$D$2:$D$10,D2)=COUNTIF($A$2:$A$10,A2),"EXACT_DUPLICATE_GROUP","CONFLICTING_ID")))
```

The first COUNTIF counts appearances of an ID. COUNTIFS counts records matching all four fields, within ranges of equal size. Microsoft and Google document these functions in Excel and Google Sheets, respectively. The example uses ordinary bounded cell ranges, not any AI-only spreadsheet feature.

Interpret the formula in this order:

1. A blank ID becomes **MISSING\_ID**.
1. A nonblank ID appearing once becomes **UNIQUE\_ID**.
1. If the ID repeats, count rows with the same ID, Region, OrderDate, and Amount.
1. If every ID occurrence matches all four fields, label the group **EXACT\_DUPLICATE\_GROUP**.
1. Otherwise, label every row under that ID **CONFLICTING\_ID**.

**Important:** EXACT\_DUPLICATE\_GROUP labels both O-102 rows. It does not mean you should delete both. Keep one copy only after checking the original export. The formula assumes all values in a given column were imported consistently; it is not a universal semantic-deduplication engine.

## Check the expected labels row by row

After filling E2:E10, compare with this independently calculated table.

| Row | OrderID | Amount | Expected AuditFlag |
| --- | --- | --- | --- |
| 2 | O-101 | 120 | UNIQUE\_ID |
| 3 | O-102 | 80 | EXACT\_DUPLICATE\_GROUP |
| 4 | O-103 | 45 | CONFLICTING\_ID |
| 5 | O-102 | 80 | EXACT\_DUPLICATE\_GROUP |
| 6 | O-104 | 60 | UNIQUE\_ID |
| 7 | O-103 | 50 | CONFLICTING\_ID |
| 8 | (blank) | 30 | MISSING\_ID |
| 9 | O-105 | 25 | UNIQUE\_ID |
| 10 | O-106 | 0 | UNIQUE\_ID |

Put these six checks in separate unused cells:

```javascript
=COUNTA(D2:D10)
=COUNT(D2:D10)
=COUNTBLANK(A2:A10)
=COUNTIF(E2:E10,"UNIQUE_ID")
=COUNTIF(E2:E10,"EXACT_DUPLICATE_GROUP")
=SUM(D2:D10)
```

The expected outputs, in order, are **9, 9, 1, 4, 2, and 490**. COUNTA counts populated Amount cells, while COUNT counts numeric Amount cells. Their agreement helps catch amounts imported as text. COUNTBLANK shows one missing ID. Add two more checks:

```javascript
=COUNTIF(E2:E10,"CONFLICTING_ID")
=COUNTIF(E2:E10,"MISSING_ID")
```

These should return **2** and **1**. The category counts must cover all nine data rows: 4 unique + 2 exact-repeat-group + 2 conflicting + 1 missing = **9**. If not, check formula references, unfilled cells, and missing input rows before proceeding.

## Reconcile amounts before removing a row

The raw total, calculated independently, is:

**120 + 80 + 45 + 80 + 60 + 50 + 30 + 25 + 0 = 490**.

The two O-102 rows match across the four fields. If you retain one 80 and exclude the redundant 80, the result is **eight retained rows totaling 410**. That is all the automatic cleanup this example supports.

Do not call 410 approved revenue: the retained data still includes two conflicting O-103 amounts (45 and 50) and the missing-ID amount 30. Build a review ledger instead.

| Ledger bucket | Rows | Amount |
| --- | --- | --- |
| Unique IDs without detected conflict | 4 | 205 |
| One retained O-102 record | 1 | 80 |
| Both O-103 records, held | 2 | 95 |
| Missing-ID record, held | 1 | 30 |
| One redundant O-102 copy excluded | 1 | 80 |

The identity is **490 = 205 + 80 + 95 + 30 + 80**. After excluding the repeated copy, **410 = 285 provisionally clear + 125 held**. Here "provisionally clear" means that these fictional rows have no detected ID conflict. It does not prove that a real payment occurred or should be reported as revenue.

This reconciliation explains exactly which amounts were retained, held, or excluded. An AI-generated short file totaling 330, 360, or 365 should not be accepted simply because it looks plausible. Compare original row numbers, removed records, amounts, and exceptions against the ledger.

## Two deliberate failure tests

A reliable workflow needs negative tests as well as a successful example. Begin each test with a fresh copy of the nine-row source; never stack changes accidentally.

**Test A: Change D5 from 80 to 81.** O-102 becomes a conflict. Both O-102 rows must now be **CONFLICTING\_ID**, just like both O-103 rows. The raw total becomes **491**. There are 4 conflicting rows, 0 exact-repeat rows, 4 unique rows, and 1 missing-ID row. Any automated removal using the original assumption would now discard a possibly distinct record.

**Test B: Restore the original, then change D7 from 50 to 45.** Both O-103 rows become exact full-row matches. You should obtain 4 exact-repeat-group rows, 0 conflicting rows, 4 unique rows, and 1 missing-ID row. The raw total becomes **485**. Excluding one extra O-102 amount 80 and one extra O-103 amount 45 leaves **360**. The missing-ID record remains unresolved.

If your outputs differ, check whether a date was imported differently, a number was stored as text, or a formula was copied one row too far. Do not ask the AI to declare the new answer correct without inspecting the data.

## Excel and Google Sheets: shared formula idea, different UI controls

The worksheet formulas rely on standard COUNTIF and COUNTIFS, documented by both vendors. Their interfaces and import defaults are not guaranteed to be identical, however.

**Excel:** Microsoft documents the From Text/CSV import path and Power Query's Keep/Remove Duplicates operations. Power Query decides duplicates according to the selected comparison columns. Selecting **only OrderID** here could collapse the O-103 disagreement. Selecting **all four fields** identifies repeated full records, but still does not resolve the conflicting IDs or missing ID.

**Google Sheets:** Google documents **Data → Data cleanup → Remove duplicates**, with column selection and a header-row option. Its documentation notes that equal-looking cells with differences in case, formatting, or formulas can be considered duplicates. That behavior should not be assumed to enforce a strict case-sensitive record key.

For both applications, prefer flags and a reviewed output copy over immediate destructive editing. The full deletion list, not a "duplicates removed" banner, is the relevant evidence. Keep the original immutable so you can always reconcile the result later.

## Mistakes that make an AI-cleaned CSV unsafe

**Same ID means duplicate.** O-103 proves otherwise: the values disagree. The right next action is to check the authoritative order system, not ask the model to guess the correct amount.

**Blank ID means delete.** The West row of 30 is missing an identifier. Its existence is not disproven by that omission. Keep it in a hold queue, and never invent an ID solely to make a validation report green.

**Zero means missing.** O-106 contains a valid numeric zero in this fixture. COUNT over the Amount cells must still be nine. Converting it to an empty value would make the imported file materially different.

**Matching totals prove correct rows.** They do not. Errors may cancel each other numerically. Compare exact row inventories and exception categories alongside the sum.

**Removing duplicates fixes formatting automatically.** It does not establish a safe normalization policy. Mixed number types, leading spaces, date parsing, and case differences can alter comparisons. Microsoft's documentation notes that COUNTIF matching is case-insensitive. If identifiers are case-sensitive in your system, this illustrative formula must be replaced with a validated case-sensitive comparison method.

## Final review checklist

- [ ] The source CSV is unchanged and the imported range is A1:D10.
- [ ] All nine Amount cells are populated and numeric.
- [ ] The raw total is 490 and every row has one AuditFlag.
- [ ] The two O-102 rows are identical across four fields.
- [ ] Both O-103 rows remain held because their amounts disagree.
- [ ] The row with no OrderID remains on hold.
- [ ] One redundant 80 is the only approved automatic exclusion.
- [ ] The eight retained rows total 410, including 125 still held.
- [ ] Negative tests A and B reproduce the stated counts.
- [ ] The reviewer records the removed row, comparison rule, and evidence for any later exception resolution.

## Official sources and testing limitations

- [Microsoft — COUNTIFS](https://support.microsoft.com/en-gb/excel/functions/countifs-function): multi-condition matching and equal range sizes.
- [Microsoft — COUNTIF](https://support.microsoft.com/en-us/excel/get-started/use-the-countif-function-in-microsoft-excel): one-condition matching and text limitations.
- [Microsoft — Import/export CSV](https://support.microsoft.com/en-us/excel/get-started/import-or-export-text-txt-or-csv-files): Excel import steps.
- [Microsoft — Keep/remove duplicate rows](https://support.microsoft.com/en-us/excel/keep-or-remove-duplicate-rows-power-query): Power Query comparison-column behavior.
- [Google — COUNTIFS](https://support.google.com/docs/answer/3256550?hl=en) and [COUNTIF](https://support.google.com/docs/answer/3093480?hl=en): Sheets syntax.
- [Google — Split text, remove duplicates, trim whitespace](https://support.google.com/docs/answer/6325535?hl=en-2): Sheets controls and equality behavior.
- [Google — Improve data ingestion](https://support.google.com/docs/answer/12236443?hl=en): file import workflow.

**Actually tested:** The fictional CSV was parsed using Python's built-in CSV reader. Independent Decimal arithmetic and ID/full-row frequency comparisons reproduced all nine original classifications, raw total 490, post-exclusion total 410, and the five ledger buckets. The two proposed mutations were also run against this independent classifier, producing the stated totals and category counts.

**Not tested:** No live AI response, Excel calculation engine, Google Sheets calculation engine, real customer dataset, or website deployment was executed for this guide. Function behavior and app workflows are described from official documentation; readers must verify them with their own spreadsheet versions before using the method on important data.
