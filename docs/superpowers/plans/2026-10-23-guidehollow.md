# GuideHollow Implementation Plan

**Goal:** Deliver an original English AI publication and two browser-local tools at https://guidehollow.com using the existing emfls/guidehollow repository.

**Architecture:** Astro static pages, validated Markdown content collections, shared SEO/layout components, plain CSS and small browser scripts. No backend, AI API, analytics, or advertising requests at launch.

**Tech Stack:** Astro 7, TypeScript, Markdown, Node test runner, GitHub Pages Actions.

**Spec:** User's supplied “GUIDE HOLLOW — CODEX 통합 구현 지시서”, 2026-10-23. User explicitly requests autonomous implementation in this session, without intermediate design approval.

## Global constraints
- Existing emfls/guidehollow only; no other EMFLS project changes.
- en-US, https://guidehollow.com, base /, output static.
- Minimum 12 substantive original sourced guides, dated 2026-10-23.
- No fabricated IDs, contacts, experiences, rankings, or deployment results.
- Ads disabled until the publisher and consent setup are confirmed.

## Scope and file map
- `src/config.ts`: brand, categories, verification and ad configuration.
- `src/content.config.ts`, `src/content/articles/*.md`: schema and original content.
- `src/layouts/Base.astro`, `src/components/*`, `src/styles/global.css`: navigation, SEO, accessible presentation, article lists.
- `src/pages/*`: home, categories, articles, search, tags, information, tools, feeds, sitemap, robots, ads and 404.
- `src/scripts/*`, `src/lib/tools.ts`: browser behavior and pure prompt/checklist logic.
- `tests/*`, `scripts/verify-build.mjs`: behavior and generated-output checks.
- `.github/workflows/deploy.yml`, `public/*`, `README.md`: deployment, independent brand assets and owner setup.

## Review focus
- Untrusted prompt/search text must remain text, never executable HTML.
- Draft/future entries must not reach pages, feeds, search, related links or sitemap.
- Empty fields, whitespace and resets must produce predictable tool output.
- Theme storage denial must not break other interactions.
- Custom domain, valid HTTPS and www redirect require external verification.

## Tasks
- [ ] Write and run failing behavior tests for prompt formatting, input validation and checklist summary.
- [ ] Implement the two tools and shared navigation/theme/copy/search behavior.
- [ ] Build validated article collection, all required pages, tags and full-content static search.
- [ ] Research official sources and write 12 distinct guides with actionable examples and limitations.
- [ ] Add semantic metadata, source attribution, feeds, sitemap, robots, gated ads configuration and policies.
- [ ] Run install, tests, type check, build and comprehensive output/link checks.
- [ ] Inspect desktop/mobile in browser and exercise search, copy, download, reset, checklist, theme and menu.
- [ ] Commit and push; enable Pages Actions and custom domain where authorized; inspect workflow and public responses.
- [ ] Record verified results and remaining owner actions in Korean.
