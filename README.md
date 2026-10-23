# GuideHollow

An independent English AI publication: **A clearer path through AI.**

Production domain: https://guidehollow.com · Repository: https://github.com/emfls/guidehollow

## Develop and verify

Node 24 LTS is recommended (minimum 22.23.4).

```sh
npm ci
npm test
npm run check
npm run build
npm run preview
```

`npm run build` validates generated pages, unique metadata, canonical routes, JSON-LD, article structure, RSS, sitemap, internal links and assets. Browser checks are recorded separately in `docs/verification.md`; no Lighthouse score is implied by a successful build.

The only direct production dependency is Astro. The site produces static HTML/CSS/JS in `dist/`; there is no backend, AI service, database or paid API. Search downloads a local full-text JSON index. No content is generated during builds.

## Site and content structure

- `src/config.ts`: brand, canonical domain, categories, verification IDs, advertising settings.
- `src/content/articles/*.md`: original English guides with schema-validated metadata.
- `src/lib/content.ts`: one publication filter shared by every public article surface.
- `src/layouts/Base.astro`: shared metadata, navigation, footer, theme initialization.
- `src/pages/`: pages, article routes, categories, tags, two tools, search, RSS, sitemap, robots.
- `src/scripts/`: small browser interactions; tool inputs are never sent to a server.
- `public/`: original SVG identity, PNG social image, CNAME, nojekyll marker.

Each article requires `title`, `description`, `slug`, `category`, `tags`, `publishedDate`, `updatedDate`, `sources`, `draft`, and `author`. The `featured` field is optional. Use ISO dates. Draft and future-dated entries are excluded from article pages, lists, tags, search, RSS, related links, and sitemap. Do not put unpublished material in `public/`.

Use categories `guides`, `ai-tools`, `prompts`, or `troubleshooting`. Slugs and tags use lowercase words separated with hyphens. Include meaningful steps, an illustrative example or prompt, limitations, troubleshooting, a summary, and official sources. The layout generates the table of contents, source list, related articles, and copy controls.

The initial 12 guides were prepared October 23, 2026 with AI assistance; examples are fictional and product benchmarks are not claimed. Update the article date when content materially changes. The editorial policy is public at `/editorial-policy/`.

## GitHub Pages deployment

Only the existing **emfls/guidehollow** repository is in scope. Never change `emfls/emfls.github.io` for this site.

1. Repository Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. Push to `main`, or dispatch **Build and deploy GuideHollow**.
3. The workflow installs with `npm ci`, runs tests and Astro checks, builds and validates `dist/`, then uploads and deploys using official GitHub actions.
4. The deploy job uses the `github-pages` environment and only `pages: write` and `id-token: write`; checkout/build use `contents: read`. Deployments are serialized for main. PRs validate without publishing.

The Astro settings are `site: https://guidehollow.com`, `base: /`, `output: static`, and `trailingSlash: always`. Do not add `/guidehollow/` to internal or canonical paths. The repository Pages URL is not intended to serve as a canonical fallback.

## Domain and DNS

First verify domain ownership in your GitHub account if not already done, then set **this repository's** Pages Custom domain to `guidehollow.com`. A CNAME file alone does not configure an Actions deployment's custom domain.

Required DNS records, based on [GitHub's official custom-domain documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site):

| Type | Host | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | emfls.github.io |

The CNAME target is the account's default Pages host; the content belongs to `emfls/guidehollow`. Do not redirect the domain to the existing EMFLS website. Avoid wildcard DNS. If you use AAAA records, use GitHub's official IPv6 records or remove conflicting values after reviewing their purpose.

GitHub normally redirects www to the apex when the domain and both DNS records are configured. Wait for domain checks and certificate issuance, then enable **Enforce HTTPS**. Verify HTTPS and redirect responses; do not treat a configured field as a working certificate. DNS providers and certificate issuance can take time.

## Search engine ownership

Set `site.verification.google` and/or `site.verification.bing` in `src/config.ts` using the actual verification tokens, then rebuild. Google Search Console domain-property verification uses the TXT record Google provides at your registrar instead. Submit `https://guidehollow.com/sitemap.xml` after the domain works. Neither verification nor sitemap submission guarantees indexing.

## AdSense

No publisher ID, ad request, ad unit, analytics service, or consent cookie is active by default. No approval is promised.

1. Set `site.ads.publisherId` to the actual `ca-pub-` plus 16 digits supplied by AdSense. This one setting enables the account verification meta tag and generates `/ads.txt` with `pub-…`, `DIRECT`, and Google's certification authority ID. No ads.txt is emitted while the ID is blank.
2. Review the operator identity, a private contact route, privacy notice, and applicable regional requirements. Configure a suitable consent platform before enabling advertising. For the EEA, UK and Switzerland, consult [Google's CMP requirements](https://support.google.com/adsense/answer/13554116).
3. Set `consentReady` only after the real CMP integration and consent behavior have been implemented and checked. This boolean is a release gate, not a CMP implementation.
4. Set `servingEnabled` only when the site is approved, your privacy notice reflects the actual integration, and consent handling is operational. It loads the AdSense script; review Auto ads settings in your account.
5. For manual units, supply an actual slot ID to `src/components/AdSlot.astro`. It emits nothing until the serving and consent gates and valid IDs are present.

The public contact route is the repository's enabled GitHub issue tracker. It requires a GitHub account and is public. No email address has been invented. Confirm a private route and operator details before inviting confidential privacy requests or submitting for monetization review.

## Moving hosts

Build and upload `dist/` to a static host. Keep the domain in config and Astro aligned. Configure the new host to return `404.html` with HTTP 404, set redirects and TLS, and retest. No GitHub runtime API is required by the site.

## Licensing

Public repository visibility does not grant a general reuse license. The site terms permit adapting practical prompt examples; broader code/content licensing remains an owner decision.

## AdSense readiness follow-up

See `docs/adsense-readiness-report.ko.md` for the current follow-up report, `docs/content-audit.ko.md` for the original 12-article review and five substantial updates, and `docs/adsense-setup.ko.md` for account verification, CMP/privacy release checks, contact setup, and Search Console steps. The library now contains 14 guides.

Set `site.contactEmail` only to an owner-confirmed public email. While it is empty, the site keeps the public GitHub issue route and clearly states its login/publication limits. A configured email reveals a mailto contact route and matching email-provider processing information in the privacy notice. This does not add a form or promise a response time.

Tag archives with fewer than two published articles remain usable and retain their URLs, but use `noindex, follow` and are omitted from the sitemap. This is an editorial threshold, not a Google rule. Tests cover the boundary and output consistency.
