# GuideHollow — archive-wide factual evidence audit (2026-11-01)

Scope: **all 31 published English article source files**, read from `src/content/articles/`. This register records independent checks of **material, checkable claims**, linked primary documentation, the scope of worked examples, and the limits of archived evidence. It is *not* a claim that every sentence, historical third-party interface session, or future product change has been independently verified. Nothing here represents a live-model benchmark or an AdSense approval guarantee.

## Evidence method

1. Reviewed each article's front matter, body, citation links, numerical claims, and separation of invented examples from observed results; inspected its actual primary-source references rather than relying on the existence of URLs.
2. Retrieved and inspected the relevant contemporary OpenAI, Google, Microsoft, Anthropic, Adobe, NASA, Atlassian, OWASP, Python, MDN, JSON Schema and GitHub documentation. Checked individual articles' central guidance against the applicable official documentation. Several sources change over time; the conclusions apply to documentation available on the date above.
3. Independently recalculated the published nine-row CSV deduplication example, two numerical mutations, the eight-row routing score (5/8 and 7/8), and the sales-weighted-price fixture (530 / 27; distinct simple mean). Node tests and existing test fixtures protect the deterministic cases.
4. Located the archived original request/response files and observed-result records for older tutorials. These are **publisher-provided records**, not independent evidence that a particular ChatGPT or LibreOffice client actually ran the stated session. Neither the historical account activity nor the original external tool execution was independently replayed.
5. Classified the articles below by their strongest specific factual check and outstanding qualification. All editorial examples describe fictional or constructed scenarios unless explicitly identified as a recorded observation.

### Reading the disposition column

- **Supported**: the article's material external claim or procedure is aligned with checked primary documentation. This does not validate every hypothetical example against real-world conditions.
- **Reconciled**: the check also includes an independently repeatable original fixture or arithmetic validation.
- **Record limitation**: material procedural guidance aligns with primary sources, but a historical product/engine run is only supported by the site's own published transcript/log. Do not use it as an independent model reliability claim.
- **Editorial method**: the article's original decision framework is a recommendation or fictional exercise, not an attributed vendor requirement.

## Per-article register — all 31

| # | Article file | Principal independently checked source or original fixture | Result and qualification |
|---:|---|---|---|
| 01 | `a-practical-ai-prompt-framework.md` | Google Gemini prompt design strategies | **Supported / editorial method** — Goal–Inputs–Boundaries–Output is the site's own organizing model, not a Google-mandated formula. |
| 02 | `ai-clarifying-question-gate-missing-information.md` | OpenAI API prompt engineering, Google Gemini and Claude prompting guidance | **Supported / editorial method** — one-question decision gate is a proposed method; no live universal success-rate claim. |
| 03 | `ai-pdf-summary-missing-tables-ocr-check.md` | Adobe Acrobat OCR, Google Drive OCR, OpenAI file/data analysis | **Supported / record limitation** — OCR behavior and caveats are documented; claimed PyMuPDF sample extraction was not independently rerun in this audit. |
| 04 | `ai-privacy-basics.md` | OpenAI Data controls; GitHub Privacy Statement | **Supported** — minimizing shared data is editorial risk guidance, not a guarantee of privacy for every AI product. |
| 05 | `ai-project-brief-requirements-traceability-matrix.md` | NASA requirements management; Atlassian acceptance criteria and stories | **Supported / editorial method** — fictional requirement codes are not NASA examples or approved product requirements. |
| 06 | `ai-valid-json-without-inventing-data.md` | OpenAI Structured Outputs, JSON Schema, MDN JSON.parse error reference | **Supported** — JSON/schema validation cannot prove source truth; distinction retained. |
| 07 | `api-key-pasted-into-chatgpt-incident-response.md` | OpenAI API key/account security; retention/deletion; GitHub secret-scanning alerts | **Supported** — revocation is issuer-dependent; deleting a chat does not revoke exposed keys. |
| 08 | `audit-ai-csv-duplicate-removal-without-losing-rows.md` | Microsoft COUNTIF/COUNTIFS/CSV/Power Query; Google Sheets COUNTIFS and dedup controls | **Reconciled** — original nine rows total 490, one duplicate removed 410; mutation 485, after two exact duplicates removed 360. |
| 09 | `build-policy-faq-with-ai-without-inventing-rules.md` | OpenAI prompting/truthfulness; Microsoft Document Intelligence document layout | **Reconciled / editorial method** — fictional late charge min(5 × $5, $20) = $20; policy sections are invented and not real rules. |
| 10 | `chatgpt-file-upload-problems.md` | OpenAI upload, Library and network troubleshooting guidance; status-page interpretation | **Supported** — failed upload attempts *can sometimes* count; limits and availability can change. |
| 11 | `chatgpt-projects-recurring-work-setup.md` | OpenAI Projects and Memory help pages | **Supported** — current project memory choices, sharing boundaries and source links checked; plan/workspace variants matter. |
| 12 | `chatgpt-search-vs-deep-research-vs-standard-chat.md` | OpenAI Search, Deep Research and accuracy help pages | **Supported / editorial method** — decision table is an editorial recommendation; no invented plan access guarantee. |
| 13 | `chatgpt-shared-links-audit-revoke-access.md` | OpenAI conversation/task sharing and Business privacy help | **Supported** — shared-link deletion, personal snapshots and separate recipient copies have distinct behavior. |
| 14 | `compare-two-documents-ai-without-missing-changes.md` | Microsoft Word Compare/Track Changes; Google Docs Compare/version history | **Supported / editorial method** — exact edit differences in fictional versions are teaching inputs, not actual Word/Docs benchmark outcomes. |
| 15 | `extract-meeting-action-items-with-ai.md` | OpenAI prompt and truthfulness guidance | **Supported / editorial method** — invented meeting and action records remain labeled source-bounded examples. |
| 16 | `few-shot-prompt-examples-teach-rules-not-keywords.md` | OpenAI, Google and Anthropic prompting guidance; Python Counter documentation | **Supported / editorial method** — sample cases illustrate rule coverage, not a measured model leaderboard. |
| 17 | `getting-started-with-chatgpt.md` | OpenAI ChatGPT home page, Data controls and accuracy guidance | **Supported** — account and feature availability appropriately qualified. |
| 18 | `how-to-build-reusable-prompt-templates.md` | Google Gemini prompting reference; published `prompt-template-run.txt` | **Supported / record limitation** — source text documents an observed ChatGPT example, but the original session was not independently replayed. |
| 19 | `how-to-draft-emails-with-ai.md` | OpenAI prompt-engineering help page | **Supported / editorial method** — fictional email comparison is not a live delivery or customer-response experiment. |
| 20 | `how-to-handle-ai-context-limits.md` | Anthropic Effective Context Engineering | **Supported / editorial method** — a concise source handoff is practical guidance, not a universal token limit or performance guarantee. |
| 21 | `how-to-summarize-long-documents-with-ai.md` | OpenAI file-upload documentation; Anthropic context engineering; published source/response transcript | **Supported / record limitation** — archival prompt/response exists but original ChatGPT execution was not independently recreated. |
| 22 | `how-to-use-ai-for-spreadsheet-tasks.md` | Microsoft SUMIFS documentation; original downloadable CSV and logged Calc workbook checks | **Reconciled / record limitation** — sample expected totals independently checked; LibreOfficeDev UI run is evidenced only by supplied files and not independently repeated in this audit. |
| 23 | `how-to-use-chatgpt-search.md` | OpenAI Search and Library help; original `chatgpt-search-evidence.json` | **Supported / record limitation** — current Library deletion claim confirmed; historic ChatGPT search result remains publisher-recorded only. |
| 24 | `how-to-verify-ai-generated-information.md` | OpenAI truthfulness; Google robots.txt and noindex documentation; original ledger | **Supported / reconciled** — robots.txt does not guarantee index exclusion; Googlebot must access noindex to observe it. |
| 25 | `how-to-write-better-ai-prompts.md` | OpenAI prompt-engineering help; verified 8-case downloadable routing exercise | **Supported / editorial method** — worked examples are explicitly authored, not a measured model improvement. |
| 26 | `revise-one-ai-answer-section-without-changing-approved-text.md` | OpenAI prompting/evaluation guidance; Python string splitlines reference | **Supported / editorial method** — fixed-text preservation is a local test criterion, not universally enforced by prompt instructions. |
| 27 | `spot-prompt-injection-in-documents.md` | OWASP LLM01:2025; OpenAI prompt-injection research | **Supported** — indirect prompt-injection risk does not mean all imperative document text is malicious. |
| 28 | `test-ai-prompts-with-evaluation-dataset.md` | OpenAI and Anthropic evaluation guidance; downloadable 8-case CSV | **Reconciled** — 5/8 and 7/8 are intentionally invented example predictions, verified only as arithmetic. |
| 29 | `verify-ai-weighted-average-price-spreadsheet.md` | Microsoft Excel and Google Sheets SUMPRODUCT/COUNT/pivot docs; browser calculator; CSV | **Reconciled** — 27 units, 530 revenue, weighted price 530/27; simple listed-price mean 153.25; no model benchmark. |
| 30 | `what-is-generative-ai.md` | Google Machine Learning Crash Course; OpenAI truthfulness guidance | **Supported** — general explanation and hypothetical community-garden data clearly separated from real facts. |
| 31 | `why-ai-gives-wrong-answers.md` | OpenAI truthfulness; Google LLM fundamentals | **Supported / editorial method** — error taxonomy diagnoses externally observable failures, not hidden model internals. |

## Findings, decision and unresolved verification

- **Source coverage:** Each of the 31 article source registers contains at least one declared primary reference. Official documentation and selected citation passages were checked on the audit date, with no confirmed major contradiction in the article's central external guidance from this review. Automated tests protect the structure of all 31 source registers; they do *not* assert that external pages cannot subsequently change.
- **Independent mathematical controls:** The original nine-row duplicate-removal data and two modifications are now testable under `tests/editorial-fact-audit.test.mjs`, in addition to the existing weighted-price and prompt-evaluation checks. Hand-written reference scores do not imply real model accuracy.
- **Provenance:** Some guides describe historical ChatGPT/PyMuPDF/LibreOffice results and supply transcripts or logs. A published transcript may help reproduction, but without independent access to the historic run it cannot prove execution provenance. Keep these claims explicitly scoped to publisher records.
- **Search and AdSense:** Index inclusion, source fidelity, and AdSense approval are distinct. This register is not a substitute for Google Search Console's live URL inspection, nor does it guarantee AdSense acceptance.
- **Residual work that cannot be honestly certified by this audit:** Replay of historical signed-in ChatGPT sessions, independent execution of the named LibreOfficeDev version and PyMuPDF binaries, and testing all possible future product UI/plan combinations. Do not present these as completed.

Primary reference starting points: [OpenAI Projects](https://help.openai.com/en/articles/10169521-projects-in-chatgpt), [OpenAI Shared links](https://help.openai.com/en/articles/7925741-sharing-conversations-and-scheduled-tasks-in-chatgpt), [Microsoft SUMIFS](https://support.microsoft.com/en-us/excel/functions/sumifs-function), [Adobe OCR](https://helpx.adobe.com/acrobat/desktop/create-documents/scan-documents-to-pdfs/recognize-text.html), [NASA Requirements](https://www.nasa.gov/reference/6-2-requirements-management/), [OWASP Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/).
