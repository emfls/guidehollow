---
title: "AI Text Cleanup: Why Identical-Looking Names Do Not Match"
description: "Diagnose Unicode mismatches in AI-cleaned text with a reproducible Python exercise. Compare NFC and NFKC, preserve originals, and flag risky ID collisions."
slug: "ai-text-cleanup-unicode-normalization"
category: "troubleshooting"
tags: ["ai", "unicode", "data-cleaning", "python", "text-validation"]
publishedDate: "2026-11-13"
updatedDate: "2026-11-13"
sources: [{"title":"Unicode Standard Annex #15: Unicode Normalization Forms","url":"https://www.unicode.org/reports/tr15/"},{"title":"Python documentation: unicodedata","url":"https://docs.python.org/3/library/unicodedata.html"},{"title":"Unicode Technical Standard #39: Unicode Security Mechanisms","url":"https://www.unicode.org/reports/tr39/"}]
draft: false
author: "GuideHollow Editorial"
featured: false
---

You ask an AI assistant to tidy a contact list. Two entries both appear to say **café**, but an exact comparison still says they differ. A Korean label looks unchanged after copying, yet a lookup misses it. Rewriting the prompt may not solve either problem: the underlying strings can contain different Unicode code points.

The useful first step is to inspect a small example, preserve both originals, and test a comparison rule separately. Unicode normalization can make canonically equivalent strings compare equally. A broader rule can also remove distinctions you needed to keep. Neither result, by itself, proves that two records belong to the same person or product.

This exercise uses fictional text and Python's standard library. It does not require an AI subscription, an uploaded customer list, or an additional package. If your broader task is cleaning an export, start with our [workflow for using AI on spreadsheet tasks safely](/guides/how-to-use-ai-for-spreadsheet-tasks/).

> **Key takeaways**
>
> - Inspect code points when text looks identical but an exact comparison fails.
> - Test NFC on a separate comparison key before considering broader transformations.
> - NFKC can make distinct source IDs equal. Review that collision instead of merging records automatically.
> - Keep the original text, the rule used, and unresolved cases together.

## 1. Separate a display problem from a matching decision

A code point is a numbered Unicode character value. The visible **é** can be represented by U+00E9, or by U+0065 followed by U+0301: an ordinary **e** and a combining acute accent. These representations can render alike while remaining different sequences.

[Unicode's normalization specification](https://www.unicode.org/reports/tr15/) distinguishes canonical equivalence from compatibility equivalence. NFC addresses the former. NFKC also applies compatibility transformations, which can discard meaningful distinctions. This is a choice about text representation; it is not a rule for deciding whether two customer accounts are duplicates.

For the exercise, imagine that a fictional directory imported labels from two sources. Keep a stable row ID beside every value. If two labels later share a comparison key, you can then investigate both original records rather than losing one.

Do not start by asking AI to “fix all weird characters.” That instruction leaves the meaning of *fix* undefined. It might encourage accent removal, spelling changes, whitespace replacement, or an unjustified merge. Define the allowed transformation first.

## 2. Run four small comparisons

The escaped forms below make the exercise reproducible even if a browser, editor, or clipboard changes how a character is displayed. In a Python string literal, `\u0301` denotes a Unicode escape; it is not six characters of source data.

| Case | Raw equal | NFC equal | NFKC equal |
| --- | --- | --- | --- |
| Accent | False | True | True |
| Hangul | False | True | True |
| Space | False | False | True |
| ① / 1 | False | False | True |

The first two pairs contain canonical equivalents. The third compares a nonbreaking space with an ordinary space. The fourth compares **①** with **1**. NFKC makes those last two pairs equal too, but that broader equality needs a policy decision.

The exact string pairs are shown as Python escapes in the code below. Copy it into a disposable Python session:

```python
import unicodedata as ud

pairs = [
    ("accent", "caf\u00e9", "cafe\u0301"),
    ("hangul", "\uac00", "\u1100\u1161"),
    ("space", "North\u00a0Team", "North Team"),
    ("circled", "\u2460", "1"),
]

for label, left, right in pairs:
    print(label, left == right,
          ud.normalize("NFC", left) == ud.normalize("NFC", right),
          ud.normalize("NFKC", left) == ud.normalize("NFKC", right))
```

Expected output:

```text
accent False True True
hangul False True True
space False False True
circled False False True
```

[Python's `unicodedata` documentation](https://docs.python.org/3/library/unicodedata.html) defines `normalize()` and the four supported forms. These calls create comparison values; this snippet does not overwrite the strings in `pairs` or save a changed file.

If you prefer complete files, download the [fictional fixture](/examples/unicode-text-audit/fixture.json), the [audit script](/examples/unicode-text-audit/audit.py), and the [recorded results](/examples/unicode-text-audit/results.json). Put the fixture and script in the same disposable folder, inspect the script, and run `python3 -B audit.py`. It reads the adjacent fixture, checks its expected results, prints a report, and writes or replaces `results.json` in that folder. It leaves the fixture unchanged and does not clean your documents.

## 3. Expose the character that changed

A visible label is not enough evidence for a repair. Inspect character values when a pair fails unexpectedly:

```python
def inspect(text):
    return [(f"U+{ord(char):04X}", ud.name(char, "UNNAMED"))
            for char in text]

print(inspect("caf\u00e9"))
print(inspect("cafe\u0301"))
```

The first string ends with **U+00E9 LATIN SMALL LETTER E WITH ACUTE**. The second ends with **U+0065 LATIN SMALL LETTER E** and **U+0301 COMBINING ACUTE ACCENT**. You now have a specific difference to test, rather than a guess that the file is corrupted.

For the space example, inspect the character between the two words. U+00A0 and U+0020 are different values. A general “trim spaces” instruction does not document which internal spaces should change or whether the no-break behavior matters.

Keep the escaped representation in an audit note when an invisible or combining character would make a plain screenshot ambiguous. Use only a sanitized sample when asking an assistant to explain that note. A few invented labels are enough to investigate the mechanism.

## 4. Ask AI for an audit proposal

Use AI to explain the difference and suggest checks. Keep it away from destructive changes until the matching policy is settled. This prompt fits the fictional examples:

```text
Review the supplied fictional string pairs.
Do not rewrite source strings, remove rows, or decide record identity.
For each pair, return:
- the exact Unicode code points, using escaped forms where useful;
- predicted raw, NFC, and NFKC equality;
- the specific transformation responsible for any new match;
- a review flag where a broader transformation removes a distinction.
Separate predictions from results actually executed.
Do not strip accents, change case, transliterate, or correct spelling.
```

Compare its predictions with the local output. A plausible explanation can still contain an incorrect code point, miss a case, or label an unexecuted result as tested. For a repeatable assessment of several prompts, use our [small evaluation-dataset method](/prompts/test-ai-prompts-with-evaluation-dataset/).

Avoid copying the assistant's cleaned list over your export. Even correct normalization leaves unanswered questions about row ownership, stable IDs, and which system has authority to change a name.

## 5. Audit collisions before joining or deduplicating

A collision occurs when different raw values map to the same proposed key. Consider two fictional product IDs: **SKU-①** and **SKU-1**. Under NFKC, both become **SKU-1**. That is an observable transformation, not evidence that one product record should disappear.

Use this check before accepting the proposed rule:

```python
raw_ids = ["SKU-\u2460", "SKU-1"]
keys = [ud.normalize("NFKC", value) for value in raw_ids]
assert len(set(raw_ids)) == 2
assert len(set(keys)) == 1
print("REVIEW: distinct source IDs share one proposed key")
```

For your own audit, create separate columns for **row ID**, **original value**, **proposed key**, **rule**, and **review decision**. Group by the proposed key and examine groups containing different original values. Leave the source column intact.

For a free-text search label, folding a circled number might be an acceptable documented choice. For an externally assigned identifier, it might join unrelated records. Ask the data owner before treating the keys as interchangeable. Even an NFC match between names does not establish that two people are the same person.

Once a rule is approved, reconcile input rows, output rows, and unresolved groups. Our [CSV deduplication audit](/guides/audit-ai-csv-duplicate-removal-without-losing-rows/) explains why retaining one record requires more evidence than detecting repeated text.

## 6. Check the cases normalization does not solve

Normalization is not spellcheck. In this exercise, **North Team** and **Nroth Team** remain different under both NFC and NFKC. A spelling correction would require another rule and supporting context.

It also does not make every visually similar character equal. Compare Latin **a** (U+0061) with Cyrillic **а** (U+0430). They remain different in this test under both forms. Unicode addresses visually confusable identifiers separately in [Unicode Security Mechanisms](https://www.unicode.org/reports/tr39/). Do not treat a successful normalization pass as proof that a username, domain, or document reference is safe.

Add three checks to any proposed cleanup:

1. **Original preservation:** the source bytes must remain unchanged during inspection.
2. **Repeatability:** normalizing an already normalized value with the same form should not change it again.
3. **Boundary controls:** include a typo, a cross-script lookalike, and two distinct IDs that the proposed rule collapses.

Passing these checks supports the particular comparison procedure. It does not validate every Unicode character, your application database, or the business decision to merge records. An export/import application may apply additional transformations, so test that round trip separately before using it on important data.

## What we tested and what to do next

The downloadable audit was executed locally with Python's standard library. It checked all four equality rows above, explicit fixture code points, repeated-normalization stability, unchanged source bytes, the circled-number ID collision, and the typo and cross-script controls. The three inline code blocks were also executed and matched their stated results, including the SKU-prefixed example. The results file records the runtime and Unicode database versions used.

No live AI response, spreadsheet calculation engine, customer dataset, or production cleanup was tested. The prompt is a suggested audit request, and the example strings are fictional. Official references were checked on November 13, 2026.

Try the four pairs first. Then choose one real mismatch, make an authorized sanitized example, inspect its code points, and record the smallest comparison rule that explains it. Approve that rule and review collisions before changing any stored value.
