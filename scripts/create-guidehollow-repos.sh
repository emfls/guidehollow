#!/usr/bin/env bash
# Create GuideHollow GitHub repositories from an already authenticated Mac.
# Intentionally does NOT change DNS, Notion status, launchd, or EMFLS.
set -euo pipefail
usage() {
  cat <<'HELP'
Usage:
  bash scripts/create-guidehollow-repos.sh --check slides
  bash scripts/create-guidehollow-repos.sh --create slides
  bash scripts/create-guidehollow-repos.sh --create slides forms notes

Accepted names are site subdomain slugs, NOT full repo names. This script
creates emfls/guidehollow-<slug> with an initial README and default branch.
The --create action is explicit; --check never creates a repository.
Repos already present are skipped safely.

Only run on your own authenticated Mac with GitHub CLI installed and
gh auth status successful for GitHub owner emfls. This is a one-time
repository creation step. Subsequent site files can be committed directly
via the connected GitHub app when the new repository is authorized.
HELP
}
if [[ ${1:-} == "--help" || ${1:-} == "-h" ]]; then usage; exit 0; fi
mode="${1:-}"; shift || :
if [[ "$mode" != "--check" && "$mode" != "--create" || "$#" -lt 1 ]]; then usage >&2; exit 2; fi
command -v gh >/dev/null || { echo 'Install GitHub CLI first: https://cli.github.com' >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo 'GitHub CLI is not signed in; run: gh auth login' >&2; exit 1; }
owner="$(gh api user --jq .login)"
if [[ "$owner" != "emfls" ]]; then
  echo "Wrong GitHub identity ($owner). Refusing to create repositories outside emfls account." >&2
  exit 1
fi
for slug in "$@"; do
  if [[ ! "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
    echo "Invalid subdomain slug: $slug" >&2
    exit 2
  fi
  if [[ "$slug" == "main" || "$slug" == "emfls" ]]; then
    echo "Refusing reserved slug: $slug" >&2
    exit 2
  fi
  repo="emfls/guidehollow-$slug"
  if gh repo view "$repo" --json nameWithOwner >/dev/null 2>&1; then
    echo "EXISTS — $repo"
    continue
  fi
  if [[ "$mode" == "--check" ]]; then
    echo "MISSING — $repo (would create only with --create)"
  else
    echo "CREATING — $repo"
    gh repo create "$repo" --public --add-readme \
      --description "GuideHollow $slug — independent English practical guides and tools"
    gh repo view "$repo" --json nameWithOwner,defaultBranchRef --jq \
      '{repository: .nameWithOwner, default_branch: .defaultBranchRef.name}'
    echo "CREATED — $repo; NOTE: no Pages/DNS/Notion publisher deployed yet"
  fi
done
