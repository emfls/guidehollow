# AdSense·연락처·Search Console 운영 설정

확인일: 2026-10-23. 계정·DNS 설정은 이번 코드 보완에서 변경하지 않았습니다.

## 상태와 입력 위치

| 항목 | 코드 준비 | 현재 운영 상태 | 운영자 작업 |
| --- | --- | --- | --- |
| AdSense 소유권 확인 | 완료 | 사용자 입력 필요 | `src/config.ts`의 `site.ads.publisherId`에 실제 ca-pub ID 입력 |
| ads.txt | 완료 | ID 미제공으로 미생성 | 계정에서 받은 원문과 생성된 `/ads.txt` 대조 |
| 광고 실제 게재 | 안전장치 유지 | 비활성 | 승인·정책·동의 관리 확인 전에는 켜지 않음 |
| CMP·지역별 동의 | 별도 외부 설정 필요 | 미구현·미검증 | 실제 CMP 구성 및 거절/철회/재방문 테스트 |
| 연락처 | 조건부 이메일 경로 완료 | 공개 GitHub Issues만 사용 | 원하면 `site.contactEmail`에 확인된 수신 이메일 입력 |
| Search Console/Bing | 메타 설정 준비 완료 | 실제 소유권·색인 미확인 | 본인 계정의 확인값으로 등록 |

## 광고 확인과 게재를 분리하는 절차

1. AdSense 계정에서 GuideHollow에 사용할 실제 Publisher ID를 확인합니다. 공개 저장소에는 비밀 키·로그인 토큰을 넣지 않습니다. Publisher ID 자체는 공개 HTML에 들어가는 식별자입니다.
2. `site.ads.publisherId` 하나만 설정하고 `servingEnabled: false`, `consentReady: false`를 유지합니다. 새 브랜치에서 테스트·검사·빌드를 통과시킵니다.
3. 배포된 홈페이지의 **원본 HTML**에서 `google-adsense-account` 값이 계정 값과 같은지 확인합니다. `/ads.txt`는 `google.com, pub-실제번호, DIRECT, f08c47fec0942fa0` 형식이어야 합니다. 이 문서의 설명 문자열을 실제 ID로 사용하지 않습니다.
4. 광고 스크립트 요청이 발생하지 않는지 브라우저 Network에서 확인합니다. 단순 ID 입력은 사이트 확인용 메타·ads.txt만 생성합니다.
5. 계정에 표시되는 소유권 확인 방식으로 Verify/Request review를 진행합니다. 이 계정 조작은 운영자가 수행합니다. 코드 준비가 계정 확인·승인 완료를 뜻하지 않습니다.

근거: [AdSense 사이트 연결](https://support.google.com/adsense/answer/7584263), [ads.txt 안내](https://support.google.com/adsense/answer/12171612). Google은 메타태그 확인 방식을 제공하며 ads.txt 사용은 권장 사항입니다. 계정 화면의 최신 안내를 우선합니다.

## 광고 시작 전 실제 동의 관리

Google 공식 문서는 EEA/UK 및 스위스에 개인 맞춤 광고를 제공할 때 Google 인증 CMP와 IAB TCF 통합을 요구합니다. 인증 CMP를 쓴다고 모든 개인정보 관련 의무가 자동 충족되는 것은 아닙니다. 비개인화·제한적 광고도 임의로 무쿠키라고 단정하지 않습니다.

근거: [지역별 CMP 요구사항](https://support.google.com/adsense/answer/13554116), [CMP 설정·광고 옵션](https://support.google.com/adsense/answer/7670013?hl=en).

실제 게재 전 체크:

- 대상 국가·광고 유형·실제 데이터 수신자를 운영자가 확인합니다.
- 계정에서 선택한 CMP를 실제 사이트에 연동하고 안내 언어와 선택지를 검토합니다.
- 동의 전·거절·선택 동의·동의 철회·재방문 각각에서 광고/저장소/요청 동작을 확인합니다.
- 광고 제공자, 식별자·쿠키/로컬 저장소, 처리 목적, 관련 링크, 선택·철회 경로가 개인정보 안내와 일치하도록 바꿉니다.
- 운영자 연락 경로, 데이터 요청 처리 및 해당되는 기타 지역 규칙을 검토합니다.
- 계정 승인과 위 검증이 끝난 뒤에만 `consentReady` 및 `servingEnabled`를 켭니다. 이 불리언은 CMP의 대체물이 아닙니다.
- 실제 광고 단위 ID가 있는 경우만 공통 AdSlot 컴포넌트를 사용합니다. Auto ads 설정도 계정에서 확인합니다.

이번 작업에서는 CMP·광고 계정을 조작하지 않았고, 동의 배너나 광고 요청을 임의로 넣지 않았습니다.

## 실제 연락처를 준비하는 절차

이메일을 제공하지 않은 상태에서는 GitHub Issues 링크를 유지합니다. GitHub 계정이 필요하고 내용이 공개된다는 안내도 유지합니다. 비공개 정보가 필요한 문의를 공개 이슈로 받지 않습니다.

이메일을 쓰려면 운영자가 수신 가능한 주소와 공개해도 되는 주소임을 먼저 확인합니다. `site.contactEmail`에 입력하면 Contact의 mailto 링크와 Privacy의 이메일 제공자/메시지 처리 안내가 함께 표시됩니다. 서버 문의 폼이나 별도 추적기를 만들지 않습니다. 실제 수신·답장·보존 및 삭제 절차는 운영자가 검토해야 합니다. 현재 빈 값이며 임의 연락처·실명·법인명·자격은 추가하지 않았습니다.

## Search Console 소유권과 사이트맵

두 방법 중 본인 관리 범위에 맞는 방법을 선택합니다.

- **도메인 속성:** Search Console에서 `guidehollow.com` 도메인 속성을 만들고 Google이 제공한 정확한 DNS TXT 값을 등록합니다. 기존 A/CNAME을 바꾸거나 이 문서에서 가짜 TXT를 만들어 쓰지 않습니다. 이 방식에는 HTML 메타태그를 대신 사용할 수 없습니다.
- **URL 접두어 속성:** `https://guidehollow.com/`으로 만들고 HTML 태그 방법을 선택합니다. Google이 제공한 content 값만 `site.verification.google`에 입력하여 배포한 뒤, 공개 홈페이지 원본 head에서 확인하고 Search Console에서 Verify를 실행합니다. 확인 후에도 토큰을 유지합니다.

소유권 확인 후 Sitemaps에서 `https://guidehollow.com/sitemap.xml`을 제출합니다. URL Inspection으로 대표 글의 색인 상태를 별도로 확인합니다. 사이트맵 응답 200이나 제출 성공은 색인 완료를 뜻하지 않습니다. Bing은 실제 확인값을 `site.verification.bing`에 사용합니다.

근거: [Google Search Console 소유권 확인](https://support.google.com/webmasters/answer/9008080?hl=en).
