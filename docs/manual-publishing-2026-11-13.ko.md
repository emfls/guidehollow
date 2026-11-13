# GuideHollow 수동 발행 전환 — 2026-11-13

최신 사용자 결정: 자동발행기를 사용하지 않고 중지한다. 새 원고를 작성·검수한 뒤 직접 게시하며 하루 1편을 운영 목표로 둔다. 이전 하루 3편·Notion 자동발행 설명은 과거 기록이다. 새 상주 프로세스나 예약은 만들지 않는다.

- GitHub `GUIDEHOLLOW_AUTO_PUBLISH=false` 확인.
- `notion-daily-publisher.yml`, `publisher-monitor.yml`: `disabled_manually` 확인.
- Mac `com.guidehollow.main.publisher`, `com.guidehollow.repo.hourly`: disable 및 bootout 성공. 기존 `com.guidehollow.scheduler`도 disabled이고 실행 중인 프로세스 없음.
- Notion gh-main 등록부: 자동 발행 경로 `paused`, Daily Limit 1. 사이트 공개 운영의 중단을 의미하지 않는다.
- 기존 원고·Notion 원장·staged 상태·예약 파일·광고 비활성 설정 보존. 미정산 원장은 변경하지 않는다.

수동 발행은 새 Markdown과 필요한 원본 예제만 추가하고 일반 PR 검증 → 병합 → Pages 배포 → 실제 글·canonical·검색/RSS/사이트맵·파일 대조 순서로 확인한다. 기존 자동발행 스크립트는 실행하지 않는다. 품질 미달 글은 수량을 채우기 위해 발행하지 않는다. 매일 발행 목표는 미래 실행이나 AdSense 승인 보장이 아니다.

이번 새 원고: `ai-text-cleanup-unicode-normalization`. Unicode 공식 표준 및 Python 문서와 독립 실행 예제에 근거한다. 예제는 가상이며 실제 AI 응답이나 고객 자료를 시험했다고 주장하지 않는다.

외부 cron-job.org 계정 작업의 현재 활성 상태는 별도 확인 대상이다. GitHub 워크플로 자체를 비활성화했으므로 해당 경로의 자동발행은 차단된다.
