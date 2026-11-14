---
title: "How to Check AI Flashcards Before Importing Them into Anki"
description: "Check AI-written flashcards against source notes, catch duplicate questions, and validate a two-field CSV before trying an Anki import in a disposable profile."
slug: "check-ai-flashcards-before-anki-import"
category: "guides"
tags: ["ai", "anki", "flashcards", "study-workflow", "data-validation"]
publishedDate: "2026-11-14"
updatedDate: "2026-11-14"
sources: [{"title":"Anki Manual: Text Files","url":"https://docs.ankiweb.net/manual/importing/text-files"},{"title":"Anki Manual: Getting Started","url":"https://docs.ankiweb.net/manual/getting-started"},{"title":"Python documentation: csv","url":"https://docs.python.org/3/library/csv.html"}]
draft: false
author: "GuideHollow Editorial"
featured: false
---

An AI assistant can turn a short document into a convincing set of flashcards, including a convincing wrong answer. Importing the file successfully only tells you that the application accepted it. It does not establish that the answers match the source, that the questions are distinct, or that existing notes stayed unchanged.

Use two separate checks: review the meaning against a fixed source, then validate the import file. This guide provides a four-note fictional exercise, a deliberately faulty candidate, and a small local checker. You can inspect the entire example before touching a real study collection. If your starting material combines several documents, first use our [source-checked study-guide workflow](/ai-tools/notebooklm-source-checked-study-guide/).

> **Key takeaways**
>
> - Keep a source reference beside each proposed answer during editing.
> - Reject an invented answer even when the CSV parses correctly.
> - Audit repeated first fields before import; they can affect existing notes.
> - Test a small file in a disposable Anki profile before using your main collection.

## 1. Freeze a small source before generating questions

Start with a document version you can identify again. For this exercise, use the [fictional workshop notes](/examples/anki-import-check/source-notes.txt). They describe the invented Northbank Makerspace and establish four facts:

- The workshop day is **Tuesday**.
- The room is **Studio B**.
- Participants must bring a **printed ticket**.
- The booking keyword is the exact text **Maker, "Basics"**.

These statements are teaching data, not information about an actual venue. The comma and quotation marks in the booking keyword are intentional: an export must preserve them. The source does not establish a ticket price, an opening date, or a cancellation deadline.

Before asking AI for a deck, decide what a useful question should retrieve. A question about the room should ask for the room alone. Combining the room, day, and required item in one answer makes it harder to tell which part you remembered. That is our editing choice for this exercise, rather than a claim about a measured learning benefit.

Keep the source file unchanged while reviewing candidate cards. If someone updates a fact, make a new source version and recheck the affected answers. Do not let an assistant silently modify the evidence to agree with its own questions.

## 2. Ask for questions and evidence before asking for CSV

Review a readable draft before dealing with import syntax. Try this request with the fictional source:

```text
Create four question-and-answer notes from the supplied fictional source.
Use one source fact per question.
For every note, return:
1. Question.
2. Short answer.
3. The exact supporting source statement.
Do not add a date, price, deadline, or eligibility rule.
Preserve the booking keyword exactly, including punctuation.
Flag missing information instead of filling it in.
Do not generate an import file until the answers are reviewed.
```

This is a suggested prompt, not a recorded AI response or a guarantee of compliance. If a model returns a Sunday answer, you still need to notice the disagreement. For a broader way to compare several prompt versions, see our [small evaluation-dataset method](/prompts/test-ai-prompts-with-evaluation-dataset/).

During editing, keep a question, its answer, and its source statement together. The final two-field import file will contain only the question and answer; keep the separate review record so that you can trace a doubtful card later. Copying a source sentence into that record is useful evidence for review, but it does not automatically prove that the question faithfully represents it.

## 3. Catch the two errors in the candidate

Download the [deliberately faulty candidate CSV](/examples/anki-import-check/candidate.csv) and the [reviewed reference CSV](/examples/anki-import-check/reviewed.csv). These are constructed teaching examples, not unedited model outputs.

The reference has four notes, one for each fact. The candidate has five rows: it changes the workshop-day answer from Tuesday to Sunday and repeats the room question. The repeated question uses the same correct answer. That makes it a useful reminder that duplication can be a problem even without contradictory text.

| Check | Reviewed file | Candidate file |
| --- | --- | --- |
| Source-backed day | Tuesday | Sunday: reject |
| Room question | One occurrence | Two occurrences: review |
| Field structure | Two per row | Two per row |
| Overall decision | Reference accepted | Reject candidate |

Both files can be syntactically valid CSV. A format-only checker would miss the invented day. An answer-only inspection could miss the repeated first field. Keep those checks separate so that a successful parser does not become a mistaken quality approval.

The local audit compares the candidate with an editorial answer key: the reviewed file. It can identify these exact differences. It cannot read an arbitrary textbook and decide whether a new question is true. If the reference itself is wrong, matching it is insufficient. Review that reference against the original source first.

## 4. Preserve punctuation when preparing the import file

Use a real delimited-file writer rather than joining question and answer with a comma. Otherwise the booking keyword's comma may become an accidental field boundary. The original keyword must also retain its quotation marks.

[Python's CSV documentation](https://docs.python.org/3/library/csv.html) provides readers and writers that handle delimiters and quoting. For example, this small in-memory round trip preserves the sample answer:

```python
import csv
import io

note = ["What is the booking keyword?", 'Maker, "Basics"']
buffer = io.StringIO(newline="")
csv.writer(buffer).writerow(note)
encoded = buffer.getvalue()
decoded = next(csv.reader(io.StringIO(encoded, newline="")))
assert decoded == note
print(encoded.strip())
```

Expected output:

```text
What is the booking keyword?,"Maker, ""Basics"""
```

The doubled quotation marks belong to the CSV representation. After parsing, the answer contains ordinary double quotation marks around Basics. Do not remove the escaping by hand because the raw file looks unusual.

For this exercise, reject every row that lacks exactly two nonempty fields. Also reject duplicate questions before accepting the file. Those are deliberate local review rules; they avoid relying on an application's handling of incomplete or extra fields. Keep a copy of the approved file outside the app.

## 5. Run the downloadable audit

Place [audit.py](/examples/anki-import-check/audit.py), [source-notes.txt](/examples/anki-import-check/source-notes.txt), [reviewed.csv](/examples/anki-import-check/reviewed.csv), and [candidate.csv](/examples/anki-import-check/candidate.csv) in the same disposable folder. All four files are required. Read the script, then run:

```text
python3 -B audit.py
```

The script reads the two adjacent CSV files and prints a JSON report. It does not edit them or connect to an AI service. The separately published [results.json](/examples/anki-import-check/results.json) records our local run; executing the script prints a fresh result instead of replacing that download.

Look for four reviewed rows, five candidate rows, and candidate issues for the unsupported answer and duplicate question. Its self-checks also exercise missing fields, extra fields, blank values, and punctuation round trips. Inspect the issues, rather than treating a zero process exit code as approval of the faulty candidate. Here a successful script run means that the demonstration detected the expected faults.

If you adapt the source or questions, update and re-review the answer key too. A changed answer should not be accepted by changing the expected result until the source supports it. For suspected invisible-character differences, our [Unicode text-cleanup exercise](/troubleshooting/ai-text-cleanup-unicode-normalization/) shows how to inspect the underlying strings without rewriting originals.

## 6. Preview a small import away from your main collection

The [Anki text-import manual](https://docs.ankiweb.net/manual/importing/text-files) specifies UTF-8 plain text and supports comma-separated fields. Check the detected separator and the mapping of question to Front and answer to Back. For this plain-text exercise, leave HTML interpretation off. A conventional header row is not included in our download.

Use a disposable profile for the trial. A new deck alone may not isolate duplicate matching from other notes. Anki's manual explains that matching first fields can update existing notes of the same note type, depending on the import options and match scope. Inspect those settings before importing.

Choose the standard **Basic** note type for this two-field trial. Anki's [getting-started guide](https://docs.ankiweb.net/manual/getting-started) distinguishes notes from generated cards: Basic produces one card per note, while other types can produce more. Four CSV rows are not a universal promise of four cards.

After a trial, compare the reported additions and updates with your intended four notes. Open each card and check the day, room, ticket, and exact booking keyword. Stop if notes were updated unexpectedly or punctuation changed. Menus vary by version; this section describes checks based on the documentation, not a recorded walkthrough of a live Anki installation.

## What this exercise establishes

We executed the downloadable checker locally and tested the inline CSV round trip. The reviewed four-note reference passed the exercise's structural and uniqueness checks. The five-row candidate was rejected for its changed answer and duplicate question. Input-file preservation and the negative self-checks passed. The recorded JSON includes the exact row counts, issue codes, and input-file hashes.

We did not execute a live AI generation, an Anki import, synchronization, a review session, or a test of learning outcomes. Official documentation was checked on November 14, 2026. A local CSV check supports the file review; it cannot establish the state of your collection or the truth of your course material.

Before importing your own material, review four or five notes against a fixed source and inspect them in an isolated trial. Expand only after their answers, field mapping, punctuation, and duplicate behavior all match your intent.
