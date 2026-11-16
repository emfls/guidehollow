---
title: "How to Check AI-Generated Alt Text for Charts"
description: "Check AI-written chart descriptions against the source data. Use a fictional bar chart, four review cases, and a reusable worksheet to catch misleading claims."
slug: "check-ai-chart-alt-text"
category: "guides"
tags: ["ai-verification", "accessibility", "data-visualization"]
publishedDate: "2026-11-16"
updatedDate: "2026-11-16"
sources: [{"title":"W3C WAI: Complex Images","url":"https://www.w3.org/WAI/tutorials/images/complex/"},{"title":"W3C WAI: An Alt Decision Tree","url":"https://www.w3.org/WAI/tutorials/images/decision-tree/"},{"title":"W3C: Understanding Success Criterion 1.1.1 — Non-text Content","url":"https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html"}]
draft: false
author: "GuideHollow Editorial"
featured: false
---

To check AI-generated alt text for a chart, compare every factual claim with the chart's labels and source data, then check whether the text serves the reader's task. A description can name the chart correctly while getting its trend wrong. It can also repeat every number without explaining the comparison the reader needs.

This guide uses an original fictional dataset and four deliberately constructed descriptions. They are teaching examples, not recorded outputs from an AI product or results from an accessibility study. You can download the chart, data, and review worksheet to practice the same checks on your own work.

> **Key takeaways**
> - Verify the period, units, values, and trend before accepting fluent wording.
> - Give a complex chart a concise identifying alternative and provide its essential information in nearby text or another appropriate accessible form.
> - Treat an explanation of *why* values changed as a separate claim requiring evidence.

## 1. Define what the chart helps a reader do

Write one sentence describing the chart's purpose before asking an AI tool to describe it. For this example, the purpose is: **compare monthly workshop registrations from July through October 2026**. The reader should be able to find the high and low months and understand how the counts changed.

The surrounding content matters. A chart in a monthly operations report may need exact figures; a chart illustrating a broad pattern may need a different emphasis. W3C's [alt decision tree](https://www.w3.org/WAI/tutorials/images/decision-tree/) makes context and purpose part of choosing a text alternative. A functional image that acts as a link also needs to communicate its action or destination.

For this informative chart, an empty alt attribute would remove its identifying information unless that purpose were already fully supplied by the surrounding content. Do not apply a blanket rule that every chart needs either a long alt attribute or an empty one. Decide what information the image contributes, and where the reader can get it.

Before drafting, gather the chart, its underlying table, the relevant surrounding paragraph, and any definitions of the metric. If those disagree, resolve the disagreement first. An AI description cannot establish which source is correct. Our broader guide to [verifying AI-generated information](/guides/how-to-verify-ai-generated-information/) explains how to separate a claim from the evidence needed to support it.

## 2. Establish the values before reviewing the prose

Here is the example chart. The counts are fictional registrations, not revenue, attendance, or a count of unique people. The dataset contains no explanation of what caused the changes.

<figure style="margin:1.5rem 0">
  <img src="/examples/chart-alt-text/registration-chart.svg" alt="Bar chart of fictional workshop registrations from July to October 2026. Values and trend are described below." width="576" height="324" style="width:100%;height:auto" loading="lazy" />
  <figcaption>Original teaching chart using fictional data. The values and text description follow immediately below.</figcaption>
</figure>

### Values and text description

| Month in 2026 | Registrations |
| --- | ---: |
| July | 40 |
| August | 60 |
| September | 30 |
| October | 50 |

Registrations rose from 40 in July to 60 in August, fell to 30 in September, and recovered to 50 in October. August had the highest count and September the lowest. The August-to-September decrease was 30 registrations. October finished 10 registrations above July, but the series did not rise every month.

The chart uses a zero baseline and displays a value label on each bar. Check the vertical axis and the labels rather than estimating counts from bar height. For a chart without printed values, use the underlying data where available; if only an approximate reading is possible, identify that uncertainty instead of inventing precision.

Download the [four-row source CSV](/examples/chart-alt-text/registration-data.csv) and the [original SVG chart](/examples/chart-alt-text/registration-chart.svg). The column `registrations` means registrations in that month. It does not establish that the same person could not register in multiple months, so summing the rows would not prove a count of unique participants.

## 3. Ask for a short alternative and a separate description

Keep the identifying alt text and the detailed explanation distinct. W3C's [complex images tutorial](https://www.w3.org/WAI/tutorials/images/complex/) describes combining a short alternative with a longer representation of the information. For this example, the nearby table supplies exact values and the paragraph explains their relationship.

Use a prompt like this after supplying the chart and data:

```text
Task: Help a reader compare monthly workshop registrations.
Data: July 2026 = 40; August = 60; September = 30; October = 50.
These are fictional registration counts, not unique people or revenue.

Draft two separate items:
1. Concise identifying alt text for the chart. Tell the reader that
   the values and trend are described immediately below it.
2. A visible text description covering the period, metric, highest
   and lowest month, and direction of change between months.

Use only the supplied facts. Do not infer causes or forecasts.
If the chart and data disagree, flag the conflict rather than guessing.
```

The prompt is a drafting aid, not a guarantee. Review its output against the table even when the response sounds confident. If you provide a different chart, update the task, metric, period, and actual location of the description. A reference to information “below” is misleading if the destination page puts that information on another page or omits it.

Avoid using an arbitrary character limit as your main quality test. Aim for concise identification in the alt text and enough detail elsewhere to preserve the chart's useful information. If your publishing system offers only one alt field, investigate how it supports nearby descriptions before pasting an entire data table into that field.

## 4. Reject these three plausible descriptions

The cases below are intentionally written examples. They show different review decisions; they do not measure the error rate of any AI model.

| Case | Constructed description | Review decision |
| --- | --- | --- |
| A | “A registration chart.” | Too vague on its own for this comparison task: it omits the period and a route to the values. |
| B | “Registrations rose every month.” | Factually wrong: September fell from 60 to 30. |
| C | “A marketing campaign caused registrations to rise.” | Unsupported: the data includes no campaign information or causal evidence. |
| D | A short identifying alternative plus the visible table and trend description above. | A suitable editorial approach for this example, subject to checking the actual delivery. |

**Case A needs context.** “A registration chart” might label the object, but it does not help this reader compare months. Improve the identification and make the detailed information easy to locate. You do not need to describe green bars merely because the bars are green; mention visual encoding when it carries meaning the reader needs.

**Case B needs a factual correction.** The first and last values alone do not describe the path between them. “October was higher than July” is supported; “registrations rose every month” is not. Check adjacent pairs as well as the endpoints, especially when a chart contains reversals.

**Case C needs evidence or removal.** Neither the chart nor the CSV records a marketing campaign. Replacing “caused” with “probably caused” still adds an unsupported explanation. Keep the description to the observed counts unless you have separate evidence and clearly distinguish that evidence from the chart itself.

Case D is not a certificate of accessibility. It shows how the information can be distributed in this article. Download the [four-case review worksheet](/examples/chart-alt-text/alt-text-review.tsv) to record the claim, the source check, and the edit you would make. For a larger set of recurring checks, see [building a small AI prompt evaluation dataset](/prompts/test-ai-prompts-with-evaluation-dataset/).

## 5. Check the published page, not just the draft

After placing the description in your site or document, inspect the result in its actual reading context. A correct sentence in a separate notes file does not help a reader if the page never exposes it.

1. Confirm that the intended image loads and the saved alt text matches the reviewed wording.
2. Read the surrounding text in order. The introduction, image alternative, caption, table, and trend description should form a coherent explanation.
3. Follow any link to a longer description. Check that its destination exists and contains the promised information.
4. Check the table's headers and reading order. Ensure all four months and counts survived the publishing process.
5. Preview a narrow screen. Check whether the chart labels remain readable and whether the nearby text and values remain easy to reach.

This example keeps the description visibly adjacent to the chart rather than relying on a hidden association. W3C notes that using `aria-describedby` for a structured long description flattens the referenced content for its spoken presentation; it does not preserve that content's internal table navigation. Choose a delivery pattern appropriate to the information rather than adding an attribute solely because it sounds accessible. See the implementation discussion in [Complex Images](https://www.w3.org/WAI/tutorials/images/complex/).

A browser preview can reveal missing content and layout defects. It does not establish how every assistive technology will present the page. If you are making a formal accessibility claim, include the relevant assistive technology testing and broader page review. W3C's [Understanding Non-text Content](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html) explains the purpose of a text alternative; the presence of an alt attribute alone does not establish conformance.

## Keep a small review record

Save the source version, the reader's task, the draft description, each correction, and the location of the final description. Record what you actually checked. For example: “Compared four values with the CSV and inspected the saved web page” is more useful than “accessibility passed.”

For this guide, the example assets are original fictional material. The checks cover their arithmetic, consistency, and web presentation; the examples are not observed AI outputs, a user study, or a screen-reader test. The W3C sources linked here were consulted on November 16, 2026.

Start with one chart: write its purpose, mark every factual claim in the AI draft, and compare those claims with the underlying values. Publish the description only after the numbers, wording, and destination page agree.
