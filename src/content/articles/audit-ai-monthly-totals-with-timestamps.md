---
title: "How to Audit AI Monthly Sales Totals When CSV Dates Include Times"
description: "Catch AI spreadsheet totals that miss end-of-month timestamps. Reproduce an October sales CSV, verify SUMIFS boundaries, and test date parsing in Excel or Sheets."
slug: "audit-ai-monthly-totals-with-timestamps"
category: "guides"
tags: ["ai", "excel", "google-sheets", "monthly-reporting", "sumifs", "datetime", "csv", "data-validation"]
publishedDate: "2026-11-01"
updatedDate: "2026-11-01"
sources: [{"title": "support.microsoft.com — reference", "url": "https://support.microsoft.com/en-us/excel/functions/sumifs-function"}, {"title": "support.microsoft.com — reference", "url": "https://support.microsoft.com/en-us/excel/functions/date-function"}, {"title": "support.microsoft.com — reference", "url": "https://support.microsoft.com/en-us/excel/functions/time-function"}, {"title": "support.google.com — reference", "url": "https://support.google.com/docs/answer/3238496?hl=en"}, {"title": "support.google.com — reference", "url": "https://support.google.com/docs/answer/3092969?hl=en"}, {"title": "support.google.com — reference", "url": "https://support.google.com/docs/answer/3093056?hl=en"}, {"title": "support.google.com — reference", "url": "https://support.google.com/docs/answer/3256550?hl=en"}]
draft: false
author: "GuideHollow Editorial"
featured: false
---

## Why an AI monthly total can be too low

An assistant is asked to calculate October sales from a CSV. It generates a reasonable-looking formula, and the number on screen is **190**. But an independent review of the same ten fictional records shows **295** in October rows marked Paid. Where did 105 go? The formula used an inclusive upper boundary at midnight on October 31. It included a transaction at 00:00 but excluded Paid records later that day.

The problem is not that SUMIFS is inherently unreliable. The problem is that date-time values contain both a calendar date and a fractional day. A condition such as "on or before October 31" may mean midnight at the start of October 31, not the end of that date. Asking AI for an "October total" without spelling out the time boundary invites an unverified interpretation.

This tutorial shows a source-bounded way to request an AI formula, normalize a tiny test CSV, verify a **half-open monthly interval**, and reconcile totals across months and statuses. We will also deliberately change one timestamp and introduce an invalid day to test the controls. No live sales records or claimed AI performance statistics are involved.

## Define the metric and the clock first

For this exercise, "October Paid amount" means the sum of Amount for records whose status is exactly Paid and whose local timestamp satisfies **2026-10-01 00:00 inclusive to 2026-11-01 00:00 exclusive**.

In other words, include October 1 at midnight, include October 31 at 23:59, and exclude November 1 at midnight. This is commonly called a **half-open interval**, written mathematically as start inclusive and next-month start exclusive.

The supplied times are a fictional export already expressed in one consistent local clock. We are **not** converting from UTC or combining multiple time zones. A production analysis using UTC, daylight-saving transitions, or mixed time zones needs an explicit business timezone and controlled conversion before monthly grouping.

The Amount column is numeric and uses fictional units, not a confirmed currency. "Paid" is only a label in the fixture; this article does not infer recognized revenue, financial compliance, or the meaning of a refund.

## Copy the ten-row CSV into a disposable sheet

Save the following UTF-8 text as **monthly-orders.csv**. Put the data in a new workbook, with the first row as a header. The input should occupy **A1:D11**.

```javascript
RecordID,Timestamp,Amount,Status
R-01,2026-09-30 23:59,70,Paid
R-02,2026-10-01 00:00,100,Paid
R-03,2026-10-15 09:30,50,Paid
R-04,2026-10-31 00:00,40,Paid
R-05,2026-10-31 18:45,80,Paid
R-06,2026-10-31 23:59,120,Pending
R-07,2026-11-01 00:00,200,Paid
R-08,2026-10-22 12:15,0,Paid
R-09,2026-10-20 14:10,30,Refunded
R-10,2026-10-31 23:59,25,Paid
```

**Important import contract:** Column B contains exactly 16-character strings in YYYY-MM-DD HH:MM form. Import or paste it as **text**, not as an automatically interpreted date. Column C must contain numeric values, including its valid zero. Column D should preserve the status labels as written. If your spreadsheet converted B into numeric dates before you add the helper column below, restore the original text-column import. Do not apply the parser to an already parsed date serial.

Excel and Google Sheets offer different import and formatting interfaces, so inspect the resulting cells rather than assuming a shared CSV-detection default. Never overwrite the original export when experimenting. In a real environment, sanitize any file that might contain personal or confidential records before sending example data to an assistant.

## Ask AI for a formula and a reconciliation plan

Give the AI the CSV and the precise metric, not just "calculate October sales." This sample instruction keeps the work auditable:

```plain
Use ONLY the ten fictional CSV rows below.
Do not delete, merge, or invent any row.
Interpret Timestamp as a local YYYY-MM-DD HH:MM value.

Metric: sum Amount where Status is exactly Paid
and timestamp is >= 2026-10-01 00:00
and timestamp is < 2026-11-01 00:00.

Return:
1. Each included RecordID and its Amount.
2. Excluded RecordIDs and reasons.
3. A count of qualifying rows and total Amount.
4. An Excel/Google Sheets SUMIFS formula with date-time values.
5. An independent month/status reconciliation table.
6. Import-format checks and one negative test.
Do not say the formula was executed unless it was.
Do not silently convert invalid text timestamps.
```

An AI answer might still omit rows or use an inclusive midnight boundary. Compare its proposed inclusions against the reference table later in this article. A source-bounded prompt improves the request; it is not a guarantee that the result is true.

## Convert the exact text timestamp to a numeric date-time

Add **ParsedTime** in E1. In E2, enter the following formula and copy it down to E11:

```javascript
=DATE(VALUE(LEFT(B2,4)),VALUE(MID(B2,6,2)),VALUE(MID(B2,9,2)))+TIME(VALUE(MID(B2,12,2)),VALUE(MID(B2,15,2)),0)
```

This extracts the four-digit year, two-digit month, two-digit day, two-digit hour, and two-digit minute, then constructs a date plus a time fraction. Both Microsoft and Google document DATE and TIME; each also describes that out-of-range date or time components may be adjusted rather than rejected. Therefore, **successful parsing is not enough to establish that source text is valid**.

For a readable display, format E2:E11 as date-and-time, showing minutes. Do not compare the visually formatted string in column B against numerical DATE criteria: SUMIFS below uses the numeric values in E.

Add **TimestampCheck** in F1. In F2, enter this round-trip check and fill to F11:

```javascript
=IFERROR(IF(AND(ISTEXT(B2),LEN(B2)=16,TEXT(E2,"yyyy-mm-dd hh:mm")=B2),"OK","CHECK"),"CHECK")
```

If B contains the expected text and E converts back to the same canonical string, F reports OK. A malformed value that DATE silently normalizes, such as **2026-10-32 18:45**, must receive CHECK rather than being accepted as November 1. This control is designed for the exact fictional layout and does not validate time zones or every possible CSV error.

On the pristine fixture, all ten F cells should be OK. Run these checks in otherwise unused cells:

```javascript
=COUNTA(A2:A11)
=COUNT(C2:C11)
=COUNT(E2:E11)
=COUNTIF(F2:F11,"OK")
=SUM(C2:C11)
```

Expected outputs: **10 records, 10 numeric amounts, 10 numeric parsed timestamps, 10 OK flags, and 715 total amount**. If any number differs, do not let AI proceed to charting. Check that B remained text, that formulas filled down through row 11, and that all amounts are numeric.

## Use the correct half-open SUMIFS boundary

For this worksheet, the October Paid total is:

```javascript
=SUMIFS(C2:C11,E2:E11,">="&DATE(2026,10,1),E2:E11,"<"&DATE(2026,11,1),D2:D11,"Paid")
```

The matching row count is:

```javascript
=COUNTIFS(E2:E11,">="&DATE(2026,10,1),E2:E11,"<"&DATE(2026,11,1),D2:D11,"Paid")
```

Both formulas should produce **295** and **6**, respectively. The sum ranges and criteria ranges all refer to exactly the ten data rows. An AI-generated formula that mixes E2:E10 with C2:C11 is not an equivalent query.

Microsoft and Google document SUMIFS as a sum with multiple criteria and COUNTIFS as a count with multiple criteria. We independently verified intended inclusion logic using Python datetime parsing and Decimal sums, not by claiming to have run these formulas inside both vendors' calculation engines.

## Inspect every inclusion and exclusion

The following table is the reference oracle. It retains the original RecordID and makes the decision at the row level.

| Record | Local time | Status | Amount | Oct Paid? |
| --- | --- | --- | --- | --- |
| R-01 | Sep 30 23:59 | Paid | 70 | No: September |
| R-02 | Oct 01 00:00 | Paid | 100 | Yes |
| R-03 | Oct 15 09:30 | Paid | 50 | Yes |
| R-04 | Oct 31 00:00 | Paid | 40 | Yes |
| R-05 | Oct 31 18:45 | Paid | 80 | Yes |
| R-06 | Oct 31 23:59 | Pending | 120 | No: status |
| R-07 | Nov 01 00:00 | Paid | 200 | No: November |
| R-08 | Oct 22 12:15 | Paid | 0 | Yes |
| R-09 | Oct 20 14:10 | Refunded | 30 | No: status |
| R-10 | Oct 31 23:59 | Paid | 25 | Yes |

The correct included IDs are **R-02, R-03, R-04, R-05, R-08, and R-10**. Their amounts are 100 + 50 + 40 + 80 + 0 + 25 = **295**. A zero amount still contributes a counted qualifying row: the count is six even though only five values are positive.

This row inventory can identify mistakes that total-only validation misses. An AI output could accidentally drop one record and add another whose amount happens to match, leaving the final sum unchanged but the inclusion set incorrect.

## Reconcile the whole source without inventing a business rule

The ten-row fixture has these month totals across **all statuses**:

| Month | Rows | All-status Amount |
| --- | --- | --- |
| September 2026 | 1 | 70 |
| October 2026 | 8 | 445 |
| November 2026 | 1 | 200 |
| All months | 10 | 715 |

October's 445 is **295 Paid + 120 Pending + 30 Refunded**. These are labels, not accounting adjustments: do not subtract 30 from revenue unless business rules explicitly define it as a signed reversal. Reconciliation shows that raw numbers are accounted for; it does not decide which operational statuses belong in a financial report.

A second spreadsheet check of October **all-status** amount is:

```javascript
=SUMIFS(C2:C11,E2:E11,">="&DATE(2026,10,1),E2:E11,"<"&DATE(2026,11,1))
```

Expected: **445**. It should equal the three October status buckets, and 70 + 445 + 200 should equal the original 715. Do not confuse the all-status result with the narrower Paid result.

## Demonstrate two wrong end-date formulas

Consider this tempting formula:

```javascript
=SUMIFS(C2:C11,E2:E11,">="&DATE(2026,10,1),E2:E11,"<="&DATE(2026,10,31),D2:D11,"Paid")
```

It yields **190** for this fixture: only Paid rows at or before October 31 **00:00** are counted. It misses R-05 (80) and R-10 (25), a combined **105**, because they occur later on October 31.

Another incorrect attempt uses less than or equal to November 1 rather than strictly less than it. That includes R-07 at **2026-11-01 00:00**, making the Paid total **495**. This is why the upper bound must be **less than DATE(2026,11,1)**.

The rule generalizes to February, leap years, and months of different lengths: compare against the **first instant of the following month**, not an assumed final second of the current month. Do not solve this with 23:59:59 strings or text-only month matching.

## Two negative tests to catch stale or broken AI answers

**Test A: Move one paid line over the boundary.** Begin with a fresh copy and change R-05's timestamp from **2026-10-31 18:45** to **2026-11-01 00:01**, leaving status and amount unchanged. The source still totals 715. October Paid becomes **215** (five qualifying rows), October all-status becomes **365**, and November all-status becomes **280**. If AI retains 295, it has not refreshed its selection or has not processed the changed row.

**Test B: Change a valid day into an invalid day.** Restore original data, then change R-05's timestamp to **2026-10-32 18:45**. The string is not a valid date. Some DATE constructions normalize day 32 into the following month; that does not repair the underlying export. The round-trip TimestampCheck should show **CHECK** on R-05, and publication of the aggregate should be blocked. An independent Python datetime parser rejects that source text. No corrected date should be invented.

Always reset to the original fixture between tests. Negative tests should prove what controls reject, not manufacture a plausible updated report.

## Excel versus Google Sheets: check assumptions

Both products document **DATE**, **TIME**, **SUMIFS**, and **COUNTIFS**. Their syntax supports the approach above, but import configuration, automatic type detection, display formats, and regional separators may differ. For this exercise, we deliberately control input by preserving the timestamp column as text before constructing E.

In Excel, use a new sheet and make sure column B remains text before pasting/importing. In Google Sheets, similarly choose an import method that preserves raw timestamp strings, and inspect a test cell. Use the worksheet's ISTEXT function and the expected 16-character length as preconditions. A localized formula editor may use semicolons rather than commas; change function argument separators only, not source data.

Spreadsheet DATE and TIME may normalize invalid components. That is why this guide pairs conversion with an exact string round trip and a count of valid outputs. Neither a successful date display nor an AI explanation proves that every timestamp was valid.

Actual calculations for this article were executed in Python, not Excel or Google Sheets. Confirm results in the intended product before relying on an adapted formula for operational reporting.

## Final QA checklist

- [ ] Ten original records remain present, with unique RecordIDs.
- [ ] Timestamp column retains 16-character source text.
- [ ] ParsedTime is numeric for all ten rows and TimestampCheck shows ten OK values.
- [ ] Amount is numeric for all rows; original sum is 715.
- [ ] Business month, status filter and single local clock are documented.
- [ ] Lower boundary is inclusive; next-month start is exclusive.
- [ ] October Paid contains exactly six IDs totaling 295.
- [ ] September/October/November all-status totals reconcile to 715.
- [ ] Pending and Refunded rows are not silently counted as Paid.
- [ ] Zero Amount is retained as a valid qualifying value.
- [ ] Inclusive October 31 and inclusive November 1 traps produce 190 and 495.
- [ ] Both negative tests produce expected response or rejection.

## Official sources and testing scope

- [Microsoft Support — SUMIFS](https://support.microsoft.com/en-us/excel/functions/sumifs-function): summing rows meeting multiple criteria.
- [Microsoft Support — DATE](https://support.microsoft.com/en-us/excel/functions/date-function): construction of a date serial and out-of-range normalization.
- [Microsoft Support — TIME](https://support.microsoft.com/en-us/excel/functions/time-function): time-of-day fraction and normalization.
- [Google Docs Editors Help — SUMIFS](https://support.google.com/docs/answer/3238496?hl=en): multi-condition sums.
- [Google Docs Editors Help — DATE](https://support.google.com/docs/answer/3092969?hl=en): date creation and invalid day handling.
- [Google Docs Editors Help — TIME](https://support.google.com/docs/answer/3093056?hl=en): time construction and component handling.
- [Google Docs Editors Help — COUNTIFS](https://support.google.com/docs/answer/3256550?hl=en): matching-row counts.

**Executed test:** Python's CSV reader, datetime.strptime and Decimal independently verified ten records; all-status total 715; October eight rows and total 445; Paid six rows totaling 295; wrong inclusive bounds 190 and 495; mutation A October Paid 215 and all-status 365; and rejection of 2026-10-32. The official sources above were checked separately for spreadsheet function behavior.

**Not executed:** No real AI assistant's output, Excel or Sheets calculation engine, real transaction file, live monthly revenue benchmark, or GuideHollow website deployment was tested. The fixture and expected outputs are instructional controls, not claims of production results.
