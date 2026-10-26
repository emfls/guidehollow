# Local credentials for GuideHollow Main

This is a **single-site** deployment. The existing `emfls/guidehollow` GitHub Actions publisher reads one external secret: `NOTION_API_TOKEN`. It already completed a real Notion-to-Pages release, so the GitHub repository had an operational token. **GitHub Secrets persist; no need to enter them again for every article or every workflow run.**

## Optional local backup and setup

From your local clone of `emfls/guidehollow`:

```bash
bash scripts/manage-local-credentials.sh status
bash scripts/manage-local-credentials.sh save   # optional, enter token without echo
bash scripts/manage-local-credentials.sh sync   # ONLY when intentionally registering/rotating
```

The token stays in `<repo>/.local-secrets/notion.token` (directory 0700, file 0600). `/.local-secrets/` is ignored by Git. **It is plain text, not encryption**. Prefer macOS Keychain if you do not need a local file. Use full-disk encryption and avoid cloud-synced or shared folders. Never paste the token into a chat, GitHub commit, issue, PR, or terminal command-line argument; never force-add the ignored file.

Cloud-hosted GitHub Actions **cannot read the local Mac file**. `sync` securely supplies its bytes on stdin to `gh secret set`; then Actions reads `secrets.NOTION_API_TOKEN` as usual. Running `sync` unnecessarily may overwrite an already working GitHub secret.

## Other credentials

| Credential / variable | What to do |
| --- | --- |
| `GITHUB_TOKEN` or `github.token` | Automatically minted for each GitHub Actions job; no separate personal access token needed. |
| `GUIDEHOLLOW_AUTO_PUBLISH` | Non-secret GitHub repository variable. Set once to `true` for daily 09:17, 15:17, 21:17 KST. Set `false` to stop scheduled publishing. |
| `NOTION_QUEUE_ID`, `NOTION_SITE_PAGE_ID` | Existing public IDs already defaulted in `scripts/notion_publish_daily.py`; no secret needed. |
| AI generation provider API key | Not needed for the current pre-approved Notion-to-GitHub publisher. If AI generation is explicitly introduced later, use a *separate* narrowly scoped repository secret, not this Notion token. |
| Google site verification, AdSense publisher ID | Do not store as a private Notion token; they are managed through site configuration/DNS and ad controls. |

Check the GitHub **secret names** without revealing their values:

```bash
gh secret list --repo emfls/guidehollow
gh variable get GUIDEHOLLOW_AUTO_PUBLISH --repo emfls/guidehollow
```

If a Notion token expires, is revoked, or loses access, rotate it in Notion and intentionally use `rotate` followed by `sync`. Confirm it has access to the GuideHollow main site registry, shared editorial queue and page contents.
