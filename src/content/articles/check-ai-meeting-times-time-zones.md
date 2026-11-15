---
title: "How to Check AI Meeting Times Across Time Zones and Daylight Saving"
description: "Verify AI-suggested meeting times with named time zones, exact dates, and a three-case New York–Seoul exercise that catches offset and date-rollover errors."
slug: "check-ai-meeting-times-time-zones"
category: "guides"
tags: ["ai", "meeting-planning", "time-zones", "productivity", "python"]
publishedDate: "2026-11-15"
updatedDate: "2026-11-15"
sources: [{"title":"Python documentation: zoneinfo — IANA time zone support","url":"https://docs.python.org/3/library/zoneinfo.html"},{"title":"NIST: Daylight Saving Time Rules","url":"https://www.nist.gov/pml/time-and-frequency-division/popular-links/daylight-saving-time-dst"},{"title":"Google Calendar Help: Use Google Calendar in different time zones","url":"https://support.google.com/calendar/answer/37064?hl=en"}]
draft: false
author: "GuideHollow Editorial"
featured: false
---

An AI assistant suggests a meeting at “9 a.m. New York, 11 p.m. Seoul.” That pairing can be correct on one date and wrong on another. Even when the hour is right, a late meeting in one city can fall on the next calendar day in the other.

Before sending an invitation, verify the exact date, a named time zone, and which location's wall-clock time must stay fixed. This guide provides three fictional meetings, a deliberately flawed conversion list, and a small local checker. The examples distinguish a calculation from a calendar invitation: no real events are created or sent.

If you are starting from meeting notes, first separate confirmed plans from suggestions with our [meeting action-item extraction guide](/guides/extract-meeting-action-items-with-ai/). A correct time conversion cannot turn an unapproved proposal into a confirmed appointment.

> **Key takeaways**
>
> - Include a full date and a named zone such as `America/New_York`.
> - State whether a recurring meeting follows a city's local time or a fixed UTC time.
> - Compare the destination date as well as its hour and minute.
> - Check the calendar preview before saving or sending an invitation.

## 1. Decide what the meeting time means

Write a small source record before asking an assistant to convert anything. For a fictional team, it might say:

```text
Meeting: A
Source date: 2026-10-26
Source local time: 09:00
Source zone: America/New_York
Destination zone: Asia/Seoul
Anchor: keep the New York local start time fixed
Status: proposed; do not create or send an invitation
```

The anchor matters. “Every Monday at 9 a.m. in New York” and “every Monday at 13:00 UTC” describe different rules. They can coincide for some dates and diverge after an offset change. An assistant should not silently choose one rule because the initial example happens to fit both.

Ask the organizer when the anchor is missing. Also clarify ambiguous abbreviations and dates such as “next Monday.” A full date plus `America/New_York` gives the conversion a more precise starting point than a bare “ET,” “EST,” or “9 a.m.” It still does not identify the intended attendee, their availability, or whether they accepted the proposal.

Keep the original source record while reviewing converted times. If the organizer changes the date or the anchor, create a new reviewed version instead of adjusting only the time displayed for the other city.

## 2. Test dates on both sides of an offset change

Our [source meetings file](/examples/meeting-timezone-check/meetings.json) contains three invented examples. A and B both start at 09:00 in New York. Their different dates are deliberate.

[NIST's daylight-saving guidance](https://www.nist.gov/pml/time-and-frequency-division/popular-links/daylight-saving-time-dst) places the 2026 U.S. fall transition on November 1. The first two dates straddle that change. That rule is not a claim that every U.S. location observes daylight saving; choose the actual location's zone.

The independently executed conversions for this exercise are:

| Case | New York local start | Seoul local start |
| --- | --- | --- |
| A | Oct 26, 2026, 09:00 | Oct 26, 2026, 22:00 |
| B | Nov 2, 2026, 09:00 | Nov 2, 2026, 23:00 |
| C | Nov 2, 2026, 21:00 | Nov 3, 2026, 11:00 |

The corresponding UTC starts are **October 26 at 13:00**, **November 2 at 14:00**, and **November 3 at 02:00**, all in 2026. The New York offset is UTC−04:00 for A and UTC−05:00 for B and C. The Seoul offset in these examples is UTC+09:00.

For A, the offset difference is 13 hours: 09:00 becomes 22:00. For B, it is 14 hours: 09:00 becomes 23:00. C adds the same 14 hours to 21:00 and crosses midnight. Those are calculations for the specified dates, not permanent conversion shortcuts for future years.

The full ISO-formatted results in [results.json](/examples/meeting-timezone-check/results.json) retain the dates and offsets together. Use those complete values when auditing a table; a column containing only “11:00” cannot tell you whether the date rolled forward.

## 3. Ask AI for an auditable conversion table

Give an assistant the exact source records and ask it to expose the assumptions. For example:

```text
Convert these fictional proposed meetings from America/New_York
to Asia/Seoul. Preserve each source date and local start time.
For each meeting, return:
- meeting ID;
- source local date/time and UTC offset;
- UTC date/time;
- destination local date/time and UTC offset;
- whether the destination calendar date differs.
Keep New York local time as the anchor.
Do not reuse one UTC offset across all dates.
Do not create, update, or send calendar events.
If a source time is ambiguous or does not exist, flag it for review.
Separate an unexecuted prediction from an actual tool result.
```

This prompt is a suggested request, not a recorded response from a particular model. A well-formatted answer can still use a stale offset or drop a date change. For repeated checks of different prompts, use our [small evaluation-dataset method](/prompts/test-ai-prompts-with-evaluation-dataset/) and keep the same source records between runs.

Do not ask an assistant to repair the source dates merely to make its output consistent. The source date and anchor are the organizer's choices; a conversion error should be corrected in the derived result.

## 4. Catch two plausible errors

Download the [deliberately flawed candidate](/examples/meeting-timezone-check/candidate.json). It is an editorial teaching fixture, not an observed AI output. It proposes these Seoul starts:

- A: October 26 at **23:00** — one hour late.
- B: November 2 at **23:00** — correct.
- C: November **2** at **11:00** — the hour is right but the date is wrong.

The first error is consistent with applying the later UTC−05:00 New York offset to the earlier date. That is an explanation of the constructed example, not a diagnosis of an actual model's reasoning. The third error shows why checking only hours and minutes is insufficient.

Only B should match the reference conversion. Passing one row does not approve the candidate list. Check every meeting ID, source date, destination date, and offset before accepting the table.

Keep unresolved entries marked for review. Do not label a time “confirmed” because the numbers match: confirmation also depends on the organizer, attendees, and the actual calendar record.

## 5. Reproduce the local calculation

Put [check.py](/examples/meeting-timezone-check/check.py), [meetings.json](/examples/meeting-timezone-check/meetings.json), and [candidate.json](/examples/meeting-timezone-check/candidate.json) in the same disposable folder. These three files are required. Inspect the script, then run:

```text
python3 -B check.py
```

The script reads both adjacent JSON inputs and prints a report. It does not modify the inputs, write a calendar file, access an account, or send a message. The published results file records our run; it is not required to execute the checker.

[Python's `zoneinfo` documentation](https://docs.python.org/3/library/zoneinfo.html) describes its IANA-based zones and support beginning in Python 3.9. Zone data comes from the system or the `tzdata` package. If your environment lacks that data, `ZoneInfoNotFoundError` is an environment problem to resolve using the documentation; do not replace named zones with guessed offsets just to make the example run.

Look for three computed conversions, one matching candidate, and two mismatches. The checker also asserts the expected literal results, a source-to-UTC-to-source round trip, the offset difference, and the next-day result. Its successful completion means the teaching checks ran as expected. It does not mean all candidate rows passed.

This checker is intentionally limited to the supplied, unambiguous morning and evening times. It is not a general validator for arbitrary local times, recurring-event rules, or calendar delivery. A round trip on these examples does not prove that every local time exists or occurs only once.

## 6. Review the calendar representation before sending

Use the verified date and named zone when preparing an event. [Google Calendar's time-zone guidance](https://support.google.com/calendar/answer/37064?hl=en) explains that events appear in attendees' local time zones and that an event can have a chosen time zone. Check the event's own time-zone setting rather than relying only on your account's display zone.

For a proposed recurring series, preview an occurrence before and after a relevant offset change. Confirm that the intended anchor still holds. If New York local time must remain 09:00, a changed Seoul time can be expected; if the intention was a fixed UTC start, the local New York time can change instead.

Before saving or sending, compare the title, full start and end dates, zones, duration, recurrence, and guest list with the approved request. The example files contain start times only, so they are insufficient to create a complete invitation. Calendar availability, an imported file, and a sent invitation are separate checks.

Do not resolve a repeated or skipped clock time by guessing. Python's documentation discusses `fold` for repeated local times, but this exercise does not test that situation. Ask for the intended occurrence or a confirmed UTC instant and verify the actual calendar preview.

## What we verified

We executed the downloadable Python checker on the three fictional source meetings. The literal UTC and Seoul results, candidate comparisons, date rollover, round trips, and unchanged input bytes passed their checks. The report identifies the Python runtime; the exact time-zone database release is recorded as unknown, rather than assumed to be current.

We did not run a live AI conversion, create a calendar event, send an invitation, inspect anyone's availability, or test a recurring series in a calendar app. Official references were checked on November 15, 2026. Time-zone rules and installed data can change, so recheck the actual dates and environment when applying the method elsewhere.

Try A and B together before reviewing your own meeting. If a conversion method returns the same Seoul hour for both while keeping New York at 09:00, investigate the dates and offsets before using it to prepare an invitation.
