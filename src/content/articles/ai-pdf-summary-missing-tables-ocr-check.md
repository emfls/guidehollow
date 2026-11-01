---
title: "AI PDF Summary Missing Tables or Pages? Check OCR Before You Trust It"
description: "Fix AI PDF summaries that miss scanned pages or misread tables. Check text layers, run OCR safely, audit amounts, and use a source-bounded prompt."
slug: "ai-pdf-summary-missing-tables-ocr-check"
category: "troubleshooting"
tags: ["ai", "pdf", "ocr", "scanned-pdf", "tables", "data-verification"]
publishedDate: "2026-10-27"
updatedDate: "2026-11-02"
sources: [{"title": "Adobe Acrobat: Recognize text in scanned documents", "url": "https://helpx.adobe.com/acrobat/desktop/create-documents/scan-documents-to-pdfs/recognize-text.html"}, {"title": "Adobe Acrobat: Fix text issues in scanned PDFs", "url": "https://helpx.adobe.com/acrobat/desktop/create-documents/scan-documents-to-pdfs/fix-scanned-text.html"}, {"title": "Google Drive Help: Convert PDF and photo files to text", "url": "https://support.google.com/drive/answer/176692?hl=en"}, {"title": "OpenAI Help Center: Data analysis with ChatGPT", "url": "https://help.openai.com/en/articles/8437071-data-analysis-with-chatgpt"}, {"title": "OpenAI Help Center: Uploading files and audio to ChatGPT", "url": "https://help.openai.com/en/articles/8555545-uploading-files-and-audio-to-chatgpt"}]
draft: false
author: "GuideHollow Editorial"
featured: false
---

An AI tool can accept your PDF and still give you a summary that misses a scanned page, misreads a table, or changes a number. **Before relying on the answer, test whether the PDF has readable text, check the page coverage, and verify every important figure against the original.** OCR can help with scanned pages, but it does not remove the need for a source check.

This guide explains a practical workflow for scanned reports and mixed PDFs. It includes a fictional expense table with results you can verify yourself, a copy-ready AI prompt, and an independently tested PDF text-layer example. You do not need to know how to code to follow the main steps.

## First diagnose the PDF, not the prompt

PDF pages can contain selectable text, a picture of text, or a mixture. When a page was scanned as an image, ordinary text extraction may return nothing even though you can clearly see words on screen. Adobe explains that OCR, or optical character recognition, adds searchable text to scanned documents. [Adobe's Scan and OCR guide](https://helpx.adobe.com/acrobat/desktop/create-documents/scan-documents-to-pdfs/recognize-text.html) describes the process.

Try this two-minute check using a PDF you are permitted to inspect:

1. **Count pages:** Note how many pages the PDF viewer shows, including appendices.
1. **Try selecting text:** Highlight a sentence on page 1, a middle page, and the last page. Copy it into a plain-text editor.
1. **Search for a distinctive word:** Use the viewer's Find feature on a word you can see. A successful match is useful evidence that text is searchable, not a guarantee that all pages are correctly extracted.
1. **Inspect one table:** Copy two table rows and check whether the columns remain associated with the right values.
1. **Record failures by page:** For example, "page 3: nothing copies" or "page 5: column order breaks."

If selection or search fails, the page may be image-only, but restricted permissions, an unusual font encoding, or the viewer can also be involved. Do not assume every failure proves that the document needs OCR. Try a different trusted viewer, and check permissions before converting anything.

## What a text-layer test actually proved

The same fictional expense report is now available in **two downloadable one-page PDFs**, each showing January travel $120, supplies $80, row total $200; February travel $95, supplies $105, row total $200; and a two-month grand total of **$400**:

1. [Download the selectable-text example PDF](/examples/pdf-ocr-fixtures/fictional-expense-selectable-text.pdf) — ordinary embedded PDF text and drawn table lines.
2. [Download the visually equivalent raster-only PDF](/examples/pdf-ocr-fixtures/fictional-expense-image-only.pdf) — the same example rendered as a single monochrome page image, with no OCR text layer.
3. [Inspect the generated-file manifest](/examples/pdf-ocr-fixtures/manifest.json) — byte sizes, SHA-256 digests, expected page counts, and extraction results. [Read the original offline generation code](https://github.com/emfls/guidehollow/blob/main/scripts/generate-pdf-ocr-fixtures.mjs) to see how these fixtures are made without calling an AI service.

**Reproduced November 2, 2026:** In a local PyMuPDF **1.26.7** check of these exact new PDFs, ordinary `page.get_text()` extracted **263 characters** from the selectable-text file and **0 characters** from the raster-only file; each PDF had one page, and the raster-only page had one embedded image. We rendered both files and visually checked the sample table. These are new downloadable teaching fixtures; their 263-character count **supersedes the earlier, non-downloadable 134-character example**, rather than claiming the old file was preserved unchanged.

To repeat this yourself, open each PDF in a trusted viewer. Try selecting or searching for `Feb 2026`, and compare the visible table. Searching the raster-only PDF will generally require OCR or visual processing by the viewer. If PyMuPDF 1.26.7 is available in an approved local Python environment, you can run this command with each file (replace the filename):

```bash
python -c 'import fitz,sys; p=fitz.open(sys.argv[1]); print(len(p),len(p[0].get_text()),len(p[0].get_images()))' fictional-expense-selectable-text.pdf
```

It prints **page count, extracted character count, and embedded-image count**. Change the filename to `fictional-expense-image-only.pdf` for the second test. This checks ordinary PDF extraction; it does not execute OCR, an AI upload, or an AI summary.

That is a demonstration of ordinary PDF text extraction, **not** evidence that a particular AI product cannot interpret an image-based PDF. Some tools can analyze embedded page images. Capabilities depend on the tool, upload method, and processing route. OpenAI also cautions that extracting exact figures from scanned or visually complex tables can be unreliable. See [Data analysis with ChatGPT](https://help.openai.com/en/articles/8437071-data-analysis-with-chatgpt).

The important question is not simply whether the PDF uploaded successfully. It is which content the tool actually examined.

## If a page is scanned, run OCR on a copy

Keep an unmodified original. OCR may introduce errors, and you need a reliable reference for later comparison.

### Option A: Adobe Acrobat

Adobe's documented desktop workflow is to open the scanned PDF and select **All tools &gt; Scan & OCR &gt; In this file**. Choose the relevant page range and recognition language, then select **Recognize Text**. Tool names or locations may vary by Acrobat version and license. Verify the converted document by selecting and searching for known text.

Adobe also documents a review process for uncertain recognized words. If a total, date, ID, or name is critical, look at the original image rather than trusting the OCR layer alone. See [Recognize text in scanned documents](https://helpx.adobe.com/acrobat/desktop/create-documents/scan-documents-to-pdfs/recognize-text.html) and [Fix text recognition errors](https://helpx.adobe.com/acrobat/desktop/create-documents/scan-documents-to-pdfs/fix-scanned-text.html).

### Option B: Google Drive and Google Docs

For permitted, non-sensitive files, Google documents an OCR conversion workflow: upload a supported PDF or image, right-click it in Drive, and open it with Google Docs. This produces a document containing recognized text. Google's help specifically cautions that tables, columns, footnotes, and some other layout elements may not transfer faithfully. See [Convert PDF and photo files to text](https://support.google.com/drive/answer/176692?hl=en).

**Privacy check:** Uploading to an online OCR service is a separate data-sharing decision. If a PDF contains financial, employee, customer, health, or other confidential records, use your organization's approved local or enterprise workflow instead of uploading it just to make the text searchable. Do not remove document security restrictions unless you are authorized to do so.

## Check tables with a worked example

Imagine a one-page fictional expense report containing this table:

| Month | Travel | Supplies | Row total |
| --- | --- | --- | --- |
| Jan 2026 | $120 | $80 | $200 |
| Feb 2026 | $95 | $105 | $200 |
| Two-month total | — | — | $400 |

The figures have deliberately simple expected results:

- January: $120 + $80 = **$200**
- February: $95 + $105 = **$200**
- Both months: $200 + $200 = **$400**

These are checkable editorial fixtures, not actual expense data or AI output.

Now suppose an AI summary says that February supplies were $150, or that the two-month total was $450. The prose may sound convincing, but the summary disagrees with the source. You should not "repair" it by asking the AI to guess which number is more likely. Open the original PDF, inspect the relevant cells, and correct the extracted table first.

A summary that says "$400, confirmed against the report" is also not trustworthy unless that comparison actually happened. Labels such as *verified* must describe work performed, not just confident wording.

## Copy-ready prompt: extract, audit, then summarize

Use this prompt with an AI tool permitted to process your document. If you have a scanned or complex PDF, first prepare a readable text layer or provide the page images through a supported visual-input workflow. Do not assume the tool inspected every page merely because the attachment is present.

```plain
Review the attached PDF as a source document.

TASK 1 — Coverage
- State the number of pages you could actually inspect.
- Identify any pages, tables, charts, or scanned regions you
  could not read reliably.
- Do not claim all pages were checked unless they were.

TASK 2 — Exact table extraction
- For each numeric table, provide the visible page number
  and the original column headings.
- Copy values as written. Keep units and currency symbols.
- Use "unclear in source" for unreadable cells; do not guess.
- Never silently replace a source value with a calculation.

TASK 3 — Arithmetic check
- Recalculate row totals and stated grand totals separately.
- Mark each as MATCH, MISMATCH, or NOT CHECKABLE.
- Explain a mismatch without inventing missing source values.

TASK 4 — Short summary
- Write no more than five bullets using only inspected content.
- Cite the relevant page for each key claim when available.
- List any omissions and unresolved ambiguities at the end.
- Do not describe an uncertain result as verified.

If you cannot access the file, say so. Do not simulate a review.
```

The order matters: coverage first, extraction next, arithmetic check after that, and only then a short summary. It prevents a tidy narrative from hiding what the tool was unable to read.

Page numbers deserve special care. A report may show printed page numbers that differ from the PDF viewer's page index. In an important report, record which convention you used rather than inventing a citation.

## Five red flags in an AI-generated PDF summary

### 1. It says "all pages reviewed" without a coverage list

**Check:** Compare the total PDF page count with the pages the tool cites or lists. Ask about the missing page numbers directly. A page not mentioned is a follow-up question, not automatically a processing failure.

### 2. It gives an exact total but no underlying cells

**Check:** Recreate the calculation from the original table. If a value is not legible, mark the result **not checkable** instead of guessing.

### 3. It loses negative signs or units

**Check:** Compare minus signs, parentheses indicating negative amounts, percentages, currencies, and decimal separators against the visual original. A visually small recognition error can change the meaning of a financial figure.

### 4. It combines side-by-side columns into one sentence

**Check:** Review the text reading order. OCR or text extraction can interleave columns. Use the original page as the authority and reconstruct the table manually if necessary.

### 5. It treats a chart as if it were a table

**Check:** Some tools can describe a chart's trend but not retrieve every underlying plotted value reliably. If exact numbers matter, prefer the original spreadsheet or accompanying data table. OpenAI's data-analysis guidance specifically recommends a spreadsheet or text-based file for precise values when scanned tables are involved.

## When OCR is not enough

OCR makes text potentially searchable; it does not guarantee accurate reading order, preserved tables, or correct numbers. It is particularly risky when the page contains handwriting, rotated text, tightly packed columns, faint scans, or complex forms.

After OCR, inspect at least the header, one middle page, the last page, every decision-critical table, and any page the AI marks unreadable. For legal, financial, medical, or other high-stakes material, this sampling approach is not a substitute for the level of expert or human review the decision requires.

If the source is originally a spreadsheet, use that original file for exact cells and formulas rather than extracting numbers back out of a PDF. If only a scan is available, record the uncertain values and ask a responsible reviewer to verify them.

## A final five-point check before you share

1. The PDF page count and the AI's inspected-page coverage are recorded.
1. Scanned pages have a reviewed OCR layer or an explicitly supported visual-reading path.
1. Important tables retain their row and column relationships.
1. Every consequential amount, date, code, and unit is compared with the original.
1. The final summary distinguishes **confirmed**, **unclear**, and **not inspected** material.

If these checks fail, fix the source or the extraction before polishing the summary. A correct-looking summary is not a replacement for a readable document.

## Sources and verification notes

- [Adobe Acrobat — Recognize text in scanned documents](https://helpx.adobe.com/acrobat/desktop/create-documents/scan-documents-to-pdfs/recognize-text.html). Product guidance for recognizing text and verifying OCR results.
- [Adobe Acrobat — Fix text issues in scanned PDFs](https://helpx.adobe.com/acrobat/desktop/create-documents/scan-documents-to-pdfs/fix-scanned-text.html). Guidance on reviewing uncertain recognized words.
- [Google Drive Help — Convert PDF and photo files to text](https://support.google.com/drive/answer/176692?hl=en). OCR conversion and formatting limitations.
- [OpenAI Help — Data analysis with ChatGPT](https://help.openai.com/en/articles/8437071-data-analysis-with-chatgpt). Warnings about exact extraction from scanned PDFs and complex visual tables.
- [OpenAI Help — Uploading files and audio to ChatGPT](https://help.openai.com/en/articles/8555545-uploading-files-and-audio-to-chatgpt). PDF file-handling guidance; availability and processing may change.

**What was actually tested (November 2, 2026):** Two downloadable original fictional one-page PDF fixtures were generated from the site's published build script. In the local PyMuPDF 1.26.7 test, ordinary text extraction returned 263 and 0 characters respectively. Both were rendered and visually inspected; the two-month $400 expense total was checked against the displayed rows. The older 134-character unpublished fixture has not been presented as the same file. No OCR engine, AI-summary benchmark, ChatGPT PDF upload, Google Drive conversion, or Adobe Acrobat application session was run for this article.
