# GuideHollow verification record

Date: October 23, 2026 (Asia/Seoul).

## Local checks completed

| Check | Result | Evidence / scope |
| --- | --- | --- |
| `npm install` | PASS | Initial dependency installation |
| `npm ci --no-fund --no-audit` | PASS | Clean lockfile installation; an initial transient ENOTEMPTY with a .DS_Store in a dependency directory was resolved by rerunning |
| `npm test` | PASS | 4 tests: empty goal, prompt formatting/untrusted text, review summary, full publication fixture |
| `npm run check` | PASS | 0 errors, 0 warnings, 0 hints |
| `npm run build` | PASS | Astro static build and generated-output assertions |
| Generated HTML | PASS | 41 HTML files; one H1 and unique title/canonical/description on each |
| Internal routes, assets, fragments | PASS | 1,212 checked link/asset references, including in-page headings |
| Public content | PASS | 12 original guides, approximately 680–780 words each including prompts and headings; no unpublished launch guides |
| Categories | PASS | All article categories contain content; Tools has two working utilities |
| Search index | PASS | 12 article bodies and 2 tools; unique public URLs |
| Publication regression | PASS | Disposable build with a renamed Start Here slug, a 13th published guide, a draft, and a future-dated guide; draft/future sentinel text excluded from generated HTML/JSON/XML/text |
| Structured data | PASS | JSON parsed; organization, website, article and breadcrumb data present where applicable |
| RSS and sitemap | PASS | XML parsed; article counts agree, sitemap links resolve; no search or 404 URL in sitemap |
| Default ads | PASS | No ad requests, fabricated publisher ID, ad unit or ads.txt |

## Real browser checks completed

Ego Lite Chromium, local static preview at `http://127.0.0.1:4321`.

- Homepage search submission and full-text results (query: spreadsheet).
- Ctrl/Cmd+K focuses search; unmatched and HTML-like search input remain text.
- Prompt Builder: required empty goal, all five fields, output, copy success, TXT downloaded and content checked, reset clears inputs/output and disables actions.
- Response checklist: all six checks set progress to 6; reset returns to zero and removes every check.
- Article prompt copy button reports successful clipboard write.
- System light theme, explicit dark theme, preference after reload, and storage-denial resilience.
- Mobile homepage, article and Prompt Builder at 390px: scroll width equals viewport width; screenshots visually inspected.
- Desktop light and dark homepage layouts visually inspected (including 1440px dark capture).
- Mobile Menu toggles aria-expanded/navigation; Escape closes it.
- `prefers-reduced-motion: reduce` checked; no decorative animation is required.
- Basic semantic inspection across 39 sitemap routes: no unnamed links/buttons, unlabeled fields or missing main/header/footer landmarks.
- Unknown URL renders the designed 404 page in the preview.

These are basic semantic and representative browser checks, not a full WCAG audit or a screen-reader certification. No Lighthouse score was measured. Other browser engines, actual mobile devices, and live Excel execution were not tested.

## Independent review and corrections

A separate read-only reviewer found two maintenance issues: a fixed launch article count in output verification, and an assumption that all Start Here selections remain public. Both were fixed and the failing reproduction was converted into the passing disposable publication regression. Advertising assertions now follow site configuration instead of permanently forbidding future legitimate integration.

Explicit editorial links to a withdrawn article must still be updated; the link validator deliberately blocks a broken publication rather than silently leaving a dead link.

## Hosting and contact setup

- Existing public repository `emfls/guidehollow` confirmed empty before implementation; admin/push permission confirmed.
- No other EMFLS repository was modified.
- GitHub Issues is enabled; `/contact/` links to its public issue submission route. No email was invented.
- Existing apex A records matched the four official GitHub Pages IPs; `www` CNAME already pointed to `emfls.github.io`. No registrar records were changed.
- Pages enabled with build_type `workflow` and custom domain `guidehollow.com`.
- GitHub reported an approved certificate for guidehollow.com and www.guidehollow.com; HTTPS enforcement enabled.

## Owner setup still needed

1. Review operator identity and choose a private contact channel if accepting confidential correspondence. Public GitHub issues are the current contact route and require a GitHub account.
2. Add genuine Google/Bing ownership verification values (or the Search Console TXT record supplied by Google); submit `/sitemap.xml` after confirming the public domain.
3. Supply the genuine AdSense Publisher ID in `src/config.ts`. This generates the account meta tag and ads.txt, without turning on ads.
4. Before ad serving, review the policy pages, implement the actual applicable consent platform, verify its behavior, and only then release the serving/consent gates. The gates are not a CMP implementation.

## Production evidence

Verified October 23, 2026, approximately 20:24–20:25 KST.

- Implementation commit: `ae746e0a6eac6962e4fed358ad99472ad362ff8a` on `main`.
- GitHub Actions run [39945686611](https://github.com/emfls/guidehollow/actions/runs/39945686611): build **success**, deploy **success**. The CI executed npm ci, tests, Astro check and the validated build before uploading dist.
- `https://guidehollow.com/`: HTTP 200 with a valid TLS certificate and GuideHollow content.
- `https://www.guidehollow.com/`: HTTP 301 → `https://guidehollow.com/`.
- `http://guidehollow.com/`: HTTP 301 → `https://guidehollow.com/`.
- 52 production HTML/assets/feed/index responses: HTTP 200 and SHA-256 identical to the local dist files. This includes all 41 HTML files, stylesheet, tool scripts, SVG/PNG assets, RSS, sitemap, robots and the search index.
- Unknown path: HTTP 404 and the custom GuideHollow error page. `/ads.txt` also returns 404 as intended without a publisher ID.
- Browser: live homepage metadata/styles loaded; privacy search returned five results; Prompt Builder generated and copied text; checklist updated to 1 of 6.
- Root canonical is `https://guidehollow.com/`; article and other canonicals use the same domain without the repository base path.

No DNS purchase/provider account was used or changed. No Google Search Console, Bing, or AdSense account setting was changed. Search indexing, AdSense approval, and future consent behavior remain unverified.
