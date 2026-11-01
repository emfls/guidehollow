---
title: "How to Build a Source-Checked Study Guide With NotebookLM (Gemini Notebook)"
description: "Build a source-checked study guide in NotebookLM (Gemini Notebook): add reference files, inspect citations, generate a report, and audit missing facts."
slug: "notebooklm-source-checked-study-guide"
category: "ai-tools"
tags: ["notebooklm", "gemini-notebook", "study-guide", "source-citations", "google-ai", "source-verification"]
publishedDate: "2026-11-01"
updatedDate: "2026-11-01"
sources: [{"title": "support.google.com — reference", "url": "https://support.google.com/gemininotebook/answer/16206563?hl=en"}, {"title": "support.google.com — reference", "url": "https://support.google.com/gemininotebook/answer/16215270?hl=en"}, {"title": "support.google.com — reference", "url": "https://support.google.com/gemininotebook/answer/16179559?hl=en"}, {"title": "support.google.com — reference", "url": "https://support.google.com/gemininotebook/answer/18323649?hl=en"}, {"title": "support.google.com — reference", "url": "https://support.google.com/gemininotebook/answer/17003757?hl=en"}, {"title": "support.google.com — reference", "url": "https://support.google.com/gemininotebook/answer/16213268?hl=en"}, {"title": "support.google.com — reference", "url": "https://support.google.com/gemininotebook/answer/17004255?hl=en"}]
draft: false
author: "GuideHollow Editorial"
featured: false
---

You have three course documents, but students need a study guide that explains what to learn, which facts are confirmed, and which questions still need a teacher's answer. You could paste all three documents into a general chatbot. A more controlled option is to create a notebook, select the exact source materials, and check the citations behind each generated statement.

Google's current help center calls this product **Gemini Notebook**; many readers know it as **NotebookLM**. Its source-oriented chat and Studio reports make it suitable for building a study guide from a small, reviewable packet. But a generated citation is not a guarantee that the source supports the precise sentence.

This is a practical, source-checking tutorial. Its fictional example is a museum docent training packet. The workflow and settings are based on Google's official help pages reviewed on October 26, 2026. No live Gemini Notebook session or paid-account experiment was performed for this article.

## What makes this different from asking a general chatbot?

The starting point is the **reference collection**. In Gemini Notebook, you create a notebook for a particular question or project and add documents, websites, or other supported sources. The notebook chat can use selected sources and display inline citations linked back to source passages. The Studio panel can create reports such as a study guide or briefing.

That structure is useful when you need to answer, "Where in our packet did this fact come from?" rather than simply, "Can AI write a good explanation?"

It does not eliminate review. A source might be out of date, internally inconsistent, incomplete, or badly imported. A cited passage can also be misunderstood. Keep your instructor or document owner responsible for approving the final guide.

Choose a notebook when you have **bounded, identifiable source material** and a recurring reason to ask questions about it. If you need unrestricted new web research, you must explicitly check what source discovery or external tools are enabled rather than assume every notebook chat searches the open web.

## Step 1: Assemble a small, versioned packet

For a first attempt, use three short, fictional text files. These are teaching fixtures, not museum rules:

- `exhibit-overview-v1.txt`: "The Harbor Gallery orientation includes three exhibit rooms. The guided walkthrough begins in Room A."
- `training-agenda-v2.txt`: "The practice session starts at 1:30 p.m. Participants should meet at the reception desk."
- `visitor-questions-v1.txt`: "Staff will practice explaining the map and welcoming visitors. The photography policy is not included in this document."

Write the filenames, versions, and owners in a separate source register. An example register entry is "training-agenda-v2.txt — approved October 25; replaces training-agenda-v1.txt." That approval sentence is part of the **invented exercise**, not an actual dated museum approval.

Do not upload a real employee list or guest record for a trial. Use permission-cleared sources. Google advises against adding documents that you do not have rights to use.

A small packet exposes errors clearly. Larger collections can be useful, but including every old draft encourages conflicts that a study guide may hide.

## Step 2: Create a notebook and add the sources

On a computer, open [Gemini Notebook](https://notebook.google.com/) and select **Create new notebook**. Google's current instructions describe choosing **Upload a source** in the initial dialog. For an existing notebook, the **Sources** panel offers **+ Add** or **Add sources**.

Upload or paste your three fixtures. Gemini Notebook's official list includes plain text, PDF, Word, Markdown, Google Docs, Google Slides, some images, audio files, web URLs, and other types. Support can vary by file format, account, and platform. The mobile application may not expose every desktop feature.

The Sources panel lets you select or deselect individual sources. When investigating an agenda detail, select the agenda alone. When checking a cross-document statement, enable all relevant files.

**Source selection is part of the test.** If a response cites a document that you intentionally excluded, inspect whether the setting was applied and whether any separate research tool contributed information.

For imported Google Drive files, Google documents automatic updating and a manual sync control, subject to access. Other imported material may be a copy rather than a synchronized source. Check the latest revision and available sync status before reusing old notebook answers.

## Step 3: Ask one question that can be checked

Do not start with "Create the perfect study guide." First establish whether the notebook can identify facts in the packet.

Enter this test question in the Chat panel:

```plain
Using only the three selected training files, report:
1. Where the guided walkthrough begins.
2. The practice session start time and meeting point.
3. Whether the visitor photography policy is stated.

For each answer, identify the source filename and show
a relevant citation if available. If the packet does not
establish an answer, say "Not established by these sources."
Do not fill gaps using general knowledge.
```

The expected source-based answers are "Room A," "1:30 p.m. at the reception desk," and "Not established by these sources." These are derived directly from the three **fictional statements above**, not measured responses produced by Gemini Notebook.

The test matters because it covers three common failure types: silently moving a location, altering a time, and inventing a policy that is absent. Write the expected answers down *before* running the model; otherwise a fluent output can persuade you that an unsupported addition is correct.

Google's chat documentation says selecting a citation lets you navigate to supporting text and review it in context. Hovering may expose a quoted passage. In your own account, click the actual citation instead of accepting a filename mentioned in prose as sufficient evidence.

## Step 4: Check every decisive citation

Suppose an AI answer says, "The practice session starts at 1:30 p.m., in Room A." That sounds plausible, but it merges **two different facts**. The agenda establishes 1:30 p.m. and the reception desk for meeting. The overview says the walkthrough begins in Room A; it does not place the practice session there.

A reviewer should split that answer into separate claims and assess each one. This is an editorial example, not a reproduced model failure.

| Claim from the example | Source support | Decision |
| --- | --- | --- |
| Walkthrough begins in Room A | Exhibit overview | Supported |
| Practice begins at 1:30 p.m. | Training agenda | Supported |
| Meet at reception desk | Training agenda | Supported |
| Practice happens in Room A | No supplied source establishes this | Not established |
| Photography is permitted | Visitor questions does not state policy | Not established |

Do not treat "not established" as "false." Missing evidence does not prove a policy prohibits photography. It means the guide should omit the claim or ask the responsible person for a definitive source.

If two versions conflict, record which one is approved. If approval status is unclear, request clarification instead of declaring that the newest filename automatically wins.

## Step 5: Generate a study guide from the audited packet

Once the factual test passes in your own notebook, use **Studio &gt; Reports &gt; Document**. Google's current report instructions distinguish Document reports from interactive reports; under Document, select a template or suggested format. The notebook creation guide lists study guides, FAQs, briefings, and suggested report types as options.

If a **Study Guide** option appears, choose it. Interface labels may vary with product updates, and Google's help states some report features are available on the web. Treat the official help page and your own current account as the authority for the exact menu.

Request a clearly bounded guide:

```plain
Create a beginner study guide from the selected training packet.

Sections:
- Five learning objectives grounded in the supplied files
- Essential facts with their source citations
- Three review questions with answer keys
- A "Not established" section for missing information
- A checklist for a trainer to verify before sharing

Do not invent visitor policies, fees, room access rules,
or event times. Distinguish walkthrough location from
the practice-session meeting point.
```

The objective is not to force exactly five *new facts* into a short packet. If the sources do not support five distinct learning objectives, a responsible guide should identify the shortage rather than manufacture content.

Google says reports are AI-generated and may be inaccurate. After generation, audit the answer key and every operational instruction against the primary documents before exporting.

## Step 6: Decide whether to save, export, or share

The Chat panel can save selected responses as notes; Google's help documents **Save to note** for retaining response formatting and inline citations. The Studio panel can also generate reports, and the notebook documentation describes exporting certain report outputs to Google Docs or data tables to Sheets.

An export is a new work product, not a source update. Google's help explicitly warns that edits to exported Docs or Sheets do not sync back to the notebook, and the notebook's sharing permissions do not automatically transfer to those files.

If the instructor revises the exported guide, give it a clear version and keep a record of what changed. Never assume that the notebook has learned the corrected version unless you intentionally add or refresh an appropriate source.

Before sharing a notebook, review the full packet. Google's documentation distinguishes **Viewer** access from **Editor** access; editors can manage sources and notes. A chat-focused sharing view may hide source panels visually, but it does **not** guarantee that viewers have lost underlying access to notebook material.

For private training files, sharing only an approved exported guide may be safer than sharing the entire notebook. Follow your organization's permissions and retention requirements.

## Step 7: Know when to use Gemini Notebook or Gemini Apps

Google also documents notebooks in Gemini Apps. Some notebook data and settings synchronize across the two experiences, but their source-grounding and output tools differ.

The official help characterizes notebook chat as source-grounded while Gemini Apps can supplement notebook materials with web searching and other tools. The Gemini Notebook chat help also describes newer experimental capabilities that may search or take actions. **For a source-bounded verification task, explicitly restrict your question to the reviewed files and check any external-source usage.**

Studio-specific artifacts such as Audio Overviews and reports belong to the Gemini Notebook workflow. Do not imply that every Studio feature is available in the ordinary Gemini Apps conversation.

There are also sharing restrictions: Google says notebooks containing certain Gemini chat context are private and cannot be shared. Review integration and collaborator access before mixing personal chat context with a shared study packet.

## Plans, limits, and privacy considerations

Google's current plan reference lists Standard and paid tiers with different notebook and source allowances. As an example of the **documented October 2026 comparison**, Standard lists 50 sources per notebook while the Pro tier lists 300. These figures are subject to change; verify current limits in the official plan documentation before choosing a subscription.

Access can also depend on country, age, account type, and workspace administrator settings. The mobile app may have narrower feature availability than the browser interface.

Google's privacy documentation says notebook content is not used to directly train its foundational AI models unless users choose to provide feedback. It also explains that feedback may expose associated prompts, sources, and outputs to review, while eligible Workspace and Education accounts have different handling. Read the applicable policy before uploading sensitive or licensed material.

No AI-generated report should replace a trained reviewer for legal, medical, safety-critical, or otherwise consequential instructions. Source grounding is an **audit aid**, not a guarantee of correctness.

## A final acceptance checklist

Before distributing any study guide, the reviewer should answer yes to these questions:

- Are the source filenames, versions, and owners documented?
- Are the relevant sources selected and accessible?
- Can each specific date, number, policy, and location be traced to its original passage?
- Are missing or contradictory facts explicitly marked unresolved?
- Do review questions have answer keys grounded in the packet?
- Has a human approved the final exported version and its audience?

The useful output is not simply a neat summary. It is a guide whose **important claims can be inspected**, whose gaps remain visible, and whose recipients receive only the approved information.

## Official Google references and test boundary

- [Create a notebook](https://support.google.com/gemininotebook/answer/16206563?hl=en) — creating notebooks, Studio outputs, sharing, and export restrictions.
- [Add or discover sources](https://support.google.com/gemininotebook/answer/16215270?hl=en) — supported file types, source selection, Drive syncing, and source limits.
- [Use chat in Gemini Notebook](https://support.google.com/gemininotebook/answer/16179559?hl=en) — source citations, chat settings, and experimental features.
- [Generate reports](https://support.google.com/gemininotebook/answer/18323649?hl=en) — Document reports, templates, and error warning.
- [Notebooks in Gemini Apps](https://support.google.com/gemininotebook/answer/17003757?hl=en) — grounding, integration, and sharing differences.
- [Plans and usage limits](https://support.google.com/gemininotebook/answer/16213268?hl=en) — plan-dependent access and allowances.
- [Privacy and terms](https://support.google.com/gemininotebook/answer/17004255?hl=en) — feedback, training, and account differences.

**Review date: October 26, 2026.** The museum course packet, claims, answers, prompts, and evaluation matrix are original fictional teaching fixtures. The fixture classifications were checked against the text in this article. No Gemini Notebook tool, subscription, source import, generated report, screenshot, or real classroom outcome was personally tested.
