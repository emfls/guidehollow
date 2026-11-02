# Public AdSense reviewer-entry smoke check (2026-11-02)

This is a **read-only post-deployment diagnostic**, not Google AdSense approval and not a replacement for a browser test. Google says a site needs unique, useful content and working navigation, and ownership verification must be present in public HTML.

Run manually from the repository with `node scripts/verify-public-readiness.mjs`. The existing GitHub Pages deploy job runs this after `actions/deploy-pages`, using `continue-on-error: true` so transient DNS, crawler blocks, CDN propagation or a temporary third-party outage will **not** stop scheduled publishing or convert a successful Pages deployment into a failed release. A failed step appears in Actions, and its paths appear in the run summary for investigation.

The script checks the canonical root domain and 16 public resources, including the home page, guides, About, Contact, Privacy Policy, Editorial Policy, Evidence Library, a complete article, an independent browser workbench, `robots.txt`, `sitemap.xml`, `ads.txt`, RSS, two original downloadable fixtures and an intentionally nonexistent URL (which must return 404). Each HTML page must expose the canonical link, public AdSense ownership meta, indexability and reader landmarks. It **does not load ads, submit a review, alter the AdSense account, collect personal data, or activate any publishing workflow**.

Four attempts account for ordinary Pages propagation lag, retrying only failed resources. No success is claimed unless the public HTTP response was inspected. A failed public check should prompt direct browser inspection; it does not automatically prove site downtime because some automation clients are blocked.

Official reference: https://support.google.com/adsense/answer/12176698?hl=en

There is no automatic AdSense approval test. Recheck account status under AdSense **Sites**, and treat policy-compliant content and indexability as ongoing editorial requirements.
