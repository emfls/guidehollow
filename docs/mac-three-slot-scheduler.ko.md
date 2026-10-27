# GuideHollow Main macOS launchd 3-slot migration (2026-10-27)

Old Mac LaunchAgent `com.guidehollow.scheduler` used Main 09:30 KST once/day (and discontinued satellite times). Main's new publication schedule is **09:17 / 15:17 / 21:17 KST**. GitHub execution at 09:30 is consistent with legacy Mac timing but GitHub does not prove the originating device.

Install once from your up-to-date local `emfls/guidehollow` clone:

    git pull --ff-only
    bash scripts/mac-scheduler/install.sh

This installs `com.guidehollow.main.publisher` as a once-per-minute user LaunchAgent. It disables **only** the old `com.guidehollow.scheduler` and archives its plist under the application's legacy-backup folder. It NEVER touches `emfls.github.io`, its cron-job.org scheduler, or deleted satellites. No new keys are needed: the Mac uses `gh auth`, GitHub Actions uses its existing `NOTION_API_TOKEN` secret.

Read-only commands after installation:

    launchctl print "gui/$(id -u)/com.guidehollow.main.publisher" | grep -E 'state =|runs =|last exit code ='
    python3 "$HOME/Library/Application Support/GuideHollowMainScheduler/dispatcher.py" diagnose
    tail -n 40 "$HOME/Library/Application Support/GuideHollowMainScheduler/scheduler.stdout.log"
    tail -n 40 "$HOME/Library/Application Support/GuideHollowMainScheduler/scheduler.stderr.log"
    gh run list --repo emfls/guidehollow --workflow notion-daily-publisher.yml --limit 5
    pmset -g custom

Do NOT test with `gh workflow run`; that actually starts publication. The installer and `diagnose` do not publish.

On each KST scheduled slot, a powered-on logged-in online Mac polls once a minute within the 60-minute window, checks the actual GitHub append-only ledger and recent publisher executions, and dispatches once with `-f slot=morning|afternoon|evening`. Explicit slot binding prevents morning delays from consuming afternoon, with another 60-minute creation-time guard inside the GitHub publisher. If the GitHub dispatch result is ambiguous, it intentionally will not retry to avoid duplicate posts; human review is required. Existing GitHub schedule remains backup (and can be late or skipped).

Today's morning and afternoon are already marked published; only evening remains. This code is installed **only after the user runs the installer on the Mac**. Site publication is not considered validated until the scheduled evening launchd trigger, Actions run, Pages SHA and Notion 완료 all match.

A sleeping/offline/logged-out Mac cannot dispatch. Launchd coalesces missed intervals on wake, but the guard blocks late events. For guaranteed 24/7 scheduling use an independent external always-on scheduler in addition to this Mac.
