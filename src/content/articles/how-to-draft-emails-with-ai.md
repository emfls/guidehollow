---
title: "How to Draft and Improve Emails with AI"
description: "Compare complete email drafts and revisions, checking that deadlines, conditions, placeholders, and commitments survive changes in tone."
slug: "how-to-draft-emails-with-ai"
category: "guides"
tags: ["productivity", "writing", "privacy"]
publishedDate: "2026-10-23"
updatedDate: "2026-11-01"
sources: [{"title": "OpenAI: Prompt engineering best practices for ChatGPT", "url": "https://help.openai.com/en/articles/10032626-prompt-engineering-best-practices-for-chatgpt"}]
draft: false
author: "GuideHollow Editorial"
featured: false
---

## Separate the message from the facts

Use AI to help express an email, while keeping the actual facts and commitments under your control. Before drafting, list the message's purpose, audience, approved details, and action you want the recipient to take.

The most dangerous email error is often not awkward wording. It is a polished promise you never approved: a refund, a delivery date, a policy exception, or a commitment on someone else's behalf.

## Write a compact brief

For a scheduling email, your brief might say: “Ask a colleague to choose one of two meeting windows. The agenda is a draft. No room is booked.” That is enough to define the task without sharing a complete conversation history.

Replace private details with placeholders where possible. If the wording problem concerns a dissatisfied customer, the assistant usually does not need the person's real name, account number, or full purchase history to suggest a more respectful tone.

Check organizational rules before entering work material into an external AI product. A harmless-looking message can still contain confidential dates or client information.

## Draft from approved inputs

1. State the email's purpose in one sentence.
2. List confirmed details separately from proposed options.
3. Tell the assistant which commitments it must not add.
4. Ask for a subject line and a short body.
5. Compare every factual sentence with your brief.
6. Revise the wording and fill placeholders in your own mail app.

Keep drafting separate from sending. This article's prompts produce text only; they do not authorize an assistant or integration to contact anyone.

## A scheduling example

```text
Draft a concise email to a colleague about a planning meeting.
Purpose: ask which of two proposed meeting windows works better.
Options: [OPTION A] or [OPTION B].
Agenda: review the draft volunteer checklist.
The venue is not booked and neither time is confirmed.

Tone: friendly and direct, without excessive enthusiasm.
Return a subject line and a body under 130 words.
Keep placeholders exactly as written.
Do not say that a meeting is confirmed or an invitation has been sent.
```

A useful draft should ask a clear question and preserve the proposed status of the options. If it says “See you at [OPTION A],” it has turned a choice into a decision. Correct the meaning before adjusting the tone.

## A complete reference email, with a fact check

Here is an **editor-written reference**, not a captured ChatGPT response or a message that was sent. Compare your own generated draft against it rather than expecting identical wording.

```text
Subject: Which planning meeting window works?

Hi,

Would [OPTION A] or [OPTION B] work better for a planning meeting?
The proposed agenda is to review the draft volunteer checklist.

Neither time has been confirmed, and the venue is not booked.
Please let me know which window you prefer.

Thanks
```

**Check the draft against the brief:**

- **Both choices remain options.** The email asks for a preference; it does not assign a time or claim an invitation was sent.
- **The agenda remains a draft.** It says "proposed" and does not treat the volunteer checklist as approved.
- **The venue remains unbooked.** It explicitly says so, rather than implying a reservation.
- **The placeholders are unchanged.** Replace [OPTION A] and [OPTION B] with real, verified details in your own mail application only when ready.

A sentence such as **"I've booked the room for [OPTION A]"** would fail this check even if it sounds helpful. No booking was authorized in the input. A draft that fails should be corrected before any recipient or attachment is selected.

## Improve an existing email narrowly

When you have a draft, say what needs improvement. “Make this better” invites broad changes. “Remove defensive phrasing while keeping the request and deadline unchanged” gives you a smaller edit to inspect.

```text
Revise the draft below for clarity and a calm tone.
Preserve the stated facts, deadline, and requested action.
Do not add apologies, compensation, guarantees, or policy statements.
After the revision, list any sentence whose meaning you changed.

Draft:
[PASTE A SANITIZED DRAFT]
```

The change list is a review aid, not a guarantee that every change is disclosed. Compare the source and revision yourself, especially around words such as “will,” “may,” “approved,” and “required.”

### Worked revision: remove blame without weakening the deadline

This pair is editor-written from fictional facts, not an observed AI run or a sent email. Use the revision prompt above with this sanitized draft:

```text
Subject: Missing agenda comments

Hi [REVIEWER],
You still haven't sent the agenda comments. We need them by
15:00 UTC on 6 November 2026 so we can prepare the review packet.
Send them in [SHARED DOCUMENT]. If you cannot meet that deadline,
tell us by 12:00 UTC on 6 November 2026.
The review meeting time is not confirmed.
```

**A reference revision:**

```text
Subject: Agenda comments needed by 15:00 UTC on 6 November

Hi [REVIEWER],
Please add your agenda comments to [SHARED DOCUMENT] by
15:00 UTC on 6 November 2026 so we can prepare the review packet.
If you cannot meet that deadline, please let us know by
12:00 UTC on 6 November 2026.
The review meeting time is not confirmed.
```

| Original element | What changed | Acceptance check |
| --- | --- | --- |
| “You still haven't sent” | Replaced blame with a direct request | The requested work is still agenda comments |
| 15:00 UTC on 6 November 2026 | Moved into the request sentence | Date, time, and time zone are unchanged |
| Prepare the review packet | Preserved as the reason | No claim that the packet is already complete |
| [SHARED DOCUMENT] | Preserved verbatim | No new attachment or delivery channel |
| Tell us by 12:00 UTC if unable | Added “please”; retained the condition | The earlier notification deadline remains distinct from the submission deadline |
| Meeting time unconfirmed | Preserved verbatim | No invitation or meeting time invented |

A smoother version saying “Send the comments when convenient” fails: it removes the deadline. “We'll send the completed packet today” also fails: it creates a delivery promise. Neither is a harmless tone change.

For your own draft, mark each time, condition, placeholder, and commitment before requesting a revision. Compare those marked items afterward. If one changes, correct that sentence and review the complete email again; the assistant's change list can miss an omission.

## Test ten candidate emails against their approved facts

A pleasant tone is not proof that a message is safe to send. We built a small **editor-written, fictional ten-case audit** to test three different outcomes: a draft can preserve the required facts (**PASS**), invent or change a fact (**REWRITE**), or keep the stated facts but omit a required condition (**INCOMPLETE**).

1. [Download the ten case briefs and draft sentences (TSV)](/examples/email-commitment-cases.tsv). Each row is a complete proposed outgoing message for that brief; do not treat it as one sentence from a larger unseen email.
2. For each case, read the approved brief first. Mark every confirmed state, deadline, negative condition, permission, and placeholder. Decide PASS, REWRITE, or INCOMPLETE **before** opening the answers.
3. [Open the separate editorial answer key and minimal repairs (TSV)](/examples/email-commitment-answer-key.tsv). Compare your reasoning with the source boundary, not just the decision label. If you disagree, point to the exact phrase in the approved brief that supports your decision.

For a quick start, consider three very different risks:

| Case | Candidate sentence | What to check |
| --- | --- | --- |
| E02 | “The room is booked for [OPTION A].” | Does a proposed meeting window authorize a booking? |
| E03 | “Please send your agenda comments by 15:00 UTC on 6 November 2026.” | Does the full brief also require an earlier notice if the deadline cannot be met? |
| E08 | “The total cost is 50 credits.” | Does the source establish a total price or only a refundable deposit? |

The answer key contains **four PASS, five REWRITE, and one INCOMPLETE** decisions. This is a fixed editorial exercise: no drafts were generated by a live AI model, no messages were sent, and these proportions are **not** a model accuracy or email-delivery statistic. TSV files can be opened as plain text or imported into spreadsheet software using tabs as the delimiter. Every row is invented to avoid sharing customer data.

**Why a third outcome matters:** E03 does not fabricate a deadline; it preserves the main due time but drops the separate requirement to notify the sender earlier if the deadline is impossible. The text is factually compatible with the brief but inadequate as the *complete message*. A check limited to “did the date change?” would miss that omission. E08 is different: it converts a deposit into a claimed total and therefore requires rewriting, not merely adding a detail.

Use the exercise as a pre-send habit: identify the source constraint, classify the candidate, write the smallest correction, and then review the entire outgoing message. A draft can be concise without discarding a condition, but you must decide what the recipient needs to know.

## Review the email in four passes

**Facts:** check names, dates, time zones, amounts, attachments, and links. A placeholder must be replaced or intentionally removed before sending.

**Commitments:** underline every promise. Confirm that you are authorized and able to make it. Remove any new obligation that appeared during rewriting.

**Tone:** read the email as the recipient. A shorter sentence may be clearer, but an overly terse response can sound dismissive. Choose language that fits the relationship rather than blindly accepting a tone label.

**Action:** make sure the recipient can tell what to do next. If you need a choice, ask for a choice. If no response is required, do not add an unnecessary demand.

## Troubleshoot a draft that sounds generic

Add one concrete purpose or relationship detail that you are permitted to share. Replace abstract instructions such as “professional” with observable ones: “no marketing language, one direct question, and a neutral sign-off.”

If the response is too long, remove duplicate ideas from the brief and ask for a shorter version. If it repeatedly invents details, narrow the task to editing your own text rather than drafting from a thin outline.

## Send only after your own final check

Confirm recipients, reply-all status, attachments, and the final text in the mail app. AI assistance should not blur who makes the decision to send. For recurring emails, build a [reusable prompt template](/prompts/how-to-build-reusable-prompt-templates/) and read [AI privacy basics](/guides/ai-privacy-basics/) before adding real examples.
