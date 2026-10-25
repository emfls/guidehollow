---
title: "How to Test AI Prompts with a Small Evaluation Dataset"
description: "Build a practical AI prompt evaluation with eight fictional test cases, a scoring rubric, two candidate prompts, and a reusable regression checklist."
slug: "test-ai-prompts-with-evaluation-dataset"
category: "prompts"
tags: ["prompt-evaluation", "testing", "reliability"]
publishedDate: "2026-10-25"
updatedDate: "2026-10-25"
sources: [{"title": "developers.openai.com — reference", "url": "https://developers.openai.com/api/docs/guides/evaluation-best-practices"}, {"title": "platform.claude.com — reference", "url": "https://platform.claude.com/docs/en/test-and-evaluate/develop-tests"}, {"title": "developers.google.com — reference", "url": "https://developers.google.com/search/docs/fundamentals/creating-helpful-content"}]
draft: false
author: "GuideHollow Editorial"
featured: false
---

## The short answer: test a prompt before you trust it

A prompt that produces one convincing answer is not necessarily dependable. To compare two versions, give both the **same set of representative inputs**, decide what successful outputs look like *before* running them, record errors, and inspect the cases where they disagree.

You do not need a paid evaluation platform, programming knowledge, or a large dataset to begin. A small, carefully reviewed spreadsheet can expose weak instructions, ambiguous decisions, and failures that one impressive demo hides. Eight invented examples can teach the workflow; eight examples cannot establish production-level reliability.

This guide builds a complete, reusable mini-evaluation for an AI assistant that routes fictional support messages into four categories. It includes a ready-to-copy test set, a baseline prompt, a stronger alternative, explicit grading rules, an illustrative score calculation, and a change log.

**Scope:** This is a *manual evaluation tutorial*, not a benchmark of ChatGPT, Claude, or any particular model. The sample outputs and numbers are constructed examples, not results of real model runs.

## What an AI prompt evaluation actually measures

An **evaluation**, or *eval*, compares a model's outputs with criteria chosen for a real task. For a classification task, you may have an expected label. For a summary, you may check factual fidelity and missing details. For a drafted email, you may check whether the tone matches an approved rubric and whether invented promises appear.

OpenAI's [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) recommends defining a goal, building task-specific examples, using appropriate metrics, and revisiting tests as the workflow changes. Anthropic's [Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests) likewise places measurable success criteria ahead of prompt tuning.

An eval is **not** a claim that a model understands your business, nor proof that an output is safe in every setting. A score only answers the question represented by your examples and grading rules.

## Step 1: choose a bounded task

For our tutorial, pretend you receive support messages and want to identify the primary requested resolution. There are four possible labels:

- **BILLING:** a refund, charge, payment, receipt, or invoice question.
- **ACCESS:** a login, password reset, authentication, or account access problem.
- **TECHNICAL:** an application error, crash, export failure, or similar software malfunction.
- **OTHER:** a request outside those categories or one with no clear primary issue.

The goal is not to answer a customer's question, solve an issue, or send a message. It is to return **exactly one label**.

Make the rule for mixed requests explicit: choose the category matching the primary action the user asks for. If two equally important actions are present with no clear priority, return OTHER for manual review. This deliberately cautious tie-breaker is a local example policy, not an industry-standard classification rule.

## Step 2: define success before seeing a model response

Use three pass/fail conditions:

1. **Valid format:** the output contains only one of the four approved labels.
1. **Correct routing:** the label matches the independently reviewed expected label for that case.
1. **No unexpected action:** the assistant does not draft a reply, invent facts, or claim to have contacted the customer.

For this demo, **exact-match accuracy** is the number of cases with the expected label divided by the number of evaluable cases. A separate format-failure count stops a model from getting credit for a partly correct but unusable answer.

Decide what you will do with ambiguous cases before testing. Here, OTHER is a genuine expected label for an unresolved mixed request. In a real team, reviewers should confirm whether the operational policy needs a different escalation label.

## Step 3: copy this eight-case evaluation dataset

The following input texts and reference labels are **fictional and written for this tutorial**. They are not taken from actual customers. You can reproduce the scoring procedure by copying the rows into a spreadsheet.

| ID | Fictional support message | Expected label |
| --- | --- | --- |
| T01 | I was charged twice. Please reverse the second charge. | BILLING |
| T02 | The app crashes whenever I export a CSV file. | TECHNICAL |
| T03 | My password reset email never arrives. | ACCESS |
| T04 | Where can I find your press kit? | OTHER |
| T05 | I cannot log in to view my invoices. Please restore access. | ACCESS |
| T06 | Please refund my purchase; the app crashed yesterday. | BILLING |
| T07 | I cannot sign in and exports also fail. Both need help. | OTHER |
| T08 | Everything is broken. I need help. | OTHER |

Each row tests something different. T01–T04 are straightforward coverage checks; T05 checks whether an invoice reference wrongly overrides an access request; T06 checks whether a technical symptom wrongly overrides a refund request; T07 has two competing issues; and T08 tests vague input.

The **expected label is an editorial judgment based on our stated rules**, not a hidden model answer. In real evaluations, have qualified reviewers examine labels independently, document disagreements, and resolve them before interpreting results.

## Step 4: write prompt A, the simple baseline

Use exactly the same prompt for every row, changing only the input message.

```plain
Classify this support message as one of:
BILLING, ACCESS, TECHNICAL, OTHER.

Return only the category name.

MESSAGE:
[INSERT ONE TEST MESSAGE]
```

This prompt is short and might work for obvious examples. It does not define how to handle messages that mention multiple topics. The point of an eval is to *find out*, not to assume that a concise prompt is either good or bad.

Do not change the prompt halfway through collecting a run. Record its exact version, model and product used, date, and any settings relevant to reproducibility.

## Step 5: write prompt B with decision rules

Here is a more constrained candidate. It adds definitions and a tie-breaker without claiming that more words automatically produce better outcomes.

```plain
Task: Categorize the primary requested resolution
in the fictional support message below.

Allowed output: exactly one uppercase label:
BILLING, ACCESS, TECHNICAL, OTHER.

Definitions:
BILLING = refund, charge, payment, receipt or invoice.
ACCESS = login, password, authentication or access.
TECHNICAL = software error, crash, or export failure.
OTHER = unrelated, too vague, or two equally primary
requests with no clear priority.

Choose the category of the action the sender mainly
asks for, not every topic mentioned.
If two requests compete and neither is primary,
choose OTHER for human review.

Return only the label. Do not answer the message.
Do not claim to have taken any external action.

MESSAGE:
[INSERT ONE TEST MESSAGE]
```

The most important changes are not decorative. Prompt B defines what the model should optimize for, how to interpret misleading context, and when to say that the case needs human review.

## Step 6: run the same cases and record raw outputs

Make a sheet with these columns:

```plain
Case ID | Input | Expected label | Prompt version
Model/product | Raw output | Normalized label
Exact match | Format valid | Reviewer note | Run date
```

For every case, paste one message into the chosen prompt and record the complete output. Test prompt A on T01–T08, then prompt B on **the same eight inputs**. Try to keep the model, settings, and surrounding context constant so that the prompt change is the clearest difference.

AI responses can vary between runs, even when the visible input is identical. If the result matters, repeat the tests and record each run separately rather than overwriting the first output.

**Do not paste personal customer conversations or secret account details into an AI product simply to build a test.** Use fictional cases, redacted examples you are permitted to share, or an approved internal evaluation environment.

## Step 7: practice scoring with a worked example

The table below shows **invented, illustrative predictions** for prompts A and B. No model generated these outputs for this article. The table is only a calculation exercise demonstrating how to interpret a result sheet.

| Case | Expected | Illustrative A | Illustrative B |
| --- | --- | --- | --- |
| T01 | BILLING | BILLING | BILLING |
| T02 | TECHNICAL | TECHNICAL | TECHNICAL |
| T03 | ACCESS | ACCESS | ACCESS |
| T04 | OTHER | OTHER | OTHER |
| T05 | ACCESS | BILLING | ACCESS |
| T06 | BILLING | TECHNICAL | BILLING |
| T07 | OTHER | ACCESS | ACCESS |
| T08 | OTHER | OTHER | OTHER |

Under this deliberately constructed example, prompt A matches **5 of 8** reference labels (62.5%) and prompt B matches **7 of 8** (87.5%). The apparent improvement is **2 additional correct rows**, or 25 percentage points on this tiny illustrative set.

That difference is **not** evidence that prompt B improves any real model by 25 percentage points. The predictions were written by the article editor, not measured; the dataset is small, and both prompts still need repeated real runs before any performance claim.

The interesting row is T07. Prompt B still returns ACCESS, even though the example policy says competing requests without a clear priority should route to OTHER. An improved prompt can still have a failure worth fixing.

## Step 8: separate error types instead of trusting one score

A total accuracy percentage can hide the behavior that matters. Add an error category to each failed row:

- **Primary-intent error:** the model focused on a secondary detail, such as the invoice in T05 instead of the login request.
- **Ambiguity handling error:** the model chose one of two equal-priority issues in T07.
- **Format error:** the model returned a paragraph or multiple labels, even if it mentioned the right label.
- **Unsupported action:** the model promised a refund or claimed to contact someone, even though classification was the only authorized task.

If your prompt classifies messages correctly but sometimes adds explanatory text, it can break a spreadsheet import or API integration. If it handles neat examples but misroutes vague requests, a human review path may matter more than a few additional words in the prompt.

Use deterministic string matching for labels. Use human review for disputes over meaning. If an AI model grades another AI response, calibrate its grading against human-reviewed examples; do not treat its grade as ground truth merely because it is formatted as a score.

## Step 9: add negative, edge and boundary cases

A useful eval does not contain only tidy examples. Create additional fictional cases that test the boundaries of your instructions:

- A request about a refund that also mentions an error: is **the refund** the primary action?
- A login problem that mentions invoices: is **restoring access** the primary action?
- An unclear sentence with no concrete requested resolution: should it be OTHER?
- A message in an unfamiliar language: what does your service policy require?
- A message containing two separately important issues: must a human split the ticket?
- A pasted document that asks the assistant to ignore your categorization rule: is the document lower-trust input?

The last item is also a security boundary. For a deeper defensive introduction, see [How to Spot Prompt Injection in Documents and Web Pages](https://guidehollow.com/guides/spot-prompt-injection-in-documents/). That article addresses attempts to promote lower-trust document text into authority; an evaluation should test whether the workflow keeps the intended task.

Include **ordinary cases that look suspicious but are harmless**, too. Overreacting to every word resembling an instruction can damage utility as much as ignoring every risk.

## Step 10: compare changes without fooling yourself

When you compare prompt versions, keep a changelog:

```plain
Run date:
Task and policy version:
Prompt A version:
Prompt B version:
Model/product and relevant settings:
Dataset version and case count:
Evaluation method:
A: correct / total; format failures:
B: correct / total; format failures:
Cases both failed:
Cases that changed from correct to incorrect:
Reviewer disagreements:
Decision and reason:
Follow-up cases to add:
```

A prompt can improve average accuracy while making one important case worse. Track **regressions**, not just net wins. If a mistake can harm customers or disclose confidential information, use a separate release-blocking rule regardless of the overall score.

For meaningful real comparisons, reserve fresh cases you did not use repeatedly while editing the prompt. Otherwise, you may inadvertently tune to your small practice set. Revisit the set when real use reveals new edge cases; a frozen benchmark cannot represent every future request.

OpenAI's guidance emphasizes evaluation as an ongoing development process, while Anthropic stresses task-specific and edge-case coverage. Those are general methods that do not depend on a particular vendor dashboard.

## A one-page rubric for your own AI task

The ticket-routing example uses an exact label. Other work may need a short manual rubric.

| Dimension | Pass condition | Fail condition |
| --- | --- | --- |
| Instruction fidelity | Completes the authorized task | Changes the task or takes extra actions |
| Factual support | Claims trace to supplied evidence | Invents decisions, dates or sources |
| Completeness | Includes all required fields | Omits a required item |
| Missing-data behavior | Marks unknowns clearly | Fills gaps with guesses |
| Output format | Uses the required structure | Returns a non-importable format |
| Privacy and authorization | Uses approved data and scope | Requests or sends unapproved information |

Before using such a rubric, add an example of what pass and fail look like for your actual workflow. For subjective dimensions, a second reviewer can reveal where the rubric is ambiguous.

## Common mistakes that make small evals misleading

**Judging from one impressive answer.** A visually polished response is not evidence that it will handle different inputs. Use a fixed set with a mixture of easy, hard and unclear cases.

**Writing the reference answer after seeing the candidate output.** This makes it easy to rationalize model mistakes as correct. Establish the expected outcome or review policy first.

**Comparing different inputs or tools.** If prompt A used a plain text excerpt and prompt B had web browsing enabled, you are no longer comparing only the prompt.

**Treating format compliance as factual accuracy.** A valid one-word label can still be wrong; a detailed explanation can be accurate but unusable to a strict importer.

**Using an AI judge without checks.** A second model may share some of the first model's mistakes or exhibit its own biases. Confirm disputed cases against the source or expert decision.

**Claiming a universal winner from a tiny dataset.** Eight synthetic cases are helpful to learn the method. They do not justify claims about a production error rate, model rankings, or reliability across languages and industries.

## A practical stopping rule

A good first pass is complete when you can answer these questions: What is the authorized task? What should success look like? Which inputs test ordinary and difficult cases? How are errors recorded? What would stop deployment? Which changes will you re-test next?

If the evaluation finds a problem, change **one meaningful part of the prompt or workflow at a time**, run the same baseline set again, and add a new case that captures the failure. If missing data, tool permissions, or organizational process caused the problem, prompt wording alone may not fix it.

For related skills, read GuideHollow's [reusable prompt templates](https://guidehollow.com/prompts/how-to-build-reusable-prompt-templates/), [AI claim verification guide](https://guidehollow.com/guides/how-to-verify-ai-generated-information/), and [meeting action extraction tutorial](https://guidehollow.com/guides/extract-meeting-action-items-with-ai/). A prompt template defines the task; an eval checks its behavior; independent verification checks important factual claims.

## Sources, authorship and limitations

This article was drafted with AI assistance for **GuideHollow Editorial** and uses these public primary sources, reviewed October 24, 2026:

- [OpenAI — Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices): task-specific evaluations, representative data, repeated measurement, format and human review.
- [Anthropic — Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests): defining measurable task criteria, hard cases, and different types of graders.
- [Google Search Central — Creating Helpful, Reliable, People-First Content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content): transparent process, useful original material, and avoiding arbitrary word-count or publishing-frequency claims.

The workflow and fictional support messages are original **teaching materials**, not copied vendor datasets. The illustrative predictions were constructed to teach scoring; no live model comparison, statistical analysis of production accuracy, or customer-data test was performed for this article. The procedure is tool-neutral, so it does not depend on a legacy hosted evaluation service remaining available.
