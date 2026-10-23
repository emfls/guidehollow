# GuideHollow 구현·배포 결과

검증일: 2026-10-23, 약 20:25 KST. 상세 증거는 [verification.md](verification.md), 운영 방법은 [README.md](../README.md)에 있습니다.

## A. 구현 완료

- Astro 7.4.2, TypeScript, Content Collections, Markdown 기반 정적 영문 사이트.
- 홈페이지, 5개 카테고리, 12개 가이드, 14개 태그 페이지, 필수 정보 페이지 5개, 검색, 무료 도구 2개, 404: 총 HTML 파일 41개.
- 홈: 터미널 히어로, 검색, Start Here, 카테고리, Featured Guides, AI Tool Guides, Prompt Library, Free Tools, Latest Articles, 푸터.
- 반응형 레이아웃, 시스템 테마 감지, 라이트/다크 전환·저장, 키보드 검색 바로가기, 모바일 메뉴, skip link, reduced-motion 대응.
- 글마다 검증된 프런트매터, 발행·수정일, 자동 목차, 프롬프트 복사, 공식 출처, 태그, 관련 글.
- 검색은 전체 글 본문을 포함하는 정적 JSON 색인으로 작동하며 외부 검색 API를 호출하지 않습니다.
- AI Prompt Builder: 5개 입력, 구조화된 프롬프트, 복사, TXT 다운로드, 초기화. AI 호출 없이 입력을 조합합니다.
- AI Response Quality Checklist: 6개 확인 항목, 완료 수·진행 상태, 초기화. 정확성 인증으로 표시하지 않습니다.
- 입력을 서버에 저장하거나 유료 API를 호출하지 않습니다. 기존 EMFLS 프로젝트는 수정하지 않았습니다.

### 초기 가이드 12편

1. What Is Generative AI? A Beginner’s Guide
2. How to Get Started with ChatGPT
3. How to Verify AI-Generated Information
4. AI Privacy Basics for Everyday Users
5. How to Write Better AI Prompts
6. A Practical AI Prompt Framework
7. How to Build Reusable Prompt Templates
8. How to Summarize Long Documents with AI
9. How to Use AI for Spreadsheet Tasks Safely
10. How to Draft and Improve Emails with AI
11. Why AI Sometimes Gives Wrong Answers
12. How to Handle AI Context Limits

각 글은 예제·프롬프트·주의사항·문제 해결·요약·공식 출처를 포함합니다. 작성일과 수정일은 2026-10-23입니다. AI 보조 작성 사실과 가상 예제임을 공개했습니다. 제품별 실측 성능, 실제 Excel 실행, 허위 사용자 경험을 주장하지 않습니다. 20편으로 숫자를 늘리지 않고 12편을 완성했습니다. 사실 불확실성 때문에 숨긴 별도 초안은 없습니다.

## B. GitHub

- 저장소: https://github.com/emfls/guidehollow (기존 저장소 사용).
- 브랜치: `main`.
- 구현 커밋: `ae746e0a6eac6962e4fed358ad99472ad362ff8a`.
- 최초 배포: https://github.com/emfls/guidehollow/actions/runs/39945686611 — build/deploy 모두 성공.
- GitHub Actions 소스 및 저장소 Custom domain을 설정했습니다. 다른 EMFLS 저장소에 변경하지 않았습니다.
- main push → 잠금 파일 설치 → 테스트 → 타입/콘텐츠 검사 → 정적 빌드·출력 검사 → 공식 Pages 아티팩트 업로드·배포.
- PR은 검증만 수행합니다. main 배포는 동시 실행 충돌을 방지하며, 배포 작업만 pages/id-token 쓰기 권한을 가집니다.
- 검증 문서는 별도 후속 문서 커밋으로 기록합니다.

## C. 사이트 접속

| 항목 | 결과 |
| --- | --- |
| https://guidehollow.com/ | HTTPS 200, 실제 사이트 확인 |
| https://www.guidehollow.com/ | 301 → https://guidehollow.com/ |
| http://guidehollow.com/ | 301 → https://guidehollow.com/ |
| 인증서 | GitHub 승인, apex/www 포함, HTTPS 강제 활성 |
| DNS | 기존 A 4개와 www CNAME 정상 확인, 직접 변경하지 않음 |
| 운영 파일 일치 | HTML·CSS·JS·이미지·피드 등 52개가 로컬 SHA-256과 일치 |
| 없는 주소 | 실제 HTTP 404와 전용 페이지 |

## D. SEO

- 사이트맵: https://guidehollow.com/sitemap.xml
- robots: https://guidehollow.com/robots.txt
- RSS: https://guidehollow.com/rss.xml
- 페이지별 title/description/canonical, OG, X 카드, 기본 1200×630 소셜 이미지.
- Organization/WebSite/BlogPosting/BreadcrumbList 구조화 데이터.
- 카테고리·태그·관련 글·실제 heading anchor 링크 검증.
- canonical은 모두 guidehollow.com 기준이며 `/guidehollow/`를 붙이지 않습니다.
- 초안·미래 날짜 콘텐츠는 사이트·검색·RSS·사이트맵에서 제외하며 회귀 테스트로 확인했습니다.
- 검색과 404는 noindex이며 사이트맵에서 제외합니다.
- 운영 검색 작동 확인. 검색엔진 소유권 확인·실제 색인 여부는 아직 검증하지 않았습니다.

## E. AdSense

완료: 원본 가이드, 탐색, 필수 정보 페이지, 모바일 가독성, 정상 링크, 크롤러 접근, 검증 코드 설정, 실제 광고 슬롯 컴포넌트, 조건부 ads.txt 생성 구조.

Publisher ID를 제공받지 않아 광고는 꺼져 있으며 `/ads.txt`는 의도적으로 없습니다. `src/config.ts`의 `site.ads.publisherId`에 실제 ID를 넣으면 확인 메타태그와 ads.txt가 생성됩니다. 광고 요청은 별도 serving/consent gate로 보호합니다.

실제 CMP 연동은 아직 없습니다. Google 요구사항에 맞는 동의 관리를 구현·검증하고 개인정보 안내를 갱신한 뒤 광고를 활성화해야 합니다. 현재 정책은 실제 무광고·무분석·브라우저 로컬 도구 동작을 설명합니다. AdSense 승인은 신청·확인하지 않았으며 보장하지 않습니다.

## F. 사용자 작업

1. **연락처·운영자:** 운영자 표시와 정책 문구를 최종 검토하고, 비공개 문의를 받으려면 실제 이메일 등 연락 경로를 확정합니다. 현재는 활성화된 공개 GitHub Issues가 문의 경로이며 GitHub 계정이 필요합니다.
2. **Search Console/Bing:** 본인 계정에서 소유권 확인 토큰을 받습니다. URL 속성이면 `site.verification.google/bing`, Search Console 도메인 속성이면 Google이 지정하는 DNS TXT를 사용합니다. 이후 사이트맵을 제출합니다.
3. **AdSense:** 실제 Publisher ID를 제공·입력하고 계정에서 사이트 심사를 신청합니다.
4. **광고 활성화 전:** 적용 지역의 CMP와 광고 동의, 정책 안내를 구현·검증한 뒤 serving/consent gate를 활성화하고 실제 광고 단위 ID를 연결합니다.

DNS 레코드·Pages Actions·Custom domain·HTTPS는 현재 확인된 범위에서 완료되어 추가 입력이 필요하지 않습니다. 도메인 소유권 검증 상태는 별도 확인하지 않았으므로 GitHub 계정의 도메인 검증 설정도 검토할 수 있습니다.

## G. 검증

| 검사 | 결과 |
| --- | --- |
| npm install 및 최종 npm ci | 통과 |
| 테스트 4개 | 통과 |
| Astro/TypeScript 검사 | 오류·경고·힌트 0 |
| Astro 정적 빌드 | 통과 |
| HTML/내부 링크·자산 | 41개 HTML / 1,212개 참조 통과 |
| 추가 글·추천 글 변경·초안·미래 글 회귀 | 통과 |
| 브라우저 검색·입력 안전성 | 통과 |
| 프롬프트 생성·복사·TXT 내용·초기화 | 통과 |
| 체크리스트 완료·초기화 | 통과 |
| 모바일 390px·데스크톱·테마·메뉴 | 대표 화면 검사 통과 |
| 저장 차단·reduced-motion | 검사 통과 |
| 접근성 기본 요소 | 사이트맵 39개 경로에서 누락된 label/이름/기본 landmark 없음 |
| RSS·사이트맵 XML | 파싱 통과 |
| Actions·실서버·HTTPS·리디렉션·404 | 통과 |

전체 WCAG 감사, 실제 스크린리더, Safari/Firefox, 실제 휴대기기, Lighthouse 점수는 측정하지 않았습니다. 개인정보·이용약관의 최종 운영자 검토와 광고 동의 관리가 남아 있습니다. Ego Lite 업데이트 알림은 확인했지만 현재 작업 범위에서 브라우저를 업그레이드하지 않았습니다.
