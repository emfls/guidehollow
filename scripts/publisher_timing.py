#!/usr/bin/env python3
"""Bound scheduled releases to one evidenced KST occurrence; never publish here."""
import argparse
from datetime import datetime, timedelta
import json
import os
from pathlib import Path
from zoneinfo import ZoneInfo

KST = ZoneInfo('Asia/Seoul')
SLOT_HOURS = {'morning': 9, 'afternoon': 15, 'evening': 21}
# Additional cron events are alternate opportunities for the SAME nominal KST slot;
# they must not invent new daily slots or rebind an expired previous-day event.
CRON_SLOTS = {
    f'{minute} {hour} * * *': slot
    for slot, hour in (('morning', 0), ('afternoon', 6), ('evening', 12))
    for minute in (17, 29, 43)
}
MAX_DELAY = timedelta(minutes=60)


def timestamp(value):
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('TIMING_EVIDENCE_REQUIRED: timezone missing')
    return parsed.astimezone(KST)


def evaluate(event, slot, created_at, now, attempt=1, bound_manual=False):
    if now.tzinfo is None:
        raise ValueError('TIMING_EVIDENCE_REQUIRED: current timezone missing')
    now = now.astimezone(KST)
    if event != 'schedule':
        date = now.date()
        if created_at:
            created = timestamp(created_at)
            if created > now:
                raise ValueError('TIMING_EVIDENCE_REQUIRED: run creation is in the future')
            date = created.date()
        allowed = attempt == 1 and date == now.date()
        if bound_manual:
            if slot not in SLOT_HOURS or not created_at:
                raise ValueError('TIMING_EVIDENCE_REQUIRED: bound manual slot and creation time required')
            due = created.replace(hour=SLOT_HOURS[slot], minute=17, second=0, microsecond=0)
            allowed = allowed and due <= created <= now <= due + MAX_DELAY
        return {'allowed': allowed, 'status': (('BOUND_MANUAL' if bound_manual else 'MANUAL') if allowed else
                'SKIPPED_RUN_RETRY' if attempt > 1 else 'SKIPPED_DATE_CHANGED'),
                'kst_date': date.isoformat(), 'slot': slot}
    if slot not in SLOT_HOURS or not isinstance(attempt, int) or attempt < 1:
        raise ValueError('TIMING_EVIDENCE_REQUIRED: invalid scheduled slot/attempt')
    created = timestamp(created_at)
    if created > now:
        raise ValueError('TIMING_EVIDENCE_REQUIRED: run creation is in the future')
    due = created.replace(hour=SLOT_HOURS[slot], minute=17, second=0, microsecond=0)
    if due > created:
        due -= timedelta(days=1)
    delay = now - due
    allowed = attempt == 1 and delay <= MAX_DELAY and now.date() == due.date()
    return {'allowed': allowed, 'status': ('SCHEDULE_ALLOWED' if allowed else
            'SKIPPED_SCHEDULE_RETRY' if attempt > 1 else 'SKIPPED_LATE_SCHEDULE'),
            'kst_date': due.date().isoformat(), 'slot': slot, 'scheduled_at': due.isoformat(),
            'created_at': created.isoformat(), 'checked_at': now.isoformat(),
            'delay_seconds': int(delay.total_seconds()), 'max_delay_seconds': int(MAX_DELAY.total_seconds())}


def context(now=None):
    event = os.getenv('GITHUB_EVENT_NAME', 'workflow_dispatch')
    slot = os.getenv('PUBLISH_SLOT', 'manual')
    if event == 'schedule' and CRON_SLOTS.get(os.getenv('PUBLISH_SCHEDULE')) != slot:
        raise ValueError('TIMING_EVIDENCE_REQUIRED: cron and slot disagree')
    result = evaluate(event, slot, os.getenv('PUBLISH_RUN_CREATED_AT', ''),
                      now or datetime.now(KST), int(os.getenv('GITHUB_RUN_ATTEMPT', '1')),
                      os.getenv('PUBLISH_BOUND_MANUAL_SLOT', 'false').lower() == 'true')
    expected = os.getenv('PUBLISH_EXPECTED_DATE')
    if expected and result['kst_date'] != expected:
        result.update(allowed=False, status='SKIPPED_DATE_CHANGED', observed_kst_date=result['kst_date'], kst_date=expected)
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--require-allowed', action='store_true')
    args = parser.parse_args()
    result = context()
    Path('/tmp/publisher-timing.json').write_text(json.dumps(result), encoding='utf-8')
    if os.getenv('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a') as out:
            out.write('allowed=' + str(result['allowed']).lower() + '\n')
    if os.getenv('GITHUB_ENV'):
        with open(os.environ['GITHUB_ENV'], 'a') as out:
            out.write('PUBLISH_EXPECTED_DATE=' + result['kst_date'] + '\n')
    print(json.dumps(result))
    if args.require_allowed and not result['allowed']:
        raise SystemExit('SCHEDULE_ADMISSION_CLOSED: no push or publication allowed')
