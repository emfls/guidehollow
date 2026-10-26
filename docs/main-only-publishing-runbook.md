# GuideHollow main-only automated article publishing

**Scope:** `emfls/guidehollow` (`gh-main`) exclusively. Satellite repositories, DNS, and EMFLS are out of scope. This change does not publish, edit existing article content, or activate unattended releases.

## Verified baseline (2026-10-26)

- The main site builds and deploys successfully from `main`, with published Markdown in `src/content/articles/`.
- Three existing main publication-ledger entries dated 2026-10-23 through 2026-10-25 remain `state=staged` even though the corresponding Notion pages were marked `발행완료`. **Do not reset those Notion pages or publish them again.** Their evidence must be reconciled against actual Pages deployment, canonical/body, relevant SHA, and Notion URL before changing the ledger.
- The Notion queue contains no new `gh-main` `발행대기` entries as of this audit. The publisher consumes *already approved* English articles; it does not generate new AI articles.
- A previous manual GitHub workflow completed with `success`, but all its publishing steps were skipped: this is a no-op, not a new article publication.

## Activation gate

1. Stop the retired satellite repo generator and scheduler. Do not change `emfls.github.io` or EMFLS.
2. Run `python scripts/notion_publish_daily.py preflight` locally, or dispatch **Main publisher readiness (read-only)** in GitHub Actions.
3. If `status=BLOCKED`, inspect the staged ledger, Notion item state, actual article file, successful deployed commit SHA, and public HTTPS page title/body/canonical. Preserve the original `kst_date`; reconcile under a reviewed PR with evidence, without silently rewriting or backdating it.
4. Ensure GitHub Actions secret `NOTION_API_TOKEN` has access to the exact Notion *main* site registry and shared article queue, `gh-main` remains `active`, and GitHub Actions workflow token has required main branch permissions. Never print the token.
5. Prepare a **new** editor-reviewed Notion article under `gh-main`: exactly one site relation, `검수승인=true`, `상태=발행대기`, valid category, slug, unique content, primary official HTTPS sources, reviewed date and future-or-today due date. Test through a **manual** run first. Verify the exact committed article and Pages deployment SHA, live canonical/body and finalized Notion properties.
6. Only after a genuinely successful end-to-end release and no unresolved ledger records, set GitHub Actions repository variable `GUIDEHOLLOW_AUTO_PUBLISH=true`. Before then leave it unset or `false`. The cron is 00:17 UTC (09:17 KST) and GitHub may delay the job. The publisher enforces one article per Asia/Seoul calendar day using its own ledger.
7. Check Actions and Notion state after the first scheduled release. Manually stop automatic publishing by setting `GUIDEHOLLOW_AUTO_PUBLISH=false`. The job is fail-closed; no unapproved items are generated or published.

**Known follow-up hardening:** The current `finalize` path marks Notion `발행완료` but does not itself persist `state=published` with deployment SHA into the repository ledger. The prior stage records demonstrate the gap. Before step 5, implement an evidence-bound, idempotent ledger finalization and recovery path in a separate reviewed PR. The preflight block deliberately prevents new releases while this gap exists.

## Post-pilot monitoring

Track source-revision drift, duplicate titles and slugs, KST daily limit, GitHub build and Pages deploy outcome, verified URL/canonical/body, Notion status, site-only scope, and Search Console organic impressions/clicks. Advertising is *not* automatically enabled by this workflow.
