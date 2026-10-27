"""No live calls: Main Mac dispatch and fail-closed guards."""
from datetime import datetime
import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

p=Path(__file__).resolve().parents[1]/'scripts/mac-scheduler/dispatcher.py'
spec=importlib.util.spec_from_file_location('mac_scheduler',p)
mac=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mac)

def kst(h,m,day=27):
    return datetime.fromisoformat(f'2026-10-{day:02}T{h:02}:{m:02}:00+09:00')

class MacSchedulerTests(unittest.TestCase):
    def test_three_windows_and_expiration(self):
        for s,h in mac.SLOTS:
            self.assertEqual(mac.slot_window(kst(h,17))[0],s)
            self.assertEqual(mac.slot_window(kst(h,59))[0],s)
            self.assertEqual(mac.slot_window(kst(h+1,17))[0],s)
            self.assertIsNone(mac.slot_window(kst(h+1,18))[0])
        self.assertIsNone(mac.slot_window(kst(9,16))[0])

    def test_used_slot_cannot_steal_next(self):
        r=[{'site_id':'gh-main','kst_date':'2026-10-27','slot':'morning','state':'published'}]
        self.assertEqual(mac.check_evidence(r,[],'morning',kst(9,17)),'SLOT_ALREADY_USED')
        self.assertEqual(mac.check_evidence(r,[],'afternoon',kst(15,17)),'CLEAR')
        r.append({'site_id':'gh-main','kst_date':'2026-10-27','slot':'afternoon','state':'published'})
        self.assertEqual(mac.check_evidence(r,[],'evening',kst(21,17)),'CLEAR')

    def test_unknown_staged_and_duplicate_run_stop(self):
        for state in ('staged','unknown'):
            r=[{'site_id':'gh-main','kst_date':'2026-10-27','slot':'morning','state':state}]
            self.assertNotEqual(mac.check_evidence(r,[],'evening',kst(21,17)),'CLEAR')
        runs=[{'event':'schedule','created_at':'2026-10-27T06:17:01Z'}]
        self.assertEqual(mac.check_evidence([],runs,'afternoon',kst(15,17)),'PUBLISHER_ALREADY_TRIGGERED')

    def test_outside_window_never_calls_gh(self):
        with patch.object(mac,'gh',side_effect=AssertionError('network')):
            self.assertEqual(mac.tick(kst(11,18)),'OUTSIDE_WINDOW')

    def test_one_named_dispatch_even_after_second_launchd_tick(self):
        with TemporaryDirectory() as d:
            state=Path(d)/'state.json'
            seen=[]
            def fake(*args):
                seen.append(args)
                if args[0]=='workflow':
                    self.assertIn('slot=evening',args)
                    return 'Created'
                if 'contents/data' in args[1]: return json.dumps({'encoding':'base64','content':''})
                return json.dumps({'workflow_runs':[]})
            with patch.object(mac,'gh',side_effect=fake):
                self.assertEqual(mac.tick(kst(21,18),state),'DISPATCHED')
                self.assertEqual(mac.tick(kst(21,19),state),'ALREADY_SENT_OR_UNCERTAIN')
            self.assertEqual(sum(a[0]=='workflow' for a in seen),1)
            self.assertEqual(json.loads(state.read_text())['2026-10-27:evening']['status'],'sent')

    def test_uncertain_command_does_not_repeat(self):
        with TemporaryDirectory() as d:
            state=Path(d)/'state.json'
            counter=[0]
            def fake(*args):
                if args[0]=='workflow':
                    counter[0]+=1
                    raise RuntimeError('unknown acceptance')
                if 'contents/data' in args[1]: return json.dumps({'encoding':'base64','content':''})
                return json.dumps({'workflow_runs':[]})
            with patch.object(mac,'gh',side_effect=fake):
                with self.assertRaises(RuntimeError): mac.tick(kst(9,18),state)
                self.assertEqual(mac.tick(kst(9,19),state),'ALREADY_SENT_OR_UNCERTAIN')
            self.assertEqual(counter[0],1)
            self.assertEqual(json.loads(state.read_text())['2026-10-27:morning']['status'],'uncertain')
