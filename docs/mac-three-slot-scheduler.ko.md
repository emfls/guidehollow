# GuideHollow Main macOS launchd 3-slot migration (2026-10-27)

독립 외부 트리거의 비활성 설계·검증과 현재 운영 증거는 [2026-10-27 검토](independent-publisher-trigger-audit.ko.md)를 참조한다. 아래 설치 안내는 실행 시 launchd를 활성화하므로 진단 목적으로 실행하지 않는다. 현재 작업은 설치/활성화하지 않았다.

## 2026-10-27 — GitHub 예약 백업 cron 추가

메인 3회 발행시각은 **09:17 / 15:17 / 21:17 KST** 그대로다. GitHub Actions 예약 이벤트 누락을 완화하려고 **각 슬롯별 09:29·09:43 / 15:29·15:43 / 21:29·21:43에 같은 발행기의 보조 예약 기회**를 추가했다. 이것은 **매일 9편**이 아니라 **최대 3편**이다.

- GitHub의 9개 cron은 동일한 `concurrency` 락을 공유하고, `publisher_timing.py`는 모든 보조 cron을 해당 일자의 원래 `:17` 슬롯으로 매핑한다.
- 이미 사용한 슬롯은 원장의 `SLOT_ALREADY_USED`로 종료한다. 하나라도 `staged`인 경우 다른 원고 자동 출판을 차단한다.
- 시작이 늦어 원래 `:17` 시각으로부터 **60분**을 넘으면 스킵한다. 날짜 변경·재실행·원인 불명 오류는 기존대로 fail-closed.
- `GUIDEHOLLOW_AUTO_PUBLISH=true`라는 기존 GitHub Variable이 활성화 조건이다. 이 변경은 설정값을 직접 변경하지 않는다.
- GitHub 서버 예약 시스템 전체가 지연·중단되면 보조 cron들도 지연될 수 있어 완전한 독립 가용성은 아니다. 기존 macOS launchd 백업은 사용자의 Mac에 **설치·로그인·전원·네트워크**가 있어야 작동한다.
- 설치되지 않은 launchd를 설치된 것으로 주장하지 않는다. 다음 명령은 사용자 Mac의 실제 GuideHollow 로컬 클론에서 **한 번만** 실행할 수 있다.
  ```bash
  git pull --ff-only
  bash scripts/mac-scheduler/install.sh
  ```
- 기존 Mac 스케줄러는 `com.guidehollow.scheduler`로서 오래된 :30/위성 시각을 포함했다. 설치기는 해당 작업만 영구 비활성화하고 신규 Main-only LaunchAgent로 교체한다. `emfls.github.io` 스케줄러는 손대지 않는다.
- 컴퓨터가 꺼져 있어도 작동하는 **독립 외부 24/7 스케줄러**(예: cron-job.org)는 아직 등록되지 않았다. 외부에서 GitHub dispatch를 호출하려면 별도의 제한된 GitHub 인증과 사용자 서비스 설정이 필요하다. 비밀 토큰을 GitHub 코드/문서에 넣지 않는다.

**검증 경계:** 이번 PR의 CI 성공은 보조 cron의 YAML/경계 시뮬레이션이 통과했다는 증거이다. 실제 GitHub scheduler가 해당 시각에 발생하는지, Mac launchd가 설치되어 작동하는지, Notion 글이 게시되는지는 운영 기록으로 따로 검증해야 한다.


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
