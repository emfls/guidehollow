---
title: "AI Privacy Basics for Everyday Users"
description: "Work through a fictional customer record to remove identifiers, preserve useful context, and check an AI-ready input before sharing it."
slug: "ai-privacy-basics"
category: "guides"
tags: ["privacy", "ai-basics", "chatgpt"]
publishedDate: "2026-10-23"
updatedDate: "2026-11-03"
sources: [{"title":"OpenAI: Data controls in ChatGPT","url":"https://help.openai.com/en/articles/7730893-data-controls-in-chatgpt"},{"title":"GitHub General Privacy Statement","url":"https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"},{"title":"OpenAI Help Center: Getting started with Space in ChatGPT","url":"https://help.openai.com/en/articles/20001549-getting-started-with-space-in-chatgpt"},{"title":"OpenAI Help Center: ChatGPT Space: sharing, data, and controls","url":"https://help.openai.com/en/articles/20001544-chatgpt-space-sharing-data-and-controls"}]
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

## A more dangerous privacy mistake: sharing a page is not sharing a file link

Removing names from a prompt does not resolve every disclosure risk. In a collaborative ChatGPT **Space**, readers may gain access through a direct page invitation, its parent page, or a shared space. The official [Getting started with Space in ChatGPT](https://help.openai.com/en/articles/20001549-getting-started-with-space-in-chatgpt) explains that Space replaces Library for accounts with access to Space, while **Projects remain separate**. This section describes documented permissions reviewed on November 3, 2026, not a live test in anyone's account.

**Three different objects have different access rules:**

| You put this on a shared Space page | What the official documentation supports | Your check before sharing |
| --- | --- | --- |
| A file uploaded **into the page** | The uploaded file follows the page's permissions; people who can access the page can access that uploaded file. | Inspect page access, any shared parent and the space; remove attachments that the audience should not receive. |
| A **link** to a separately stored file, including a connected-service file | Sharing the page does **not automatically grant** access to the original file. Its own source permissions still apply. | Verify the linked file separately. Do not assume the link is accessible merely because the page is. |
| A copied **quotation or summary** from a restricted document | People who can read the shared page can read the copied text **even if they cannot open the original file**. | Remove confidential copied passages. Restricting the source document afterward does not erase text that was already copied to the page. |

### A six-case permission drill you can audit

**Try a blind review before looking at the answers.** Download the [six-case practice worksheet](/examples/space-sharing-permissions-practice.tsv), which provides only fictional scenarios and empty response fields. Predict one of `PAGE_VIEWERS`, `SOURCE_PERMISSIONS_STAY` or `INHERITED_ACCESS` for each case. Write your reason and the access check you would perform. **Then** open the separate [editorial answer key and reasoning](/examples/space-sharing-permissions-cases.tsv) and compare each case ID. The key is a learning reference, not verified access to any real account. Both files use the same six fictional cases; the practice copy does not include the solution column.

**Case S03:** a coordinator links to a restricted report from a shared page. The link alone does not extend the report's original permissions. **Case S04:** the same coordinator pastes two confidential lines from that report into the page body. The *copied text*, unlike the link, is readable by the page audience. Even if the original file stays inaccessible, the copied lines have been disclosed to page readers.

**Case S05:** a private draft page is moved below a parent page already shared with a team. Access can change through the new parent. **Case S06:** deleting a person's direct page invitation may not revoke access they still inherit from the parent or space. The effective access grant matters more than whether an individual invitation appears in the list.

### Pre-share access review

1. **Identify the object:** conversation, Project, Space page, file attachment, linked source, or copied excerpt.
2. **Identify effective readers:** direct invitees, readers through a parent page, and readers of the shared space. Do not infer access from the page title.
3. **Check every material form:** page text, subpages, uploaded attachments, links to separately stored files, and copied summaries.
4. **Use the right removal control:** removing a page invite is insufficient when a parent still grants access; changing a source file's access does not retract copied page text.
5. **Verify in the intended account:** inspect current sharing options without posting confidential page URLs in a public ticket. Record what you actually observed, not the result you hoped for.

This is particularly important for a workgroup preparing a public update from restricted source material: an AI-generated summary pasted into a widely shared page is a **new disclosed copy**, not a private pointer back to the restricted original. Where permissions are unclear, keep the material in the approved restricted workspace and consult the responsible administrator.

### A shared page has a second boundary: Memory and model training

Permissions determine **who can read the page**. A collaborator's Memory and model-improvement settings govern different questions about what their ChatGPT may use when they interact with that shared page. The official [Space sharing, data, and controls guide](https://help.openai.com/en/articles/20001544-chatgpt-space-sharing-data-and-controls) describes these distinctions:

- **Your private chats and Memory are not automatically shared.** But if you or ChatGPT put personal context from a prior conversation **into the page itself**, anyone authorized to view that page can read that information. Check generated text before sharing; a private source does not make a copied passage private.
- **Another reader's Memory setting is their own.** Their ChatGPT may remember relevant content from the shared page if their Memory is enabled, even when yours is disabled.
- **Personal-account model-training preferences are individual.** Disabling “Improve the model for everyone” on your account does not control another collaborator's use of shared content. Their interactions with a page are governed by their settings; no change here retrospectively revokes page access.
- **Business and Enterprise have a different default.** OpenAI states that these products are not used for model training by default. An organization's own workspace rules still govern whether the page should have been shared.

**Decision rule:** if material is too sensitive for a collaborator to read, **do not put it on a page they can access**. Trying to fix that exposure by changing only your personal Memory or training preference addresses the wrong control. These are documented feature boundaries, not an experiment in any reader's account.

## Understand what a setting changes

OpenAI's Data controls documentation describes an option to prevent new personal-workspace conversations from being used to improve models. It separately describes saved chats and other controls. Read those distinctions carefully: opting out of training is not equivalent to making all use or retention impossible.

Settings can differ by workspace and account. If you use an organizational account, consult the workspace owner rather than assuming your personal settings govern that environment. Avoid relying on screenshots from an older interface.

## Remember the surrounding workflow

A prompt is only one place information can travel. Shared conversation links, copied text, downloaded files, browser extensions, screenshots, and collaborators can all change who can see the material. Inspect a generated document before forwarding it; the assistant may have preserved details you meant to remove.

On GuideHollow, all four free browser tools process your entered information locally. The Source Claim Verifier downloads public fictional teaching files, but does not upload your answers. Search terms appear in URLs, and public GitHub issues are public. Those details are explained in our [Privacy Policy](/privacy-policy/). Local processing does not protect against someone with access to your device or clipboard.

## If you already shared something sensitive

Stop adding more information. Follow the provider's current removal options and your organization's incident process. For a credential, use the issuing service's revocation or rotation process; deleting a conversation is not a substitute for invalidating a disclosed secret.

This is general workflow guidance rather than a determination of your legal obligations. For a regulated or confidential use case, ask the responsible privacy or security contact before continuing.

## Build a repeatable habit

Use a short preflight: permission, necessity, settings, recipients. If any part is unclear, use a fictional input or pause. Then review the output for accidental disclosure before sharing it. Our [email drafting guide](/guides/how-to-draft-emails-with-ai/) shows how to preserve useful context without supplying a complete personal history.
