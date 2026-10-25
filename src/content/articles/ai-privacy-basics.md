---
title: "AI Privacy Basics for Everyday Users"
description: "Work through a fictional customer record to remove identifiers, preserve useful context, and check an AI-ready input before sharing it."
slug: "ai-privacy-basics"
category: "guides"
tags: ["privacy", "ai-basics", "chatgpt"]
publishedDate: "2026-10-23"
updatedDate: "2026-10-25"
sources: [{"title": "OpenAI: Data controls in ChatGPT", "url": "https://help.openai.com/en/articles/7730893-data-controls-in-chatgpt"}, {"title": "GitHub General Privacy Statement", "url": "https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"}]
draft: false
author: "GuideHollow Editorial"
featured: false
---

## Share the minimum the task needs

Before entering information into an AI product, decide whether it is necessary, whether you are permitted to share it, and what the product's current settings allow. A writing task rarely needs a real customer's name, account number, or complete history.

Privacy is not one switch. Training controls, retention, sharing links, connected services, and organizational rules address different questions. Check the current documentation for the actual product and account you use.

## Classify the material first

Use three practical groups as a starting point, then follow any stricter rules that apply to your work:

- **Public:** information already intended for public distribution, such as a published event description.
- **Internal:** plans, drafts, or operating details not meant for public circulation.
- **Sensitive:** credentials, financial or personal records, health details, and other information whose exposure could cause harm.

These groups are a planning aid, not a legal classification system. If you do not have authority to share a document, a personal AI subscription does not create that authority.

## Remove details that do not change the answer

Suppose you want help making a customer email less defensive. You can often replace the customer's identity with “Customer A,” an order number with “[ORDER],” and a precise address with “[ADDRESS].” Keep the problem and the required response; remove the unnecessary identifiers.

Redaction is more than replacing names. A combination of dates, locations, job roles, and unusual events may still identify someone. When the real details are not needed, use an entirely fictional example with the same communication problem.

## Follow a pre-upload checklist

1. Identify the task: rewrite, summarize, classify, or calculate.
2. Determine the smallest input that makes the task possible.
3. Remove identifiers, credentials, hidden comments, and unrelated sections.
4. Check whether the content belongs to someone else or is restricted by your organization.
5. Review the product's current privacy controls and service terms.
6. Decide whether to proceed, use an approved workspace, or complete the task without AI.

If you cannot explain why a field is necessary, leave it out of the first attempt. Add context selectively if the response shows that a relevant detail is missing.

## Worked example: keep the task, remove the customer record

Suppose the job is to make a document request sound calmer. The following record is entirely fictional and editor-written; it is not customer data or an observed AI response.

**Original practice record, before minimization:**

```text
Customer: Morgan Vale, morgan.vale@example.com
Order: DEMO-4821
Delivery address: 17 Sample Lane, Example City
Internal note: the only night-shift supervisor at the East Depot
Request: the signed delivery form is missing.
We cannot complete the delivery review without it.
Ask the customer to send it through the approved customer portal.
```

A simple name replacement would leave the email, address, order identifier, and distinctive role in place. None helps rewrite the request. The decision below is based on this specific writing task; a different authorized task might require different fields.

| Field | Decision for this task | Reason |
| --- | --- | --- |
| Name and email | Replace the greeting with [CUSTOMER]; omit email | Tone can be revised without identifying the recipient |
| Order and address | Omit entirely | Neither changes what document is needed |
| Unique job and location | Omit entirely | Removing a name alone leaves identifying context |
| Missing signed delivery form | Keep | Otherwise the recipient cannot tell what to provide |
| Review cannot finish without the form | Keep | This dependency explains why the request matters |
| Approved portal | Keep as [APPROVED CHANNEL] | Preserve the permitted route without exposing a private URL |

**Minimum practice input to use instead:**

```text
Rewrite this fictional request in a calm, professional tone.
Keep the requested document and dependency unchanged.
Preserve [CUSTOMER] and [APPROVED CHANNEL] exactly.
Do not add a deadline, compensation, or completion promise.

Hello [CUSTOMER],
The signed delivery form is missing.
We cannot complete the delivery review without it.
Please send it through [APPROVED CHANNEL].
```

**Editorial reference result:**

> Hello [CUSTOMER], please send the signed delivery form through [APPROVED CHANNEL]. We need the form to complete the delivery review.

The result retains the document, dependency, and delivery route. It has no customer identity, private address, deadline, or new promise. Compare your own result with those properties; the wording need not match.

**Do not minimize away the task itself.** “Please send [THING] so we can do [TASK]” hides which document is needed and makes the output less useful. Keep task-relevant context while removing unrelated identifying details. Fill the recipient and approved channel in your authorized local workflow after reviewing the text.

### A second check: indirect identifiers

Try this fictional note: “The only weekend technician at the North branch asked for the same signed form.” For this tone-editing task, remove the role, schedule, and branch together. Keeping them after replacing the person's name does not establish anonymity. If the work requires such details, use the organization's approved handling process rather than treating this exercise as clearance to upload them.

## Understand what a setting changes

OpenAI's Data controls documentation describes an option to prevent new personal-workspace conversations from being used to improve models. It separately describes saved chats and other controls. Read those distinctions carefully: opting out of training is not equivalent to making all use or retention impossible.

Settings can differ by workspace and account. If you use an organizational account, consult the workspace owner rather than assuming your personal settings govern that environment. Avoid relying on screenshots from an older interface.

## Remember the surrounding workflow

A prompt is only one place information can travel. Shared conversation links, copied text, downloaded files, browser extensions, screenshots, and collaborators can all change who can see the material. Inspect a generated document before forwarding it; the assistant may have preserved details you meant to remove.

On GuideHollow, the two free tools operate locally in the page. Our search terms appear in URLs, and public GitHub issues are public. Those details are explained in our [Privacy Policy](/privacy-policy/). Local processing does not protect against someone with access to your device or clipboard.

## If you already shared something sensitive

Stop adding more information. Follow the provider's current removal options and your organization's incident process. For a credential, use the issuing service's revocation or rotation process; deleting a conversation is not a substitute for invalidating a disclosed secret.

This is general workflow guidance rather than a determination of your legal obligations. For a regulated or confidential use case, ask the responsible privacy or security contact before continuing.

## Build a repeatable habit

Use a short preflight: permission, necessity, settings, recipients. If any part is unclear, use a fictional input or pause. Then review the output for accidental disclosure before sharing it. Our [email drafting guide](/guides/how-to-draft-emails-with-ai/) shows how to preserve useful context without supplying a complete personal history.
