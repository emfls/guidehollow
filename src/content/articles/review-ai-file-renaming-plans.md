---
title: "How to Review AI File-Renaming Plans Before Changing Any Files"
description: "Review AI-proposed filenames with a read-only exercise that flags name collisions, path changes, and extension changes before you consider a real rename."
slug: "review-ai-file-renaming-plans"
category: "guides"
tags: ["ai", "file-management", "data-validation", "python"]
publishedDate: "2026-11-16"
updatedDate: "2026-11-16"
sources: [{"title":"Python documentation: os.rename","url":"https://docs.python.org/3/library/os.html#os.rename"},{"title":"Microsoft Learn: Naming Files, Paths, and Namespaces","url":"https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file"},{"title":"Python documentation: pathlib pure paths","url":"https://docs.python.org/3/library/pathlib.html#pure-paths"}]
draft: false
author: "GuideHollow Editorial"
featured: false
---

An AI assistant proposes tidy names for a folder of documents. Two scans become the same invoice name, a notes file gets a parent-directory path, and the output still looks organized. Running that plan immediately could change more than you intended.

Review the mapping first: which original file becomes which new name, which files remain untouched, and which proposals conflict. This guide supplies a fictional inventory, a deliberately flawed plan, and a read-only checker. It does not rename documents or provide a batch-execution command.

The goal is a reviewable plan with specific unresolved issues. A passing name check is one piece of evidence, not permission to modify a real folder. If you are also cleaning records inside an export, keep that separate from renaming the file; our [CSV deduplication audit](/guides/audit-ai-csv-duplicate-removal-without-losing-rows/) explains why removing repeated-looking records needs its own review.

> **Key takeaways**
>
> - Preserve an exact original-to-proposed mapping and include untouched files in the inventory.
> - Check the complete batch for collisions, including names that differ only in letter case.
> - Treat a folder change or extension change as a separate request.
> - Use a disposable copy and verified recovery path before any real execution.

## 1. Freeze the inventory and define the allowed change

Download the [fictional inventory](/examples/rename-plan-review/inventory.json). It contains five entries: four proposed rename sources and one file to leave alone. The labels are invented teaching context, not observations from documents on your computer.

- A: `scan_001.pdf`, described as the North October invoice.
- B: `scan_002.pdf`, described as the South October invoice.
- C: `notes_draft.txt`, team notes.
- D: `roster.csv`, a staff roster.
- KEEP: `summary.txt`, unchanged.

The labels help explain useful proposed names, but the checker does not open a PDF or verify what it contains. For real work, use descriptions you have authorized and checked. Do not let a model infer an invoice date, customer, or document status from a filename alone.

Our exercise permits only a new basename in the same folder and preserves the final extension. It uses a deliberately narrow ASCII naming policy and treats case-only target differences as collisions. It rejects targets already listed in the original inventory, so chains, swaps, and case-only renames need a different review rather than an execution-order guess.

This policy is an editing constraint for the exercise, not a complete definition of valid names on every operating system. Keep the inventory and the approved scope beside the plan. An inventory that omits a real destination file cannot reveal that conflict.

## 2. Ask AI for a proposal, not a command

Request a mapping that can be inspected without changing anything:

```text
Propose new basenames for A, B, C, and D in this fictional inventory.
Return the original ID, exact original basename, proposed basename,
and a short reason for each proposal.
Keep all files in the same folder and preserve each final extension.
Do not alter KEEP or invent document facts.
Use only ASCII letters, digits, periods, hyphens, and underscores.
Do not reuse a target name, including case-only variations.
Do not target any existing inventory filename.
Do not write a shell command or execute a rename.
Mark uncertain descriptions for review.
```

This is a suggested prompt, not a recorded model response. The restrictions make the desired output clearer; they do not prove that an assistant followed them. Retain the original ID and name even when the proposed name looks obvious. That lets you detect a proposal attached to the wrong source.

For confidential documents, give an assistant an authorized, sanitized inventory rather than uploading the files unnecessarily. A descriptive filename can itself disclose private information. Decide which details are appropriate to include before preparing that inventory.

## 3. Review the whole batch for collisions

The [constructed candidate plan](/examples/rename-plan-review/candidate.json) contains four proposals. It deliberately makes two mistakes affecting three rows:

| Source | Proposed target | Review result |
| --- | --- | --- |
| A | `invoice-2026-10.pdf` | Conflicts with B |
| B | `INVOICE-2026-10.pdf` | Conflicts with A |
| C | `../notes.txt` | Not a permitted basename |
| D | `staff-list.csv` | No detected policy issue |

Our conservative comparison ignores letter case for target uniqueness. Both A and B must be flagged; choosing the first row and rejecting only the second would conceal the unresolved collision. [Microsoft's filename guidance](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file) cautions against assuming case sensitivity. The review policy remains the same even if a particular filesystem could store both names.

C requests more than a name. It includes a parent-directory component, which is outside this exercise's same-folder scope. Do not repair it by silently stripping the prefix: that would create a different proposal requiring review.

D passes only the checks represented by the supplied inventory and policy. That does not establish that a real `staff-list.csv` is absent, that the source exists, or that a synchronized application will tolerate the change. The overall candidate batch remains **HOLD**.

## 4. Check untouched names and extensions too

Compare every proposed target with the full original inventory, including `summary.txt`. If C were instead proposed as `summary.txt`, it would collide with the unchanged file. A checker that looks only at the rename rows could miss that.

Also inspect the extension. Renaming `roster.csv` to a `.pdf` name does not convert the document into a PDF. In this exercise, an extension change is a rejected scope change. Do not accept it because the resulting name looks more polished.

Why review before execution? [Python's `os.rename` documentation](https://docs.python.org/3/library/os.html#os.rename) describes different existing-destination behavior: on Windows an existing destination raises an error; on Unix a permitted file-to-file rename can replace the destination silently. These are documented behaviors, not operations we ran for this guide. Do not rely on an assumed error to protect an existing document.

Keep a reason beside each flagged row. “Target conflicts with untouched summary” is actionable; a generic “unsafe” label is harder to resolve. Ask for a revised plan that addresses the named issue without changing unrelated entries.

## 5. Run the read-only plan exercise

Place [audit.py](/examples/rename-plan-review/audit.py), [inventory.json](/examples/rename-plan-review/inventory.json), and [candidate.json](/examples/rename-plan-review/candidate.json) in the same disposable folder. These three files are required. Inspect the script, then run:

```text
python3 -B audit.py
```

The script reads the adjacent JSON inputs and prints a report. It does not inspect your document folders, run shell commands, or rename, move, overwrite, or delete files. The [recorded results](/examples/rename-plan-review/results.json) are a separate saved output, not a required input or an execution plan.

Expect five inventory entries, four proposals, three flagged rows, one clear row, and a batch decision of HOLD. The self-checks exercise collisions, an existing untouched target, an unknown source, duplicate source mappings, path separators, extension changes, and malformed fields. A revised in-memory example with distinct basenames passes the stated policy checks.

The download is a fixed demonstration: it asserts the original candidate's expected HOLD result and tests the revised plan in memory. Editing the input files can therefore trigger an assertion; it is not a ready-made validator for your own folder inventory.

Successful completion means those demonstration checks ran as expected. It does not mean the deliberately flawed plan passed. Inspect the row-level issue codes and the batch decision together.

The script works on strings and the provided manifest. Python's [pure-path documentation](https://docs.python.org/3/library/pathlib.html#pure-paths) distinguishes computational path operations from filesystem access. A name or suffix calculation does not establish what is actually on disk. This exercise does not certify complete Windows naming compatibility, Unicode equivalence, path-length limits, symbolic-link handling, permissions, or protection against a folder changing after review.

## 6. Revise the mapping before considering execution

A and B need distinct, justified names. For this invented inventory, names that retain the North/South distinction would resolve the demonstrated target collision. C needs a permitted same-folder basename. Recheck the entire revised batch; a fix for one row can introduce another conflict.

Keep both the original and revised plans. For a real folder, stop if the inventory has changed while you were reviewing it. Rebuild and review the inventory rather than assuming an earlier clear result still applies.

Before any real execution, confirm the exact folder, source identities, complete destination inventory, backup, and recovery method. Try the approved process on disposable copies and inspect the results before applying it to important originals. This guide intentionally stops at plan review and does not supply a rename executor.

If different-looking text or invisible characters affect a comparison, investigate the representations separately with our [Unicode text-cleanup exercise](/troubleshooting/ai-text-cleanup-unicode-normalization/). Do not remove distinctions from identifiers merely to make a collision check pass.

## What we tested

We executed the downloadable audit on the fictional inventory and candidate, checked its negative cases and revised in-memory example, and verified that input bytes stayed unchanged. The recorded report identifies the Python runtime and input hashes. A and B share a collision flag, C has a basename-policy flag, and D has no detected issue; the candidate batch is held.

No real documents were scanned or renamed, no operating-system overwrite behavior was exercised, and no live AI response was benchmarked. Official references were checked on November 16, 2026. The examples establish a bounded review procedure, not a guarantee of safe execution on an arbitrary filesystem.

Start with a small authorized inventory and ask for a mapping only. Resolve every flagged row, retain the plan's evidence, and review the actual environment before deciding whether to execute anything.
