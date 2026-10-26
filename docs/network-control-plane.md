# GuideHollow growth-ready central publishing architecture

**Current operational mode: MAIN_ONLY.** Only `emfls/guidehollow` and `guidehollow.com` are active. This document is an **advance design and validated registry**, not authorization to recreate deleted satellite repositories, buy domains, alter DNS or start publishing for them.

## What has been implemented now

- A strict, versioned `ops/network/sites.json` registry containing **only gh-main**; no deleted satellite appears as registered.
- `python scripts/network_control.py audit`: offline, read-only validation of site IDs, repos, allowed domains, uniqueness, publication caps and inactive expansion switches.
- `python scripts/network_control.py plan --slug future-example`: emits a **PLAN_ONLY** preparation checklist and proposed *disabled* site record; no filesystem writes and **no GitHub/Notion/DNS API requests**.
- `Future GuideHollow Network Readiness (read-only)` manual GitHub Actions workflow with `contents: read`, **no secrets**, no schedule, no publishing and no repo creation.
- Regression tests in CI that reject accidental enabled satellites, rogue domains, duplicate site identities, unknown registry keys (including secrets) and unsafe slugs.
- Current `notion-daily-publisher.yml` remains unchanged. Main's three KST daily slots, Notion approval, live Pages deployment checks and ledger are not routed through new experimental code.

## Central credentials: one trusted control plane, not copied secrets

When a new site is *approved* for activation, choose a central controller **in `emfls/guidehollow`** rather than copying the Notion integration token into each satellite repository:

| Credential or capability | Where it belongs | Scope |
| --- | --- | --- |
| `NOTION_API_TOKEN` | Existing **main repo GitHub Secret** | Access to relevant Notion site registry and approved editorial queue |
| `GH_APP_CLIENT_ID` | Future **main repo GitHub Variable** | Non-secret GitHub App client ID |
| `GH_APP_PRIVATE_KEY` | Future **main repo GitHub Secret** | Private key for a dedicated publishing GitHub App; **not yet created or registered** |
| GitHub App installation access token | Mint inside a future central publishing job | Short-lived, restricted to **one explicitly approved target repository** |
| Satellite `GITHUB_TOKEN` | Minted by Actions in the target repo for its own Pages workflow | Permissions narrowly limited to that site's deploy |
| `GUIDEHOLLOW_AUTO_PUBLISH` | Existing **main repo Variable** | Main's 09:17, 15:17, 21:17 KST schedule only |

The controller should fetch only the target's authorized and reviewed Notion content, write a content commit with a GitHub App installation token, trigger the target's own protected Pages workflow, verify that specific commit SHA and public article title/canonical/body, then update the Notion item and per-site ledger. No other site may be selected from a user-supplied URL or untrusted article text.

**GitHub Actions caveat:** A reusable workflow in one repository does **not** automatically receive that repository's Secrets when called from another. The caller supplies/inherits its **own** secrets. For a future centrally owned secret, the controller must execute in `emfls/guidehollow` (or migrate to an organization-owned security model). Never assume workflow reuse alone shares tokens.

GitHub supports the official `actions/create-github-app-token` action. A future implementation can restrict `owner=emfls` and `repositories=<approved-repository-name>`; request only necessary App permissions (initially repository Metadata read and Contents read/write; add Actions read/write only where verification or dispatch actually requires it). Avoid broad account PATs, copying the private key to satellite repositories or printing generated tokens. Short-lived installation tokens expire in around one hour; generate them close to use. Keep user control of GitHub App installation, access, and key rotation.

## Lifecycle gates before enabling each new site

1. **Business gate:** document target search audience, original tool/guide differentiation, expected maintenance cost, and criteria to retire a weak site. No automated 100-site creation.
2. **Manual repository existence:** a human explicitly creates/approves the target repository (if authorized). Do **not** bypass account repository-creation limits.
3. **Registry PR:** submit the target entry with `state=preparing`, `publisher=central`, `publication_enabled=false`, `daily_limit=0`, exact domain and Notion identity. Strict validation fails closed on rogue domains.
4. **Github App (future):** register and install an App on only the approved target repo. Give its private key once to central Secrets. Production code for token creation / dispatch must be separately implemented, reviewed and E2E-tested; it is **not present yet**.
5. **Build gate:** Astro Markdown site with independent design, working browser tools, unique reviewed original guides, and CI. Reuse content schema and audit rules, never blindly clone visual designs or mass-generate near-duplicate content.
6. **Deploy gate:** Actions Pages, exact commit SHA, correct CNAME, HTTPS 200, canonical and content check; leave Notion state as preparing until successful.
7. **Publish gate:** one independently approved Notion article, immutable per-site KST ledger, failed draft quarantine/requeue, idempotent finalization and manual end-to-end verification.
8. **Activation gate:** separate PR and explicit user approval for enabling a future site and enabling any central cross-repo publisher; owner confirms secrets and permissions.

This registry is **intentionally unable to activate a satellite**. The first real expansion is a separately reviewed engineering milestone; removing this safety mechanism should never be disguised as a routine doc/config update.

## What is not needed yet

No new Notion token, GitHub personal access token, GitHub App key, domain, DNS CNAME, scheduler or satellite repository is needed just to maintain this design. The production main publisher remains independent. GitHub does not guarantee cron exact-on-time delivery or a revenue outcome. Keep AdSense approvals and privacy/consent controls separate from posting automation.

## Operator checks (read-only)

```bash
python3 scripts/network_control.py audit
python3 scripts/network_control.py plan --slug example-future-site
python3 -m unittest discover -s tests -p 'test_network_control.py' -v
```

Relevant official references: [GitHub Apps installation token action](https://github.com/actions/create-github-app-token), [GitHub reusable workflow secrets](https://docs.github.com/actions/how-tos/reuse-automations/reuse-workflows), [GitHub App access tokens](https://docs.github.com/authentication/connecting-to-github-with-ssh/managing-deploy-keys).
