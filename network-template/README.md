# GuideHollow network design master — copy #01, do not redesign

**Authority:** [#01 Main](https://github.com/emfls/guidehollow) is the golden master for **all** GuideHollow sites (#02–#100). This folder is a source snapshot of Main at commit `d97cb054d71119212656f64b750018911049543f` (2026-10-25). `reference/` contains exact, unmodified source copies for adaptation. **Do not serve this folder as site content.** Do not create a differently styled site. When #01 design changes, update and version the network snapshot in the same reviewed PR.

## The rule (user instruction, 2026-10-25)

1. **Exactly the same shared visual language**: #01's dark default, mint accent, typography and spacing, two-column terminal hero, header/menu/search/theme toggle, category grid, *article rows* rather than unrelated cards, guide prose/toc/source-note typography, tool section frame, footer, mobile navigation, keyboard focus and accessible semantics. Preserve responsive behavior at 360, 390, 768 and 1280 pixels.
2. **Exactly the same core file architecture**: Astro static site, Markdown `src/content/articles/*.md`, typed content collection in `src/content.config.ts`, `src/layouts/Base.astro`, `src/styles/global.css`, `src/scripts/site.ts`, `src/components/ArticleList.astro`, `src/pages/`, static SEO endpoints and GitHub Pages Actions.
3. **Exactly the same page shapes and routes**: home → search/category/featured guides → guide article with breadcrumbs, metadata, table of contents, actionable steps, sources and related guides → tools → About/Contact/Editorial/Privacy/Terms, RSS/sitemap/robots, 404. Site-specific slugs and existing canonical paths stay stable. On category or slug changes, retain old URLs where practicable and provide explicit redirect plan.
4. **Site-specific substitutions only**: name, domain, tagline, accurate subject-matter text, topic categories, guides, verifiable examples, original screenshot/diagrams where useful, and each site's distinct local-only tools. These are supplied via `src/config.ts`, Markdown articles and tool content; do *not* invent a separate color palette, home-card system, navigation shell or article layout. Replace AI-specific strings in copied Main reference with truthful domain-specific strings; maintain structural markup and CSS classes.
5. **Identical user interaction standards**: mobile menu and keyboard Escape, theme (including persistence), local search, breadcrumbs, article copy button, accessible headings, focus rings, readable code/tables and mobile TOC. No broken anchors, placeholders, or nonworking buttons.
6. **Identical production gates**: approved Notion site relation and article; per-site 1/day Asia/Seoul ledger; verified main SHA and Pages deploy; public URL, article body and canonical; Notion finalize only after verification. Fail closed on uncertainty. Existing EMFLS never touched.

## Conversion stages for previously prepared ZIPs

- Retrieve *real source ZIP* in its owning chat/Library. Do not claim to have migrated a ZIP without accessing and changing it.
- Map current pages, semantic classes, article slugs, tool behavior, policy pages and test fixtures. Retain all original verified guides, links and working tools.
- Copy this **actual** reference, then parameterize domain, titles, categories, article schemas and site-specific tool sections; port static JSON/HTML/Python articles into Markdown collection while preserving approved content.
- Retain script/data ledger schema or supply reviewed migration; change publisher source paths with regression tests. Do not enable a preparing publisher or launchd.
- Locally run `npm ci`, `npm test`, `npm run check`, `npm run build`; run real browser E2E on 360/390/768/1280, test search, theme, navigation, articles, code copy and unique site tools. For live repos, use a branch + PR; do not force-push or bulk replace.
- Compare screenshots against #01 desktop/mobile for shell and page templates, using *same* viewport, theme and UI states. Intentional differences must be explained by distinct content only.
- Record source ref, per-site commit SHA, tests, URL mapping, CI, and hosted Pages evidence in Notion. Keep `Content Format` as the real existing implementation until verified migration, and `Status` as the actual deployment state.

## Network status at time of decision

The common Notion registry initially contained 15 sites on 2026-10-25: `gh-main` and `gh-sheets` were on the Astro Markdown stack, but **Sheets still has a different visual design**. `gh-docs` is active on Python+JSON. The other twelve were preparing packages using diverse implementations (check up-to-date registry, as 5 production chats are working in parallel). **No site other than #01 has been certified visually identical yet.**

The source copies in `reference/` are *the same originals* as #01, not simplified approximations. New site projects can use the snapshot to make code identical in structure. Tested build and deployed visual equality for each site require separate proof.

## Ownership and safe rollout order

Start with #02 Sheets (live Astro but different UI), then #03 Docs (live JSON migration, keep publisher safe), then #04–#10 ready packages, then already created #11 Notes / #29 CSV / #47 Git / #65 Account Security / #83 Invoices and all additional new sites. Each of 5 owning chats performs conversion in its scope; general coordinator records acceptance. Do not recreate already written guides or overwrite the work of another chat.

Notion: [central tower](https://app.notion.com/p/403db4c0a991812c94dfca52dd40eb7f), [registry](https://app.notion.com/p/582a8b7b2abb410abfd515fcab76ae8a), [editorial](https://app.notion.com/p/402db4c0a99181fcac7fdc0e459763d0). Parent issue: [#17](https://github.com/emfls/guidehollow/issues/17).
