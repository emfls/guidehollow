#!/usr/bin/env bash
# GuideHollow main-only Notion credential helper. Never stores secrets in Git.
set -euo pipefail
REPO='emfls/guidehollow'
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
DIR="$ROOT/.local-secrets"
FILE="$DIR/notion.token"

usage() {
  cat <<'HELP'
Usage: bash scripts/manage-local-credentials.sh [status|save|sync|rotate]
status   See if a local token file / GitHub secret name exists (no values).
save     Save a Notion token only in local, ignored .local-secrets/notion.token.
sync     Explicitly update main GitHub Actions secret from the local file.
rotate   Replace the local token; sync separately to change GitHub secret.
HELP
}
check_local_security() {
  if [[ -L "$DIR" || -L "$FILE" ]]; then
    echo 'Refusing symlinked local secrets path.' >&2; exit 1
  fi
  if [[ -e "$FILE" && ! -f "$FILE" ]]; then
    echo 'Refusing non-regular token file.' >&2; exit 1
  fi
}
check_gh() {
  command -v gh >/dev/null 2>&1 || { echo 'Install the GitHub CLI first.' >&2; exit 1; }
  gh auth status >/dev/null || { echo 'Run gh auth login first.' >&2; exit 1; }
}
save_token() {
  local mode="$1" token='' temp
  check_local_security
  if [[ "$mode" == save && -f "$FILE" ]]; then
    echo 'Local Notion token is already saved. No changes; use rotate if needed.'
    exit 0
  fi
  [[ -t 0 ]] || { echo 'Use an interactive local terminal.' >&2; exit 1; }
  umask 077
  mkdir -p -- "$DIR"
  chmod 700 -- "$DIR"
  printf 'Enter Notion integration token (hidden): ' >&2
  IFS= read -r -s token
  printf '\n' >&2
  if [[ -z "$token" || "$token" == *$'\r'* || "$token" == *$'\n'* ]]; then
    echo 'Missing or malformed token, no changes made.' >&2
    unset token
    exit 1
  fi
  temp="$(mktemp "$DIR/.notion-token.XXXXXXXX")"
  chmod 600 -- "$temp"
  printf '%s' "$token" > "$temp"
  unset token
  mv -f -- "$temp" "$FILE"
  chmod 600 -- "$FILE"
  echo 'Token saved only on this Mac. GitHub secret is unchanged.'
}
case "${1:-status}" in
  status)
    check_local_security
    if [[ -f "$FILE" ]]; then
      echo "Local token file exists: $FILE (value hidden)"
    else
      echo 'No local token file; not needed for existing GitHub Actions publishing.'
    fi
    check_gh
    if gh secret list --repo "$REPO" | awk '$1 == "NOTION_API_TOKEN" { found=1 } END { exit !found }'; then
      echo 'GitHub Actions NOTION_API_TOKEN: registered (value cannot be read).'
    else
      echo 'GitHub Actions NOTION_API_TOKEN: not listed or inaccessible.'
    fi
    if gh variable get GUIDEHOLLOW_AUTO_PUBLISH --repo "$REPO" >/dev/null 2>&1; then
      echo 'GitHub Actions GUIDEHOLLOW_AUTO_PUBLISH: variable exists.'
    else
      echo 'GitHub Actions GUIDEHOLLOW_AUTO_PUBLISH: variable is absent.'
    fi
    ;;
  save|rotate) save_token "$1" ;;
  sync)
    check_local_security
    [[ -s "$FILE" ]] || { echo 'No local token: use save first.' >&2; exit 1; }
    check_gh
    gh secret set NOTION_API_TOKEN --repo "$REPO" < "$FILE"
    echo 'GitHub main-site secret updated. Token was not printed.'
    ;;
  help|-h|--help) usage ;;
  *) usage >&2; exit 2 ;;
esac
