---
title: "What Is Generative AI? A Beginner\u2019s Guide"
description: "Understand what generative AI creates, how a language model fits into the picture, and how to choose a useful first task without trusting it blindly."
slug: "what-is-generative-ai"
category: "guides"
tags: ["ai-basics", "getting-started"]
publishedDate: "2026-10-23"
updatedDate: "2026-10-25"
sources: [{"title": "Google Machine Learning Crash Course: Introduction to LLMs", "url": "https://developers.google.com/machine-learning/crash-course/llm"}, {"title": "OpenAI: Does ChatGPT tell the truth?", "url": "https://help.openai.com/en/articles/8313428-does-chatgpt-tell-the-truth"}]
draft: false
author: "GuideHollow Editorial"
featured: false
---

## The short answer

Generative AI produces new content in response to an input: a paragraph, an image, a piece of code, or another kind of output. A text assistant is one familiar example. It can help turn rough notes into a readable draft, but the draft still needs your judgment.

For a beginner, the useful question is not whether AI can “do everything.” It is whether a particular output will help with a task you can explain and check. Start with something small, reversible, and easy to compare with the original material.

## A practical mental model

A language model works with patterns in language and context. Tokens are the pieces of text it processes; they do not always line up with whole words. A product built around the model may also provide tools, files, or search. Those surrounding features matter, so avoid assuming that every chatbot has the same capabilities.

Imagine asking for three ways to explain a community garden project. The assistant can propose language and structure. You still supply the actual location, budget, and permissions. Smooth writing does not establish that those details are true.

## Generation, search, and calculation solve different problems

A generated answer, a retrieved source, and a calculated result can appear in the same interface. Check which operation your task needs before judging the result. A fluent explanation alone does not show that a source was retrieved or a calculation executed.

| Your task | Useful starting point | Evidence to check |
| --- | --- | --- |
| Turn your garden notes into an invitation | Text generation | Every date, instruction, and unknown matches the notes |
| Find the garden's current opening hours | The operator's current published information; search can help locate it | Correct location, applicable day, and any dated closure notice |
| Total the cost of supplies | A calculator or spreadsheet with explicit inputs | Quantities, unit prices, units, and the resulting total |
| Decide what information a plan is missing | A question-generating prompt | Questions address actual gaps without treating proposed answers as facts |

These are workflow choices, not a comparison of model performance. An AI product may offer search or calculation tools, but you still need to inspect their sources or results. The rest of this guide focuses on text; image, audio, and code outputs need checks appropriate to their intended use.

### One project, three different checks

Consider a fictional garden group buying **3 bags at $8 each** and **2 trays at $6 each**. The expected subtotal is **3 × 8 + 2 × 6 = $36**, before any unspecified tax or delivery charge. You can verify that with arithmetic; a confident paragraph is unnecessary evidence.

If the same group asks whether the garden is open next Saturday, these purchase notes cannot answer. Find the operator's current schedule. If it asks for an invitation, the notes can support a draft, but only supplied meeting details belong in it.

**Practice:** a draft says “The garden is open Saturday, supplies cost $36 including delivery, and everyone gets free seeds.” Which parts are supported? The arithmetic supports a $36 supplies subtotal only. Opening hours, delivery cost, and free seeds remain unsupported. A correct number does not validate the surrounding sentence.

## An original 22-claim source check: generation is not verification

Here is a small audit you can **repeat without a ChatGPT account**. We wrote three fictional sets of notes—a garden plan, a software release note and a proposed event—and then wrote 22 statements that a confident assistant might include. The real task is to decide whether the supplied information supports each statement. You are checking evidence discipline, **not** measuring a model.

**Download the [exact fictional source notes](/examples/claim-boundary-source-notes.txt) and [22-case claim ledger with the editorial answer key](/examples/claim-boundary-audit.csv).** The notes are published separately from the answers so you can try the exercise without seeing the labels first.

Classify a statement as **SUPPORTED** when the notes establish it, **CONTRADICTED** when the notes say otherwise, and **UNSUPPORTED** when the notes leave it unknown. “Unsupported” does not mean “false”: it means you are not entitled to assert the claim from this particular source.

| Proposed statement | Expected status | Why |
| --- | --- | --- |
| G09: The listed supplies subtotal is $36 | SUPPORTED | Three bags at $8 plus two trays at $6 yields $36 |
| G10: The $36 includes delivery | UNSUPPORTED | Neither the delivery charge nor its inclusion is specified |
| R02: Offline mode is approved | CONTRADICTED | The release note explicitly calls it an unapproved proposal |
| E05: The event is next Saturday | CONTRADICTED | The event notes explicitly say no date was chosen |

The original reference set contains **12 supported, 6 contradicted and 4 unsupported statements**. Those numbers are a count of our *editor-written cases*, not a count of model errors. The public automated [fixture test](https://github.com/emfls/guidehollow/blob/main/tests/claim-boundary-audit.test.mjs) independently confirms the 22 rows, the answer-key coverage and the $36 arithmetic; the editorial decisions themselves are explained beside the source statements.

### Try a change that should not change the answer

Change the price of a bag from $8 to $9 in your own copy of the source. The subtotal becomes **3 × 9 + 2 × 6 = $39**. The garden's meeting time and still-unknown location do **not** change. A response that updates the cost but also invents a confirmed venue has failed a different requirement entirely.

This illustrates the critical difference: a generative assistant can suggest language, a source can establish a factual boundary, and arithmetic can verify a number. None of those substitutes for the others. For an interactive numerical audit using a separate eight-row dataset, try the [weighted-average workbench](/tools/weighted-price-checker/).

**Limits of the exercise:** the meeting, release and event are fictional; we did not submit the 22 cases to an AI service or infer any vendor's accuracy rate. The value is a public input and answer key you can use to check your own results.

## Choose your first task

1. Pick a short piece of material you are allowed to share. Fictional notes are a good starting point.
2. Define the output before opening the tool: a summary, a rewrite, or a list of questions.
3. State who will use the result and any practical limits.
4. Compare the response against your input. Mark anything it added, omitted, or changed.
5. Keep the parts that help and revise the rest yourself.

This workflow makes the success condition visible. “Make me productive” is difficult to evaluate; “turn these four notes into a 70-word invitation without adding facts” is much easier.

## Try a bounded example

Use this fictional source material:

> Garden planning meeting: Saturday at 10 a.m. Bring a notebook. We will choose a planting schedule. Location is not confirmed.

```text
Turn the notes below into a friendly invitation under 70 words.
Audience: neighbors who have not attended before.
Keep every confirmed detail. Do not invent a location.
If a detail is missing, use [TO CONFIRM].

Notes:
Garden planning meeting: Saturday at 10 a.m. Bring a notebook.
We will choose a planting schedule. Location is not confirmed.
```

Here is one **editor-written example of an acceptable answer**, not a transcript of a live AI test:

> You're invited to a community garden planning meeting on Saturday at 10 a.m. We'll choose a planting schedule together. Please bring a notebook. **Location: [TO CONFIRM].**

Compare it with the notes: Saturday at 10 a.m. is preserved, the planting schedule and notebook are included, and the unknown location remains marked for confirmation. There is **no invented address, organizer, or promise**. You do not need the model to write these exact words; you need its answer to keep the same facts.

A usable response should preserve the time, purpose, and notebook request while leaving the location unresolved. If it adds refreshments, a street address, or an organizer's phone number, those are defects—even if the invitation sounds better.

## What it is useful for

Consider AI for drafts you can revise, alternative explanations you can compare, and ways to organize material you already understand. For a summary, keep the original beside the result. For an explanation, ask for an example and check that the example fits the definition.

You can also ask for questions rather than answers. “What information is missing from this plan?” may be more helpful than requesting a finished plan from incomplete notes. The assistant's suggestions are still proposals, but they can help expose gaps.

## Common beginner mistakes

Do not confuse a confident tone with evidence. Do not supply private information just because a task seems ordinary. Do not assume a generated link or quotation exists. Open important sources yourself and confirm what they actually say.

Avoid judging all AI from one broad question. An unclear prompt may be responsible for an unhelpful answer. Equally, a clear prompt cannot guarantee factual accuracy. Both the instruction and the output need review.

## If the result is disappointing

Change one part of the request at a time. If the response is too vague, add the audience and a concrete example of the desired output. If it adds details, restate the source boundary. If the task requires current facts, use an appropriate original source rather than asking the model to guess.

## Your next step

Choose one small task, write down what a correct result must contain, and compare the output against that list. Then learn [how to write better AI prompts](/prompts/how-to-write-better-ai-prompts/) and [how to verify AI-generated information](/guides/how-to-verify-ai-generated-information/).
