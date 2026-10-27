"""Admission policy tests: no live Notion/GitHub calls."""
import importlib.util
from datetime import datetime
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('timing', Path(__file__).resolve().parents[1]/'scripts/publisher_timing.py')
timing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(timing)

class TimingTests(unittest.TestCase):
    def check(self, created, now, slot='evening', attempt=1):
        return timing.evaluate('schedule', slot, created, datetime.fromisoformat(now), attempt)

    def test_on_time_and_hour_boundary(self):
        self.assertTrue(self.check('2026-10-26T12:17:00Z','2026-10-26T22:17:00+09:00')['allowed'])
        self.assertFalse(self.check('2026-10-26T12:17:00Z','2026-10-26T22:17:01+09:00')['allowed'])

    def test_incident_cross_midnight_cannot_use_next_day_slot(self):
        result=self.check('2026-10-26T18:41:21Z','2026-10-27T03:41:28+09:00')
        self.assertFalse(result['allowed'])
        self.assertEqual(result['kst_date'],'2026-10-26')
        self.assertEqual(result['delay_seconds'],23068)

    def test_runner_wait_crosses_date_and_new_day_window(self):
        result=self.check('2026-10-26T12:17:00Z','2026-10-27T21:20:00+09:00')
        self.assertFalse(result['allowed'])
        self.assertEqual(result['kst_date'],'2026-10-26')

    def test_future_creation_and_missing_evidence_fail_closed(self):
        for created in ('', 'invalid', '2026-10-26T12:17:00', '2026-10-27T12:17:00Z'):
            with self.subTest(created=created):
                with self.assertRaises(ValueError):
                    self.check(created,'2026-10-26T21:20:00+09:00')

    def test_scheduled_retry_requires_review_even_inside_window(self):
        self.assertEqual(self.check('2026-10-26T12:17:00Z','2026-10-26T21:20:00+09:00',attempt=2)['status'],'SKIPPED_SCHEDULE_RETRY')

    def test_all_three_slot_times_and_manual_dispatch(self):
        for slot, hour in [('morning',0),('afternoon',6),('evening',12)]:
            result=self.check(f'2026-10-26T{hour:02}:17:00Z',f'2026-10-26T{hour+9:02}:20:00+09:00',slot)
            self.assertTrue(result['allowed'])
            self.assertEqual(result['slot'],slot)
        self.assertTrue(timing.evaluate('workflow_dispatch','manual','',datetime.fromisoformat('2026-10-27T02:00:00+09:00'),1)['allowed'])

    def test_backup_crons_all_bind_to_same_three_slots_without_new_publications(self):
        from unittest.mock import patch
        for slot, utc_hour in (('morning', 0), ('afternoon', 6), ('evening', 12)):
            for minute in (17, 29, 43):
                cron = f'{minute} {utc_hour} * * *'
                with self.subTest(cron=cron):
                    self.assertEqual(timing.CRON_SLOTS[cron], slot)
                    created = f'2026-10-27T{utc_hour:02}:{minute:02}:10Z'
                    now = datetime.fromisoformat(
                        f'2026-10-27T{utc_hour+9:02}:{minute+1:02}:00+09:00')
                    with patch.dict('os.environ', {
                        'GITHUB_EVENT_NAME': 'schedule',
                        'PUBLISH_SCHEDULE': cron,
                        'PUBLISH_SLOT': slot,
                        'PUBLISH_RUN_CREATED_AT': created,
                        'GITHUB_RUN_ATTEMPT': '1',
                        'PUBLISH_BOUND_MANUAL_SLOT': 'false',
                    }):
                        admission = timing.context(now)
                        self.assertTrue(admission['allowed'], admission)
                        self.assertEqual(admission['slot'], slot)
                        self.assertEqual(admission['scheduled_at'],
                                         f'2026-10-27T{utc_hour+9:02}:17:00+09:00')
                        # Multiple matching events use the original :17 release identity.
                        self.assertEqual(admission['kst_date'], '2026-10-27')
                        with patch.dict('os.environ', {'PUBLISH_SLOT': 'evening' if slot != 'evening' else 'morning'}):
                            with self.assertRaisesRegex(ValueError, 'TIMING_EVIDENCE_REQUIRED'):
                                timing.context(now)

    def test_delayed_backup_cannot_use_next_day_even_if_created_late(self):
        from unittest.mock import patch
        for minute in (29, 43):
            cron = f'{minute} 12 * * *'
            with self.subTest(cron=cron):
                with patch.dict('os.environ', {
                    'GITHUB_EVENT_NAME': 'schedule', 'PUBLISH_SCHEDULE': cron,
                    'PUBLISH_SLOT': 'evening',
                    'PUBLISH_RUN_CREATED_AT': f'2026-10-27T18:{minute:02}:01Z',
                    'GITHUB_RUN_ATTEMPT': '1'
                }):
                    result = timing.context(datetime.fromisoformat('2026-10-28T03:45:00+09:00'))
                    self.assertFalse(result['allowed'])
                    self.assertEqual(result['kst_date'], '2026-10-27')
                    self.assertEqual(result['status'], 'SKIPPED_LATE_SCHEDULE')

    def test_manual_rerun_is_not_a_new_publication_authorization(self):
        result=timing.evaluate('workflow_dispatch','manual','',datetime.fromisoformat('2026-10-27T02:00:00+09:00'),2)
        self.assertFalse(result['allowed'])
        self.assertEqual(result['status'],'SKIPPED_RUN_RETRY')

    def test_manual_date_binding_survives_midnight(self):
        from unittest.mock import patch
        with patch.dict('os.environ',{'GITHUB_EVENT_NAME':'workflow_dispatch','PUBLISH_SLOT':'manual',
                                     'GITHUB_RUN_ATTEMPT':'1','PUBLISH_RUN_CREATED_AT':'','PUBLISH_EXPECTED_DATE':'2026-10-26'}):
            result=timing.context(datetime.fromisoformat('2026-10-27T00:01:00+09:00'))
        self.assertFalse(result['allowed'])
        self.assertEqual(result['kst_date'],'2026-10-26')

    def test_manual_run_queued_across_midnight_keeps_original_date(self):
        result=timing.evaluate('workflow_dispatch','manual','2026-10-26T14:50:00Z',datetime.fromisoformat('2026-10-27T00:05:00+09:00'),1)
        self.assertFalse(result['allowed'])
        self.assertEqual(result['kst_date'],'2026-10-26')

    def test_explicit_mac_slots_are_bound_to_created_at_and_the_60_minute_window(self):
        dt = datetime.fromisoformat
        for slot, hour in (('morning',9),('afternoon',15),('evening',21)):
            created=f'2026-10-27T{hour:02}:17:15+09:00'
            self.assertTrue(timing.evaluate('workflow_dispatch',slot,created,
                dt(f'2026-10-27T{hour:02}:20:00+09:00'),1,True)['allowed'])
            self.assertFalse(timing.evaluate('workflow_dispatch',slot,created,
                dt(f'2026-10-27T{hour+1:02}:17:01+09:00'),1,True)['allowed'])
            self.assertFalse(timing.evaluate('workflow_dispatch',slot,
                f'2026-10-27T{hour-1:02}:59:00+09:00',
                dt(f'2026-10-27T{hour:02}:20:00+09:00'),1,True)['allowed'])
            self.assertFalse(timing.evaluate('workflow_dispatch',slot,created,
                dt(f'2026-10-27T{hour:02}:20:00+09:00'),2,True)['allowed'])
        with self.assertRaises(ValueError):
            timing.evaluate('workflow_dispatch','manual','',dt('2026-10-27T09:20:00+09:00'),1,True)

    def test_publisher_suite_isolated_from_real_schedule_timestamps(self):
        import os, subprocess, sys
        env={**os.environ,'GITHUB_EVENT_NAME':'schedule','GITHUB_RUN_ATTEMPT':'2',
             'PUBLISH_RUN_CREATED_AT':'2020-01-01T12:17:00Z','PUBLISH_EXPECTED_DATE':'2020-01-01',
             'PUBLISH_SCHEDULE':'17 12 * * *','PUBLISH_SLOT':'evening'}
        result=subprocess.run([sys.executable,'-m','unittest','discover','-s','tests','-p','test_notion_publisher.py','-q'],
                 cwd=Path(__file__).resolve().parents[1],env=env,capture_output=True,text=True,timeout=20)
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
