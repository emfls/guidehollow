# PR #30 추가 검토: 원고 오류와 외부 응답 오류 경계

대상: `emfls/guidehollow`, 기존 `fix/publisher-seo-audit`, [PR #30](https://github.com/emfls/guidehollow/pull/30).
기준 커밋: `54f3922f2abcc6d87989a01c27c9d8b0cec98017`. 기존 기술 SEO 감사와 증거 파일은 보존했다.

## 추가 발견과 분류

`stage()`의 `except (ValueError, KeyError, TypeError)`는 `공식출처` 누락 같은 응답 결손도 원고 오류로 기록하고 다음 원고를 선택했다. 일부 `get(..., 기본값)`은 누락 응답을 빈 원고 값으로 숨겼다. `has_more` 누락은 마지막 페이지로 오인할 수 있었고 반복 cursor는 반복 조회를 유발할 수 있었다.

| 구분 | 코드 경계 | 처리 |
| --- | --- | --- |
| 확인된 원고 내용 오류 | `ArticleValidationError(ValueError)` | 원고 실패+이유 PATCH 후 같은 슬롯의 다음 승인 원고 검사 |
| Notion 응답 구조/자료형 오류 | `NotionResponseError(RuntimeError)` | 즉시 중단. 실패 PATCH·다음 원고 선택 금지 |
| API/권한/시간 초과, npm 실행 환경, 원인 불명 빌드, 기존 발행 ID, 미확정 배포 | 기존 RuntimeError, 네트워크/프로세스 예외 등 | 즉시 중단하는 기존 보호 유지 |
| 예상하지 못한 KeyError/TypeError/ValueError | 원고 오류로 변환하지 않음 | 예외 전파 및 실행 실패. 원고를 임의로 격리하지 않음 |

원고 오류는 제목·설명·슬러그·카테고리·태그·출처 형식·지원하지 않는 블록·승인된 시각 자료의 편집 검증·대상 원고에 명시적으로 귀속되는 Astro 오류에서만 명시적으로 발생시킨다. URL 파서의 내용 오류도 해당 출처/링크를 검증하는 위치에서만 이 예외로 변환한다.

대기열 항목의 id/properties와 9개 필수 속성의 Notion type/value 형식을 선검증한다. 정상 형식의 `select: null`, 빈 제목/출처 rich text는 실제 편집 입력이므로 원고 검증 대상으로 남긴다. 속성 누락, 잘못된 select/relation/checkbox/date, 잘린 relation, 잘못된 rich text와 본문 응답은 외부 데이터 오류다. 다른 사이트나 승인되지 않은 항목을 수정하지 않는다. 잘못된 응답 때문에 대기열 전체가 멈출 수 있으며 이는 의도한 데이터 보존 동작이다.

## 회귀 검사

새 테스트 메서드 8개를 추가했고, 기존 회귀 검사는 제거하지 않았다. 파라미터별 사례는 테스트 개수에 별도로 더하지 않았다.

- `공식출처` 누락, properties 누락/None/list/string, 잘못된 필수 속성 타입·rich text/select/relation/checkbox/date와 잘린 relation.
- 모든 비정상 항목에서 Notion 호출 0회, 두 번째 원고 렌더 선택 0회, 기존 임시 원장 바이트 보존, 새 원고 파일 없음 확인.
- 본문 rich_text 누락/비문자열, 잘못된 체크 상태·has_children, 이미지 응답 결손에서도 실패 PATCH 없이 중단.
- 분류하지 않은 KeyError/TypeError/ValueError도 원고 오류로 간주하지 않음.
- 정상 자료형의 잘못된 제목/설명/슬러그/카테고리/태그/출처 및 미지원 블록은 실패 사유를 기록하고 두 번째 승인 원고를 선택. 빈 카테고리/출처와 파싱 불가 URL도 편집 오류로 검사.
- 두 페이지네이션 경로에서 has_more 누락/잘못된 타입, 잘못된 cursor 및 반복 cursor 중단.
- Notion의 정상 `annotations.color="default"`는 처리 가능.
- 기존 수정·재대기 재시도, 하루 최대 3편, 동일 슬롯/Notion ID 중복 방지, staged 원장 차단, 배포 실패/지연, 완료 PATCH 실패 회귀 유지.

모든 Notion/GitHub 장애 사례는 Mock·임시 파일 사용. 실제 서비스에 장애를 주입하거나 운영 원고를 재대기·실패·발행 상태로 변경하지 않았다.

## 의존성 및 전체 로컬 검증

직접 import하는 `@astrojs/markdown-satteri`를 dependencies에 정확한 기존 버전 `0.4.5`로 선언했다. package-lock.json은 최상위 직접 의존성 선언만 추가되었고 전이 패키지 버전 변경은 없다.

- `python3 -m unittest discover -s tests -p 'test_*.py' -v`: **54개 통과** (기존 46 + 신규 8).
- `npm ci`: 성공, 잠금 파일 기반 266개 패키지 설치.
- `npm test`: **23개 통과**.
- `npm run check`: 45개 파일, 오류/경고/힌트 각 0.
- `npm run build`: 58 HTML, 18개 글·도구 2개, 내부 링크/자산 참조 1,808개 및 메타·사이트맵·광고 게이트 통과.
- 생성 JSON 가이드 HTML에서 체크박스 **7개 모두 aria-label 있음**, disabled·unchecked 상태 보존 확인. 기존 게시물 fixture의 checked 상태 및 `&` 라벨 이스케이프 검사도 통과.
- `git diff --check`: 통과.

GitHub PR CI는 이 변경 커밋을 push한 뒤 별도로 확인한다. CI 실행 링크와 최종 SHA는 PR 본문/최종 보고에 기록한다. 로컬 성공을 CI 성공으로 대체하지 않는다.

## 보존 범위와 배포 판단

이 추가 수정에서 발행 원고·URL·Notion 데이터·발행 원장·AdSense 설정·자동 발행 스케줄·기존 워크플로는 변경하지 않는다. 새 PR·사이트·저장소를 생성하지 않고 main 병합·운영 배포·새 원고 발행은 하지 않는다.

기술 판단: 요청된 경계는 오프라인 회귀와 깨끗한 의존성 설치 후 전체 빌드로 검증했다. 최종 PR CI 성공까지 확인하면 검토 후 배포 가능한 후보지만, 실제 운영 장애 복구 E2E와 배포 후 검증 완료를 뜻하지 않는다. 알 수 없는 오류는 계속 안전 중단하며 운영자가 원장을 삭제하거나 원고를 복제해서 우회해서는 안 된다.
