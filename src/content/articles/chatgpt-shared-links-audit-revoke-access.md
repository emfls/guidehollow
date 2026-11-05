---
title: "ChatGPT Shared Links: How to Check Access and Revoke a Link Safely"
description: "Audit ChatGPT shared conversation and task links, check access and separate copies, and practice with an offline synthetic-link audit and eight revocation cases."
slug: "chatgpt-shared-links-audit-revoke-access"
category: "troubleshooting"
tags: ["chatgpt", "shared-links", "privacy", "access-control"]
publishedDate: "2026-10-30"
updatedDate: "2026-11-05"
sources: [{"title": "OpenAI Help Center: Sharing conversations and scheduled tasks in ChatGPT", "url": "https://help.openai.com/en/articles/7925741-sharing-conversations-and-scheduled-tasks-in-chatgpt"}, {"title": "OpenAI Help Center: Managing data, sharing, and privacy in ChatGPT Business", "url": "https://help.openai.com/en/articles/8798634-managing-data-sharing-and-privacy-in-chatgpt-business"}]
draft: false
author: "GuideHollow Editorial"
featured: false
---

A ChatGPT sharing link is easy to forward and easy to forget. If you have shared a conversation and now worry that someone else can read it, the appropriate response is not to guess whether deleting the original chat, changing a privacy setting, or sending an updated link will fix the problem. First identify what was shared, where the link was created, and what deleting that particular link can actually accomplish.

This is a practical access review for ChatGPT conversations and scheduled tasks. Its product-specific claims were checked against OpenAI's official sharing and Business documentation on November 5, 2026. The original exercise below uses **invented URLs and situations only**: GuideHollow did not open readers' links, inspect private accounts or run any live account-sharing experiments.

## Step 1: Identify the thing that was shared

Write down the answer to three questions before touching the settings:

1. Was this a **conversation**, a single assistant response shared through an available option, or a **scheduled task**?
1. Was its URL created in a **personal account** or a managed **Business, Enterprise, Edu, or Healthcare workspace**?
1. Do you want to stop **future URL access**, understand **potential past exposure**, or remove the underlying original material?

These outcomes differ. Deleting a URL can stop new visitors from accessing that URL, but it cannot undo every screenshot or saved copy. Deleting the original content affects a different object. A recipient may have a separate copy created through the product's continuation feature.

If you cannot identify the originating account, check the accounts that you legitimately control. Do not forward a questionable link to new people just to ask whether they can open it.

## Step 2: Determine who may read the link

OpenAI's [sharing documentation](https://help.openai.com/en/articles/7925741-sharing-conversations-and-scheduled-tasks-in-chatgpt) says anyone who possesses a shared link created from a **personal account** can view the shared conversation or task. Sending that link in a private email does not create an email-address allowlist. Personal-account shared links do not have a configurable expiration date or recipient-by-recipient access control.

Links created from eligible **managed workspaces** are restricted to eligible members of the originating workspace. This is an important distinction, not permission to assume every colleague should see the material. A ChatGPT Business link is not the same thing as a publicly viewable personal-account link.

A shared link does not grant someone access to your entire ChatGPT account. However, the shared content may contain conversation text, supported images, or uploaded files, depending on the specific sharing experience and recipient permissions.

## Step 3: Inspect the actual sharing preview

Return to the original conversation and select **Share**. Inspect the available sharing options and the whole preview. Some current sharing experiences support sharing one assistant response instead of the entire conversation, but you must inspect what the interface actually includes.

Look beyond passwords and email addresses. Personal data may appear in project names, case descriptions, team schedules, invoice amounts, screenshots, or quoted documents. OpenAI says shared conversations are anonymous by default, but some older sharing experiences may expose the creator's name. Review the preview rather than relying on an assumption.

For a **scheduled task**, review the title, full instructions, schedule, and original time zone. OpenAI states that the shared task does not include the creator's prior chat history, saved memories, previous task results, connected-app credentials, or local files. Yet the task's own title or instructions may still contain sensitive details. A safe credential boundary does not make a confidential task description suitable for public sharing.

If you are unsure whether the preview is appropriate for the allowed audience, do not create or refresh the link until you have removed the unnecessary material.

## Step 4: Find existing links in Data controls

OpenAI documents the management path as follows:

1. Open **Settings** in the account or workspace that created the link.
1. Select **Data controls**.
1. Under **Shared links**, select **Manage**.
1. Review the entries for shared conversations and shared scheduled tasks.
1. Identify the exact link record you want to remove.

Do not confuse the absence of an entry in one account with proof that the link never existed. If you belong to multiple workspaces, the link may be associated with another account context.

Avoid deleting all links unless that is your intentional decision. Some other shares may still serve legitimate collaboration needs. A focused incident generally calls for a focused change.

Product interfaces can evolve. If the described label is not available, recheck current official help rather than inventing a hidden setting or assuming the chat is inaccessible.

## Step 5: Revoke the unwanted link

Select **Delete shared link** beside the relevant entry. OpenAI also describes **More actions → Delete all shared links** for a deliberate bulk removal.

For an eligible scheduled task, the task creator can open the original task's share dialog, select the trash-can icon next to the shared link, and confirm **Delete share**.

The distinction is critical: deleting a shared link **prevents future access using that link**. It does not automatically delete the original conversation or scheduled task. It also does not erase a separate conversation or task saved earlier by someone else.

If a recipient previously continued a shared conversation, OpenAI says that continuation creates a separate private conversation in the recipient's account. If someone scheduled a shared task, it becomes a separate task operating with that person's own account, connections, and permissions. Revoking your URL does not make their separate copy disappear.

## Step 6: Check what later messages could expose

Personal-account conversation links represent a **snapshot** of content available when the link was created or updated. Later messages in the original chat do not automatically appear on the previously shared personal link. The creator can choose **Update link** to refresh that snapshot.

A managed-workspace conversation link can behave differently: messages sent after sharing may become included in the shared content. Review the sharing notice before writing private material into a conversation that was previously shared within your workplace.

A shared scheduled task has another update behavior. Copying its link again from the task-sharing interface refreshes the task snapshot at the same URL, but does not modify a separate task that a recipient already scheduled.

For a possible disclosure, record which account type was involved and whether the link was updated. If those facts are unknown, do not assign a precise exposure window.

## Worked example: an accidental team share

Consider a fictional coordinator preparing a generic support response. Their ChatGPT conversation also includes a volunteer rota and a private contact note. They create a link using a personal account and send it to a team group, intending to share only the support-response text.

**Observed:** The original chat includes more detail than the intended recipient needs. A personal-account link was created and sent. The coordinator does not know who opened it.

**Appropriate action:** Inspect the original Share preview; open **Settings → Data controls → Shared links → Manage**; locate and delete the relevant link; and follow the organization's reporting procedure if the contact note may have been exposed.

**Accurate result statement:** “The shared link was revoked after the listed record was deleted.” The coordinator cannot honestly conclude that everyone who previously viewed it forgot the content, or that screenshots and separately saved copies no longer exist.

**Safer alternative:** Make a new conversation containing only an approved and sanitized response example. Review its preview before sharing. Do not assume adding a corrected message to the old conversation removes the old shared snapshot.

This is an invented teaching case. It is not a real customer disclosure or a claim about a particular account's access logs.

## Do not confuse sharing, deletion, and training settings

The controls below solve different problems:

| Action | Primary effect | What it does not establish |
| --- | --- | --- |
| Delete a sharing URL | Stops future access through that URL | Existing recipient copies vanished |
| Delete original conversation | Removes its conversation-sharing link | All screenshots or imported copies vanished |
| Delete original scheduled task | Removes its task-sharing link | Other people's separately scheduled tasks vanished |
| Change model-improvement setting | Changes the relevant training preference | Old sharing links are gone |
| Lock original conversation | Applies the chat-lock interaction rules | Previous sharing links are revoked |

OpenAI explicitly says that changing the personal **Improve the model for everyone** setting does not delete existing shared links. Locking a conversation also leaves earlier sharing links in place. Use the specific shared-link manager to end future access.

Another subtle case: deleting a conversation with an associated scheduled task can pause the task while its **separate scheduled-task sharing link remains accessible**. Remove that task link separately if you need to stop access.

## An important exception: deleting a conversation may leave a shared task link

OpenAI's current [sharing and scheduled-task documentation](https://help.openai.com/en/articles/7925741-sharing-conversations-and-scheduled-tasks-in-chatgpt) distinguishes the **conversation**, an associated **scheduled task**, and the **shared URLs** for each. These are not interchangeable deletion targets.

| Action | Documented result | Still needs checking |
| --- | --- | --- |
| Delete a shared **conversation link** | Stops future access through that link | Original conversation, existing recipient copies, and any separately shared task |
| Delete the **original conversation** | Removes its conversation-sharing link; an associated scheduled task is **paused** | The task's previously created **shared task link remains available** and must be removed separately |
| Delete an individual **shared scheduled-task link** | Stops access through that link | Original scheduled task and recipient-owned copies |
| Delete the **original scheduled task** | Removes its shared task link | Copies already scheduled by someone else remain in that recipient's account |
| **Lock** the conversation | Prevents new locked-chat messages from being added to the old shared link | The previously shared content remains accessible until the link is explicitly deleted |

**Do not equate "paused" with "unshared."** If a conversation was deleted after a task was shared, inspect **Settings → Data controls → Shared links → Manage** in the originating account. Check the task link separately and remove it where appropriate. If you cannot access the link manager, report that verification as incomplete rather than claiming the task was made private.

For an account-deletion review, OpenAI says account deletion removes shared **conversation** links, but recommends deleting existing **shared scheduled-task** links before deleting the account. Recipient copies remain a separate concern.

### Check the sharing URL without trusting a lookalike domain

OpenAI documents two canonical patterns: conversation links begin with `https://chatgpt.com/share/` and scheduled-task links begin with `https://chatgpt.com/s/`. Check the **actual hostname** before opening a purported ChatGPT share; a lookalike hostname or a URL that merely contains `chatgpt.com` in its path is not the same destination. Correct domain structure alone does not make a stranger's content safe.

For internal incident notes, record the content type and what you saw in the first-party link manager rather than pasting sensitive link URLs into a public ticket. This is a documentation-based procedure, **not** a live test of an account, scheduled task, or third-party recipient.

## Inspect synthetic links without clicking them

Even before you review the content of a share, a malicious URL can mislead you about its destination. OpenAI documents two first-party URL prefixes: `https://chatgpt.com/share/` for conversations and `https://chatgpt.com/s/` for scheduled tasks. An address that contains `chatgpt.com` as part of a **different hostname** is not a ChatGPT share. A correct-looking prefix is also not evidence that the destination is still accessible, authentic, or safe to open.

To make this check reproducible, we created an original **14-case offline exercise**, without real shared-link IDs, requests to the web, cookies or account credentials. The local script uses JavaScript's URL parser and never opens a link.

- [Download 14 synthetic link examples (TSV)](/examples/shared-link-audit/synthetic-links.tsv) — four canonical-looking conversation/task shapes and ten deliberately suspicious or unsupported forms.
- [Download a blank classification worksheet (TSV)](/examples/shared-link-audit/classification-worksheet.tsv) — choose `CONVERSATION_PATTERN`, `TASK_PATTERN`, or `REJECT` for each case.
- [Download the editorial reference key (TSV)](/examples/shared-link-audit/answer-key.tsv) — each reference names the strict pattern result and precise rejection reason.
- [Download intentionally flawed example answers (TSV)](/examples/shared-link-audit/flawed-worksheet.tsv) — editor-written, not a recorded AI output; includes two unsafe false positives and two malformed labels.
- [Download the offline URL-shape checker (Node.js)](/examples/shared-link-audit/link-shape-audit.mjs) — inspects the local text only and makes no HTTP requests.

Place the files in one local folder and run:

```bash
node link-shape-audit.mjs scan synthetic-links.tsv
node link-shape-audit.mjs grade flawed-worksheet.tsv
node link-shape-audit.mjs grade classification-worksheet.tsv
```

The first command should report **4 recognized shapes and 10 rejected shapes**. The deliberately flawed worksheet should produce **10 matches, 2 wrong valid labels, and 2 invalid-format labels**. An untouched blank worksheet contains `UNREVIEWED` in every row, so all 14 entries should initially be marked invalid; replace those values after making your own judgments.

Examples of why literal substring matching is unsafe:

| Synthetic pattern | What the local checker establishes | What it cannot establish |
| --- | --- | --- |
| `https://chatgpt.com/share/fictional-conversation-01` | The structure matches the documented conversation prefix | That a real conversation exists or its content is safe |
| `https://chatgpt.com/s/fictional-task-02` | The structure matches the documented scheduled-task prefix | That it belongs to a particular creator, plan or audience |
| `https://chatgpt.com.evil.example/share/...` | The hostname is different and must be rejected | The owner's identity or intent |
| `https://chatgpt.com@not-chatgpt.example/share/...` | The hostname is not `chatgpt.com` and the user-information syntax is suspicious | Whether a third-party page is malicious in every possible case |

The tool is **deliberately strict**, rejecting query strings, fragments, nonstandard ports and extra path segments. That is a conservative *training convention*, not a claim that every legitimate ChatGPT link forever has no optional URL parameter. It does not follow redirects, authenticate a sender, establish workspace eligibility or determine whether a shared link has been revoked. Do not enter real sensitive share URLs into a public issue, paste them into a third-party checker, or trust an otherwise unfamiliar link just because a local shape test passes.

## Eight share-revocation situations worth reviewing separately

[Download the eight-case sharing lifecycle table (TSV)](/examples/shared-link-audit/lifecycle-boundaries.tsv) for a compact source-based audit worksheet. It maps the **observed action** to the **next required check** and the inference that action does *not* justify. These rows are original editorial teaching scenarios built from the official rules; they are not records of reader accounts.

| Scenario | Appropriate follow-up | Common but unsupported conclusion |
| --- | --- | --- |
| Delete one personal conversation link | Confirm that link in the creator's Shared links manager | Every recipient-owned continuation or screenshot vanished |
| Delete the original chat containing an associated shared task | Find and remove the **separate task share link** | The task link was also removed |
| Delete an original scheduled task | Confirm the original task's share link is gone | Recipients' separately scheduled copies disappeared |
| Lock a conversation | Remove any previously shared link independently | Locking instantly revoked the old snapshot |
| Inspect a personal account data export | Check **Shared links → Manage** for scheduled-task URLs too | The export alone exhaustively lists every shared task link |

Two account-specific boundaries also matter. A **Business** shared link is restricted to the originating workspace, but that restriction does not prove private conversations are visible to all coworkers or that a recipient did not retain a separate copy. The official documentation says Business does not offer the same workspace-wide disable-sharing control available to eligible Enterprise or Edu administrators. <strong>Do not instruct a Business member to look for an Enterprise-only sharing toggle.</strong>

A personal account export can include conversation-sharing metadata in `shared_conversations.json`, but the official sharing documentation says it currently **does not include shared scheduled-task links or saved task snapshots**. That is why an apparently empty export is not an all-clear for task links. For eligible scheduled tasks, sharing may also involve connected-app or workspace permissions that are independent of the link's shape. Handle the originating account's actual UI and permissions separately.

These distinctions apply to **future access through the original URL**, not to every historical copy. If you need a defensible access review, document the link's owner, share type, workspace, scope, exact removal action and remaining uncertainty; avoid copying private link URLs or content into the report.

The [published regression checks](https://github.com/emfls/guidehollow/blob/main/tests/shared-link-safety-audit.test.mjs) recompute the 14 URL-shape judgments and verify the exercise data without opening any URL. They do not test OpenAI's live UI, certify a link's safety, or prove that a recipient has no saved copies.
## Step 7: Verify the action without spreading the URL

Return to **Shared links → Manage** and confirm that the intended record is no longer listed. If organizational policy permits, open the old link in a browser session without privileged access and observe the outcome. Do not recruit a new outside tester or post the URL to a public troubleshooting forum.

An access error is evidence consistent with the link no longer working. It is not evidence that nobody saved the content earlier. Likewise, failing to find a record in the wrong workspace does not verify revocation.

Use this minimal local verification note:

```plain
Content shared: conversation / response / scheduled task
Originating account or workspace: [known or unknown]
Link record identified: yes / no
Preview reviewed: yes / no
Action taken: [exact control selected]
Action time and timezone: [observed]
Post-action check: [actual result]
Recipient copies: unknown unless independently verified
Follow-up owner: [authorized person or role]
```

Do not include passwords, original sensitive chat text, or unnecessary private identifiers in a broadly visible issue ticket. Respect your organization's incident evidence-handling requirements.

## If the link manager does not show what you expect

Confirm that you are using the original sender's account rather than a recipient account. A recipient can sometimes view content without owning its revocation controls. Workspace membership, account type, and product availability may also affect the interface.

Follow current official instructions and contact an authorized administrator or official support route if needed. Do not trust a third-party site claiming it can remove ChatGPT links in exchange for account credentials. If a link cannot be identified or revoked, report that uncertainty explicitly.

## Reduce risk before your next share

Prepare a new, short conversation or reviewed document containing only information the recipient needs. Remove confidential background, contact information, sensitive attachments, and identifying details that do not change the answer. Inspect the preview before creating a new link.

Where the product supports sharing one response, determine whether that is narrower than sharing an entire transcript. If you copy text to another tool, remember that the receiving tool has its own permissions; deleting the ChatGPT sharing link does not govern the copied document.

**Bottom line:** Identify the originating account, inspect the content and audience, remove the exact shared link, and distinguish stopping future access from undoing earlier distribution. A careful audit records what was actually observed and what remains unknown.

## Official sources

- [OpenAI: Sharing conversations and scheduled tasks in ChatGPT](https://help.openai.com/en/articles/7925741-sharing-conversations-and-scheduled-tasks-in-chatgpt) — personal and workspace share access, snapshots, scheduled-task copies, deletion controls, export limitations and canonical link patterns.
- [OpenAI: Managing data, sharing, and privacy in ChatGPT Business](https://help.openai.com/en/articles/8798634-managing-data-sharing-and-privacy-in-chatgpt-business) — workspace-only sharing, recipient copies and Business-versus-Enterprise admin-control differences.

**Source review and test disclosure (November 5, 2026):** Both official help pages were checked when adding this exercise. The 14 URLs and eight scenarios are synthetic editor-written cases. The Node.js script checks URL structure and the published editorial sample; it does not open links, measure ChatGPT product behavior or establish whether any link is live, trusted, accessible or revoked. Account-level permission and deletion outcomes require an authorized person to verify their own account settings.
