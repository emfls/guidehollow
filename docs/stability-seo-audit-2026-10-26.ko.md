# GuideHollow 메인 발행 안정성·기술 SEO 감사

검사일: 2026-10-26 KST. 범위: `emfls/guidehollow`, `https://guidehollow.com`만.
기준 main: `6738d1bd7bcb6467f70018eab14c2ee2d8e92c86`.

## 사전 확인 및 보존

- 원격 fetch 후 최신 main으로 fast-forward. 기존 3회 슬롯·원고 실패 fallback·미확정 원장 차단·과거 원장 복구 기능은 재구현하지 않았다.
- GitHub 저장소 변수 `GUIDEHOLLOW_AUTO_PUBLISH=true`를 읽기 전용 확인. 슬롯은 09:17 / 15:17 / 21:17 KST. 스케줄 전달 정시성까지 보장하는 증거는 아니다.
- Notion 사이트 등록부 `402db4c0-a991-81ed-a03d-d8b1c2247d76`: active, gh-main, 해당 저장소/도메인, Daily Limit=3 확인. 본문에 남은 1편/일 안내는 속성과 불일치하는 과거 설명으로 분리했다. Notion을 편집하지 않았다.
- 원장 preflight: 메인 기록 4건, 미확정 0건, 알 수 없는 상태 0건, `READY_FOR_QUEUE_CHECK`. 이는 원장 상태 검사이며 새 발행 증거가 아니다.
- 기존 원고, URL, 원장 JSONL, Notion 상태/기록, 광고 설정, 비밀 키, 스케줄 활성화 변수는 변경하지 않았다. 새 사이트·저장소를 생성하지 않았다.

## 발견된 문제 및 수정

| 심각도 | 재현 조건·영향 | 수정 및 회귀 검사 |
| --- | --- | --- |
| P1 | Notion 본문 응답이 JSON이 아니거나 잘못된 페이지네이션일 때 ValueError/KeyError가 원고 오류로 잡혀 실패 처리·다음 원고 진행. cursor 누락 응답은 반복 조회 가능 | JSON 객체와 목록 응답 검증. 불완전 응답은 RuntimeError로 중단. 잘못된 JSON/배열/목록/cursor, API 중단 테스트 |
| P1 | 기준 빌드가 성공했더라도 이후 npm ENOSPC 등 일반 실패를 원고 검수 실패로 간주 | 대상 원고를 명시하는 Astro 내용 검증 또는 빌드 assertion만 원고 오류로 취급. 일반 실패·실행 누락·시간 초과는 중단 |
| P1 | 이미 발행한 Notion ID가 다시 발행대기로 들어오면 중복 원고 판정을 실패 PATCH로 기록하여 이전 발행 상태를 훼손하고 다음 원고 선택 | 기존 ID 감지 시 기록을 수정하지 않고 즉시 중단. 원장 바이트·Notion 무변경 테스트 |
| P2 | 대기 중인 중복 Actions가 실행 생성 당시 SHA를 checkout하면 이전 실행이 확정한 원장을 놓칠 수 있음. 기존 비강제 push 검사는 덮어쓰기를 막지만 불필요한 Notion 전환·중단 가능 | 공유 concurrency 진입 후 `ref: main` checkout. 슬롯 중복·상한 테스트 및 발행/원장 복구의 공유 잠금 불변식 검사 |
| P2 | 배포 확인 shell은 실패/취소를 시간 초과까지 기다리고, 같은 SHA의 과거 성공이 새 실패를 가릴 수 있음 | 기존 polling을 Python으로 이동. 최신 해당 SHA workflow_dispatch 완료 결과 확인. 실패/취소/시간 초과 즉시 중단, 지연 시 한정 대기. GitHub API 장애도 중단 |
| P2 (axe 영향도 critical) | JSON 가이드의 Markdown 체크박스 7개에 접근성 이름 없음 | 기존 Astro Sätteri의 HAST 확장으로 문맥 텍스트를 aria-label로 제공. 체크 상태/disabled 보존. 실제 빌드 및 axe 재검사 |
| P3 잔여 | Notion 등록부 본문에 과거 1편/일 문구 잔존 | 실행 속성은 3으로 정상. 기록 보존을 위해 수정하지 않고 보고 |

## 요청된 발행 시나리오 검증

실제 운영 원고·서비스를 훼손하는 장애 주입 대신 임시 파일·가짜 외부 응답을 사용하는 오프라인 회귀 검사를 수행했다.

| 시나리오 | 확인 결과·경계 |
| --- | --- |
| 순서 중간 번호 누락 | 1, 3번 조회 결과를 연속 번호 요구 없이 유지. 기존 ascending 발행순서 쿼리 사용 |
| 첫 원고 검수 실패 | 실패+원인 기록 후 다음 승인 원고를 같은 슬롯에 stage. 거절 원고 로컬 파일 제거·실패 원고는 슬롯 미소비 |
| 실패 원고 수정 후 재대기 | 수정한 원고가 재선택되며 통과 시 기존 오류를 지움. 실제 편집자의 재검수·재대기 전환은 시뮬레이션 |
| Notion API 장애/응답 지연 | HTTP/연결 장애·TimeoutError·잘못된 JSON/불완전 응답에서 다음 원고 선택 및 실패 PATCH 금지 |
| Actions 중복 실행 | 공유 concurrency/cancel=false/최신 main checkout, 동일 슬롯 재사용 차단 및 staged 원장 차단 검사. 실서비스 중복 dispatch는 하지 않음 |
| Pages 실패/지연 | 다른 SHA·PR 성공은 거부, 지연 후 정확한 SHA 성공만 허용. 실패·취소·시간 초과·API 장애는 중단. 실제 운영 배포를 고장내지 않음 |
| 커밋 후 Notion 완료 PATCH 실패 | 확정 전 원장 staged 바이트 유지, 다음 발행 차단. 공개 URL 지연도 동일. 실패한 실제 운영 기록을 만들지 않음 |
| 최대 3편/중복 방지 | 세 번째 슬롯까지 허용, 이후 DAILY_LIMIT_REACHED, 슬롯 재사용 차단. 기존 발행 Notion ID 재등장 시 기록 보존·중단 |

## 기술 SEO 전수 결과

수집 증거: [stability-seo-live-2026-10-26.json](./stability-seo-live-2026-10-26.json).

- 58개 생성 HTML 경로와 내부 자산·피드 35개(전부 HTTP 200)를 공개 사이트에서 확인. 18개 글, 도구 2개. 빌드 검증기는 1,808개 내부 링크·자산 참조 및 앵커를 확인했다.
- sitemap.xml/robots.txt 공개 응답 200, 도메인·sitemap 선언 일치. sitemap과 noindex 정책 일치. 검색·404·단일 글 태그 제외 정책 유지.
- 각 페이지 canonical·제목·설명·H1·JSON-LD 파싱 확인. 빌드에서 기사 제목·표시 날짜·mainEntityOfPage 일치 검사. 제목/설명/정규 URL/기사 본문 완전 중복 없음. 기사 18개 쌍의 소문자 5단어 shingle Jaccard 유사도도 계산해 상위 3쌍을 JSON에 기록했다. 이는 의미상 중복의 최종 판정이 아니다.
- 홈페이지에서 실제 a[href]를 따라 도달 가능한 페이지 집합을 계산: indexable 고아 페이지 없음. 카테고리 4개와 도구 허브, 게시 글 경로 유지.
- 58개 전부 390px 모바일에서 innerWidth=scrollWidth=390. 이미지 로드 실패 없음. 홈·기사 화면 스크린샷을 직접 확인.
- axe-core 4.14.0, WCAG 2 A/AA 및 2.1 AA 태그로 58개 공개 경로 검사: JSON 기사 label 규칙 1종/노드 7개. 해당 로컬 수정 페이지 재검사에서 위반 0개. 일부 color-contrast는 incomplete로 남아 있어 완전 접근성 적합성을 주장하지 않는다. 수동 스크린리더 전수 검사는 하지 않았다.
- 없는 경로는 HTTP 404 및 noindex 확인. `/404.html` 파일 자체의 200 응답은 정적 오류 문서 직접 접근이며 누락 URL의 soft 404로 오인하지 않는다.
- 대표 6개 경로의 기존 브라우저 캐시 환경에서 초기 LCP 관측 44–76ms, 초기 layout-shift 합 0. 네트워크/CPU 제한 없는 짧은 관측이므로 Lighthouse 점수나 현장 Core Web Vitals 통과 증거가 아니다. INP·CrUX·Search Console 색인 여부는 미검증.

## 테스트 및 배포 증거

- 기준 main: Python 32 / JS 22 통과, Astro check 0 오류/경고/힌트, build 통과.
- 수정: Python 45 / JS 23 통과. `npm run check`: 0 오류/경고/힌트. `npm run build`: 58 HTML·1,808 내부 참조, 피드·사이트맵·광고 게이트 통과. `git diff --check` 통과.
- 수정 전 실패를 재현한 JSON 응답·일반 npm 오류·접근성 라벨·기존 발행 ID 테스트가 수정 후 통과했다.
- 기존 최신 main [Pages 배포 40323571034](https://github.com/emfls/guidehollow/actions/runs/40323571034)는 성공. 이는 이번 수정의 배포 증거가 아니다.
- 이번 변경은 별도 PR 검증 대상으로 제출한다. 병합·운영 배포·새 원고 발행을 실행하지 않는다. PR CI 결과와 커밋은 아래 실행 기록으로 보충한다.

## 남아 있는 위험

- 인프라 실패, main 동시 편집, Notion 완료 전환/원장 확정 push 실패 시 의도적으로 발행을 중단한다. 운영자는 원장을 지우거나 Notion 원고를 복제하지 말고 실제 배포 SHA/공개 URL/Notion을 대조해 복구해야 한다.
- 알려지지 않은 Astro 오류 문구는 안전 중단한다. 후속 오류가 원고 탓임을 입증하면 분류기와 회귀 테스트를 함께 확장할 수 있다.
- 슬롯은 KST 실행 시점 날짜를 사용한다. GitHub 스케줄 지연·누락에 대한 정시 발행 보장과 실운영 장애 복구 E2E는 이번 테스트 범위에 포함되지 않는다.
- 광고 송출·승인·검색 순위·색인 성공은 이 감사의 통과 결과로 간주하지 않는다.

브라우저 도구에서 Ego Lite 업데이트 알림을 받았으나 도구 업데이트는 실행하지 않았다.
