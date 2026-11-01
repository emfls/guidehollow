# Direct browser evidence — GuideHollow, 2026-11-01

This document records an **actual browser agent's interaction with the public production website**, not a reconstructed transcript or an invented demonstration. The source datasets are deliberately fictional. A browser visit to GuideHollow's own utilities **is not** a test of ChatGPT, Excel, Google Sheets, external model accuracy or production merchant transactions.

## Environment and reproducibility

- Website: `https://guidehollow.com/`
- Date of execution: November 1, 2026
- Interface: publicly available web app; browser automation operated the actual page, clicked UI controls, edited CSV text and read feedback
- Browser/OS/viewport: not reliably recorded by the browser-agent report; **do not infer browser compatibility**
- Data: the published `/examples/weighted-price-sample.csv` and `/examples/claim-boundary-audit.csv`, **invented for teaching**
- Structured observations: [firsthand-browser-qa-2026-11-01.json](https://guidehollow.com/examples/firsthand-browser-qa-2026-11-01.json) (the link is relative to the public website)
- Original browser executions: [price workbench run](https://agent.tinyfish.ai/runs/6c7255f0-7df2-46fb-be53-b5df638d8d38), [source-claim UI run](https://agent.tinyfish.ai/runs/25bc82f0-a7ad-4557-8f24-7269ac707534). Visibility may depend on the browser service. The JSON preserves key observations independently of those links.
- No user data was uploaded, purchases made or authenticated sessions used.

## Trial A — Original CSV and reconciliation

Opened `/tools/weighted-price-checker/`, left its eight-row sample unchanged and clicked **Calculate and audit**.

| Output visible on the real page | Observed |
| --- | ---: |
| Valid rows | 8 |
| Total sold units | 27 |
| Total revenue | 530.00 |
| Weighted revenue per sold unit | 19.63 |
| Arithmetic mean of eight listed prices | 153.25 |
| Web channel | 7 units, 280 revenue |
| Store channel | 20 units, 250 revenue |
| Zero-unit line | L-106 |
| Zero-price line | L-107 |

The 999 listed price on L-106 has zero sales units; therefore the simple mean 153.25 is not the revenue-weighted selling price. This is an observed result of the site's browser utility, and can be reconciled independently from the public fixture.

## Trial B — Change one quantity

Changed **only** `L-102,Web,4,25` to `L-102,Web,40,25` and recalculated in the public UI. The results shown were:

- 63 units, 1,430.00 revenue, 22.70 weighted price.
- Listed-price simple mean **unchanged at 153.25**.
- Web: 43 units, 1,180.00 revenue. Store: 20 units, 250.00 revenue.

Why: raising the quantity by 36 adds 36 units and 900 revenue. The simple mean ignores quantities; the weighted result changes. The observed result matches `1430 / 63` rounded to two decimal places.

## Trial C — Missing price must fail rather than silently become free

Restored the sample and replaced `L-107,Store,5,0` with `L-107,Store,5,`. Submitted via **Calculate and audit**.

The actual page displayed the error:

> Row 8: UnitPrice must be a nonnegative number; blanks are not zero.

Its summary was **“No result: correct the input and try again.”** The browser report confirms that prior successful summaries, channel tables and row tables were removed. This protects against a subtle usability problem: a user should never mistake stale values for results derived from a new invalid input.

## Trial D — Source Claim Verifier, unresolved input attribution

Opened the original 5-case set on `/tools/claim-checker/`. The browser loaded the complete fictional `GARDEN`, `RELEASE` and `EVENT` source notes, showed case-level feedback and switched cleanly to all 22 questions.

The **written automation plan** specified G04=SUPPORTED (deliberately wrong), G06=CONTRADICTED, G09=SUPPORTED, R02=CONTRADICTED and E06=SUPPORTED (the other four are reference matches). The visible final browser score was **“1 of 5”**, not 4/5. The G04 explanation correctly said the location was not confirmed.

**We did not capture a reliable before-submit snapshot of the checked radio input values.** Therefore we cannot tell whether the automated browser selected one option per question or whether the UI mis-scored a correctly filled form. The result is **inconclusive, not evidence of 1/5 accuracy**. A source-level scoring regression test independently verifies that the five intended values score **4/5**.

### Remediation and limits

Following this run, the web UI was changed to (a) assign each radio a unique case+verdict accessible label, (b) display how many claims are selected, and (c) block grading until every question has a selection. Those are usability protections, not retroactive evidence that the earlier browser score was caused by a specific defect. A separate **post-fix live-browser smoke test** was subsequently performed. It loaded all five questions, selected only G04=SUPPORTED, and displayed **“1 of 5 claims answered”** before submitting. Clicking Check displayed **“Only 1 of 5 claims answered. Select a verdict for every claim before grading.”** It showed no score or feedback, and the selected option had the unique accessible label **“G04: Supported by the notes”**. [Inspect the observed browser run](https://agent.tinyfish.ai/runs/ff9a4360-9346-42d2-8d0d-bcf09beeb690). This directly verifies the incomplete-answer guard after deployment; it does **not** retest all five selected answers or resolve the earlier automated-selection discrepancy.

## What these tests do and do not establish

They do establish that real users can run GuideHollow's own public weighted-price tool, observe the listed results and trigger a descriptive validation error. They also identify a concrete ambiguity in an automated use of the source-claim tool and document the engineering response.

They do **not** establish that ChatGPT generates correct formulas, that commercial spreadsheet applications behave identically, that the exercises reflect real revenue, that the site works on all browsers, or that Google AdSense will approve the site.

The relevant source tests are [weighted-price.test.mjs](https://github.com/emfls/guidehollow/blob/main/tests/weighted-price.test.mjs) and [firsthand-browser-findings.test.mjs](https://github.com/emfls/guidehollow/blob/main/tests/firsthand-browser-findings.test.mjs).
