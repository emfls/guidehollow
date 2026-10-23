# GuideHollow 애드센스 심사 전 보완 결과

작업일: 2026-10-23 (KST). 지시 원본: [Notion 통합 지시서](https://app.notion.com/p/402db4c0a99181c78dfbca077ddccd32), 전체 본문과 1번 섹션의 A~G 우선순위를 확인했습니다.

## 범위와 기준선

- 기존 저장소 `emfls/guidehollow`, 기준 main `dc5e011ffea9e38ad9d77f7cbd6c9a7fe9e285c4`.
- 작업 브랜치 `adsense-readiness-20261023`. 사용자에게 검증 후 PR 병합·운영 배포 승인을 받았습니다.
- 시작 시 최신 Pages 배포 성공, 운영 홈페이지 HTTPS 200, 기존 테스트 4개/타입 검사/빌드 통과를 확인했습니다.
- 기존 메뉴·검색·테마·두 도구·글 URL·루트 canonical·Pages 배포 구조를 유지했습니다. 다른 EMFLS 저장소, DNS, 등록기관, 광고/Google 계정은 수정하지 않았습니다.
- 재설계·의존성 추가·유료 API·서버·분석기·자동 광고는 추가하지 않았습니다.

## 변경 파일과 이유

| 파일 | 이유 |
| --- | --- |
| `src/config.ts` | 비공개 이메일을 운영자가 나중에 넣을 `contactEmail` 단일 설정과 입력 검증. 실제 값은 빈 상태 |
| `src/pages/contact.astro` | 이메일 설정 시에만 mailto 경로 표시, 공개 GitHub Issues·로그인 필요·공개 게시 유의사항 보존 |
| `src/pages/privacy-policy.astro` | 이메일을 설정한 경우에만 이메일 제공자/메시지 처리 안내를 표시해 기능·정책 불일치 방지 |
| `src/lib/seo.ts` | 작은 태그 자료실의 색인 기준(공개 글 2편 이상)을 한 곳에서 정의 |
| `src/pages/tags/[tag].astro` | 1편 태그 noindex/follow, URL·링크 유지, 단복수 표현 수정 |
| `src/pages/sitemap.xml.ts` | 같은 기준으로 noindex 태그 제외 |
| `src/styles/global.css` | 본문 링크 규칙에 가려졌던 문의 CTA 글자색만 수정. 레이아웃/브랜드 변경 없음 |
| `scripts/verify-build.mjs` | robots↔sitemap 일관성, 태그 임계값, 실제 Publisher 메타, 보이는 H1↔기사 schema, 작성자·날짜 검사 강화 |
| `tests/publication.test.mjs` | 글 수 하드코딩 제거, 틀린 H1 검출, ID만 설정한 무광고 빌드·ads.txt·조건부 이메일/정책·동의 미준비 실패 검사 |
| `tests/readiness.test.mjs` | 단일 글/2편 태그 경계 및 Publisher ID 문법 검사 |
| `tests/spreadsheet-example.test.mjs` | 다운로드 CSV와 글의 기대값 5개를 Node 산술로 검증 |
| `public/examples/ai-spreadsheet-sample.csv` | 독자가 바로 쓸 수 있는 비민감 가상 데이터 |
| `src/content/articles/` 아래 기존 5편 | 프롬프트 개선, ChatGPT 입문, 수식, 사실 검증, 컨텍스트 진단을 구체적 입력·판정표로 보강 |
| `src/content/articles/how-to-use-chatgpt-search.md` | 독립적인 AI Tools 안내 추가 |
| `src/content/articles/chatgpt-file-upload-problems.md` | 파일 문제의 단계별 진단 안내 추가 |
| `README.md`, `docs/adsense-setup.ko.md` | 현재 14편 구조·연락처 설정·AdSense/동의/소유권 운영 절차 |
| `docs/content-audit.ko.md`, `docs/source-url-checks.json`, `docs/production-readiness-check.json` | 12편 전수 검수표·출처별 실제 확인 방법과 한계 |
| `docs/adsense-readiness-plan.ko.md`, 이 보고서 | 작업 범위·체크리스트·검증과 외부 미완료 사항 기록 |

## 콘텐츠 품질

기존 **12편 전체 검수**, 그중 **5편 보강**, **새 글 2편** 추가로 최종 **14편**입니다. AI Tools 2편, Troubleshooting 3편이며 빈 카테고리는 없습니다.

| 보강 글 | 이전 → 이후 |
| --- | --- |
| how-to-write-better-ai-prompts | 반복 행사 예제 → 릴리스 노트의 실패 예문/개선 프롬프트/허용 예문/5개 검사 기준 |
| getting-started-with-chatgpt | 일반 단계·낡은 FAQ → 현재 공식 home-page 자료, 티켓 추출의 입력/수동 기준 답안/기능별 대안 |
| how-to-use-ai-for-spreadsheet-tasks | 수동 표 → 실제 CSV 다운로드·150/150/200/120/0 검사표 및 Node 산술 검증 범위 공개 |
| how-to-verify-ai-generated-information | ledger 설명 → 복사용 TSV와 근거별 keep/rewrite/omit 결정 사례 |
| how-to-handle-ai-context-limits | 바로 요약/새 대화로 이동 → 승인 3페이지/폐기 6페이지를 이용한 통제된 진단 절차·실패 기준 |

새 글:

- `/ai-tools/how-to-use-chatgpt-search/`: 실제 공식 Search 문서 기반으로 출처 열기·증거 메모·검색 입력 개인정보 경계를 안내합니다.
- `/troubleshooting/chatgpt-file-upload-problems/`: 파일 선택/전송/내용 해석, 형식/한도/네트워크 문제를 구분합니다.

모든 예제는 가상/수동 예시로 표시했으며, 실제 ChatGPT 계정 테스트·모델 출력·벤치마크·Excel 엔진 실행으로 위장하지 않았습니다. 날짜는 실제 작업일 2026-10-23, 작성자는 GuideHollow Editorial을 유지합니다. 4~6편을 숫자로 채우지 않았고 새 미완성 초안은 없습니다.

## 공식 출처 검증

- 기존 12편 출처 10개: 직접 HTTPS 200 5개, OpenAI 도움말 직접 요청 403 5개.
- 최종 14편 출처 12개: 직접 HTTPS 200 5개, OpenAI 도움말 직접 요청 403 7개. 후자는 웹 도구의 공식 본문/공식 검색 결과를 읽어 관련성을 확인했습니다. 403을 404·접속 정상 200으로 보고하지 않았습니다.
- 오래된 일반 FAQ `6783457`에 남아 있는 옛 기능 설명은 입문 안내 근거로 쓰지 않고 현재 `9125172` home-page 문서로 교체했습니다.
- 주요 공식 자료: [OpenAI prompting](https://help.openai.com/en/articles/10032626-prompt-engineering-best-practices-for-chatgpt), [ChatGPT home](https://help.openai.com/en/articles/9125172-the-chatgpt-home-page), [Microsoft SUMIFS](https://support.microsoft.com/en-us/excel/functions/sumifs-function), [truthfulness](https://help.openai.com/en/articles/8313428-does-chatgpt-tell-the-truth), [Anthropic context](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents), [ChatGPT Search](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt), [uploads](https://help.openai.com/en/articles/8555545-uploading-files-and-audio-to-chatgpt), [network](https://help.openai.com/en/articles/9247338-network-recommendations-for-chatgpt-errors-on-web-and-apps).

상세 글별 판정은 `content-audit.ko.md`, 응답 원문 메타데이터는 `source-url-checks.json`을 참고합니다. 공식 페이지도 낡은 내용을 포함할 수 있으므로 상태 200과 사실 최신성은 구분했습니다.

## SEO와 운영 신뢰

- 태그 14개 URL 유지. 그중 `templates`, `writing`, `spreadsheets`는 글 1편이므로 noindex/follow·사이트맵 제외.
- 2편 기준은 내부 편집 판단이며 Google 요건 또는 승인 보장이 아닙니다.
- HTML 43개, 색인 대상 사이트맵 URL 38개, RSS 14개 글. 검색/404/초안/미래 글/noindex 태그 제외 일관성 검사 통과.
- canonical은 https://guidehollow.com 기준, 글/태그/카테고리/도구/정책의 title/description/robots/JSON-LD 검사 통과.
- Article의 실제 H1·작성자·표시 날짜와 schema를 대조하고, H1만 틀리게 만든 격리 fixture가 실패하는지 확인했습니다.
- Search Console 도메인 TXT와 URL 속성 HTML 메타의 차이·사이트맵 제출은 `adsense-setup.ko.md`에 기록했습니다. 실제 토큰·Google 색인은 **미확인**입니다.

## AdSense 준비 판정

| 상태 | 항목 |
| --- | --- |
| 완료 | Publisher ID 단일 설정, 소유권 메타/ads.txt 생성 경로, 게재와 확인 분리, 보호장치와 격리 회귀 검사 |
| 완료 | 기존 12편 감사·5편 보강·14편 공개 구성, 필수 정책·유효 문의 경로, 내부 링크·모바일·기술 SEO 검사 |
| 사용자 입력 필요 | 실제 AdSense Publisher ID, Search Console/Bing 확인값, 선택적 실제 비공개 이메일·운영자 정보 검토 |
| 별도 외부 설정 필요 | CMP 구성·실제 지역별 동의/거절/철회 검증, 광고 계정 설정 및 심사 신청 |
| 미완료·미확인 | AdSense 소유권 계정 확인·승인·수익화, 실제 Google 색인, 실제 이메일 수신 테스트 |

운영 구성은 Publisher ID/이메일 빈 값, `servingEnabled: false`, `consentReady: false`입니다. 가짜 ID·광고 슬롯·메일 주소·법인·전문가 신원을 넣지 않았습니다. 테스트용 합성 ID/이메일은 삭제되는 임시 빌드에만 존재합니다.

Google의 [사이트 확인 방식](https://support.google.com/adsense/answer/7584263), [ads.txt](https://support.google.com/adsense/answer/12171612), [EEA/UK/스위스 CMP 요구](https://support.google.com/adsense/answer/13554116)를 확인했습니다. 실제 CMP가 없으므로 광고를 켜지 않았습니다. 코드 준비가 승인 완료를 뜻하지 않습니다.

## 실제 검증

| 검사 | 결과 |
| --- | --- |
| npm ci | 통과 |
| npm test | 7개 통과. fixture 내부에 추가 게시/초안/미래 글/소유권 확인/이메일/불완전 동의/H1 오류 검사 포함 |
| npm run check | 오류·경고·힌트 0 |
| npm run build 및 추가 출력 검사 | 43개 HTML / 1,311개 내부 링크·자산 참조 통과 |
| 검색 | 본문 검색으로 새 upload 글 검색됨, Ctrl/Cmd+K 작동 |
| 도구 2개 | 생성·복사·TXT 저장·초기화, 체크 진행·초기화 통과 |
| 본문/프롬프트 복사 | 보강 ledger 복사 통과 |
| JS 비활성 | 글 본문 6,152자 읽힘, 복사 버튼 미삽입, prompt fieldset disabled 및 FormData 필드 0 |
| 모바일/테마/메뉴 | 390px 대표 새 글·표 예제·문의에서 scrollWidth=390, 저장·재로드·메뉴/Escape 통과 |
| 문의 버튼 대비 | 기존 글자/배경 동일색 결함 수정. 라이트 6.86:1, 다크 12.58:1 |
| 접근성 기본 요소 | 색인 대상 38경로에서 이름 없는 링크/버튼·label 없는 필드 없음 |
| 별도 코드 검토 | 차단 결함 없음. 비차단 H1 검증 지적은 수정 및 회귀 검사 |

Lighthouse, 전체 WCAG/스크린리더, 실제 휴대기기/타 브라우저, 실제 ChatGPT 계정 기능·Excel 실행은 미수행입니다. 외부 공식 문서 확인과 GuideHollow 자체 동작 검증을 구분했습니다.

## 병합·배포 기록

- PR: https://github.com/emfls/guidehollow/pull/1 — CI 통과 후 사용자 승인에 따라 병합.
- 작업 코드 커밋: `735ffb108ed0dcfd49268ea9f9d32bf3ba434281`.
- main 병합 커밋: `6bc4ce9357d9062c716ee04a3144fa1e6f44aa2c`.
- PR 검사: https://github.com/emfls/guidehollow/actions/runs/39950647598 — build 성공, deploy는 PR에서 의도적으로 제외.
- 운영 배포: https://github.com/emfls/guidehollow/actions/runs/39950741425 — build 및 deploy 성공.
- 실제 확인: 2026-10-23 21:07 KST. HTTPS로 받은 55개 파일(HTML 43개 포함)이 로컬 빌드와 바이트 단위로 일치했습니다. 상세 경로/결과는 `production-readiness-check.json`.
- `https://guidehollow.com/` 및 새 글·CSV·사이트맵·RSS·JS/CSS 200, `www` → 정규 HTTPS 301. 없는 경로는 전용 페이지와 HTTP 404. ID 없는 `/ads.txt`도 의도대로 404.
- 운영 브라우저: upload 검색 7개 결과에서 새 글 확인, 문의 CTA 정상 표시/공개 게시 경고 유지, 새 Search 글의 canonical 정상, 광고 스크립트 요청 0.
- Google 색인·AdSense 승인·실제 이메일 수신·CMP 동의 처리는 검증하지 않았습니다. 외부 계정/DNS는 변경하지 않았습니다.
- 최종 배포 증거와 작업 완료 문서는 후속 문서 커밋으로 기록합니다. 사이트 런타임 변경은 포함하지 않습니다.

## 남은 작업과 우선순위

1. 운영자가 실제 연락처·운영자 공개 정보·정책 문구를 최종 확인합니다. GitHub 로그인/공개 게시가 어려운 방문자를 위해 비공개 경로가 있으면 좋지만 임의로 만들지 않습니다.
2. 실제 Publisher ID와 소유권 확인값을 받아 검증 설정 경로로 배포합니다. 비밀 키·로그인 자료를 공개 이슈에 게시하지 않습니다.
3. 계정에서 신청·승인을 확인하고, 실제 CMP/데이터 수신자/선택권/개인정보 안내를 준비·검증합니다. 완료 전 광고는 계속 비활성입니다.
4. Search Console 실제 색인과 사용자 질문을 바탕으로 다음 콘텐츠 보강을 결정합니다. 남은 행사 예제를 허구의 사용담으로 바꾸거나 글 수를 무리하게 늘리지 않습니다.
