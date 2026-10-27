#!/usr/bin/env python3
"""Read-only publisher SRE checks. No Notion PATCH, publishing, Issue creation or repair."""
import argparse
from collections import Counter
from datetime import datetime, timedelta
from io import BytesIO
import json
import os
from pathlib import Path
import re
import subprocess
from urllib.parse import quote
import zipfile

import notion_publish_daily as pub
from publisher_timing import KST, MAX_DELAY, SLOT_HOURS, timestamp

REPO = pub.REPO
ACTION = 'Review Actions logs and exact deployed SHA/URL/Notion/ledger evidence. Do not republish or reset the ledger.'


def gh(route, binary=False):
    data = subprocess.check_output(['gh', 'api', 'repos/' + REPO + '/' + route], timeout=45, stderr=subprocess.PIPE)
    return data if binary else json.loads(data)


def pages(route, key=None):
    rows = []
    for number in range(1, 21):
        data = gh(route + ('&' if '?' in route else '?') + 'per_page=100&page=' + str(number))
        batch = data[key] if key else data
        if not isinstance(batch, list):
            raise RuntimeError('Invalid paginated GitHub response')
        rows.extend(batch)
        if len(batch) < 100:
            return rows
    raise RuntimeError('GitHub pagination limit: coverage is incomplete')


def read_receipt(run):
    artifacts = pages('actions/runs/' + str(run['id']) + '/artifacts', 'artifacts')
    name = 'publisher-observation-' + str(run['id']) + '-' + str(run['run_attempt'])
    matched = [a for a in artifacts if a['name'] == name]
    if not matched:
        return None
    if len(matched) != 1 or matched[0]['expired']:
        raise RuntimeError('Receipt unavailable')
    data = gh('actions/artifacts/' + str(matched[0]['id']) + '/zip', binary=True)
    if len(data) > 1000000:
        raise RuntimeError('Receipt archive exceeds bound')
    with zipfile.ZipFile(BytesIO(data)) as archive:
        info = archive.getinfo('publisher-observation.json')
        if info.file_size > 65536:
            raise RuntimeError('Receipt exceeds bound')
        result = json.loads(archive.read(info))
    if (result.get('schema') != 1 or result.get('run_id') != run['id'] or
            result.get('attempt') != run['run_attempt'] or result.get('event') != run['event'] or
            result.get('workflow_sha') != run['head_sha'] or result.get('slot') not in (*SLOT_HOURS, 'manual')):
        raise RuntimeError('Receipt provenance mismatch')
    datetime.strptime(result['kst_date'], '%Y-%m-%d')
    for key in ('admission', 'stage_status', 'job_status'):
        if not isinstance(result.get(key), str) or len(result[key]) > 64:
            raise RuntimeError('Receipt outcome malformed')
    # Retain only operational fields, never arbitrary extra artifact content.
    return {key: result.get(key) for key in ('schema', 'run_id', 'attempt', 'event', 'workflow_sha',
            'kst_date', 'slot', 'admission', 'stage_status', 'job_status', 'article_sha', 'execution_base_sha')}


def notion_records(ledger):
    pub.verify_site_registry()
    rows, cursor, seen = [], None, set()
    while True:
        payload = {'filter': {'and': [
            {'property': '배포 사이트', 'relation': {'contains': pub.SITE_PAGE}},
            {'or': [{'property': '상태', 'select': {'equals': status}} for status in ('발행중', '발행완료')]}
        ]}, 'page_size': 100}
        if cursor:
            payload['start_cursor'] = cursor
        response = pub.notion('POST', '/data_sources/' + pub.QUEUE_ID + '/query', payload)
        if not isinstance(response.get('results'), list) or not isinstance(response.get('has_more'), bool):
            raise RuntimeError('Invalid Notion monitor response')
        rows.extend(response['results'])
        if not response['has_more']:
            break
        cursor = response.get('next_cursor')
        if not isinstance(cursor, str) or not cursor or cursor in seen or len(seen) >= 20:
            raise RuntimeError('Incomplete Notion monitor pagination')
        seen.add(cursor)
    known = {r['id'] for r in rows}
    for row in ledger:
        if row['page_id'] not in known:
            rows.append(pub.notion('GET', '/pages/' + quote(row['page_id'], safe='')))
            known.add(row['page_id'])
    result = {}
    for row in rows:
        p = row['properties']
        relation = pub.notion_property(p, '배포 사이트', 'relation')
        if len(relation) != 1 or relation[0]['id'] != pub.SITE_PAGE:
            raise RuntimeError('Main-site relation mismatch')
        state = pub.notion_property(p, '상태', 'select')
        url = pub.notion_property(p, '게시 URL', 'url')
        commit = pub.notion_property(p, 'GitHub 커밋', 'url')
        if not state or (url is not None and not isinstance(url, str)) or (commit is not None and not isinstance(commit, str)):
            raise RuntimeError('Malformed completion metadata')
        if commit and not re.fullmatch(r'https://github.com/emfls/guidehollow/commit/[a-f0-9]{40}', commit):
            raise RuntimeError('Commit URL does not belong to this repository')
        result[row['id']] = {'status': state['name'], 'url': url or '', 'commit': commit.rsplit('/', 1)[-1] if commit else ''}
    return result


def automation_settings():
    # The workflow uses vars context: GITHUB_TOKEN has no Variables permission knob.
    if 'AUTO_PUBLISH_ENABLED' in os.environ:
        since = os.getenv('MONITOR_SINCE')
        if not since:
            since = subprocess.check_output(['git', 'log', '--first-parent', '--diff-filter=A', '-1',
                     '--format=%cI', '--', '.github/workflows/publisher-monitor.yml'], text=True, timeout=15).strip()
        timestamp(since)
        return {'enabled': os.environ['AUTO_PUBLISH_ENABLED'] == 'true', 'since': since,
                'baseline': 'monitor introduction or explicit monitoring baseline'}
    flag = gh('actions/variables/GUIDEHOLLOW_AUTO_PUBLISH')
    return {'enabled': flag['value'] == 'true', 'since': flag['updated_at'], 'baseline': 'current activation variable update'}


def collect():
    now = datetime.now(KST)
    data = {'now': now.isoformat(), 'automation': None, 'ledger': [], 'runs': [], 'notion': {},
            'notion_complete_scan': False, 'pages': {}, 'ancestry': {}, 'errors': []}
    try:
        data['ledger'] = [r for r in (json.loads(line) for line in pub.LEDGER.read_text().splitlines() if line.strip()) if r.get('site_id') == pub.SITE_ID]
        for row in data['ledger']:
            if (not all(isinstance(row.get(k), str) and row[k] for k in ('page_id', 'url', 'kst_date', 'state')) or
                    not row['url'].startswith(pub.SITE + '/')):
                raise ValueError('Malformed ledger metadata')
            datetime.strptime(row['kst_date'], '%Y-%m-%d')
    except Exception:
        data['ledger'] = []
        data['errors'].append('LEDGER_UNAVAILABLE')
    try:
        data['automation'] = automation_settings()
        cutoff = max(now - timedelta(hours=48), timestamp(data['automation']['since']))
        runs = pages('actions/workflows/notion-daily-publisher.yml/runs?branch=main&created=' + quote('>=' + cutoff.isoformat(), safe=''), 'workflow_runs')
        for run in runs:
            if run['event'] not in ('schedule', 'workflow_dispatch'):
                continue
            row = {key: run[key] for key in ('id', 'event', 'status', 'conclusion', 'created_at', 'run_started_at', 'run_attempt', 'head_sha', 'html_url')}
            row['receipt'] = None
            if run['status'] == 'completed':
                try:
                    row['receipt'] = read_receipt(run)
                except Exception:
                    row['receipt_error'] = 'RECEIPT_UNAVAILABLE_OR_INVALID'
            if run['conclusion'] not in (None, 'success', 'skipped'):
                jobs = pages('actions/runs/' + str(run['id']) + '/jobs', 'jobs')
                row['failed_steps'] = [step['name'] for job in jobs for step in job.get('steps', []) if step.get('conclusion') == 'failure']
            data['runs'].append(row)
        deployments = gh('deployments?environment=github-pages&per_page=1')
        latest = deployments[0]
        state = gh('deployments/' + str(latest['id']) + '/statuses?per_page=1')[0]['state']
        sha = latest['sha']
        if not re.fullmatch(r'[a-f0-9]{40}', sha):
            raise RuntimeError('Invalid Pages SHA')
        deploy_runs = pages('actions/workflows/deploy.yml/runs?branch=main', 'workflow_runs')
        verified = any(r['head_sha'] == sha and r['conclusion'] == 'success' and r['event'] != 'pull_request' for r in deploy_runs)
        data['pages'] = {'sha': sha, 'state': state, 'run_verified': verified, 'deployment_id': latest['id']}
        for row in data['ledger']:
            reference = row.get('commit') or row.get('verified_deployment_sha')
            if reference and reference not in data['ancestry']:
                if not re.fullmatch(r'[a-f0-9]{40}', reference):
                    raise RuntimeError('Invalid ledger SHA')
                data['ancestry'][reference] = gh('compare/' + reference + '...' + sha)['status'] in ('ahead', 'identical')
    except Exception:
        data['errors'].append('GITHUB_READ_FAILED_OR_INCOMPLETE')
    try:
        data['notion'] = notion_records(data['ledger'])
        data['notion_complete_scan'] = True
    except Exception:
        data['errors'].append('NOTION_READ_FAILED_OR_INCOMPLETE' if os.getenv('NOTION_API_TOKEN') else 'NOTION_TOKEN_UNAVAILABLE')
    return data


def assess(data):
    now = timestamp(data['now'])
    findings, slots, comparisons = [], [], []
    def finding(code, target):
        item = {'code': code, 'target': target, 'action': ACTION}
        if item not in findings:
            findings.append(item)
    for error in data['errors']:
        finding('UNKNOWN', error)
    if not data['notion_complete_scan']:
        finding('UNKNOWN', 'Notion reverse comparison is incomplete')
    deployment = data['pages']
    deployed = deployment.get('state') == 'success' and deployment.get('run_verified') is True
    if not deployed:
        finding('PAGES_UNVERIFIED', 'Current Pages environment and successful deployment-run SHA must agree')
    active = [r for r in data['runs'] if r['status'] != 'completed' and now - timestamp(r['created_at']) <= timedelta(minutes=55)]
    ledger = data['ledger']
    for field in ('page_id', 'url'):
        if any(count > 1 for count in Counter(r.get(field) for r in ledger).values()):
            finding('DUPLICATE_LEDGER', field)
    if any(count > 3 for count in Counter(r.get('kst_date') for r in ledger).values()):
        finding('DAILY_LIMIT_EXCEEDED', 'KST publication date')
    occupied = [(r.get('kst_date'), r.get('slot')) for r in ledger if r.get('slot')]
    if len(occupied) != len(set(occupied)):
        finding('DUPLICATE_LEDGER', 'KST slot')
    for row in ledger:
        page = row['page_id']
        expected = data['notion'].get(page)
        reference = row.get('commit') or row.get('verified_deployment_sha')
        verified = deployed and data['ancestry'].get(reference) is True
        if row['state'] == 'staged':
            if not active:
                finding('UNRECONCILED_LEDGER', page)
        elif row['state'] != 'published':
            finding('UNKNOWN_LEDGER_STATE', page)
        elif not expected and not data['notion_complete_scan']:
            finding('UNKNOWN', page + ': Notion metadata unavailable')
        elif (not expected or expected.get('status') != '발행완료' or expected.get('url') != row['url'] or
              (row.get('commit') and expected.get('commit') != row['commit'])):
            finding('NOTION_LEDGER_MISMATCH', page)
        if row['state'] == 'published' and not verified:
            finding('ARTICLE_SHA_NOT_VERIFIED', page)
        comparisons.append({'page_id': page, 'ledger': row['state'], 'notion': expected.get('status') if expected else 'UNKNOWN',
                            'reference_sha': reference, 'included_in_current_pages_sha': verified,
                            'consistent': verified and not data['errors'] and data['notion_complete_scan'] and bool(expected) and
                            expected.get('status') == '발행완료' and expected.get('url') == row['url'] and
                            (not row.get('commit') or expected.get('commit') == row['commit'])})
    known = {r['page_id'] for r in ledger}
    for page, item in data['notion'].items():
        if 'LEDGER_UNAVAILABLE' not in data['errors'] and page not in known and (item['status'] == '발행완료' or (item['status'] == '발행중' and not active)):
            finding('NOTION_WITHOUT_LEDGER', page)
    for run in data['runs']:
        if run.get('receipt') and run['receipt']['admission'].startswith('SKIPPED_'):
            finding(run['receipt']['admission'], str(run['id']))
        if run['status'] == 'completed' and run['conclusion'] not in ('success', 'skipped'):
            finding('RUN_FAILURE', str(run['id']))
        elif run['status'] == 'completed' and (not run.get('receipt') or run.get('receipt_error')):
            finding('UNKNOWN', 'Missing trustworthy outcome receipt for run ' + str(run['id']))
        elif run['status'] != 'completed' and run not in active:
            finding('RUN_OVERDUE', str(run['id']))
    automation = data['automation']
    if automation and automation['enabled']:
        since = max(now - timedelta(hours=48), timestamp(automation['since']))
        day = since.replace(hour=0, minute=0, second=0, microsecond=0)
        while day.date() <= now.date():
            for slot, hour in SLOT_HOURS.items():
                due = day.replace(hour=hour, minute=17)
                if due < since or due > now:
                    continue
                date = due.date().isoformat()
                rows = [r for r in ledger if r.get('kst_date') == date and r.get('slot') == slot]
                attempts = [r for r in data['runs'] if r.get('receipt') and r['receipt']['kst_date'] == date and r['receipt']['slot'] == slot]
                latest = max(attempts, key=lambda r: (timestamp(r['created_at']), r.get('run_attempt', 1)), default=None)
                if latest and latest['status'] == 'completed' and latest['conclusion'] not in ('success', 'skipped'):
                    status = 'FAILURE'
                elif any(r['state'] == 'published' for r in rows):
                    status = 'SUCCESS' if all(c['consistent'] for c in comparisons if c['page_id'] in {r['page_id'] for r in rows}) else 'UNVERIFIED'
                elif active and due <= now <= due + MAX_DELAY + timedelta(minutes=55):
                    status = 'RUNNING'
                elif latest:
                    receipt = latest['receipt']
                    stage = receipt['stage_status']
                    if receipt['admission'].startswith('SKIPPED_'):
                        status = receipt['admission']
                    elif stage == 'QUEUE_EMPTY':
                        status = 'QUEUE_EMPTY'
                    elif stage in ('ALL_CANDIDATES_FAILED', 'MAX_FAILURES_REACHED'):
                        status = 'EDITORIAL_FAILURE'
                    elif stage in ('SLOT_ALREADY_USED', 'DAILY_LIMIT_REACHED', 'SLOTS_EXHAUSTED'):
                        status = 'GUARD_HELD'
                    else:
                        status = 'UNKNOWN'
                elif data['errors'] or any(not r.get('receipt') and
                        due <= timestamp(r['created_at']) <= due + MAX_DELAY for r in data['runs']):
                    status = 'UNKNOWN'
                elif now > due + MAX_DELAY:
                    status = 'MISSING'
                elif now > due + timedelta(minutes=15):
                    status = 'DELAYED'
                else:
                    status = 'WAITING'
                if status not in ('SUCCESS', 'QUEUE_EMPTY', 'WAITING', 'RUNNING'):
                    finding(status, date + '/' + slot)
                delay = None
                timeliness = status if status in ('MISSING', 'DELAYED', 'UNKNOWN', 'WAITING') else 'UNKNOWN'
                if latest:
                    if latest.get('event') == 'workflow_dispatch':
                        timeliness = 'MANUAL'
                    else:
                        delay = int((timestamp(latest.get('run_started_at') or latest['created_at']) - due).total_seconds())
                        timeliness = 'DELAYED' if delay > 900 else 'ON_TIME'
                slots.append({'kst_date': date, 'slot': slot, 'timeliness': timeliness, 'start_delay_seconds': delay, 'scheduled_at': due.isoformat(), 'status': status,
                              'run_ids': [r['id'] for r in attempts], 'duplicate_executions': len(attempts) > 1})
            day += timedelta(days=1)
    return {'checked_at': data['now'], 'slots': slots, 'findings': findings, 'comparison': comparisons,
            'pages': deployment, 'automation': automation, 'coverage_hours': 48, 'notion_complete_scan': data['notion_complete_scan'],
            'run_diagnostics': [{k: r.get(k) for k in ('id', 'html_url', 'conclusion', 'failed_steps', 'receipt_error')} for r in data['runs']]}


def write_summary(report):
    lines = ['## GuideHollow publisher operations', '', '| KST date | Slot | Outcome | Timing | Delay (s) |', '|---|---|---|---|---|']
    for row in report['slots']:
        lines.append('| ' + row['kst_date'] + ' | ' + row['slot'] + ' | ' + row['status'] + ' | ' + row['timeliness'] + ' | ' + str(row['start_delay_seconds']) + ' |')
    for item in report['findings']:
        lines.append('\n- **' + item['code'] + '**: ' + item['target'] + '. ' + item['action'])
    for run in report.get('run_diagnostics', []):
        if run.get('conclusion') not in (None, 'success', 'skipped'):
            lines.append('\n- Failed run [' + str(run['id']) + '](' + (run.get('html_url') or '') +
                         '), steps: ' + ', '.join(run.get('failed_steps') or ['UNKNOWN']) + '. ' + ACTION)
    lines.append('\nRead-only diagnosis. No automatic retry, Notion repair, ledger reset, Issue creation or email sending.')
    if os.getenv('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as out:
            out.write('\n'.join(lines) + '\n')


def receipt():
    def read(path):
        file = Path(path)
        try:
            return json.loads(file.read_text()) if file.exists() and file.stat().st_size else {}
        except (OSError, ValueError):
            return {'status': 'UNKNOWN'}
    timing = read('/tmp/publisher-timing.json')
    stage = read('/tmp/notion-result.json')
    result = {'schema': 1, 'run_id': int(os.environ['GITHUB_RUN_ID']), 'attempt': int(os.environ['GITHUB_RUN_ATTEMPT']),
              'event': os.environ['GITHUB_EVENT_NAME'], 'workflow_sha': os.environ['GITHUB_SHA'],
              'kst_date': stage.get('kst_date', timing.get('kst_date')), 'slot': stage.get('slot', timing.get('slot')),
              'admission': timing.get('status', 'UNKNOWN'), 'stage_status': stage.get('status', 'UNKNOWN'),
              'job_status': os.environ['PUBLISH_JOB_STATUS'], 'execution_base_sha': os.getenv('PUBLISH_EXECUTION_BASE_SHA', ''), 'article_sha': os.getenv('ARTICLE_SHA', ''), 'timing': timing}
    Path('/tmp/publisher-observation.json').write_text(json.dumps(result), encoding='utf-8')
    if os.getenv('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as out:
            out.write('## Publisher outcome\n\n```json\n' + json.dumps(result, indent=2) + '\n```\n\n' + ACTION + '\n')
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=('check', 'receipt'))
    parser.add_argument('--snapshot', type=Path)
    parser.add_argument('--save-snapshot', type=Path)
    args = parser.parse_args()
    if args.command == 'receipt':
        print(json.dumps(receipt()))
    else:
        try:
            data = json.loads(args.snapshot.read_text()) if args.snapshot else collect()
            if args.save_snapshot:
                args.save_snapshot.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
            result = assess(data)
        except Exception as exc:
            result = {'checked_at': datetime.now(KST).isoformat(), 'slots': [],
                      'findings': [{'code': 'UNKNOWN', 'target': 'Monitor data/collection error: ' + type(exc).__name__, 'action': ACTION}]}
        write_summary(result)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        raise SystemExit(1 if result['findings'] else 0)
