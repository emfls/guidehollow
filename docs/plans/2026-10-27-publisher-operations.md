# Main publisher operations plan

Scope: existing main publisher and read-only monitoring; no content, ledger, Notion or advertising mutation. Keep cron 09:17/15:17/21:17 KST and 3/day cap.

1. Reuse current fail-closed publisher, ledger, typed Notion reader and exact-SHA deployment checks. Investigate #40379949004 and record evidence separately from inferred nominal schedule time.
2. Add a shared timing policy: scheduled runs may select/commit only within 60 minutes of their cron occurrence, on its KST date. Bind to the original run creation timestamp; reject scheduled reruns and missing timing evidence. Manual dispatch remains explicit current-day operation. Recheck after candidate validation and before push.
3. Emit a versioned operational receipt and real Actions Summary on every publisher outcome, including empty queue, late skip, guarded duplicate and failure. Keep artifacts for run/attempt reconciliation.
4. Add an hourly and workflow-completion read-only monitor. Compare expected slots, run receipts, Notion main completion/in-progress metadata, ledger and current successful Pages deployment/commit ancestry. Unknown/missing/expired evidence remains unknown, never zero/success. A successful workflow without publication proof is not publication success.
5. Use Actions Summary plus a failing monitor job for incident notification. Do not create Issues or send email; no Issue duplicates or Issue write permission. Document native GitHub email settings and same-provider monitoring blind spot.
6. Add isolated Python and workflow regressions, run all Python/JS/check/build checks, create a new PR and verify CI. Do not merge, deploy, dispatch a real publisher, or repair production records.

Implementation choices made by the engineer: Python standard library, existing GitHub CLI and Notion helper; 60-minute maximum admission delay, 15-minute delayed-warning threshold, hourly observer (publisher cron unchanged). The monitor never retries publication or edits completion state. Data discrepancies require evidence-bound manual review.
