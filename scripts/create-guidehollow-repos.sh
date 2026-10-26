#!/usr/bin/env bash
# GuideHollow repository bootstrap: cautious GitHub-first, never modifies EMFLS.
# --resume creates at most 1-3 missing GuideHollow repos per invocation.
# GitHub secondary rate limits may require a much longer cooldown.
set -euo pipefail

usage() {
  cat <<'HELP'
Usage:
  bash scripts/create-guidehollow-repos.sh --check slides
  bash scripts/create-guidehollow-repos.sh --create slides
  bash scripts/create-guidehollow-repos.sh --resume 2

--resume [1-3] picks the next missing names from the approved #04-#100
site plan, then creates no more than the requested number (default 2).
Run only AFTER any GitHub secondary rate-limit cooldown has expired.
Never re-run immediately after a 403/429, and do not schedule rapid retries.

Repositories remain README-only until website code is independently committed.
No DNS, Pages, Notion publisher, launchd, or EMFLS change is performed.
HELP
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then usage; exit 0; fi
mode="${1:-}"
if [[ "$#" -gt 0 ]]; then shift; fi
if [[ "$mode" != "--check" && "$mode" != "--create" && "$mode" != "--resume" ]]; then usage >&2; exit 2; fi
command -v gh >/dev/null || { echo 'GitHub CLI missing: https://cli.github.com' >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo 'Sign into gh first: gh auth login' >&2; exit 1; }
owner="$(gh api user --jq '.login')"
if [[ "$owner" != "emfls" ]]; then
  echo "Wrong GitHub account: $owner. Required: emfls" >&2
  exit 1
fi

if [[ "$mode" == "--resume" ]]; then
  if [[ "$#" -gt 1 ]]; then usage >&2; exit 2; fi
  batch="${1:-2}"
  if [[ ! "$batch" =~ ^[1-3]$ ]]; then
    echo 'Safety limit: --resume accepts only 1, 2 or 3.' >&2
    exit 2
  fi
  slugs=(
    slides forms drive calendar mail meetings pdf
    notes tasks bookmarks screenshots clipboard shortcuts focus file-manager
    backups printers scanning autofill browser-tabs extensions notifications
    text-input accessibility disk-space
    csv json regex data-charts power-bi looker-studio tableau sql sqlite
    airtable notion kpi survey-analysis data-cleaning data-anonymity
    file-encoding date-data data-export
    git github vscode terminal python javascript html-css rest-api
    http-status dns https static-hosting linux docker npm python-env
    github-actions web-performance
    account-security passkeys phishing privacy-controls wifi routers
    bluetooth headphones monitors iphone-storage android-storage
    iphone-settings android-settings smart-tv streaming family-tech
    lost-devices system-updates
    invoices estimates business-writing resumes interviews portfolios
    employee-onboarding meeting-minutes project-plans sops support-tickets
    help-centers customer-feedback professional-emails time-tracking
    expense-tracking pricing-calculators client-proposals
  )
  if [[ "${#slugs[@]}" -ne 97 ]]; then
    echo 'INTERNAL ERROR: expected 97 slugs.' >&2
    exit 1
  fi
else
  if [[ "$#" -lt 1 ]]; then usage >&2; exit 2; fi
  slugs=("$@")
  batch="${#slugs[@]}"
fi

# Read repository names just once instead of issuing 97 REST requests.
existing="$(gh repo list emfls --limit 1000 --json name --jq '.[].name')"
created=0
skipped=0

for slug in "${slugs[@]}"; do
  if [[ ! "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ || "$slug" == "main" ]]; then
    echo "Unsafe slug: $slug" >&2
    exit 2
  fi
  repo="emfls/guidehollow-$slug"
  short="guidehollow-$slug"
  if printf '%s\n' "$existing" | grep -Fxq -- "$short"; then
    skipped=$((skipped + 1))
    if [[ "$mode" != "--resume" ]]; then echo "EXISTS — $repo"; fi
    continue
  fi
  if [[ "$mode" == "--check" ]]; then
    echo "MISSING — $repo"
    continue
  fi

  echo "CREATING — $repo"
  # NEVER mask 403/429 errors. Stop immediately instead of hammering GitHub.
  if ! gh repo create "$repo" --public --add-readme --description "GuideHollow $slug — practical guides and tools"; then
    echo "STOP — GitHub refused repository creation; do NOT retry rapidly." >&2
    echo "If rate-limited, follow Retry-After or allow a longer cooldown." >&2
    exit 1
  fi
  created=$((created + 1))
  existing="$(printf '%s\n%s\n' "$existing" "$short")"
  echo "CREATED — $repo ($created of this batch)"
  if [[ "$created" -ge "$batch" ]]; then break; fi
  # Spacing reduces burst pressure but does not guarantee bypassing limits.
  sleep 120
done

echo "DONE — created=$created, already_present=$skipped"
if [[ "$mode" == "--resume" ]]; then
  echo 'Run a later batch only after an appropriate cooldown.'
fi
