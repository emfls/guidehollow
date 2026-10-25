# GuideHollow 100-site publishing standard

**User-confirmed scope: standardize the publication system and article format, NOT site design.**

## What remains independent
Each GuideHollow site has its own styling, layout, hero, color palette, typography, topic navigation, brand visuals, specialist guides, and tested browser-only tools. Reuse a design only when a site's editorial requirements actually justify it; no visual parity requirement exists.

## Common publishing format
1. **Astro + Markdown:** site content written as UTF-8 Markdown in `src/content/articles/*.md`, with an Astro content collection and static HTML build. The published site is deployed to GitHub Pages. Existing preparing packages may need source migration; do not merely relabel their Notion `Content Format`.
2. **Common frontmatter field names:** `title`, `description`, `slug`, `category`, `tags`, `publishedDate`, `updatedDate`, `sources`, `author`, `draft`, `featured`, and a `notionPageId` binding when the publisher imports from Notion. Each site's **category values remain independent**; `sources` provide title and HTTPS URL, and any site-specific `verification` text remains available. Content and slug validation must be site-aware.
3. **Notion:** use the network site registry, shared article queue and linked quality record. Before publication verify the site relation/ID, article identity, approval, due time in Asia/Seoul, source provenance, duplicate slug/content and edited revision. Never select an article for a different site.
4. **Daily state:** independent per-site one-article-per-KST-day ledger and idempotent stage/resume. Never discard, recreate or backdate existing staged or published ledger entries. Treat manual review or reconciliation as required when a run has partially staged or deployed.
5. **Release:** stage content, commit exact source and ledger, execute full build and tests, explicitly dispatch Pages if needed, verify the deployed run has the expected commit SHA and live page body/canonical, then finalize Notion and publication accounting. Fail closed on missing authority, ambiguous deployment, or partial failure.
6. **Repo-local isolation:** each site has independent GitHub repository, Pages source, `CNAME`, publisher secrets, deployment pipeline and launchd opt-in. Do not add preparing sites to enabled scheduling before end-to-end validation. EMFLS and cron-job.org remain separate and untouched.

## New site delivery: GitHub-first, not ZIP-first
- Verify Notion site ID and repository availability to avoid collisions.
- **Create the actual repository** under `emfls` through an authorized GitHub account workflow. Current GitHub connector can edit/create files, branches and PRs in existing repositories but does NOT expose a new-repository creation action.
- Once a repository exists and this GitHub integration can access it, directly commit the original Astro website, scripts, Markdown articles, tests, Github Actions and SEO files to GitHub via repository tools. ZIP bundles are optional backups, not the primary deliverable.
- If repository creation is unavailable in-chat, obtain account authorization through supported browsing/Work, or use one-time `gh repo create emfls/<slug> --public` from the owner's authenticated Mac. Do not say a repository exists until GitHub verifies it; no invented deployment or domain success.
- Keep `Status=preparing` until GitHub Pages, DNS/HTTPS, tested browser journeys and one legitimate Notion article publication have been independently verified.

## Design correction and history
The previously merged UI-copy snapshot (PR #18) was introduced under an incorrect interpretation and is reverted by the publishing-only correction PR. The unrelated site production files and working design are not touched. The unmerged #02 Sheets redesign PR #24 was closed. Future chats should not copy `global.css`, `Base.astro` or the homepage merely to match Main.

Approved engineering changes must preserve existing permalink/canonical maps, verified unique tutorials, reader-first content, accessibility and unique tools, with reviewed CI in operating repos.

Notion: [central tower](https://app.notion.com/p/403db4c0a991812c94dfca52dd40eb7f), [site registry](https://app.notion.com/p/582a8b7b2abb410abfd515fcab76ae8a), [editorial standard](https://app.notion.com/p/402db4c0a99181fcac7fdc0e459763d0).
