---
title: "How to Write Better AI Prompts"
description: "Turn an ambiguous request into a clear task with relevant context, checkable constraints, and an output format you can evaluate."
slug: "how-to-write-better-ai-prompts"
category: "prompts"
tags: ["prompting", "getting-started"]
publishedDate: "2026-10-23"
updatedDate: "2026-10-23"
sources: [{"title": "OpenAI: Prompt engineering best practices for ChatGPT", "url": "https://help.openai.com/en/articles/10032626-prompt-engineering-best-practices-for-chatgpt"}]
draft: false
author: "GuideHollow Editorial"
featured: true
---

## Give the answer a job

A useful prompt tells the assistant what result you need, what information it should use, and what a satisfactory answer looks like. You do not need elaborate roleplay or a long list of impressive adjectives.

OpenAI's prompting guidance emphasizes specific instructions, context, and revision. The workflow below turns those principles into a task you can inspect. It is a practical starting point, not a formula that guarantees correctness.

## Diagnose the vague version

“Help me with my project” leaves several decisions to the model: what the project is, who needs the answer, how much detail to include, and whether it should invent missing facts. You may receive a fluent response that solves the wrong problem.

Before writing a longer prompt, finish this sentence: “After reading the response, I should be able to ___.” If you cannot fill in the blank, clarify your own task first.

For a fictional community event, the blank might be: “assign the next five preparation tasks to volunteers.” That is more useful than “understand event planning.”

## Write five useful ingredients

1. **Task:** name the action, such as draft, compare, extract, or explain.
2. **Context:** give the facts that affect the result. Exclude unrelated history.
3. **Audience:** explain who will read or act on the answer.
4. **Constraints:** state limits that can be checked, including what must not be invented.
5. **Format:** specify the structure that makes the output usable.

Not every task needs all five. A simple rewrite may only need the text, audience, and tone. The point is to resolve important ambiguity, not to make every prompt long.

## Compare two requests

Weak request:

```text
Write something about our book swap. Make it engaging.
```

More useful request:

```text
Draft a 100-word invitation to a fictional neighborhood book swap.
Audience: neighbors who have never attended.
Confirmed facts: two volunteers, a two-hour event, books exchanged for free.
Date and location: not decided.
Tone: welcoming and straightforward.
Use [DATE] and [LOCATION] for missing details.
Do not invent sponsors, refreshments, attendance, or accessibility features.
Return a subject line and one paragraph.
```

The second version gives you a review checklist. Count the words, check the known facts, verify the placeholders, and look for invented details. You can now explain what is wrong if the answer misses the mark.

## Add an example when style is hard to describe

If you need a particular structure, provide a short example you wrote or are authorized to use. Explain which property matters: sentence length, headings, or the way unknown information is labeled.

Avoid supplying an example that conflicts with the instructions. If your example has five sections but you ask for two, resolve the conflict yourself before expecting the assistant to do so. Also remove private information from examples.

## Revise one failure at a time

After the first response, choose the most important defect. A precise follow-up might be:

```text
Keep the confirmed facts and placeholders.
Remove promotional language such as “unmissable.”
Make the invitation sound like one neighbor writing to another.
Keep the subject line and one-paragraph format.
```

Read the whole revision afterward. A request to change tone can still alter facts or omit a required detail. Do not assume that a narrow instruction creates a perfect edit boundary.

## Common mistakes

Too many constraints can make a task internally inconsistent. “Explain every exception in 30 words” may not be achievable. Decide whether completeness or brevity matters more, and say so.

A role such as “world-class expert” does not provide evidence, private context, or professional accountability. Asking for sources does not ensure that sources exist. If facts matter, provide trustworthy material and [verify the output](/guides/how-to-verify-ai-generated-information/).

Do not paste a large document merely because it is available. First identify the sections relevant to the task. Extra text can distract from what actually changes the answer.

## When the prompt still fails

Check whether the task depends on information you did not supply or a tool the product does not offer. Split a complex request into steps: extract facts, build an outline, then draft. Review each step before continuing so an early mistake does not become a polished final answer.

## Keep the useful parts

Save a prompt only after it has produced an output you can evaluate. Use the [AI Prompt Builder](/tools/ai-prompt-builder/) to organize the ingredients, then read the [reusable template guide](/prompts/how-to-build-reusable-prompt-templates/) when the same task comes around again.
