---
title: "How to Audit AI Cron Expressions: Five Fields, Sunday Numbering, and Month Boundaries"
description: "Test AI-generated cron expressions against POSIX, Vixie cron, Quartz, EventBridge, and GitHub Actions with five reproducible scheduling cases."
slug: "verify-ai-cron-schedule-expressions-day-of-week"
category: "guides"
tags: ["verification", "automation", "devops"]
publishedDate: "2026-11-27"
updatedDate: "2026-11-28"
sources: [{"title":"POSIX.1-2017 Programmer's Manual — crontab(1p), input files","url":"https://man7.org/linux/man-pages/man1/crontab.1p.html#INPUT_FILES"},{"title":"Paul Vixie — Vixie cron crontab(5)","url":"https://github.com/vixie/cron/blob/master/crontab.5"},{"title":"OpenBSD — crontab(5)","url":"https://man.openbsd.org/crontab.5"},{"title":"Quartz Scheduler — CronTrigger tutorial","url":"https://www.quartz-scheduler.org/documentation/quartz-2.3.0/tutorials/crontrigger.html"},{"title":"Amazon EventBridge — cron expressions for scheduled rules","url":"https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html#eb-cron-expressions"},{"title":"GitHub Actions — schedule event and timezone","url":"https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule"},{"title":"GitHub Changelog — timezone support for scheduled workflows","url":"https://github.blog/changelog/2026-03-19-github-actions-late-march-2026-updates/"},{"title":"croniter — numeric schedules, timezones, and seconds","url":"https://github.com/pallets-eco/croniter"}]
draft: false
author: "GuideHollow Editorial"
featured: false
---

An AI-generated cron expression can pass a parser and still send an invoice on the wrong date. A weekday and a day of the month can combine as a union, a closing-hour range can include four more quarter-hour slots, and a Sunday schedule can shift by five hours if it lands on a scheduler configured for UTC. Start a review with the intended calendar and the scheduler that will read the expression. Record both before checking the characters.

This audit uses five cases with explicit UTC reference instants and IANA timezones. Download the [JSON validator suite](/examples/cron-validator-suite/cron-validator-suite.json) and the [CSV discrepancy matrix](/examples/cron-validator-suite/cron-discrepancy-matrix.csv). The CSV summarizes the scheduling requirement, original input, correction, and first expected run. The JSON also contains the sample runs and rejected inputs used by the Python example. A reference instant is an exclusive lower bound, so a run at the exact instant of the reference belongs to the preceding sample.

Open the [Cron Schedule Verifier](/tools/cron-schedule-verifier/) to load the fictional Sunday, weekday-union, or quarter-hour presets. Compare the next ten timestamps under POSIX OR and strict AND, or switch between UTC and a regional timezone. To reproduce CRON-02, load its preset and verify it twice, changing only the day rule. May 8 at 09:00 UTC appears under OR and drops out under AND.

## Check the field order and destination

| Destination | Time fields in order | What follows the time fields |
| --- | --- | --- |
| POSIX or Vixie-style user crontab | Minute, hour, day of month, month, day of week | The shell command starts at the sixth token |
| Vixie-style system /etc/crontab | Minute, hour, day of month, month, day of week | Username, then command |
| Quartz Scheduler | Seconds, minutes, hours, day of month, month, day of week, optional year | The application configures the job separately |
| EventBridge scheduled rules | Minutes, hours, day of month, month, day of week, year | The six fields go inside the cron(...) wrapper |
| GitHub Actions on.schedule | Minute, hour, day of month, month, day of week | The cron value is a five-field string |

Quartz accepts six or seven fields. EventBridge scheduled rules accept six required fields and work at minute precision. The two formats each require a question mark in either day of month or day of week to leave that field unspecified. GitHub Actions documents five-field POSIX-style syntax, numeric weekdays 0 through 6, and a minimum interval of five minutes. The benchmark uses its default UTC mode. GitHub also supports a separate optional IANA timezone setting alongside the cron expression, introduced in March 2026. The timezone setting leaves the field order unchanged. [Quartz CronTrigger tutorial](https://www.quartz-scheduler.org/documentation/quartz-2.3.0/tutorials/crontrigger.html), [EventBridge cron syntax](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html#eb-cron-expressions), [GitHub schedule documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

Keep the scheduler name and the configuration surface together in a review. An expression stored in a workflow YAML string has no command portion. In a user crontab the command is part of the line, runs through a shell, and inherits the job's environment. Both surfaces can show five time fields, yet they fail in different ways if you append a sixth token. Document the exact file or API field you are validating so a reviewer can tell which parser will see the string.

## CRON-01 — Sunday numbering and the scheduling timezone

The requirement is **every Sunday at 04:00 in America/New_York**. The generated expression is `0 4 * * 7`. Vixie cron and OpenBSD crontab(5) both accept 0 and 7 as Sunday. Strict POSIX defines numeric weekdays as 0 through 6, and GitHub Actions documents the same numeric range. The portable numeric expression is `0 4 * * 0`. Its hour is interpreted in the scheduler's configured timezone. A separate time field or suffix cannot supply that configuration. [POSIX crontab input format](https://man7.org/linux/man-pages/man1/crontab.1p.html#INPUT_FILES), [Vixie crontab(5)](https://github.com/vixie/cron/blob/master/crontab.5), [OpenBSD crontab(5)](https://man.openbsd.org/crontab.5).

Use `2026-11-27T00:00:00Z` as the reference instant for both timezone checks. The next run in New York is Sunday, November 29, 2026 at 04:00 EST (UTC−05:00), or `2026-11-29T04:00:00-05:00`. Adding five hours gives `2026-11-29T09:00:00Z`. Interpreting the same corrected expression in UTC yields `2026-11-29T04:00:00Z`, which is 23:00 on Saturday in New York. The UTC result is a control that catches a schedule evaluated in the wrong timezone.

In a UTC-only deployment, a fixed 09:00 UTC expression matches the November New York run but gives 05:00 local time after New York switches to daylight time. If the job follows a New York business clock, configure the scheduler's IANA timezone or use a scheduler that supports it. Keep the reference time in UTC so that anyone can reproduce the calculation from the same instant, even if they run the validator from a laptop in a third timezone. The comparison between these two cases is a time conversion, separate from checking that the input's Sunday token is valid.

## CRON-02 — Run only when the 1st or 15th falls on a Monday

The requirement is **run at 09:00 UTC only when the 1st or 15th of the month falls on a Monday**. That is an intersection. The generated `0 9 1,15 * 1` gives a union in both POSIX and Vixie cron because the month is unrestricted and both day fields are restricted. It fires on every Monday and on every 1st and 15th, whatever their weekdays. A single union expression matches an overlap once. Splitting it into a line for every Monday and a line for every 1st and 15th schedules two calls on each overlap.

Using `2028-05-01T00:00:00Z` as the reference, the original expression fires at 09:00 UTC on May 1, 8, 15, 22, and 29. The corrected job fires at `2028-05-01T09:00:00Z` and `2028-05-15T09:00:00Z` in that month. Keep a single line and check the weekday before invoking the job.

```sh
0 9 1,15 * * [ "$(date +\%u)" = "1" ] && /path/to/job
```

`date` returns 1 for Monday with `+\%u` as written in a crontab. The backslash protects the percent sign from cron, which parses the line before the shell handles command substitution and quoting. Use the same calendar timezone for scheduling and for `date`. Here the example assumes that the daemon runs this schedule in UTC and the command environment uses UTC. On a non-Monday calendar candidate the shell still evaluates the guard. It invokes the actual job only when the test succeeds.

The POSIX and Vixie rules differ when the month is restricted. Under POSIX, when day of week is restricted and either month or day of month is restricted, a date qualifies if it matches either the combination of month and day of month or the day of week. Vixie cron checks the month independently, then applies the day rule inside that month. For example, `0 9 1,15 5 1` under POSIX admits Mondays outside May. Under Vixie cron it admits only dates in May, taking the union of Mondays and the 1st and 15th within May. Both rules still produce a union for this benchmark's `*` month. [POSIX crontab input format](https://man7.org/linux/man-pages/man1/crontab.1p.html#INPUT_FILES), [Vixie crontab(5)](https://github.com/vixie/cron/blob/master/crontab.5).

## CRON-03 — Every 15 minutes through the 17th hour

The requirement is **run daily every 15 minutes from 09:00 through 17:45 UTC**. The generated `0 */15 9-17 * *` places the step in the hour field and the range in day of month. A Vixie-style parser interprets it as minute zero at hours 00 and 15 on dates 9 through 17 of every month. The next run from `2026-11-27T16:59:00Z` is `2026-12-09T00:00:00Z`. A parser's acceptance of the expression says very little about whether the field placement satisfies the requirement.

The corrected Vixie expression is `*/15 9-17 * * *`. The hour range includes every slot in hour 17, namely 17:00, 17:15, 17:30, and 17:45. From the same reference the first run is `2026-11-27T17:00:00Z`. The four runs in hour 17 are followed by 09:00 UTC the next day. The last run on the 27th qualifies under this case's stated closing time. If the operating window ends at the start of hour 17, change the range to match that revised requirement before expanding the schedule.

The slash step in `*/15` is a widely supported Vixie extension outside strict POSIX syntax. For strict POSIX use `0,15,30,45 9-17 * * *`. The explicit minutes give the same quarter-hour times and keep the range inclusive. Include a reference just before the end of the window in your tests. The first few occurrences after 09:00 would prove the interval but would miss the exact boundary this case is meant to verify. [Vixie crontab(5)](https://github.com/vixie/cron/blob/master/crontab.5), [POSIX crontab input format](https://man7.org/linux/man-pages/man1/crontab.1p.html#INPUT_FILES).

## CRON-04 — Midnight at the start of the last day of the month

The requirement is **run at 00:00 UTC at the start of the month's last calendar day**. Given the reference `2026-11-27T00:00:00Z`, the first expected run is `2026-11-30T00:00:00Z`. The next month fires at 00:00 on December 31. The expression `0 0 L * *` is invalid five-field Unix crontab syntax. It borrows Quartz and EventBridge's `L` day-of-month token without using either scheduler's field layout. Valid six-field alternatives for the same calendar rule are Quartz `0 0 0 L * ?` in UTC and EventBridge scheduled rules `cron(0 0 L * ? *)`. Both use `?` in day of week. [Quartz CronTrigger tutorial](https://www.quartz-scheduler.org/documentation/quartz-2.3.0/tutorials/crontrigger.html), [EventBridge cron syntax](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html#eb-cron-expressions).

For a Unix crontab, use days 28 through 31 as candidates. The Python standard library can add one calendar day and check whether that day is the first of a new month.

```sh
0 0 28-31 * * /usr/bin/env python3 -c 'from datetime import date, timedelta; raise SystemExit((date.today() + timedelta(days=1)).day != 1)' && /path/to/job
```

This entry uses POSIX field syntax and POSIX shell syntax, with Python 3 on the job's path. The Python check exits successfully only when tomorrow has day number 1. The shell then runs `/path/to/job`. Calendar arithmetic handles 30-day months, 31-day months, and both lengths of February without a platform-specific `date` option. Schedule and evaluate the guard in the same timezone. This case uses UTC for both. The guard calls the job on February 28 in a common year and February 29 in a leap year.

The month-end line uses no percent format strings. If you use a `date` format directly in a crontab command, escape each literal percent sign as `\%`, as in CRON-02. An unescaped percent ends the command text and becomes a newline. Text after the first unescaped percent is sent to the command's standard input. Shell quoting alone leaves cron's percent handling in effect. In a separate script file invoked by cron, the shell receives the script contents directly and ordinary date format strings work as written there. [POSIX crontab input format](https://man7.org/linux/man-pages/man1/crontab.1p.html#INPUT_FILES), [OpenBSD crontab(5)](https://man.openbsd.org/crontab.5).

## CRON-05 — One six-token string, four different interpretations

The requirement is **run every 10 seconds in UTC**. The original candidate is `*/10 * * * * *`. The corrected Quartz expression is `*/10 * * * * ?`, with seconds in the first field. The question mark leaves day of week unspecified. With a UTC Quartz trigger and an exclusive reference of `2026-11-27T00:00:00Z`, the first run is `2026-11-27T00:00:10Z`. The next two are at 00:00:20 and 00:00:30 UTC.

| Where the original candidate goes | Result |
| --- | --- |
| Vixie-style user crontab line | The first five tokens, `*/10 * * * *`, schedule every ten minutes. The sixth token, `*`, is the shell command text and can expand against the job's working directory. |
| Vixie-style system /etc/crontab line | The sixth token, `*`, is interpreted as a username. This leaves no job command. |
| Quartz Scheduler | The field order starts with seconds, but both day fields contain `*`. Quartz requires `?` in one of them. |
| EventBridge scheduled rules | The first field is minutes. Wrapping the original in `cron(...)` still leaves both day fields specified. The service cannot express ten-second runs in cron. |
| GitHub Actions on.schedule | The cron string has six fields where GitHub expects five. Its five-minute minimum interval also rules out ten-second runs. |

A six-field expression can have a plausible name and still encode the wrong time unit. Review the Quartz and EventBridge layouts side by side before translating between them. Removing the first field from a Quartz expression can make it look closer to EventBridge, but drops all of the seconds handling and leaves a missing year field. Conversely, a Unix user crontab reads any remaining tokens as shell text after its time fields. Treat a schedule-only string and a full crontab line as separate inputs whenever automated checks handle both.

## Run the Python validator against the fixture

Save the JSON file beside this script, install `croniter==7.0.0` in your Python environment, and run `python3 audit_cron.py cron-validator-suite.json`. The checks exercise five-field Unix expressions and the two guards. They use strict numeric POSIX grammar in `posix` mode and explicitly allow numeric Sunday 7 and steps after wildcards or ranges in `vixie` mode. This mode covers a numeric subset of common Vixie syntax. Named days, aliases, and complete crontab commands are outside the example's input grammar.

The order is minute, hour, day of month, month, day of week. The regex validates each token's structure, and the range check validates the bounds for its position. Before constructing a croniter iterator, the audit rejects other field counts, unsupported tokens, and out-of-range numbers. Croniter itself accepts five fields with an optional sixth field for seconds by default. Setting `second_at_beginning=True` moves the seconds field to the beginning, and the library has its own optional year handling. Those features do not implement Quartz or EventBridge validation. [croniter documentation](https://github.com/pallets-eco/croniter).

The reference is read as an aware UTC datetime, then converted to the requested `ZoneInfo` timezone before it is passed to croniter. The iterator expands dates in that timezone, while the output lists UTC instants for comparison. The strict POSIX month/day union is built by merging two streams and coalescing shared timestamps. That split is an implementation detail of the test. Installing two separate crontab lines would cause duplicate calls on overlap dates. The guards below mirror the crontab business conditions against the scheduled local date. The audit neither invokes the job nor submits schedules to external services.

```python
import json
import re
import sys
from datetime import datetime, timedelta, timezone
from heapq import merge
from itertools import groupby, islice
from pathlib import Path
from zoneinfo import ZoneInfo

from croniter import CroniterBadDateError, croniter

INTEGER = r"[0-9]+"
RANGE = rf"{INTEGER}-{INTEGER}"
ELEMENT = rf"(?:{INTEGER}|{RANGE})"
POSIX_FIELD = re.compile(rf"(?:\*|{ELEMENT}(?:,{ELEMENT})*)")
VIXIE_ELEMENT = rf"(?:{ELEMENT}|{RANGE}/{INTEGER})"
VIXIE_FIELD = re.compile(rf"(?:\*(?:/{INTEGER})?|{VIXIE_ELEMENT}(?:,{VIXIE_ELEMENT})*)")


def validate(expression, mode):
    pattern, dow_max = {"posix": (POSIX_FIELD, 6), "vixie": (VIXIE_FIELD, 7)}[mode]
    bounds = ((0, 59), (0, 23), (1, 31), (1, 12), (0, dow_max))
    fields = re.split(r"[ \t]+", expression.strip(" \t"))
    if len(fields) != 5:
        raise ValueError("Expected minute, hour, day of month, month, day of week")
    for field, (minimum, maximum) in zip(fields, bounds):
        if not pattern.fullmatch(field):
            raise ValueError(f"Unsupported {mode} field: {field}")
        for element in field.split(","):
            span, _, step = element.partition("/")
            if step and int(step) == 0:
                raise ValueError(f"Step must be positive: {element}")
            if span != "*":
                numbers = [int(number) for number in span.split("-")]
                if not minimum <= numbers[0] <= numbers[-1] <= maximum:
                    raise ValueError(f"Invalid or descending range: {element}")
    return fields


def utc_runs(fields, start):
    iterator = croniter(" ".join(fields), start, day_or=False)
    while True:
        try:
            run = iterator.get_next(datetime)
        except CroniterBadDateError:
            return
        yield run.astimezone(timezone.utc)


def candidate_runs(fields, start, mode):
    minute, hour, dom, month, dow = fields
    if mode == "posix" and dow != "*" and (dom != "*" or month != "*"):
        groups = [(minute, hour, dom, month, "*"), (minute, hour, "*", "*", dow)]
    elif mode == "vixie" and not dom.startswith("*") and not dow.startswith("*"):
        groups = [(minute, hour, dom, month, "*"), (minute, hour, "*", month, dow)]
    else:
        groups = [fields]
    streams = (utc_runs(group, start) for group in groups)
    for instant, _ in groupby(merge(*streams)):
        yield instant


def last_day(day):
    return (day + timedelta(days=1)).day == 1


GUARDS = {
    "monday": lambda day: day.isoweekday() == 1,
    "last_day": last_day,
}


def audit(expression, mode, reference_time_utc, tz_name, count, guard=None):
    try:
        fields = validate(expression, mode)
    except ValueError:
        return None

    reference = datetime.fromisoformat(reference_time_utc.replace("Z", "+00:00"))
    if reference.utcoffset() != timedelta(0):
        raise ValueError("The fixture reference must be timezone-aware UTC")
    zone = ZoneInfo(tz_name)
    start = reference.astimezone(zone)
    runs = candidate_runs(fields, start, mode)
    if guard:
        matches = GUARDS[guard]
        runs = (instant for instant in runs if matches(instant.astimezone(zone).date()))
    return [instant.isoformat().replace("+00:00", "Z") for instant in islice(runs, count)]


def main(fixture_path):
    suite = json.loads(Path(fixture_path).read_text(encoding="utf-8"))
    for case in suite["test_cases"]:
        for check in case["checks"]:
            expected = check["expected_utc"]
            result = audit(
                check["expression"],
                check["mode"],
                case["reference_time_utc"],
                check.get("timezone", case["timezone"]),
                len(expected) if expected is not None else 1,
                check.get("guard"),
            )
            label = f'{case["id"]} {check["id"]}'
            if result != expected:
                raise SystemExit(f"{label}: expected {expected}, got {result}")
            print(f"{label} | " + ("REJECTED" if result is None else ", ".join(result)))


if __name__ == "__main__":
    main(sys.argv[1])
```

```text
CRON-01 posix-original | REJECTED
CRON-01 vixie-original | 2026-11-29T09:00:00Z
CRON-01 posix-new-york | 2026-11-29T09:00:00Z, 2026-12-06T09:00:00Z, 2026-12-13T09:00:00Z, 2026-12-20T09:00:00Z, 2026-12-27T09:00:00Z
CRON-01 posix-utc-control | 2026-11-29T04:00:00Z
CRON-02 posix-union | 2028-05-01T09:00:00Z, 2028-05-08T09:00:00Z, 2028-05-15T09:00:00Z, 2028-05-22T09:00:00Z, 2028-05-29T09:00:00Z
CRON-02 vixie-union | 2028-05-01T09:00:00Z, 2028-05-08T09:00:00Z, 2028-05-15T09:00:00Z, 2028-05-22T09:00:00Z, 2028-05-29T09:00:00Z
CRON-02 guarded-intersection | 2028-05-01T09:00:00Z, 2028-05-15T09:00:00Z
CRON-03 vixie-original | 2026-12-09T00:00:00Z, 2026-12-09T15:00:00Z
CRON-03 posix-step-rejected | REJECTED
CRON-03 vixie-quarter-hours | 2026-11-27T17:00:00Z, 2026-11-27T17:15:00Z, 2026-11-27T17:30:00Z, 2026-11-27T17:45:00Z, 2026-11-28T09:00:00Z
CRON-03 posix-quarter-hours | 2026-11-27T17:00:00Z, 2026-11-27T17:15:00Z, 2026-11-27T17:30:00Z, 2026-11-27T17:45:00Z, 2026-11-28T09:00:00Z
CRON-04 posix-original | REJECTED
CRON-04 vixie-original | REJECTED
CRON-04 guarded-last-day | 2026-11-30T00:00:00Z, 2026-12-31T00:00:00Z, 2027-01-31T00:00:00Z, 2027-02-28T00:00:00Z, 2027-03-31T00:00:00Z
CRON-05 unix-expression | REJECTED
CRON-05 user-crontab-time-fields | 2026-11-27T00:10:00Z, 2026-11-27T00:20:00Z
```

The five-field validator rejects CRON-05's original six-token string as an expression. The separate user-crontab time-field check models the five fields the daemon would read before handing the sixth token to the shell. The valid Quartz correction and the EventBridge interpretation belong to their own field layouts. Use a dialect-specific validator for those targets and compare their next timestamps against the same UTC reference.

## Review a schedule before shipping it

1. **Name the scheduler and the input.** Record the daemon, job scheduler, or managed service alongside the actual field or file. Include the username slot for a system crontab and the wrapper for an EventBridge scheduled rule.
2. **Write the calendar requirement in plain language.** Say whether a date and a weekday are an intersection or a union, whether a range includes the final hour, and whether midnight starts the last day or starts the following month. Include an example that must run and one that must be skipped.
3. **Expand dates around the failure boundary.** Test an overlap, an out-of-window time, a leap February, or an upcoming clock change as appropriate. Save the local wall time and its UTC equivalent. Check the scheduler's own daylight-saving and catch-up behavior for any jobs that depend on those transitions.
4. **Review the command separately.** For a crontab, inspect percent escaping, the command's executable path, and the timezone seen by any date-based guard. Run the guard against known dates without invoking the production job. Read the guard and the scheduling fields together before approving the change.
5. **Keep the fixture with the change.** A saved reference and expected result let another reviewer re-run the comparison even after the dates have passed. If the schedule is moved to a different service, revalidate each field in the new dialect and compare the expanded times with the original business requirement.

For other calendar formats, the [recurrence-rule audit](/guides/check-ai-calendar-invite-recurrence-rules/) covers the equivalent problem in calendar invites. The [time-zone verification guide](/guides/check-ai-meeting-times-time-zones/) walks through converting local civil times into UTC instants.
