#!/bin/bash
# GuideHollow Main only. No EMFLS / satellite changes.
set -euo pipefail
[[ "$(uname -s)" == Darwin ]] || { echo "macOS required"; exit 1; }
ROOT="$(cd "$(dirname "$0")" && pwd)"
GH="$(command -v gh || true)"
PY="$(command -v python3 || true)"
[[ -n "$GH" && -n "$PY" ]] || { echo "Missing gh or python3"; exit 1; }
"$GH" auth status -h github.com >/dev/null 2>&1 || { echo "Run gh auth login"; exit 1; }
[[ "$("$GH" api repos/emfls/guidehollow --jq .full_name)" == "emfls/guidehollow" ]] || { echo "No Main repo access"; exit 1; }
APP="$HOME/Library/Application Support/GuideHollowMainScheduler"
AGENTS="$HOME/Library/LaunchAgents"
PLIST="$AGENTS/com.guidehollow.main.publisher.plist"
BACKUP="$APP/legacy-backup"
mkdir -p "$APP" "$AGENTS" "$BACKUP"
chmod 700 "$APP"
cp "$ROOT/dispatcher.py" "$APP/dispatcher.py"
chmod 600 "$APP/dispatcher.py"
"$PY" - "$PLIST" "$PY" "$GH" "$APP" <<'PYTH'
import plistlib,sys
path,python,gh,app=sys.argv[1:]
data={"Label":"com.guidehollow.main.publisher",
      "ProgramArguments":[python,app+"/dispatcher.py","tick"],
      "RunAtLoad":True,"StartInterval":60,
      "EnvironmentVariables":{"GUIDEHOLLOW_GH":gh,
          "PATH":"/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"},
      "StandardOutPath":app+"/scheduler.stdout.log",
      "StandardErrorPath":app+"/scheduler.stderr.log"}
with open(path,"wb") as f: plistlib.dump(data,f)
PYTH
plutil -lint "$PLIST"
# Disable only the obsolete GuideHollow 09:30 / satellite job.
launchctl bootout "gui/$(id -u)/com.guidehollow.scheduler" 2>/dev/null || true
# Persistently suppress the old label, even if its plist lives outside LaunchAgents.
launchctl disable "gui/$(id -u)/com.guidehollow.scheduler"
OLD="$AGENTS/com.guidehollow.scheduler.plist"
if [[ -f "$OLD" ]]; then
  mv "$OLD" "$BACKUP/com.guidehollow.scheduler.$(date +%Y%m%d%H%M%S).plist"
fi
launchctl bootout "gui/$(id -u)/com.guidehollow.main.publisher" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl enable "gui/$(id -u)/com.guidehollow.main.publisher"
launchctl kickstart -k "gui/$(id -u)/com.guidehollow.main.publisher"
echo "Installed Main-only: 09:17 / 15:17 / 21:17 KST."
echo "Legacy scheduler disabled; no article published by installer."
GUIDEHOLLOW_GH="$GH" "$PY" "$APP/dispatcher.py" diagnose
launchctl print "gui/$(id -u)/com.guidehollow.main.publisher" | grep -E 'state =|runs =|last exit code =' || true
echo "Log: $APP/scheduler.stdout.log"
