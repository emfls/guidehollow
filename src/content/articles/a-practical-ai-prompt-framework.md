---
title: "A Practical AI Prompt Framework"
description: "Use a lightweight Goal\u2013Inputs\u2013Boundaries\u2013Output framework to organize multi-part AI tasks and make missing information visible before drafting."
slug: "a-practical-ai-prompt-framework"
category: "prompts"
tags: ["prompting", "workflows"]
publishedDate: "2026-10-23"
updatedDate: "2026-10-23"
sources: [{"title": "Google: Prompt design strategies", "url": "https://ai.google.dev/gemini-api/docs/prompting-strategies"}]
draft: false
author: "GuideHollow Editorial"
featured: false
---

## Use structure when the task has several moving parts

For a multi-part task, organize the prompt into four sections: Goal, Inputs, Boundaries, and Output. This is GuideHollow's working checklist, not a standardized method or a vendor-endorsed framework.

Its purpose is to separate what you want from what you know. If those are mixed together, the assistant may treat a desired outcome as an established fact. Clear sections also make the prompt easier for you to revise.

## Goal: describe the finished job

Write one sentence describing what the response should help you do. “Prepare a volunteer handoff” identifies a deliverable. “Be helpful and strategic” does not.

Include a success condition if it changes the work. For example: “The next volunteer should be able to identify the pending decisions without reading the full conversation.” That tells you how to judge the answer later.

If your goal contains three unrelated jobs, make three requests. You can combine the results after reviewing each one.

## Inputs: separate evidence from requests

List the information the assistant may rely on. Label fictional examples, confirmed facts, estimates, and unresolved details. Put source material below a clear heading or delimiter so it does not blend into your instructions.

Google's prompt design guidance discusses adding context and consistent examples. Here, the practical step is to make the input's role explicit. A draft proposal is not necessarily an approved decision, even if both appear in the same notes.

## Boundaries: say what must remain unknown

A boundary is a limit on how the assistant should work. Examples include using only supplied notes, leaving unconfirmed costs blank, and asking a clarifying question when a required detail is absent.

Do not expect “do not hallucinate” to solve the problem. State the concrete fallback: “Write ‘not specified’ for any missing owner.” That makes the failure mode visible and gives you something to check.

Boundaries also include privacy. Remove material that the task does not need before you send the prompt to an external service.

## Output: choose a reviewable shape

Ask for a format that supports the next action. A table helps compare options; a checklist helps carry out a process. Avoid tables merely for decoration if a short paragraph would be easier to use.

Specify the columns or headings when consistency matters. If you need a machine-readable format, validate it with the consuming tool rather than accepting a response that only looks correct.

## Put the framework together

```text
GOAL
Create a handoff note so another volunteer can continue event planning.

INPUTS
These are fictional notes:
- Two volunteers have agreed to help.
- A room has been suggested but not booked.
- A draft invitation exists.
- No date has been approved.

BOUNDARIES
Use only the notes above.
Distinguish suggestions from confirmed decisions.
Do not invent owners, deadlines, approvals, or bookings.
Use "not specified" for missing details.

OUTPUT
A table with columns: Item, Status, Next action, Missing information.
Then list the three questions that would most help the next volunteer.
Keep the whole response under 300 words.
```

A successful answer will mark the room as suggested rather than booked. It will not give a volunteer an invented deadline. The three questions should address real gaps in the notes instead of asking about already confirmed facts.

## Review the framework in reverse

Start with Output: did you get the requested shape? Then check Boundaries: were unknowns left unresolved? Check Inputs: did the response preserve their meaning? Finally check Goal: can someone actually use this handoff?

This reverse pass avoids a common trap: admiring a well-formatted table while overlooking invented content. Format is usually the easiest property to inspect; correctness requires comparison with the input.

## Troubleshoot a weak result

If every row says “not specified,” your input may be too thin for the goal. Add authorized information or narrow the deliverable to a list of questions. Do not ask the model to make the handoff look complete.

If the output mixes confirmed and proposed actions, add separate status labels and provide one short example. If it repeats your notes without adding structure, clarify what the next reader needs to decide.

## Know when to skip the framework

For a two-sentence rewrite, four headings may be unnecessary. Use the shortest prompt that makes the important decisions explicit. For repeated work, move the stable instructions into a [reusable template](/prompts/how-to-build-reusable-prompt-templates/) and keep the changing facts in clearly named fields.
