# 기존 12편 콘텐츠 검수 및 보강 기록

2026-10-23 / 기준 dc5e011. 기존 12편 전체의 원문·메타·공식 출처를 검토했습니다. 단어 수나 임의 품질 점수를 승인 지표로 사용하지 않았습니다.

| 글 슬러그 | 고유 검색 의도·발견 사항 | 조치 | 검증 범위/남는 한계 |
| --- | --- | --- | --- |
| what-is-generative-ai | 입문 개념. 사례는 가상 행사지만 핵심 정의·한계를 구분함 | 유지 | Google LLM/공식 정확성 안내와 관련성 확인. 개인 사용담·벤치마크 없음 |
| getting-started-with-chatgpt | 첫 대화 실행. 기존 공식 FAQ에는 현재 기능과 맞지 않는 옛 설명이 섞여 있음 | 보강 | 현재 home-page 문서로 교체. New chat/텍스트 입력/로그아웃 저장 차이, 지원 티켓 추출 입력·수동 기준 답안 추가. 개인 계정 미실행 명시 |
| how-to-verify-ai-generated-information | 일반 사실 검증. ledger가 설명 예제에 머무름 | 보강 | 복사 가능한 TSV 양식과 supported/contradicted/unresolved에 따른 keep/rewrite/omit 판정 추가. 가상 venue를 실제 출처로 제시하지 않음 |
| ai-privacy-basics | 최소 데이터 공유. 제품 설정·훈련·보존을 구분함 | 유지 | 현재 Data controls 문서 확인. 조직별·법적 판단을 확정하지 않음 |
| how-to-write-better-ai-prompts | 단일 프롬프트 개선. 기존 행사 예제가 입문 글과 반복됨 | 보강 | 릴리스 노트 사례로 교체. 의도적으로 실패한 수동 예문→개선 프롬프트→허용 예문→5개 검사 기준. 실제 모델 응답으로 위장하지 않음 |
| a-practical-ai-prompt-framework | 여러 정보/제약을 4구역으로 조직. 일반 개선 글과 잠재 중복 | 유지 | 자체 체크리스트이며 표준·벤더 승인 방법이 아님을 유지. 템플릿 저장/회귀와 목적을 분리 |
| how-to-build-reusable-prompt-templates | 반복 업무의 입력 계약·템플릿 회귀 | 유지 | Google prompt examples/일관성 문서 확인. ordinary/sparse/conflicting 입력은 제안 검사이며 실험 결과가 아님 |
| how-to-summarize-long-documents-with-ai | 긴 문서의 증거 연결·조건 누락 방지 | 유지 | OpenAI uploads/Anthropic context 문서 확인. 스캔·표는 추출 확인 필요, 특정 요금제 보장 없음 |
| how-to-use-ai-for-spreadsheet-tasks | 수식 요청·검사. 수동 표만 있어 재사용성이 낮음 | 보강 | CSV 다운로드와 독립 초기 상태의 5개 기대값 추가. Node 산술 assertions 통과. Excel 엔진·로캘 실제 실행은 미수행으로 유지 |
| how-to-draft-emails-with-ai | 사실·약속 보존과 전송 전 검토 | 유지 | OpenAI prompting 문서 관련성 확인. 승인되지 않은 약속·자동 전송 금지, 민감정보 최소화 유지 |
| why-ai-gives-wrong-answers | 오류 분류와 최소 근거 수정. 사실 검증 글과 일부 공통 경고 | 유지 | 원인 관찰/추정 구분 유지. 본문 역할은 오류 유형 분류, ledger 글은 증거 판정으로 분리 |
| how-to-handle-ai-context-limits | 긴 대화 복구. 진단 전에 긴 요약으로 이동할 위험 | 보강 | 3페이지 승인/6페이지 폐기/고정 footer를 이용한 격리 진단 절차. compact/old 대화 비교를 context-limit 측정으로 단정하지 않음 |

## 출처 판정

초기 12편의 중복 제거 출처는 10개였습니다. 직접 공개 HTTPS GET에서는 5개 200, OpenAI 도움말 5개 403이었습니다. 403을 404나 문서 부재로 간주하지 않고 웹 도구에서 공식 본문을 별도로 읽었습니다. 직접 응답과 웹 도구 확인을 구분한 증거는 `source-url-checks.json`에 남깁니다.

오래된 `6783457-what-is-chatgpt`는 URL이 열려도 GPT-3.5/2021 이후 정보 등 낡은 설명을 포함하므로, 입문 글에서 현재 `9125172-the-chatgpt-home-page`로 교체했습니다. 다른 기존 공식 링크는 핵심 주장과 관련이 있으며 404로 판정한 링크는 없습니다. 링크가 열린다는 사실과 모든 내용이 현재라는 판단은 구분했습니다.

날짜는 준비·수정 당일인 2026-10-23을 유지합니다. 동일 날짜 보강에 인위적으로 미래 수정일을 만들지 않았습니다. 작성자는 GuideHollow Editorial이며 허구의 전문가 이력은 없습니다.

## 새 글 공개 판단

4~6편을 숫자로 채우지 않고 서로 다른 제품 작업 2편만 추가합니다.

- **AI Tools:** `how-to-use-chatgpt-search` — 웹 검색과 계정 내 검색 구분, 출처 열기·증거 메모, 개인정보 입력 경계. 공식 Search 문서 확인. signed-in 실행/검색 성능 측정은 주장하지 않음.
- **Troubleshooting:** `chatgpt-file-upload-problems` — 파일 선택/전송/내용 해석 분리, 오류 메모 양식, 요율·저장·형식/네트워크 원인 구분. 공식 uploads/network 문서 확인. 실제 계정 오류 재현은 주장하지 않음.

최종 공개 글은 14편이며 AI Tools 2편, Troubleshooting 3편입니다. 새로 만든 미완성 초안은 없습니다. 추가 4~6편 확장은 이번에 수행하지 않았습니다.

## 반복 표현과 다음 검수

공통 출처/가상 예제/제품 미실측 고지는 독자가 검증 범위를 이해하는 데 필요해 유지합니다. 핵심 5편은 입력·실패·검수 목적이 다른 고유 자료로 보강했습니다. 남은 입문 글의 행사 예제는 추후 실제 허가된 작업 사례가 확보되면 교체할 수 있지만, 지금은 경험담을 만들어 채우지 않습니다. Google의 AdSense 품질 판단이나 실제 검색 의도별 성과는 아직 확인하지 않았습니다.
