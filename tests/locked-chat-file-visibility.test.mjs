import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=slug=>readFileSync(new URL('../src/content/articles/'+slug+'.md',import.meta.url),'utf8');
const officialLibrary='https://help.openai.com/en/articles/20001052-using-library-to-manage-files-in-chatgpt';
const officialSpace='https://help.openai.com/en/articles/20001549-getting-started-with-space-in-chatgpt';

test('missing-file troubleshooting distinguishes hidden locked-chat files from upload failures',()=>{
  const guide=read('chatgpt-file-upload-problems');
  assert((guide.match(/^updatedDate: "(\d{4}-\d{2}-\d{2})"$/m)?.[1] ?? '') >= '2026-11-03');
  assert(guide.includes('Uploaded a file but cannot find it? Check visibility before making a destructive change'));
  for(const term of ['Library','Space','Temporary Chat','Projects → Locked chats','originating locked chat','existing PIN','supported device authentication','mobile']) {
    assert(guide.includes(term),'Missing documented diagnostic branch: '+term);
  }
  assert(guide.includes('resetting an account PIN permanently deletes files protected only by the previous PIN'));
  assert(guide.includes('do not reset the PIN as a troubleshooting experiment'));
  assert(guide.includes('not findings from our access to an account'));
  assert(guide.includes('Date and time checked:'));
  const refs=JSON.parse(guide.match(/^sources: (\[.*\])$/m)?.[1]??'[]');
  assert(refs.some(x=>x.url===officialLibrary));
  assert(refs.some(x=>x.url===officialSpace));
});

test('account and platform branches do not incorrectly promise Space access or mobile editing',()=>{
  const guide=read('chatgpt-file-upload-problems');
  assert(guide.includes('Free, Go, Plus'));
  assert(guide.includes('eligible Pro, Business and Enterprise'));
  assert(guide.includes('subject to administrator settings'));
  assert(guide.includes('not editing them'));
  assert(guide.includes('Google Drive or another connected source'));
  assert(guide.includes('Files uploaded in Temporary Chats') || guide.includes('files uploaded in Temporary Chats'));
  assert(!guide.includes('reset your PIN to recover'));
  assert(!guide.includes('Space is available to all users'));
  assert(!guide.includes('delete your project to free upload quota'));
});

test('historical documented Search exercise is not misrepresented as live file access or recovery',()=>{
  const search=read('how-to-use-chatgpt-search');
  const upload=read('chatgpt-file-upload-problems');
  assert(search.includes('updatedDate: "2026-11-03"'));
  assert(search.includes('newly checked November 3, 2026 official instructions'));
  assert(search.includes('not part of the original October 23 ChatGPT Search session'));
  assert(search.includes(officialLibrary));
  assert(search.includes('Projects → Locked chats'));
  assert(search.includes('Do not reset the PIN to test visibility'));
  assert(search.includes('/troubleshooting/chatgpt-file-upload-problems/#uploaded-a-file-but-cannot-find-it-check-visibility-before-making-a-destructive-change'));
  assert(upload.includes('/ai-tools/how-to-use-chatgpt-search/'));
  assert(search.includes('research and source reading only; no account file was opened or deleted') ||
    search.includes('Research and source reading only; no account file was opened or deleted'));
});
