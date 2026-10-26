# GuideHollow main-only publishing — three daily slots

**Repository:** `emfls/guidehollow` (Notion site `gh-main`). No satellite projects or EMFLS jobs are included.

## Times (Asia/Seoul)

| Slot | KST | UTC cron |
| --- | --- | --- |
| Morning | **09:17** | `17 0 * * *` |
| Afternoon | **15:17** | `17 6 * * *` |
| Evening | **21:17** | `17 12 * * *` |

The times are spaced six hours apart for manageable editorial operations, **not a claim of improved search ranking**. GitHub's scheduled jobs may be delayed or dropped. The publisher creates **at most one article per slot, three articles per KST date**, using the persistent publication ledger. Manual workflow dispatches also count toward the same daily limit by occupying the first available slot.

The existing activation flag is the GitHub Actions **repository variable** `GUIDEHOLLOW_AUTO_PUBLISH=true`. If absent or `false`, the scheduled job skips; manual dispatch still works. Never store a Notion token in this variable: the token belongs only in `NOTION_API_TOKEN` secret.

## What the automated publisher actually does

The publisher **does not write articles or approve them with AI**. It selects English Notion entries having `상태=발행대기`, `검수승인=true`, exactly one `gh-main` relation, and a due date no later than today's KST date. Other sites' entries and drafts without approval are ignored.

At each allowed slot:

1. Check `gh-main` in Notion has `Daily Limit=3`; confirm no unresolved `staged` ledger entry, unknown state, previously used slot or daily cap.
2. Run baseline tests/build **before** selecting an article, so broken shared infrastructure does not falsely fail individual drafts.
3. Walk the queue by `발행순서`, skipping not-yet-due articles. Review structural metadata, source URLs, Markdown blocks, minimum substantial length, duplicate slugs/Notion IDs, and real Astro content check/build for each candidate.
4. On **candidate-specific** validation or build failure, delete the rejected local draft, PATCH its Notion status to **`실패`** with the reason in **`오류`**, then try the next approved/due item in the **same slot**. Stop after 20 rejected candidates to keep execution bounded. A failed draft does **not** consume a daily publication slot.
5. For the first validated article, stage one source file plus one JSONL ledger row with `kst_date`, `slot`, and `state=staged`. Mark the selected Notion item `발행중` and clear its old `오류`. Test, commit without forcing, deploy GitHub Pages, verify the exact article commit SHA and live title, canonical and body, then set Notion `발행완료` with URL and GitHub commit.
6. Persist `state=published` to GitHub ledger in an additional non-force commit. If this cannot complete, later releases block until evidence-bound recovery.

### Retrying a previously failed article

An editor opens the Notion item, reads `오류`, fixes the actual title/body/sources/slug or unsupported blocks, checks it again, and explicitly changes `상태` **`실패 → 발행대기`**. Preserve the `gh-main` relation and explicit `검수승인`. At the next unused release slot it re-enters the sorted queue according to `발행순서`. The publisher clears the old error once that corrected article passes validation and is staged.

**Do not automatically retry a failed draft unchanged.** A human must review and requeue it. This is different from an infrastructure fault; see below.

### Infrastructure and partially published errors

Notion API outages, rate limits, token/permission issues, missing npm, timeouts, GitHub push/deploy problems and uncertain post-commit publication results are **not** safe article-specific failures. Stop instead of changing a possibly published article to `실패` or publishing a second article. The preflight ledger blocks further releases when a `staged` record remains until its public deployed SHA/Notion state is reconciled. Never delete the ledger or force-push to clear this condition.

## Activation and observation

After the reviewed PR merges and GitHub Pages succeeds, the operator can enable three scheduled slots with:

```bash
gh variable set GUIDEHOLLOW_AUTO_PUBLISH --body true --repo emfls/guidehollow
gh variable get GUIDEHOLLOW_AUTO_PUBLISH --repo emfls/guidehollow
```

Turn off automated posting immediately with:

```bash
gh variable set GUIDEHOLLOW_AUTO_PUBLISH --body false --repo emfls/guidehollow
```

Manual E2E launch:

```bash
gh workflow run notion-daily-publisher.yml --repo emfls/guidehollow --ref main
```

Check GitHub Actions, the Notion `상태` and `오류`, commit and exact deployed SHA, and the repository `data/guidehollow-publication-ledger.jsonl`. The daily capacity is a **maximum, not a promise**: without enough genuinely reviewed and due articles the job emits `QUEUE_EMPTY`; it never invents or publishes unapproved content. Ad serving remains separately disabled pending consent/ad readiness.

Legacy rows dated 2026-10-23 to 2026-10-25 were previously reconciled in a verified manual-only workflow; the main 2026-10-26 JSON tutorial passed the full real Notion→Pages→ledger E2E.
