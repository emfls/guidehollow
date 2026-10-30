---
title: "Few-Shot Prompting: Examples That Teach Rules, Not Keywords"
description: "Design balanced few-shot examples that teach AI the decision rule rather than keyword shortcuts, with a copyable prompt, contrasting cases, and a Python audit."
slug: "few-shot-prompt-examples-teach-rules-not-keywords"
category: "prompts"
tags: ["few-shot-prompting", "contrastive-examples", "prompt-examples", "prompt-testing", "classification"]
publishedDate: "2026-10-30"
updatedDate: "2026-10-30"
sources: [{"title": "developers.openai.com — reference", "url": "https://developers.openai.com/api/docs/guides/prompt-engineering"}, {"title": "ai.google.dev — reference", "url": "https://ai.google.dev/gemini-api/docs/prompting-strategies"}, {"title": "platform.claude.com — reference", "url": "https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices"}, {"title": "docs.python.org — reference", "url": "https://docs.python.org/3/library/collections.html#collections.Counter"}]
draft: false
author: "GuideHollow Editorial"
featured: false
---

A few-shot prompt includes several input-output examples to show an AI assistant what successful answers look like. Good examples can communicate an unfamiliar rule quickly. Bad examples can teach an accidental shortcut: a model may follow a familiar word rather than the decision you intended.

This guide builds a few-shot classifier for **fictional product-feedback messages**, then audits its examples and prepares unseen cases for later testing. You can copy the prompt, inspect the reference outputs, and run the small Python check. The examples are editorial fixtures, not observed outputs from a live AI model.

## Why examples can teach the wrong rule

A zero-shot prompt gives instructions without demonstrations. A few-shot prompt adds samples. OpenAI's [prompt engineering documentation](https://developers.openai.com/api/docs/guides/prompt-engineering) describes using diverse input-output examples. Google's [prompt design strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies) discusses consistent formatting, varied examples, and iteration. Anthropic's [prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) emphasizes relevance, diversity, and recognizable example boundaries.

These are design recommendations, not guarantees. Suppose every example labeled REQUEST contains “please” and every IDEA contains “maybe.” A model could learn those words instead of the difference between a current need and a future suggestion. Contrastive examples address this problem by changing meaning while retaining similar topics or vocabulary.

**The goal is not to maximize example count. It is to teach a decision boundary that survives different wording.**

## Step 1: Write a clear task policy

Imagine you receive short fictional product-feedback messages. Choose exactly one of four local labels:

- **REQUEST:** the author directly asks for a change or expresses a concrete current need.
- **IDEA:** the author suggests considering a possible improvement without clearly asking for immediate implementation.
- **STATUS:** the author explicitly reports a feature's current or released state.
- **UNCLEAR:** the message is too fragmentary, or its competing intents cannot be resolved.

The assistant must return exactly one uppercase label and no extra explanation. This is a teaching policy, not a universal definition used by product teams. Reviewers should adjust these categories for their organization's actual workflow before processing real feedback.

These definitions matter more than the length of the prompt. An example cannot repair an internally inconsistent labeling policy.

## Step 2: Make close examples disagree for a good reason

Start with the same feature described in different ways:

```plain
Input: Please add keyboard-only navigation.
Output: REQUEST

Input: Keyboard-only navigation would be nice someday.
Output: IDEA

Input: Keyboard-only navigation is live today.
Output: STATUS

Input: Keyboard navigation.
Output: UNCLEAR
```

The noun phrase stays similar. The *speech act* changes: direct request, hypothetical suggestion, release statement, and bare fragment. The desired label follows intent, not the topic.

Now deliberately break a misleading keyword correlation:

```plain
Input: Please consider dark mode in a later planning cycle.
Output: IDEA

Input: I need dark mode in the next release.
Output: REQUEST

Input: Dark mode went live yesterday.
Output: STATUS

Input: This needs work.
Output: UNCLEAR
```

The first message includes “Please” yet is labeled IDEA. The second is a REQUEST without that word. That contrast makes it harder to infer that politeness determines intent. The two UNCLEAR examples show that vague text should not be promoted into a definite request.

## Step 3: Copy this complete prompt

Paste the following into an AI interface. Replace only `\[NEW MESSAGE\]`; keep the definitions and labeled examples together.

```plain
TASK
Classify the primary intent of one fictional
product-feedback message.

LABELS
REQUEST = direct change request or concrete need.
IDEA = tentative future improvement or suggestion.
STATUS = explicit existing/released feature status.
UNCLEAR = missing or conflicting primary intent.

RULES
Choose intent, not a keyword.
"Please" does not automatically mean REQUEST.
A feature name does not prove release or approval.
Do not invent facts about implementation.
Return exactly one uppercase label.
Do not answer the feedback or add commentary.

EXAMPLES
Input: Please add keyboard-only navigation.
Output: REQUEST

Input: Keyboard-only navigation would be nice someday.
Output: IDEA

Input: Keyboard-only navigation is live today.
Output: STATUS

Input: Keyboard navigation.
Output: UNCLEAR

Input: Please consider dark mode in a later planning cycle.
Output: IDEA

Input: I need dark mode in the next release.
Output: REQUEST

Input: Dark mode went live yesterday.
Output: STATUS

Input: This needs work.
Output: UNCLEAR

NEW INPUT
[NEW MESSAGE]

OUTPUT
```

This prompt makes the output shape visible through repeated examples. If an application expects a single machine-readable token, including explanatory paragraphs inside some demonstrations would teach an inconsistent format. A separate human-review mode can request justifications when needed.

Ordinary chat prompts do not enforce a schema or guarantee that a model will obey these instructions. For production applications, validate the returned label and handle unexpected outputs.

## Step 4: Reserve independent examples for testing

The eight demonstrations are not a fair final test: the desired answers are already in the prompt. Prepare held-out messages with independently reviewed reference labels.

| Held-out message | Expected | What changes the decision? |
| --- | --- | --- |
| Could you add an undo button? | REQUEST | Direct request |
| An undo button could be useful later. | IDEA | Future possibility |
| The undo button shipped in version 4. | STATUS | Release statement |
| Undo button. | UNCLEAR | No intent stated |
| I want a new search filter this month. | REQUEST | Current need |
| Perhaps we should explore a search filter. | IDEA | Exploratory suggestion |
| The search filter is already available. | STATUS | Availability statement |
| Search filter problem. | UNCLEAR | Unspecified problem |

These expected results are *editorial judgments*, not AI predictions. They provide a way to recognize wrong answers when you later run the prompt. The examples vary subject matter while holding the decision rules steady.

A real acceptance set should also include misspellings, indirect requests, conflicting requests, and organization-specific ambiguities. Eight invented cases cannot represent actual usage patterns.

## Step 5: Check the teaching and test sets with Python

Before using a model, check whether your example sets contain the expected number of records, balanced labels, and no exact duplicated input strings. This guards against simple editorial mistakes.

Run the following Python 3 script locally. It uses the standard library and does not contact an AI provider.

```python
from collections import Counter

examples = [
    ("Please add keyboard-only navigation.", "REQUEST"),
    ("Keyboard-only navigation would be nice someday.", "IDEA"),
    ("Keyboard-only navigation is live today.", "STATUS"),
    ("Keyboard navigation.", "UNCLEAR"),
    ("Please consider dark mode in a later planning cycle.", "IDEA"),
    ("I need dark mode in the next release.", "REQUEST"),
    ("Dark mode went live yesterday.", "STATUS"),
    ("This needs work.", "UNCLEAR"),
]
heldout = [
    ("Could you add an undo button?", "REQUEST"),
    ("An undo button could be useful later.", "IDEA"),
    ("The undo button shipped in version 4.", "STATUS"),
    ("Undo button.", "UNCLEAR"),
    ("I want a new search filter this month.", "REQUEST"),
    ("Perhaps we should explore a search filter.", "IDEA"),
    ("The search filter is already available.", "STATUS"),
    ("Search filter problem.", "UNCLEAR"),
]
allowed = {"REQUEST", "IDEA", "STATUS", "UNCLEAR"}

for name, rows in (("examples", examples), ("heldout", heldout)):
    assert len(rows) == 8
    assert len({text for text, label in rows}) == 8
    assert Counter(label for text, label in rows) == {
        label: 2 for label in allowed
    }
    print(name, "OK: eight unique messages; two per label")

assert {text for text, label in examples}.isdisjoint(
    {text for text, label in heldout}
)
print("PASS: no exact input appears in both sets")
```

**Executed editorial verification:** A Python 3 check was run on these sixteen fictional text-label pairs. Both sets contained eight unique inputs and two references for each label (IDEA, REQUEST, STATUS, UNCLEAR); no exact input was reused across sets. The printed wording above is representative of the equivalent audit, not a claim of a captured model response.

This only validates fixture structure. It does not determine whether the labels are semantically correct or whether two different sentences express the same underlying request. The [Python Counter documentation](https://docs.python.org/3/library/collections.html#collections.Counter) explains the counting utility used here.

## Step 6: Run held-out cases and keep raw results

To evaluate a model, submit each held-out message as `NEW INPUT`. Record the full raw output, prompt version, model/product and relevant settings, expected label, actual label, and any reviewer disagreement.

Test two different conditions:

- **Format correctness:** Does the answer contain exactly one of REQUEST, IDEA, STATUS, UNCLEAR, with no prefix or prose?
- **Decision correctness:** Does the selected label match the reviewed policy for that specific input?

For example, “This is an IDEA” may convey the intended decision but fail the required single-token format. Returning REQUEST for “Perhaps we should explore a search filter” is a substantive decision error even when the format is valid.

If a model matched seven of eight references, the arithmetic would be 7 ÷ 8 = 87.5%. **That number is illustrative, not an observed model score.** We did not execute live AI classifications for this article. Repeat important tests, because model responses may vary; retain all raw runs rather than overwriting failures.

For a full scoring workflow, see [How to Test AI Prompts with a Small Evaluation Dataset](https://guidehollow.com/prompts/test-ai-prompts-with-evaluation-dataset/). This article focuses on designing demonstrations rather than benchmarking models.

## Step 7: Repair accidental correlations

If a tested model makes the same mistake repeatedly, audit the *demonstrations* before adding a generic instruction to be more accurate.

Ask whether each label is associated with an irrelevant feature: one keyword, one sentence length, one topic, or one punctuation style. Replace redundant examples with close contrastive pairs. Keep every reference label consistent with the written policy.

Change a small part of the prompt, version it, and rerun previous test inputs alongside cases targeting the new failure. Once you repeatedly tune against a held-out set, it is no longer genuinely unseen. Create a fresh final set before making a credible deployment decision.

## Frequent mistakes

**Only easy examples:** A set with “Please implement...” as REQUEST and “Maybe...” as IDEA may be too obvious. Include close and ambiguous examples.

**Contradictory labels:** If two equivalent suggestions have different labels, the model receives incompatible signals. Fix the policy and references first.

**Inconsistent example format:** One output contains a sentence while others contain labels. Demonstrate precisely what the consuming workflow expects.

**Overfitting to the test set:** Copying a failed held-out item into demonstrations may repair that one case while doing little for unseen inputs. Add a *new* final test set and examine the general rule.

**Unapproved real records:** Fictional data is preferable for tutorials. For workplace prompts, obtain permission and follow applicable privacy controls.

## Practical review checklist

- [ ] Every label has an explicit meaning.
- [ ] Demonstrations include ordinary and borderline cases.
- [ ] Similar keywords appear across different correct labels.
- [ ] All outputs use one consistent format.
- [ ] Reference labels are reviewed by someone familiar with the task.
- [ ] No held-out input is duplicated in the demonstrations.
- [ ] Automated shape checks and human semantic review are separate.
- [ ] Raw model responses are recorded before scoring.
- [ ] Model behavior is tested again after prompt revisions.

Few-shot examples are **task specifications by demonstration**, not evidence that an AI system is reliable. A small, varied set that teaches meaningful differences is usually a better starting point than a large collection of repetitive samples.

## Official sources and limitations

- [OpenAI — Prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering): few-shot examples and their diversity.
- [Google AI for Developers — Prompt design strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies): formatting consistency and example variety.
- [Anthropic — Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices): relevant, varied, separated examples.
- [Python — collections.Counter](https://docs.python.org/3/library/collections.html#collections.Counter): label-count inspection.

**Verification scope:** All messages and expected labels are fictional teaching data. We executed only the local dataset-shape checks, not live model runs. No observed model accuracy, production outcome, real support case, public publication, or deployed page is claimed. Any organization must define its own labeling policy, review ambiguous records, and validate model behavior before operational use.
