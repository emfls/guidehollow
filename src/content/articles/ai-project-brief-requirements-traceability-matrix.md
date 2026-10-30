---
title: "How to Build a Requirements Traceability Matrix with AI Without Inventing Scope"
description: "Turn a project brief into a source-linked AI requirements matrix. Separate approved scope from proposals, open decisions and exclusions with a tested example."
slug: "ai-project-brief-requirements-traceability-matrix"
category: "guides"
tags: ["ai", "project-brief", "requirements", "traceability", "workflows", "source-verification"]
publishedDate: "2026-10-30"
updatedDate: "2026-10-30"
sources: [{"title": "www.nasa.gov — reference", "url": "https://www.nasa.gov/reference/6-2-requirements-management/"}, {"title": "www.nasa.gov — reference", "url": "https://www.nasa.gov/reference/system-engineering-handbook-appendix/"}, {"title": "www.atlassian.com — reference", "url": "https://www.atlassian.com/work-management/project-management/requirements-gathering"}, {"title": "www.atlassian.com — reference", "url": "https://www.atlassian.com/work-management/project-management/acceptance-criteria"}, {"title": "www.atlassian.com — reference", "url": "https://www.atlassian.com/agile/project-management/user-stories"}]
draft: false
author: "GuideHollow Editorial"
featured: false
---

A project brief may describe what a team wants, what it has approved, and what is still being discussed—all in the same document. When you ask an AI assistant to "turn this into requirements," it can quietly promote a proposed feature into a commitment, fill in an unassigned owner, or write acceptance criteria nobody approved.

**The safer approach is a source-linked requirements traceability matrix:** every extracted requirement points back to a specific approved statement, while proposals, open decisions, and excluded work stay visible but separate. This guide includes a complete fictional brief, a six-row reference matrix, and an independently checked completeness test.

## Why a polished AI requirements list can be misleading

A requirements traceability matrix is not simply a to-do list. It connects a requirement with its origin and the evidence that will eventually demonstrate whether it was met. NASA's systems engineering requirements management guidance emphasizes recording bidirectional traceability and identifying self-derived requirements rather than quietly treating them as approved source requirements. That formal engineering approach is more rigorous than most office projects need, but the principle—**know where each requirement came from**—also helps with a small internal tool.

Atlassian's requirements gathering guidance similarly distinguishes in-scope requirements, out-of-scope items, assumptions, acceptance criteria, and open questions. These categories should not be merged for convenience.

In the example below, a suggested SMS reminder is not an approved feature. An unanswered question about who approves applications is not evidence that the coordinator is responsible. And something explicitly excluded should not appear in the delivery backlog as if it were required.

## Step 1: Freeze one source version and label its authority

Before using AI, confirm which project brief is the current working version. If a source says "draft" or "proposal," preserve that status. Use its actual approval record if available; do not invent one based on a document's title or modification date.

For a real project, record the source document's name, version, location, and the responsible reviewer. Keep the original unchanged and produce the traceability matrix as a separate working artifact. If another document conflicts with it, raise the conflict before converting either statement into an actionable requirement.

For confidential internal plans, use only an AI service and file-sharing configuration approved by your organization. You can also paste a fictional or redacted fixture to test your workflow before using actual material.

## Step 2: Copy the fictional nine-line project brief

The project below is a made-up volunteer-shift signup tool. It is an editorial fixture, not a specification for a real organization.

The words APPROVED, PROPOSED, OPEN, and EXCLUDED are part of the fictional source. Treat them as labels to preserve, not invitations for an AI model to make decisions.

```plain
B1 | APPROVED | The volunteer signup form requires name, email address, and selected shift.
B2 | APPROVED | The form lists available shifts for the next 14 calendar days.
B3 | APPROVED | Successful submission displays a confirmation code.
B4 | APPROVED | Coordinators can export approved signups as CSV.
B5 | APPROVED | A volunteer may change their selected shift until 24 hours before the shift begins.
B6 | APPROVED | The form must support 375 px and 768 px viewport widths.
B7 | PROPOSED | An SMS reminder 2 hours before a shift was suggested but not approved.
B8 | OPEN | Who approves new signups has not been decided.
B9 | EXCLUDED | Online payments are excluded from the current release.
```

The first six lines are approved features or constraints **within this fictional exercise**. B7 is only an idea, B8 is unresolved, and B9 is explicitly out of scope.

Notice how easily extra assumptions could slip in. The brief mentions a confirmation code, but not a confirmation email. It mentions CSV exports, but not their column order. It gives two viewport widths, but does not specify a design system. It says nothing about sign-in, passwords, SMS providers, budget, delivery dates, or the identity of the approval owner.

## Step 3: Extract only approved requirements into a matrix

Make a row for each approved source statement. Keep the source ID in a separate column; do not rely on an AI-generated sentence as its own evidence.

| Source | Source-grounded requirement | Proposed verification approach |
| --- | --- | --- |
| B1 | Signup requires name, email, selected shift | Check the three fields; test blank-field handling |
| B2 | Show shifts in next 14 calendar days | Inspect shown dates and ask about interval boundary |
| B3 | Show a code after successful submission | Submit a valid test signup and inspect display |
| B4 | Coordinators can export approved signups as CSV | Check export access and resulting file contents |
| B5 | Allow shift change until 24 hours before start | Test either side of the cutoff; clarify exact boundary |
| B6 | Support 375 px and 768 px viewport widths | Inspect layout at both widths |

**The third column proposes checks; it is not an approved test plan.** For example, blank-field handling is a reasonable way to investigate B1, but the brief does not dictate a particular error message or validation method. Similarly, testing a point exactly 24 hours before the shift reveals a useful ambiguity, rather than proving the requirement already defines the boundary precisely.

NASA's example requirements verification matrix links individual requirements to a source and to a verification approach. In a small workplace project, you can adapt that structure while acknowledging that the example matrix above is only a preparation aid, not an official NASA-compliant verification package.

## Step 4: Put the remaining three lines in a decision register

Do **not** delete ideas and gaps from your working notes. Keep them visible without mixing them into the approved delivery scope.

| Source | Status | What the team still needs |
| --- | --- | --- |
| B7 | Proposed, not approved | Decide whether SMS reminders belong in scope |
| B8 | Open decision | Identify who has signup approval authority |
| B9 | Excluded | Keep online payments out of this release |

It is tempting to put "owner: coordinator" beside B8 because the brief names coordinators in B4. That is not justified. The right question is, **who is authorized to approve new signups?** The answer requires a decision from the project owner, not an educated guess from AI.

## Step 5: Use this copy-ready AI extraction prompt

Run the prompt below using the exact labeled brief. With a real document, replace the fixture with the full approved source; do not paste several conflicting versions without distinguishing them.

```plain
Create a source-traceable requirements register
from the PROJECT BRIEF below.

Source boundary:
- Use only the supplied brief.
- Preserve each source ID and its status.
- Do not promote PROPOSED, OPEN, or EXCLUDED
  statements into APPROVED requirements.
- Do not invent an owner, deadline, budget,
  feature, system, dependency, or approval.
- If part of the input cannot be read, say so.

Return these sections:

1. SOURCE COVERAGE
List every source ID and status exactly as given.

2. APPROVED REQUIREMENTS
For each APPROVED line, show:
Source ID | Faithful requirement |
Proposed verification approach |
Unspecified details needing clarification

Label all verification approaches as PROPOSED.
Do not call them agreed acceptance criteria.

3. SEPARATE DECISION REGISTER
List all PROPOSED, OPEN, and EXCLUDED lines
with their exact source IDs and meanings.

4. COMPLETENESS AUDIT
Count rows in each status category.
List any source IDs that were not accounted for.
Identify added details that were not in the source.

Do not mark the project ready for implementation
unless its owner has reviewed the resulting register.

PROJECT BRIEF:
[PASTE THE COMPLETE LABELED BRIEF HERE]
```

The instruction uses a status gate **before** any rewrite. The AI assistant must first classify the source statements, then organize them. That makes it easier to detect an invented scope commitment than asking for a polished requirements specification all at once.

The prompt is not a guarantee. Check whether the result copied the exact section identifiers, whether any proposed item appeared in the approved table, and whether a sentence introduced information that was never supplied.

## Step 6: Use a coverage audit, not a vague confidence score

A correct extraction of our fictional source must account for **all nine IDs**.

- **Approved:** B1, B2, B3, B4, B5, B6 — 6 rows.
- **Proposed:** B7 — 1 row.
- **Open:** B8 — 1 row.
- **Excluded:** B9 — 1 row.
- **Total:** 9 distinct source statements.

This was tested locally using Python's standard library. The source lines were parsed as ID, status, and text; unique IDs and exact classification counts were asserted. A reference mapping also confirmed that all six approved IDs appear in the approved register. The checks passed.

These results verify our manually constructed editorial fixture. They do **not** establish that any AI model generated the correct matrix, and they are not an accuracy benchmark of the prompt. Run your own comparison against the AI output.

On a larger project, a simple count is necessary but insufficient. One sentence could contain multiple obligations, and a feature could appear in several source sections. After counting, inspect the actual wording and relationships.

## Step 7: Convert verification ideas into reviewed acceptance criteria

A traceability matrix describes where a requirement comes from. An acceptance criterion describes an agreed condition that demonstrates a user-facing requirement is met. Those are related but not identical artifacts.

Atlassian's acceptance criteria guidance emphasizes clear, testable conditions and collaborative agreement on what counts as complete. The fictional brief provides some measurable facts—three required fields, a 14-day window, a 24-hour rule, two viewport widths—but leaves implementation and edge conditions open.

For instance, B2 does **not** say whether today counts as day one of the 14-day window, what timezone governs availability, or how to show an empty schedule. B5 does **not** specify whether the user can still edit at the instant exactly 24 hours before the shift. Neither ambiguity should be resolved solely because an AI assistant could write a plausible test.

A responsible follow-up might propose: "Confirm the precise inclusion rule for the 14-calendar-day display range." Once the owner decides, record the decision in the source or approved acceptance criteria and update the matrix accordingly.

## Step 8: Watch for common failure patterns

### The model adds a desirable feature

**Incorrect:** "Send an automatic confirmation email."

**Why it fails:** B3 requires an on-screen confirmation code. No email is approved. An email could be considered later, but it does not belong in this source-derived requirement list.

### The model invents an approver

**Incorrect:** "Coordinators approve all signups."

**Why it fails:** B4 describes coordinators as CSV exporters, not approval owners. B8 explicitly marks approval ownership as unresolved.

### The model converts a proposal into delivery scope

**Incorrect:** "Text volunteers two hours before their shifts."

**Why it fails:** B7 is labeled PROPOSED. Do not move it into an approved backlog just because the timing is specific.

### The model turns a useful test into an approved decision

**Incorrect:** "The system must display a red error banner for an empty email field."

**Why it fails:** The source requires an email address but does not specify a banner color or exact UI copy. A reviewer may choose those details; the AI cannot authorize them.

### The model quietly forgets excluded work

**Incorrect:** "Add payment processing during signup."

**Why it fails:** B9 explicitly excludes online payments from the release. Out-of-scope statements deserve the same fidelity as approved requirements.

## Step 9: Bring the register into a real project workflow

A useful working register has an ID, source version or location, status, concise requirement, proposed verification method, human reviewer, and an explicit review outcome. Where an owner or acceptance condition is not yet known, leave it blank or mark **not decided**.

Review it with the person accountable for the brief before creating implementation tasks. Only after decisions are confirmed should the team turn accepted requirements into backlog items, user stories, or formal tests. Keep a link between each task and the approved requirement ID so later changes can be traced.

If the project brief changes, compare old and new versions, record newly approved decisions, and update affected matrix rows. Do not silently overwrite the source evidence. NASA's guidance describes review and approval of changes as part of maintaining traceability; small projects should apply an appropriately scaled approval process rather than blindly copying aerospace governance.

## Final checklist before implementation

- [ ] The exact source version and its approval status are known.
- [ ] Every approved requirement links to a real source statement.
- [ ] Proposed, open, and excluded items remain separate.
- [ ] All source IDs are counted; none are missing or duplicated.
- [ ] Verification ideas are labeled proposals until reviewed.
- [ ] Critical numeric boundaries and conditions retain their exact meaning.
- [ ] No owner, deadline, approval, integration, or feature was invented.
- [ ] A responsible reviewer has resolved decision-critical ambiguity.
- [ ] Approved changes can be traced back to the current source.

AI can reduce transcription and formatting effort, but a clean table is **not proof of approval or implementation readiness**. The essential value is the connection from each proposed action back to the source and the responsible human decision.

## Official references and test disclosure

- [NASA — Requirements Management](https://www.nasa.gov/reference/6-2-requirements-management/). Requirements provenance, bidirectional traceability, self-derived requirements, and change review.
- [NASA — Systems Engineering Handbook Appendix](https://www.nasa.gov/reference/system-engineering-handbook-appendix/). Illustrative verification matrices with unique requirement identifiers and sources.
- [Atlassian — Requirements Gathering](https://www.atlassian.com/work-management/project-management/requirements-gathering). Distinguishes approved requirements, exclusions, assumptions, dependencies, acceptance criteria, and open questions.
- [Atlassian — Acceptance Criteria](https://www.atlassian.com/work-management/project-management/acceptance-criteria). How acceptance criteria support a shared and testable understanding of a requirement.
- [Atlassian — User Stories](https://www.atlassian.com/agile/project-management/user-stories). The distinction between user intent, conversations, and agreed conditions of completion.

**What we actually tested:** The nine fictional brief statements were parsed in a local Python standard-library test. The expected distribution—6 approved, 1 proposed, 1 open, 1 excluded—and the six-ID approved mapping were independently asserted. No live AI extraction test, NASA process certification, Jira or Microsoft project-tool execution, or actual client requirements review was performed.
