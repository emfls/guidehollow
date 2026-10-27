# GuideHollow Main 자동 발행 SRE 관제·복구

작성: 2026-10-27 KST. 기준 main `e3644e10fac1bf7622a2a5fb07121eba54e4d0ae`.
대상은 `emfls/guidehollow` / `gh-main`만이다. 기존 원고·URL·Notion 콘텐츠·원장·광고·비밀 키를 수정하지 않는다.

## 실제 장애 #40379949004

[실행 기록](https://github.com/emfls/guidehollow/actions/runs/40379949004)과 실패 로그를 읽었다.

| 항목 | 확인된 증거 |
| --- | --- |
| 이벤트 / 시도 | schedule / 1 |
| 실행 SHA | `6738d1bd7bcb6467f70018eab14c2ee2d8e92c86` |
| 로그의 슬롯 | `PUBLISH_SLOT=evening` |
| 명목 예약 시각 | 2026-10-26 21:17 KST — 해당 cron의 직전 일일 발생 시각으로 추론 |
| 생성 / run_started_at | 모두 2026-10-27 03:41:21 KST |
| 명목 시각 대비 지연 | 6시간 24분 21초 (23,061초) |
| 종료 | 03:41:32 KST, failure |
| 실패 원인 | `test_approved_article_stages_once_per_kst_date`: 실제 job의 evening 환경을 상속했는데 morning을 기대함 |
| 실제 발행 여부 | self-test에서 중단. stage/원고 커밋/Notion 발행 단계 미도달 |

생성과 run_started_at이 동일하므로 API 메타데이터에는 장시간 runner 대기가 나타나지 않는다. 예약 전달 이전 지연이 주원인인 것으로 추정하되, GitHub가 원래 예약 발생 timestamp를 제공한 것으로 주장하지 않는다.

최신 main에는 테스트 환경 격리 및 실제 슬롯 회귀가 이미 반영되어 있다. [배포 #40422021278](https://github.com/emfls/guidehollow/actions/runs/40422021278)의 build/deploy가 성공했고, Pages 환경 배포 ID `7346447543`의 성공 SHA도 `e3644e1`이다. 기존 수정은 재구현하지 않았다.

당시 자동 발행 변수는 2026-10-26 21:39:09 KST에 true로 설정되었다. 지연된 저녁 이벤트는 그 이후 도착하여 실행 조건을 만족했다. 당시 publisher는 실행 시점의 KST 날짜를 사용하므로, 테스트가 통과했다면 10월 26일의 지연 이벤트가 10월 27일 저녁 슬롯을 소비할 위험이 있었다. 실제 잘못된 발행이 있었다는 뜻은 아니다.

기계 증거: [장애 메타데이터](./publisher-incident-40379949004.json).

## 변경된 지연 허용 정책

- 발행 cron은 **09:17 / 15:17 / 21:17 KST**, 일일 최대 **3편** 그대로다. 대체 발행 시각이나 보충 발행을 추가하지 않는다.
- 예약 실행은 원래 run의 `created_at`과 cron 슬롯으로 계산한 직전 명목 시각부터 **60분 이내(정확히 60분까지 포함)**, **동일 KST 날짜**에서만 입장 가능하다.
- 원래 run 생성 시각을 조회한다. `run_started_at`이나 재시도 시작 시각으로 날짜를 새로 지정하지 않는다. 생성 시각·cron·슬롯 증거가 없거나 모순되면 중단한다.
- 예약 실행은 처음부터 Notion 조회 전에 검사한다. 원고 검증 후 원장 append/Notion 발행중 PATCH 전, 실제 원고 push 직전에도 재검사한다. 검증 중 만료되면 거절 원고로 기록하지 않고 중단한다.
- 수동 dispatch는 기존의 첫 빈 슬롯·3편 상한을 유지한다. GitHub에서 이전 날짜에 생성되어 자정을 넘겨 대기한 수동 실행도 날짜를 바꾸어 소비하지 않는다. 로컬 명시 실행은 현재 KST 날짜를 사용한다.
- 예약 및 수동 **기존 run의 재실행(attempt > 1)은 발행하지 않는다**. 실패 run을 재실행해 다음 원고나 다음 날짜를 소비하지 않게 한다. 증거 검토 후 필요할 때 새 수동 dispatch를 사용하며, 일일 한도·중복·미확정 원장 보호는 계속 적용된다.
- 이미 원고가 커밋/배포된 뒤의 Notion/원장 확정 실패는 자동 재발행하지 않는다. 원고 push 입장과 이미 진행된 발행의 확정 기록은 구분한다.

**관측 한계:** GitHub의 원래 cron 발생 timestamp가 별도로 없으므로 명목 날짜는 `created_at` 이전의 가장 가까운 해당 cron 시각이다. 이벤트 자체가 24시간 이상 지연되어 다음 날의 허용 창 안에서 새로 생성되는 경우, 원래 의도 날짜를 이 메타데이터만으로 절대 입증할 수 없다. 이번 보호는 확인된 야간/자정 지연과 생성 이후 장기 대기·재시도를 차단한다. 이 한계를 없애려면 별도 신뢰 가능한 날짜 포함 트리거가 필요하며 이번 작업에서 추가하거나 발행 스케줄을 바꾸지 않았다.

## 관제와 상태 구분

새 `publisher-monitor.yml`은 매시 47분, publisher 완료 이벤트, 수동 실행으로 **읽기 전용** 점검한다. main에 병합되기 전에는 예약 관제가 가동되지 않는다. 발행 워크플로를 대신 실행하지 않는다.

| 표시 | 의미 / 대응 |
| --- | --- |
| SUCCESS | 해당 슬롯의 published 원장, Notion 완료/URL/원본 commit(있는 경우), 현재 성공한 Pages 환경 SHA와 배포 run 및 포함 관계 확인 |
| QUEUE_EMPTY | 성공한 run의 검증된 결과 파일에서 확인한 대기열 없음. 발행 성공으로 세지 않음 |
| WAITING / DELAYED | 예약 전은 표시하지 않음. 정시 후 15분까지 대기, 15분 초과~60분은 지연 |
| MISSING | 허용 창이 끝났는데 실행 결과·발행 증거가 없음. 조회 실패와 구분하며 자동 보충 발행 금지 |
| RUNNING / RUN_OVERDUE | 최대 job 시간 55분 내의 진행 또는 초과. 진행 중 임시 staged/Notion 전환은 완료 후 다시 비교 |
| FAILURE | 실제 Actions failure/cancelled/timed_out 등. 실패 단계·run 링크와 수동 조치 안내 기록 |
| EDITORIAL_FAILURE | 전체 후보 검수 실패/20개 거절 상한. 편집자가 오류를 수정하고 재검수해야 함 |
| SKIPPED_* / GUARD_HELD | 만료·날짜 변경·재실행·기존 슬롯/3편 상한 차단. 동일 원고/슬롯 자동 재시도 금지 |
| UNKNOWN / UNVERIFIED | 토큰/권한/API/결과 파일/원장/배포 증거 부족. 없음·0·성공으로 간주하지 않음 |

결과와 시작 지연을 별도 필드로 기록한다. 허용 범위 내 늦게 시작해 발행에 성공한 경우에도 `timeliness=DELAYED`와 초 단위 시작 지연이 남는다.

- publisher는 run ID + attempt별 `publisher-observation-*` 아티팩트와 실제 `GITHUB_STEP_SUMMARY`를 기록한다. 이벤트 SHA와 실제 checkout 기본 SHA를 구분한다.
- 관제는 동일 run/attempt/event/SHA의 JSON 결과 파일만 읽는다. 만료·손상·출처 불일치·크기 초과는 UNKNOWN이다. ZIP을 추출하거나 원격 코드를 실행하지 않는다.
- 관측 범위는 최근 48시간이며, 자동 관제의 첫 기대 슬롯은 main 이력에서 관제 workflow가 도입된 시각 이후다. `${vars.GUIDEHOLLOW_AUTO_PUBLISH}`를 읽고 Variables API용 추가 PAT를 요구하지 않는다. Pages 조회는 `deployments: read`를 명시한다.
- 발행을 일시 중지했다가 다시 켤 때는 운영자가 비밀이 아닌 `GUIDEHOLLOW_MONITOR_SINCE`에 재가동 시각(시간대 포함 ISO)을 설정할 수 있다. 현재 변수 값만으로 과거 중지/재개 이력을 알 수 없으므로 이 기준을 기록한다. 이 작업에서 변수는 변경하지 않았다.
- Notion 메타데이터를 양방향 비교한다. ledger 항목의 상태·URL·SHA뿐 아니라 main의 `발행중/발행완료` 중 원장에 없는 문서도 검사한다. 본문은 읽거나 수정하지 않는다.
- 과거 원장 3건의 `verified_deployment_sha`는 원래 발행 SHA로 바꾸거나 추정하지 않는다. 현재 Pages SHA가 이 검증 SHA 또는 실제 publication commit의 후손임을 GitHub compare로 확인한다. 최신 Pages 환경 SHA와 성공한 deploy.yml run SHA는 정확히 같아야 한다.

## 알림과 중복 방지

관제 결과·원인·수동 조치 안내는 Actions Summary와 JSON 아티팩트에 기록한다. 주의가 필요한 결과는 관제 job을 실패시켜 GitHub의 기존 Actions 알림으로 연결한다.

**Issue는 생성하지 않는다.** 따라서 동일 장애의 Issue 중복 생성도 없고 `issues: write` 권한도 없다. Notion/원장/콘텐츠 쓰기, publisher dispatch, 자동 재승인, 강제 push 권한·기능을 관제에 부여하지 않았다.

GitHub Settings → Notifications → Actions에서 이메일/웹 알림을 설정하고 필요하면 실패 실행만 받도록 설정할 수 있다. 예약 알림 수신자는 cron 수정자 또는 재활성화 사용자 등 GitHub 규칙에 따른다. 계정 알림 설정·수신 주소·메일 도착은 확인하거나 변경하지 않았다. 별도 메일을 보내지 않았다.

공식 근거: [예약 이벤트 지연·누락](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), [Actions 알림](https://docs.github.com/en/actions/concepts/workflows-and-actions/notifications-for-workflow-runs), [저장소 변수 API 권한](https://docs.github.com/en/rest/actions/variables#get-a-repository-variable).

**공통 장애 한계:** publisher와 관제가 모두 GitHub Actions이므로 GitHub 스케줄러 전체가 멈추면 누락을 즉시 통보할 수 없다. 시간당 검사 자체도 지연될 수 있다. 독립 외부 heartbeat는 이번 범위에 추가하지 않았다.

## 증거를 보존하는 수동 복구

1. 새 발행을 시도하기 전에 해당 날짜·슬롯·run ID/attempt·실행 SHA·실제 checkout SHA·실패 단계를 수집한다. 원장/Notion/URL을 수정하지 않고 비교 결과부터 기록한다.
2. Pages의 실제 성공 환경 SHA, 대응 deploy run, 발행 commit 포함 관계, 공개 HTTPS 200·canonical·기대 본문을 확인한다. 접수/빌드 성공을 실제 배포로 대신하지 않는다.
3. 이미 배포된 글은 재발행하거나 다른 Notion ID로 복제하지 않는다. 원래 URL·발행 시각·승인 기록을 보존한다.
4. Notion 완료와 staged 원장이 어긋나면 확인한 SHA·URL·기존 상태·원래 발행 시각·제안된 정확한 변경을 검토한 뒤 별도 승인된 복구를 수행한다. 완료 시각을 덮어쓸 수 있는 finalize를 무조건 재실행하지 않는다.
5. commit 성공·배포 실패라면 원고를 다시 생성하지 말고 해당 기존 commit의 배포 장애를 처리한다. push 실패·Notion 발행중만 남은 경우도 배포/원장 부재를 입증한 뒤 수동 상태 복구를 검토한다. 불명확하면 계속 중단한다.
6. 원고 검수 실패는 편집자가 수정·재검수 후 `실패 → 발행대기`로 전환한다. 관제는 실패 글을 자동 승인하거나 순서를 재배정하지 않는다.
7. 원장 초기화/행 삭제, force push, 상한 우회, 이전 run 재실행으로 복구하지 않는다.

## 이번 검증 및 남은 미확인

- Python **83개**, JS **24개**, npm ci, Astro check/build 및 git diff --check 통과. 오후·저녁 슬롯 환경에서도 Python 83개 통과. 최종 결과와 PR CI 링크는 PR/최종 보고에 기록한다.
- 실제 GitHub 읽기 진단: 현재 Pages SHA `e3644e1`, 성공 deployment/run 일치, 원장 4건의 기록된 SHA 포함 확인.
- Notion 커넥터에서 선택한 원장 4건은 완료·URL 일치 확인. 과거 2건의 커밋 URL은 비어 있음 그대로 기록. [선택 조회 증거](./publisher-selected-notion-evidence-2026-10-27.json).
- 로컬 Notion REST 토큰 부재로 새 관제의 전체 Notion 역조회는 `NOTION_TOKEN_UNAVAILABLE`/UNKNOWN으로 남겼다. 이때 불일치 또는 빈 대기열로 오인하지 않는 동작을 확인했다. [실제 GitHub 조회 snapshot](./publisher-operations-snapshot-2026-10-27.json) / [진단 결과](./publisher-operations-check-2026-10-27.json).
- 원장·Notion 콘텐츠·기존 URL·광고·비밀 키 변경 없음. 실제 발행·장애 주입·복구·main 병합·운영 배포·이메일 설정은 수행하지 않는다. 미래 관제 workflow 자체와 원고 발행의 운영 E2E는 병합 후 별도 확인 대상이다.

Notion 참고: [중앙 운영 명세](https://app.notion.com/p/402db4c0a991817da846f1a1deb85361), [현재 메인 등록부](https://app.notion.com/p/402db4c0a99181eda03dd8b1c2247d76), [3채팅 운영·발행순서 규칙](https://app.notion.com/p/405db4c0a99181edb63eed0edaf1ccf6). 과거 1편/일 본문은 현재 사용자 지시·등록부 Daily Limit=3 및 최신 main과 구분했고 Notion은 수정하지 않았다.
