// GuideHollow original, secret-free incident exercise. No network, API keys or uploads.
// This checks consistency of fictional records only, NOT provider revocation,
// security investigations, legal retention or approval by an incident owner.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const requirements={
  issuerRevocation:{state:'CONFIRMED'},
  workloadRestoration:{state:'VERIFIED'},
  usageReview:{state:'REVIEWED_WITH_LIMITS'},
  chatHandling:{state:'REMOVED_FROM_ACCOUNT_VIEW'},
  savedFileHandling:{state:'ADDRESSED'},
  shareHandling:{state:'REVIEWED_WITH_LIMITS'},
  prevention:{state:'VERIFIED'}
};
const domains=new Set([...Object.keys(requirements),'exposure','ownerIdentification']);

export function parseEvents(tsv){
  if(typeof tsv!=='string'||tsv.length>30000)throw Error('Source events must be a small local TSV.');
  const lines=tsv.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').trimEnd().split('\n');
  if(lines.shift()!=='EventID\tSequence\tDomain\tRecordedState\tEvidenceSummary')
    throw Error('Unexpected source-events TSV header.');
  if(lines.length!==10)throw Error('The editorial fixture requires exactly ten source events.');
  const records=new Map();
  for(let i=0;i<lines.length;i++){
    const cells=lines[i].split('\t');
    if(cells.length!==5||cells.some(x=>!x.trim()))throw Error('Malformed event at line '+(i+2));
    const [id,sequence,domain,state,summary]=cells;
    if(id!=='E'+String(i+1).padStart(2,'0')||Number(sequence)!==i+1)
      throw Error('Unexpected event sequence; source history must stay ordered.');
    if(records.has(id)||!domains.has(domain)||summary.length<40)throw Error('Invalid source event '+id);
    records.set(id,{id,sequence:Number(sequence),domain,state,summary});
  }
  if(records.get('E01').domain!=='exposure'||records.get('E02').domain!=='ownerIdentification')
    throw Error('Fixture must begin with exposure and owner identification.');
  return records;
}

export function assess(eventsText,ledgerText){
  const events=parseEvents(eventsText);
  if(typeof ledgerText!=='string'||ledgerText.length>20000)throw Error('Ledger must be a small local JSON file.');
  const ledger=JSON.parse(ledgerText);
  if(ledger.scenario!=='FICTIONAL-STAGING-01')throw Error('Unexpected incident fixture ID.');
  const cutoff=events.get(ledger.throughEvent);
  if(!cutoff)throw Error('Invalid throughEvent cutoff.');
  if(!ledger.checks||typeof ledger.checks!=='object'||Array.isArray(ledger.checks)||
     Object.keys(ledger.checks).sort().join(',')!==Object.keys(requirements).sort().join(','))
    throw Error('Expected all seven independent outcome fields, including explicit nulls.');
  if(!ledger.assertions||typeof ledger.assertions!=='object'||Array.isArray(ledger.assertions)||
     Object.keys(ledger.assertions).sort().join(',')!=='allCopiesErased,unauthorizedUse')
    throw Error('Both claims requiring caution must be recorded.');
  if(!['OPEN','READY_FOR_OWNER_REVIEW'].includes(ledger.requestedDisposition))
    throw Error('Unknown requested disposition. There is no auto-CLOSED state.');

  const findings=[];
  for(const [domain,expected] of Object.entries(requirements)){
    const id=ledger.checks[domain];
    if(id===null){findings.push({domain,kind:'MISSING_EVIDENCE'});continue;}
    if(typeof id!=='string'||!/^E\d{2}$/.test(id))throw Error('Invalid evidence ID in '+domain);
    const event=events.get(id);
    if(!event){findings.push({domain,kind:'UNKNOWN_EVENT'});continue;}
    if(event.sequence>cutoff.sequence){findings.push({domain,kind:'FUTURE_EVIDENCE'});continue;}
    if(event.domain!==domain){findings.push({domain,kind:'WRONG_DOMAIN'});continue;}
    if(event.state!==expected.state){findings.push({domain,kind:'OUTCOME_PENDING'});continue;}
  }
  if(ledger.assertions.unauthorizedUse!=='UNKNOWN')
    findings.push({domain:'unauthorizedUse',kind:'UNSUPPORTED_CERTAINTY'});
  if(ledger.assertions.allCopiesErased!=='UNKNOWN')
    findings.push({domain:'allCopiesErased',kind:'UNSUPPORTED_CERTAINTY'});
  const computedDisposition=findings.length?'OPEN':'READY_FOR_OWNER_REVIEW';
  const requestedDispositionMatches=ledger.requestedDisposition===computedDisposition;
  return {computedDisposition,requestedDispositionMatches,findings,throughEvent:cutoff.id};
}

function main(){
  if(process.argv.length!==3){
    process.stderr.write('Usage: node closure-audit.mjs path/to/incident-ledger.json\n');
    process.exitCode=1;return;
  }
  try{
    const source=readFileSync(new URL('./source-events.tsv',import.meta.url),'utf8');
    const ledger=readFileSync(resolve(process.argv[2]),'utf8');
    const result=assess(source,ledger);
    process.stdout.write('GuideHollow FICTIONAL credential-exposure response drill\n');
    process.stdout.write('Events considered through: '+result.throughEvent+'\n');
    for(const item of result.findings)process.stdout.write('- '+item.domain+': '+item.kind+'\n');
    process.stdout.write('Computed disposition: '+result.computedDisposition+'\n');
    process.stdout.write('Requested disposition: '+(result.requestedDispositionMatches?'CONSISTENT':'UNSUPPORTED')+'\n');
    process.stdout.write('LIMIT: This is only a fictional ledger consistency gate. It cannot verify provider logs, real revocation, absence of misuse, deletion from every copy or human incident closure.\n');
    if(!result.requestedDispositionMatches)process.exitCode=2;
  }catch(error){
    process.stderr.write('Audit failed: '+(error instanceof Error?error.message:'unknown error')+'\n');
    process.exitCode=1;
  }
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)main();
