# Main 자동 발행 독립 트리거 검토 — 2026-10-27 KST

기준: `emfls/guidehollow` main `7a06450aba3de3323c1afd786de8fa2f0f9bc22c`.
**설계·오프라인 검증만 수행했다. 외부 작업 등록/활성화, 토큰 발급, 실제 dispatch, 병합·배포를 하지 않았다.**

## 기존 구현 검토

| 병합된 PR | 현재 main에서 재사용하는 기능 |
| --- | --- |
| [#27](https://github.com/emfls/guidehollow/pull/27) | 09:17 / 15:17 / 21:17 KST, 하루 최대 3편, 원고 오류 격리 후 다음 후보 |
| [#28](https://github.com/emfls/guidehollow/pull/28) | 선택적 로컬 Notion 자격 증명 관리. 외부 트리거에 Notion 토큰을 전달할 이유 없음 |
| [#29](https://github.com/emfls/guidehollow/pull/29) | 현재 gh-main만 활성인 등록부·확장 차단. 별도 사이트/저장소 불필요 |
| [#30](https://github.com/emfls/guidehollow/pull/30) | 명시적인 원고 검증 예외만 실패 PATCH, 외부 데이터·인프라 예외 중단 |
| [#31](https://github.com/emfls/guidehollow/pull/31) | 실행 생성 시각·날짜·60분 입장 검사, 원장/Notion/Pages 읽기 전용 모니터·Summary·결과 artifact |
| [#32](https://github.com/emfls/guidehollow/pull/32) | Mac 60초 폴링, 이름이 지정된 슬롯 dispatch, 불확실한 전송 로컬 잠금 |
| [#33](https://github.com/emfls/guidehollow/pull/33) | 이전 GuideHollow launchd label만 영구 비활성화 |
| [#34](https://github.com/emfls/guidehollow/pull/34) | 같은 발행기에서 슬롯별 :17 / :29 / :43, 총 9개 GitHub cron |

발행기의 공유 concurrency는 기존 원장 복구 작업과 동일하고 취소하지 않는다. 대기 실행은 최신 main을 checkout한다. 동일 날짜/슬롯은 `SLOT_ALREADY_USED`, 일일 한도는 `DAILY_LIMIT_REACHED`, 과거 날짜를 포함한 `staged` 또는 알 수 없는 원장 상태는 중단한다. 이미 원장에 있는 Notion page ID가 재등장하면 원고 실패 처리 없이 중단한다. 모든 보조 cron은 원래 :17 슬롯에 속한다.

예약 입장 검사 → 기본 사이트 검사 → 원고 선택 → 원고 검사 후 재검사 → 최초 push 직전 재검사 구조를 그대로 사용한다. Pages의 정확한 원고 SHA와 live URL 검증 후에만 Notion 완료와 원장을 확정한다. 배포 불확실성에서 다음 글을 강제 선택하거나 원장을 초기화하지 않는다.

## 읽기 전용 운영 증거

- 실제 설치된 `com.guidehollow.main.publisher`: StartInterval 60초, 조회 당시 runs=14 / last exit code=0. 설치된 dispatcher 내용은 위 main 파일과 같았다(SHA-256 `818d4251fb8d6e1dd39f0cf9e552a4680507dcb4df04b59b97a5f7273afbb22e`). 기존 `com.guidehollow.scheduler`는 disabled. 이번 작업은 이 상태를 바꾸지 않았다.
- `pmset -g custom`: AC Power의 sleep=1. 종료·절전·로그아웃·인터넷 단절 중 실행 개시 보장 없음. launchd exit=0은 실제 발행 증거가 아니다.
- [예약 실행 #40453790883](https://github.com/emfls/guidehollow/actions/runs/40453790883): created_at `2026-10-27T05:10:21Z`(14:10:21 KST), 원본 receipt의 morning 예정 시각 09:17, 검사 시각 14:10:31.332180 KST. `SKIPPED_LATE_SCHEDULE`, delay_seconds=17611, article_sha 빈 값. 워크플로 conclusion=success여도 새 글 발행 성공이 아니다.
- [모니터 #40453822808](https://github.com/emfls/guidehollow/actions/runs/40453822808): 14:10:47 KST 결과에서 `SKIPPED_LATE_SCHEDULE`을 보고해 exit=1. Notion 역방향 조회 완료, 원장 6건 모두 consistent=true, Pages SHA `7a06450aba3de3323c1afd786de8fa2f0f9bc22c`, deployment_id=7349683192, run_verified=true. 슬롯 목록이 빈 이유는 모니터 도입 baseline 10:56:33 이후 아직 15:17 슬롯이 도래하지 않았기 때문이다. 결과 artifact를 내려받아 확인했으며 새 모니터를 실행하지 않았다.
- 조회 당시 `GUIDEHOLLOW_AUTO_PUBLISH=true`. 값을 변경하지 않았다. 실제 24시간 연속 가용성이나 모든 9개 cron의 제때 실행을 입증한 것은 아니다.

## 발견 문제와 최소 개선

1. **높음: 오래된 외부 설정 안내.** 기존 문서의 21:30 / 슬롯 없는 `ref=main` 요청은 현재 슬롯 정책과 다르다. `manual`은 다음 빈 슬롯을 쓰므로 외부 작업에서 금지한다. 아래 3개 명시적 슬롯으로 교체했다. 발행기의 동작 코드·기존 예약을 수정할 필요는 없다.
2. **높음: 독립 실행 개시 경로 없음.** 9개 GitHub cron은 같은 예약 시스템에 의존하고 Mac은 전원에 의존한다. cron-job.org가 기존 workflow_dispatch API를 호출하는 설계를 제공한다. 새 서버·사이트·저장소·웹훅 구현 없이 해결한다. 계정 내 등록 여부는 확인하지 않았고 이번 작업에서 등록하지 않았다.
3. **남은 제한:** 외부 작업도 GitHub API/runner/Notion/Pages 장애를 우회하지 못한다. 24시간 무인 발행 보장이 아니라 예약 실행 개시 경로를 하나 더 갖추는 설계다.

## cron-job.org 비활성 설계

[설정 예시](examples/cron-job-org-main.disabled.json)는 세 개의 개별 작업 payload를 담은 배열이다. 일괄 import API나 실행 스크립트가 아니다. 각 `job`은 `enabled=false`, 인증 헤더 없음, 응답 저장 꺼짐이다. 지금 등록하거나 실행하지 않는다. 추후 별도 활성화 승인 시 UI에서 아래 값을 대조한다.

| 작업 | 시간대 | 매일 시각 | GitHub inputs.slot |
| --- | --- | --- | --- |
| GuideHollow Main morning | Asia/Seoul | 09:17 | morning |
| GuideHollow Main afternoon | Asia/Seoul | 15:17 | afternoon |
| GuideHollow Main evening | Asia/Seoul | 21:17 | evening |

- HTTPS POST 대상은 `https://api.github.com/repos/emfls/guidehollow/actions/workflows/notion-daily-publisher.yml/dispatches` 하나다. body는 예를 들어 `{"ref":"main","inputs":{"slot":"morning"}}`. `slot=manual` 또는 slot 생략 금지.
- 기존 GitHub :17/:29/:43 및 Mac은 유지한다. 세 경로가 같은 날 같은 슬롯으로 도착해도 하나의 공유 락과 원장을 사용한다. 외부 작업에 별도 게시 코드나 로컬 원장 복사본을 두지 않는다.
- 허용 창은 :17부터 다음 시간 :17:00까지(60분, 끝 경계 포함). GitHub run의 원래 created_at과 실제 검사 시각 모두 해당 창 안이어야 한다. 날짜를 넘긴 대기, 창 만료, run_attempt>1은 중단한다. 외부 요청 접수 이후 Actions 대기로 창을 놓치면 발행하지 않는다. 이 경우 named manual 경로의 기존 status 문구는 `SKIPPED_DATE_CHANGED`일 수도 있으므로 결과의 allowed=false와 시각을 함께 읽는다.
- 전송 timeout은 30초, 3xx를 성공 처리하지 않는다. HTTP 2xx는 접수 증거일 뿐 발행 성공이 아니다. 응답 코드는 사용 API 버전에 따라 달라질 수 있다. 2022-11-28 요청의 기존 204에는 run ID가 없을 수 있다. Actions 실행/receipt → 원장 → 정확한 Pages SHA/live URL → Notion 완료로 검증한다.
- timeout/응답 유실은 `UNKNOWN_ACCEPTANCE`로 취급한다. 운영자가 원래 슬롯의 기존 실행을 확인하기 전 수동 재전송, Test run, Actions Re-run을 하지 않는다. 서비스의 재시도 설정·자동 비활성화 조건은 활성화 전 실제 UI에서 확인해야 하며 미검증이다. 임의 백업 작업을 추가하지 않는다.
- cron-job.org의 실패/자동 비활성화 알림은 나중에 계정의 기존 이메일 채널을 사용할 수 있다. HTTP 성공 후 Actions 실패는 GitHub 기존 실패 알림과 운영 모니터 Summary로 확인한다. 알림 설정·전달 시험은 하지 않았다.

## 인증과 토큰 경계

별도 승인 후 사용할 인증의 최소 REST 요구사항은 **fine-grained PAT, resource owner emfls, 선택 저장소 emfls/guidehollow 하나, Repository Actions: read and write**다. Metadata read는 기본이다. Contents/Administration/Secrets write, 조직 전체·다른 저장소, classic repo 범위를 요청하지 않는다. 만료일과 갱신 책임자를 정하고 계정 MFA 및 접근자를 제한한다.

토큰은 추후 운영자가 cron-job.org의 HTTPS 요청 `Authorization: Bearer …` 헤더에 직접 설정한다. 실제 값은 파일·예시·URL·query string·body·Notion·Issue·PR·채팅·스크린샷에 넣지 않는다. `gh auth token` 출력이나 shell 인자로 복사하지 않는다. cron-job.org API key와 GitHub PAT는 서로 다른 자격 증명이며 이 설계는 cron-job.org 관리 API key도 요구하지 않는다. 외부에는 Notion 토큰이나 Actions의 일시적 GITHUB_TOKEN을 전달하지 않는다.

**Actions write는 특정 workflow/slot만 허용하는 권한이 아니다.** 같은 저장소의 다른 dispatch 가능 workflow나 기존 무슬롯 manual 경로도 호출할 수 있다. 따라서 탈취된 토큰을 named-slot 가드가 완전히 제한한다고 주장하지 않는다. 토큰은 제3자 서비스와 계정 관리자가 접근할 수 있는 신뢰 경계를 갖는다. 응답 저장을 꺼도 요청 헤더가 서버/관리자에게 보이지 않는다는 보장은 아니다. 이 범위도 허용할 수 없으면 직접 PAT 설계는 보류해야 한다. workflow만 한정하는 별도 게이트웨이는 이번 범위에서 만들지 않는다.

## 장애 및 복구 경계

원고 검증 오류만 실패 PATCH 후 다음 승인 원고로 이동한다. Notion 응답/권한/페이지네이션, GitHub·npm 환경, 알 수 없는 build 실패는 현재 실행을 중단한다. 커밋 후 Notion 완료 실패 또는 Pages 불확실성은 원장의 staged 상태를 보존해 다음 발행을 차단한다. [기존 복구 절차](publisher-operations-runbook.ko.md)를 사용하고 이미 배포된 글은 재발행하지 않는다.

**입장 차단의 한계:** 원장에 남지 못한 Notion `발행중` 등 역방향 불일치는 읽기 전용 모니터가 탐지하지만 발행기 자체가 그 전체 역방향 스캔을 입장 조건으로 사용하지는 않는다. 예를 들어 staging PATCH 후 최초 push 전 runner가 사라지면 원격 원장만으로 그 시도를 확인할 수 없다. 증거 확인 전 외부 트리거 활성화를 보류하고 수동 검토한다. 모든 인프라 실패를 미래의 별도 실행까지 자동 영구 잠금하는 시스템으로 주장하지 않는다. 이번에는 별도 복구·상태 원장을 중복 구현하지 않았다.

GitHub created_at 이전에 이벤트가 24시간 이상 지연되어 다음 날의 동일 창에 새 run이 생기는 경우 원래 날짜를 입증할 수 없는 한계도 유지된다. 정적 외부 payload 역시 원래 명목 날짜를 전달하지 않는다. cron-job.org의 `%cjo:unixtime%`는 실행 당시 timestamp여서 원래 예정 발생일의 증거를 대신하지 못한다. 이번 변경으로 절대적 과거 이벤트 방지나 exactly-once 전달을 주장하지 않는다.

## 검증

추가 회귀 테스트는 비활성 예시의 3개 KST 시각/슬롯·main ref·토큰 없음·설정과 기존 workflow의 연결, 60분 정확한 경계/초과·다음 날 대기·재실행 거절을 검증한다. 기존 Python 테스트의 3/day·중복 ID/슬롯·과거 staged·원고/인프라 예외·불확실 전송과 모니터 역방향 비교를 재사용한다. 외부 전송·운영 장애 주입은 없다.

검증 명령: `python3 -m unittest discover -s tests -p 'test_*.py' -v`, `npm ci`, `npm test`, `npm run check`, `npm run build`, `git diff --check`. 실행 결과와 PR CI는 PR 본문에 기록한다. CI는 실제 서비스 등록/예약 실행/메일 전달의 증거가 아니다.

**판단:** 기존 런타임 코드 재사용으로 독립 트리거를 설계할 수 있어 새 발행기·workflow·의존성은 불필요하다. 설정은 비활성 검토 자료로만 제공한다. 미확정 상태 검토, 토큰의 넓은 Actions 권한 수용, 별도 활성화 승인과 실서비스 검증 없이 24시간 운영 준비 완료로 판단하지 않는다.

## 공식 근거

- [GitHub workflow dispatch REST 권한·요청](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event)
- [cron-job.org 요청 방식·시간대·알림 설정](https://docs.cron-job.org/rest-api.html)
- [cron-job.org 변수는 실행 시 생성됨](https://docs.cron-job.org/creating-cron-jobs.html)
- [GitHub schedule 지연·누락 제한](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
