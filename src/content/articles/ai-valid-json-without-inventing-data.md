---
title: "How to Get AI to Output Valid JSON Without Inventing Missing Data"
description: "Make AI return valid JSON without inventing values. Learn a source-bounded prompt, a two-ticket example, JSON syntax checks, schema rules, and a fact audit."
slug: "ai-valid-json-without-inventing-data"
category: "guides"
tags: ["ai", "json", "structured-data", "source-verification", "validation"]
publishedDate: "2026-10-26"
updatedDate: "2026-10-26"
sources: [{"title": "developers.openai.com — reference", "url": "https://developers.openai.com/api/docs/guides/structured-outputs"}, {"title": "json-schema.org — reference", "url": "https://json-schema.org/understanding-json-schema/reference/object"}, {"title": "developer.mozilla.org — reference", "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/JSON_bad_parse"}]
draft: false
author: "GuideHollow Editorial"
featured: false
---

If an AI answer needs to feed a spreadsheet, script, or database, ask for **JSON with a fixed set of fields**, then check both the structure and the facts. Valid JSON is not automatically accurate data. A field can have perfect syntax and still contain a made-up value.

This guide shows a small two-ticket exercise you can repeat in a few minutes. It separates three different checks: JSON syntax, expected fields and types, and agreement with the original text. The tickets are fictional. The example output is an editorial reference, not a claimed result from a live AI-model test.

## The three checks that prevent different mistakes

1. **Syntax:** Can a JSON parser read the response? JSON keys and string values use double quotes; trailing commas are not allowed.
1. **Structure:** Does the object contain the required fields with the expected types, and no unwanted extra fields?
1. **Source fidelity:** Do the values actually appear in the original notes? A parser or schema cannot prove this part.

Consider a perfectly valid response containing `"resolved": false`. If the source only says that no fix was confirmed, that `false` value is too strong. The honest value in our example is `null`, meaning the status was not specified.

## Step 1: Start with a tiny source you can audit

Copy the following fictional support notes into your AI assistant. Do not use sensitive customer records without the necessary permission and data-handling review.

> **T-101:** The customer says the download link shows an error. They tried it once. They did not provide an error code. The note does not confirm whether the problem was resolved.

> **T-102:** A CSV import failed with error code E42. The support note explicitly confirms the problem was resolved after the customer uploaded a corrected CSV.

We want exactly four fields per ticket:

- `id`: ticket identifier copied from the note
- `problem`: a brief description supported by the note
- `error\_code`: the exact code, or JSON `null` if absent
- `resolved`: `true` only if confirmed resolved, `false` only if explicitly confirmed unresolved, otherwise `null`

The distinction between `null` and `false` matters. Unknown is not the same as unsuccessful.

## Step 2: Give the model an exact output contract

Copy and adapt this prompt:

```plain
Convert the SOURCE NOTES below into a single valid JSON object.

The root object must contain exactly one key: "records".
"records" must be an array with one object per ticket.
Each ticket object must contain exactly these four keys:
"id", "problem", "error_code", "resolved".

Rules:
- Use only facts in SOURCE NOTES.
- Never invent an error code or resolution.
- Set "error_code" to null if no code is supplied.
- Set "resolved" to true only for explicitly confirmed resolution.
- Set "resolved" to false only for explicitly confirmed non-resolution.
- Otherwise set "resolved" to null.
- "id", "problem" and any supplied "error_code" are strings.
- "resolved" is a boolean or null.
- No commentary, Markdown fences or additional keys.
- If the source is ambiguous, preserve that ambiguity as null.

SOURCE NOTES:
[PASTE THE TWO NOTES HERE]
```

This prompt makes the missing-value rule explicit instead of letting the AI choose a plausible answer. A good prompt increases clarity, but does not guarantee obedience or correctness in a normal free-form chat.

## Step 3: Compare against this reference JSON

For the two fictional notes above, the source-supported result is:

```json
{
  "records": [
    {
      "id": "T-101",
      "problem": "Download link shows an error",
      "error_code": null,
      "resolved": null
    },
    {
      "id": "T-102",
      "problem": "CSV import failed",
      "error_code": "E42",
      "resolved": true
    }
  ]
}
```

Check the small details: T-101 contains no error code and no confirmed resolution. T-102 has one reported code and an explicitly confirmed resolution. Neither record contains an invented date, owner, refund, or customer name.

If the model returns `"resolved": false` for T-101, fix the value after checking the source. If it fabricates an error code, remove that code. Do not automatically trust the next AI-generated attempt simply because it looks more polished.

## Step 4: Check JSON syntax locally

Save the response as a UTF-8 file named `output.json`. If Node.js is already installed on your computer, run this command in the folder containing the file:

```bash
node -e 'JSON.parse(require("node:fs").readFileSync("output.json", "utf8")); console.log("JSON syntax OK")'
```

If the file is valid JSON, the command prints `JSON syntax OK`. A syntax error will stop parsing and print an error instead. This check reads the local file; it does not send your notes to an online validator.

Common syntax problems include:

- Using `'single quotes'` for JSON property names or values
- Adding a comma after the last property in an object
- Wrapping the JSON in an explanatory sentence or Markdown code fence
- Writing `None` or `undefined` instead of JSON `null`

**Important:** `JSON.parse()` checks whether the text is valid JSON. It does **not** check the required ticket fields, correct types, or truth of any statement.

## Step 5: Define the allowed structure with JSON Schema

If you process many records, a JSON Schema makes the expected data shape explicit. The following schema describes the example above:

```json
{
  "type": "object",
  "properties": {
    "records": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "problem": { "type": "string" },
          "error_code": { "type": ["string", "null"] },
          "resolved": { "type": ["boolean", "null"] }
        },
        "required": ["id", "problem", "error_code", "resolved"],
        "additionalProperties": false
      }
    }
  },
  "required": ["records"],
  "additionalProperties": false
}
```

In JSON Schema, `required` says which keys must exist. `additionalProperties: false` rejects keys not listed for that object. Types that include `"null"` allow explicitly unknown values. A missing field and a present field containing `null` are not identical.

A schema is only useful as a validation rule when you actually run a compatible validator against the output, or supply it through an API feature that enforces the supported schema. Simply pasting this schema into a normal chat does not turn that chat into a guaranteed schema validator.

OpenAI's API Structured Outputs can enforce a supported JSON Schema when configured correctly. This is different from basic JSON mode: valid JSON alone is not a guarantee that the result matches a chosen schema. Consult the current API documentation for model and schema limitations.

## Step 6: Run the source-fidelity check that code cannot replace

Even a schema-valid JSON object may be factually wrong. Use this four-row audit for our exercise:

| Test | Expected |
| --- | --- |
| Number of records | Exactly 2, IDs T-101 and T-102 |
| T-101 unknowns | error\_code = null; resolved = null |
| T-102 confirmed facts | error\_code = E42; resolved = true |
| Unsupported details | No added dates, owners, refunds or names |

A practical production workflow should also count source records and output records, flag unmatched IDs, and ask a human to review any extracted value not traceable to the source. These checks catch content mistakes that syntax parsing cannot see.

## Three failure patterns and how to repair them

### The model adds an unsupported field

**Problem:** It returns `"priority": "urgent"` even though no priority is present in the source or allowed in the schema.

**Repair:** Reject the extra field. Make the allowed keys explicit, and validate with `additionalProperties: false`. Do not add priority to the schema merely to preserve the model's guess.

### The model turns unknown into false

**Problem:** It marks the T-101 issue as unresolved, despite the note only saying resolution was not confirmed.

**Repair:** Compare the status against the exact source sentence. Use `null` for an unknown state. Reserve `false` for a source that explicitly says the issue remains unresolved.

### The model returns attractive but invalid JSON

**Problem:** It includes an introduction, Markdown fences, or a trailing comma.

**Repair:** Ask again for only a single JSON object, then re-run the syntax check. If you use an application, handle errors rather than assuming the response always parses.

## A quick checklist before importing AI-generated JSON

- [ ] Every source item has exactly one expected output record.
- [ ] All required fields are present.
- [ ] Field types and `null` values follow the contract.
- [ ] Extra fields are rejected.
- [ ] Dates, codes, statuses and totals are checked against the source.
- [ ] No private data is transferred to a third-party service without permission.
- [ ] Parsing, schema validation and factual review are treated as separate checks.

For a related source-bounded extraction workflow, see [How to Extract Meeting Action Items with AI Without Inventing Deadlines](https://guidehollow.com/guides/extract-meeting-action-items-with-ai/). That guide covers decision and action extraction; the present guide focuses on machine-readable JSON and the difference between missing and negative values.

## Sources and verification scope

- [OpenAI API — Structured model outputs](https://developers.openai.com/api/docs/guides/structured-outputs): JSON mode versus schema-constrained Structured Outputs, schema requirements and edge cases.
- [JSON Schema — Objects](https://json-schema.org/understanding-json-schema/reference/object): `properties`, `required`, and `additionalProperties`.
- [MDN — JSON.parse syntax errors](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/JSON_bad_parse): examples of rejected JSON syntax.

**Verification note:** The examples are fictional editorial fixtures, and the reference JSON and schema were written for this article. The cited official documentation was checked when preparing the draft. No live AI-model benchmark, paid API request, user account, or native third-party application run is claimed. Always validate any model response in your own environment before relying on it.
