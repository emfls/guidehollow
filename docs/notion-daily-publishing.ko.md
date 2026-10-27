# GuideHollow · Notion 통합 원고 자동 발행 운영 안내

작성 및 1차 실발행: 2026-10-23 KST

**현재 운영 기준(2026-10-27):** 09:17 / 15:17 / 21:17 KST, 하루 최대 3편, 슬롯별 60분 허용 창이다. 아래 1차 테스트와 과거 사전 조건은 역사 기록이다. 현재 외부 트리거 설계·권한·남은 위험은 [독립 트리거 검토](independent-publisher-trigger-audit.ko.md)를 따른다. 예약 등록/실행은 별도 승인 대상이다.

## 등록부와 대기열

- [통합 원고 대기열](https://app.notion.com/p/9bae0ba5be6b4abf961b84d10724761f) · data source `b788e982-fc20-4df0-9f1b-8ff2a19f271d`
- [사이트 등록부](https://app.notion.com/p/582a8b7b2abb410abfd515fcab76ae8a) · data source `99edf088-9778-4b8d-80f0-c7d7777f2fc4`
- 사이트 ID `gh-main`: `emfls/guidehollow` / `https://guidehollow.com`, 한글 날짜 기준 **하루 최대 한 편**
- 기존 EMFLS 한국어 사이트 대기열·cron-job.org 작업·레포는 변경하지 않는다

## 실제 확인된 1차 테스트

1. Notion이 승인한 영어 원고 `extract-meeting-action-items-with-ai`를 `발행대기`로 입력하고 사이트 관계를 `gh-main`에 연결.
2. [Actions 첫 실행 #39959121274](https://github.com/emfls/guidehollow/actions/runs/39959121274)에서 Notion 토큰·관계 조회·Python 테스트·Astro 테스트/빌드 통과.
3. Actions의 PR 생성 권한이 꺼져 있어 `gh pr create`가 차단됨. 원고와 발행 ledger가 브랜치에 스테이징된 것을 확인.
4. [PR #4](https://github.com/emfls/guidehollow/pull/4)를 커넥터로 병합한 후 [배포 #39959656916](https://github.com/emfls/guidehollow/actions/runs/39959656916) 성공.
5. [실제 영어 가이드](https://guidehollow.com/guides/extract-meeting-action-items-with-ai/)의 제목·canonical·본문을 확인한 뒤 Notion `발행완료`/게시 URL/시간/커밋을 기록.
6. PR 생성 권한에 의존하지 않도록 발행 워크플로를 **검사 통과 → main 기준 SHA 재확인 → 강제하지 않는 git push → deploy.yml 명시적 dispatch**로 수정. 가드와 변환 회귀 테스트를 추가.

**주의:** 1차 원고의 PR 병합은 오류 복구를 위해 수동으로 수행했다. 새로운 직접 push 방식의 완전 무인 E2E 발행은 두 번째 승인 원고로 검증하기 전까지 *설계 및 회귀 테스트 완료, 실발행 미검증*으로 구분한다.

## GitHub Actions 사전 조건

- GitHub 저장소 Secret: `NOTION_API_TOKEN` (등록 여부/값은 GitHub UI에서만 관리)
- Notion integration이 **두 데이터베이스**에 읽기/쓰기 권한을 가져야 함.
- `.github/workflows/notion-daily-publisher.yml`: 직접 `workflow_dispatch`만 받음.
- `GITHUB_TOKEN`의 `contents: write`, `actions: write`를 사용. GuideHollow `main`은 2026-10-23에 보호 규칙이 없었으므로 직접 비강제 push 가능. 앞으로 branch protection을 적용하면 그에 맞게 게시 방식 수정 필요.
- 별도 GitHub PAT는 수동 Actions 실행에는 필요 없음. cron-job.org에서 REST API로 dispatch할 때만 필요.
- Notion의 대상 사이트 관계가 `gh-main`과 정확히 맞고 검수승인/발행대기가 있어야 게시됨. 남의 사이트 원고를 읽어 게시하지 않음.
- `data/guidehollow-publication-ledger.jsonl`이 중복/같은 KST 날짜 재발행을 차단함.
- Notion에서 작성된 글은 Astro Content Collection의 Markdown으로 변환하고 본문·출처를 검사한 뒤 `npm ci`, `npm test`, `npm run check`, `npm run build`를 통과해야 게시됨.
- 기존 광고 메타/ads.txt/광고 비활성 설정은 변경하지 않음.

## 수동 테스트 절차

1. 새 영문 원고를 올바른 대상 사이트/슬러그·공식 출처와 함께 작성하고 `검수승인=true` 및 `상태=발행대기`로 전환.
2. [GuideHollow Actions](https://github.com/emfls/guidehollow/actions/workflows/notion-daily-publisher.yml)에서 `Run workflow` / `main` 클릭.
3. 워크플로의 성공은 단계별로 확인: Python 검사 → Notion STAGED → Astro 빌드 → main push → deploy workflow dispatch → 사이트 HTTP 200/canonical 확인 → Notion 발행완료.
4. `QUEUE_EMPTY`, `ALREADY_STAGED_TODAY`, `NOT_DUE`는 새 글이 없는 정상 실행 결과이며 발행 성공을 뜻하지 않음.
5. 배포에 실패하면 **발행완료 표시를 금지**하고 Actions 로그와 GitHub/main ledger 및 실제 URL, Notion `발행중` 상태를 비교 후 복구. 같은 원고를 새로 복제해 중복 게시하지 않음.

## cron-job.org 예약 설정 — 비활성 설계

GitHub 본문/Notion에 민감 토큰을 기재하지 말 것. 예약 작업이 실제로 등록·성공하기 전에는 자동 발행이 가동된 것으로 보고하지 말 것.

기존 21:30 / 슬롯 없는 요청 안내는 폐기한다. 그 요청은 다른 빈 슬롯을 사용할 수 있다. [비활성 3개 설정 예시](examples/cron-job-org-main.disabled.json)를 참조한다. 현재 계정의 작업 등록 상태를 확인하거나 변경한 것은 아니다.

- 시간대 `Asia/Seoul`, 매일 09:17 / 15:17 / 21:17에 각각 `morning` / `afternoon` / `evening`을 지정한다.
- POST 대상은 기존 `notion-daily-publisher.yml/dispatches`, body 예시는 `{"ref":"main","inputs":{"slot":"morning"}}`. `slot` 생략 또는 `manual` 금지.
- GitHub fine-grained PAT의 저장소는 `emfls/guidehollow`만, 권한은 `Actions: Read and write`. 이 권한은 특정 workflow만으로 한정되지 않는다는 위험이 있다.
- 예시에는 인증값이 없다. 토큰 발급·등록·작업 활성화·실제 테스트 실행은 하지 않는다.
- HTTP 접수 성공과 실제 발행 성공을 구분하고 timeout은 접수 여부 불명으로 수동 검토한다. 자세한 보안·복구·알림 경계는 위 검토 문서를 따른다.

## 실패 및 보안 원칙

- 무단 원고 자동 생성·중복 글 발행 금지. 원고 작성 및 검수/승인은 독립 단계.
- 사이트 등록부가 일치하지 않거나 검수승인이 없는 경우 게시 금지.
- 강제 push 금지. 메인 브랜치가 예상과 달라지면 게시 중단.
- 공개 상태를 검증하기 전 `발행완료`로 변경 금지.
- PAT, Notion Integration token, 비밀번호, 계정 세션을 레포 파일/Notion/채팅에 붙여넣지 말 것.
- 첫 글 링크/문단 수정은 원본 Notion 글에서 Markdown 변환 시 발생한 문제를 해결하기 위한 품질 조치.
