"""Operational monitor fixtures. No production mutations or live requests."""
import importlib.util
import sys
from pathlib import Path
import unittest
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
spec=importlib.util.spec_from_file_location('monitor',Path(__file__).resolve().parents[1]/'scripts/publisher_monitor.py')
monitor=importlib.util.module_from_spec(spec);spec.loader.exec_module(monitor)


def snapshot():
    row={'site_id':'gh-main','kst_date':'2026-10-27','slot':'morning','state':'published',
         'page_id':'p1','url':'https://guidehollow.com/guides/one/','commit':'a'*40}
    return {'now':'2026-10-27T10:20:00+09:00','automation':{'enabled':True,'since':'2026-10-27T08:00:00+09:00'},
            'ledger':[row],'notion':{'p1':{'status':'발행완료','url':row['url'],'commit':'a'*40}},
            'notion_complete_scan':True,'pages':{'sha':'c'*40,'state':'success','run_verified':True},
            'ancestry':{'a'*40:True},'errors':[],
            'runs':[{'id':1,'status':'completed','conclusion':'success','event':'schedule',
                     'created_at':'2026-10-27T00:17:00Z','receipt':{'kst_date':'2026-10-27','slot':'morning',
                     'admission':'SCHEDULE_ALLOWED','stage_status':'STAGED'}}]}


class MonitorTests(unittest.TestCase):
    def test_success_requires_ledger_notion_and_pages(self):
        result=monitor.assess(snapshot())
        self.assertEqual(result['slots'][0]['status'],'SUCCESS')
        self.assertEqual(result['findings'],[])

    def test_empty_queue_is_not_publication_or_failure(self):
        data=snapshot();data['ledger']=[];data['notion']={}
        data['runs'][0]['receipt']['stage_status']='QUEUE_EMPTY'
        result=monitor.assess(data)
        self.assertEqual(result['slots'][0]['status'],'QUEUE_EMPTY')
        self.assertEqual(result['findings'],[])

    def test_missing_and_delayed_are_distinct(self):
        data=snapshot();data['ledger']=[];data['notion']={};data['runs']=[]
        self.assertEqual(monitor.assess(data)['slots'][0]['status'],'MISSING')
        data['now']='2026-10-27T09:40:00+09:00'
        self.assertEqual(monitor.assess(data)['slots'][0]['status'],'DELAYED')

    def test_failure_and_editorial_rejection_are_distinct(self):
        data=snapshot();data['ledger']=[];data['notion']={}
        data['runs'][0]['conclusion']='failure'
        self.assertEqual(monitor.assess(data)['slots'][0]['status'],'FAILURE')
        data['runs'][0]['conclusion']='success'
        data['runs'][0]['receipt']['stage_status']='ALL_CANDIDATES_FAILED'
        self.assertEqual(monitor.assess(data)['slots'][0]['status'],'EDITORIAL_FAILURE')

    def test_notion_ledger_mismatches_never_repair_records(self):
        import copy
        data=snapshot();data['notion']['p1']['status']='발행중';before=copy.deepcopy(data)
        result=monitor.assess(data)
        self.assertIn('NOTION_LEDGER_MISMATCH',[f['code'] for f in result['findings']])
        self.assertEqual(data,before)
        data['notion']['extra']={'status':'발행완료','url':'https://guidehollow.com/guides/extra/','commit':''}
        self.assertIn('NOTION_WITHOUT_LEDGER',[f['code'] for f in monitor.assess(data)['findings']])

    def test_pages_sha_mismatch_or_incomplete_data_is_not_success(self):
        for field in ('ancestry','pages','errors'):
            with self.subTest(field=field):
                data=snapshot()
                if field=='ancestry':data[field]['a'*40]=False
                if field=='pages':data[field]['run_verified']=False
                if field=='errors':data[field]=['NOTION_UNAVAILABLE']
                self.assertTrue(monitor.assess(data)['findings'])
                self.assertNotEqual(monitor.assess(data)['slots'][0]['status'],'SUCCESS')

    def test_unexplained_success_cannot_be_called_empty_queue(self):
        data=snapshot();data['ledger']=[];data['notion']={};data['runs'][0]['receipt']=None
        result=monitor.assess(data)
        self.assertIn('UNKNOWN',[f['code'] for f in result['findings']])
        self.assertNotIn('QUEUE_EMPTY',[s['status'] for s in result['slots']])
        self.assertEqual(result['slots'][0]['status'],'UNKNOWN')

    def test_disabled_schedule_does_not_create_missing_incidents(self):
        data=snapshot();data['automation']['enabled']=False;data['runs']=[]
        self.assertEqual(monitor.assess(data)['slots'],[])

    def test_active_publisher_does_not_make_transition_an_incident(self):
        data=snapshot();data['ledger'][0]['state']='staged';data['notion']['p1']['status']='발행중'
        data['runs'][0]['status']='in_progress';data['runs'][0]['conclusion']=None;data['now']='2026-10-27T10:00:00+09:00'
        self.assertEqual(monitor.assess(data)['slots'][0]['status'],'RUNNING')
        self.assertEqual(monitor.assess(data)['findings'],[])

    def test_daily_cap_and_duplicate_ledger_are_reported(self):
        data=snapshot();data['ledger']*=4
        codes=[f['code'] for f in monitor.assess(data)['findings']]
        self.assertIn('DUPLICATE_LEDGER',codes)
        self.assertIn('DAILY_LIMIT_EXCEEDED',codes)

    def test_collector_failure_stays_unknown(self):
        with patch.object(monitor,'gh',side_effect=OSError('offline')),patch.object(monitor,'notion_records',side_effect=OSError('offline')):
            data=monitor.collect()
        self.assertTrue(data['errors'])
        self.assertIn('UNKNOWN',[f['code'] for f in monitor.assess(data)['findings']])

    def test_absent_notion_data_is_unknown_not_a_confirmed_mismatch(self):
        data=snapshot();data['notion']={};data['notion_complete_scan']=False;data['errors']=['NOTION_TOKEN_UNAVAILABLE']
        codes=[f['code'] for f in monitor.assess(data)['findings']]
        self.assertIn('UNKNOWN',codes)
        self.assertNotIn('NOTION_LEDGER_MISMATCH',codes)

    def test_receipt_provenance_and_expiry_are_validated_without_extraction(self):
        import json
        from io import BytesIO
        import zipfile
        run={'id':1,'run_attempt':1,'event':'schedule','head_sha':'a'*40}
        receipt={'schema':1,'run_id':1,'attempt':1,'event':'schedule','workflow_sha':'a'*40,
                 'kst_date':'2026-10-27','slot':'morning','admission':'SCHEDULE_ALLOWED',
                 'stage_status':'QUEUE_EMPTY','job_status':'success','unexpected':'must not retain'}
        def archive(value):
            out=BytesIO()
            with zipfile.ZipFile(out,'w') as z:z.writestr('publisher-observation.json',json.dumps(value))
            return out.getvalue()
        metadata=[{'name':'publisher-observation-1-1','expired':False,'id':99}]
        with patch.object(monitor,'pages',return_value=metadata),patch.object(monitor,'gh',return_value=archive(receipt)):
            result=monitor.read_receipt(run)
            self.assertEqual(result['stage_status'],'QUEUE_EMPTY')
            self.assertNotIn('unexpected',result)
        receipt['run_id']=2
        with patch.object(monitor,'pages',return_value=metadata),patch.object(monitor,'gh',return_value=archive(receipt)):
            with self.assertRaisesRegex(RuntimeError,'provenance'):monitor.read_receipt(run)
        metadata[0]['expired']=True
        with patch.object(monitor,'pages',return_value=metadata):
            with self.assertRaisesRegex(RuntimeError,'unavailable'):monitor.read_receipt(run)

    def test_late_skipped_run_is_reported_even_before_activation_cutoff(self):
        data=snapshot();data['automation']['since']='2026-10-27T10:00:00+09:00'
        data['runs'][0]['receipt']['admission']='SKIPPED_LATE_SCHEDULE'
        self.assertIn('SKIPPED_LATE_SCHEDULE',[f['code'] for f in monitor.assess(data)['findings']])

    def test_workflow_uses_vars_context_without_repository_variable_api(self):
        with patch.dict('os.environ',{'AUTO_PUBLISH_ENABLED':'true','MONITOR_SINCE':'2026-10-27T08:00:00+09:00'}),patch.object(monitor,'gh') as api:
            self.assertTrue(monitor.automation_settings()['enabled'])
            api.assert_not_called()

    def test_unavailable_ledger_is_not_treated_as_confirmed_empty(self):
        data=snapshot();data['ledger']=[];data['errors']=['LEDGER_UNAVAILABLE']
        codes=[f['code'] for f in monitor.assess(data)['findings']]
        self.assertIn('UNKNOWN',codes)
        self.assertNotIn('NOTION_WITHOUT_LEDGER',codes)

    def test_offline_cli_writes_summary_and_returns_attention_status(self):
        import json, os, subprocess, tempfile
        with tempfile.TemporaryDirectory() as td:
            root=Path(td);source=root/'snapshot.json';summary=root/'summary.md'
            env={**os.environ,'GITHUB_STEP_SUMMARY':str(summary)}
            source.write_text(json.dumps(snapshot()))
            command=[sys.executable,str(Path(monitor.__file__)),'check','--snapshot',str(source)]
            good=subprocess.run(command,env=env,capture_output=True,text=True,timeout=10)
            self.assertEqual(good.returncode,0,good.stderr)
            self.assertIn('SUCCESS',summary.read_text())
            source.write_text('{broken json')
            bad=subprocess.run(command,env=env,capture_output=True,text=True,timeout=10)
            self.assertEqual(bad.returncode,1)
            self.assertIn('UNKNOWN',json.loads(bad.stdout)['findings'][0]['code'])
            self.assertIn('UNKNOWN',summary.read_text())
