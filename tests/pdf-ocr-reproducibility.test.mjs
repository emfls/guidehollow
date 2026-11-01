import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';

const root = fileURLToPath(new URL('../',import.meta.url));
const base64Path='data/pdf-ocr-fixtures/expense-bitmap-deflate.base64';
const expected=[
  ['fictional-expense-selectable-text.pdf',263,0],
  ['fictional-expense-image-only.pdf',0,1],
];

test('build generates independent, inspectable PDF text-versus-scan fixtures without network or new packages', () => {
  const tmp=mkdtempSync(path.join(tmpdir(),'guidehollow-pdf-fixtures-'));
  try {
    mkdirSync(path.join(tmp,'data/pdf-ocr-fixtures'),{recursive:true});
    copyFileSync(path.join(root,base64Path),path.join(tmp,base64Path));
    const source=readFileSync(path.join(root,base64Path),'utf8').trim();
    const image=inflateSync(Buffer.from(source,'base64'));
    assert.equal(source.length,4608,'Frozen bitmap must not be truncated');
    assert.equal(image.length,Math.ceil(918/8)*1188,'Raster payload must have the exact one-bit dimensions');
    const run=spawnSync(process.execPath,[path.join(root,'scripts/generate-pdf-ocr-fixtures.mjs')],{cwd:tmp,encoding:'utf8',timeout:10000});
    assert.equal(run.status,0,run.stdout+'\n'+run.stderr);
    const out=path.join(tmp,'public/examples/pdf-ocr-fixtures');
    const manifest=JSON.parse(readFileSync(path.join(out,'manifest.json'),'utf8'));
    assert.equal(manifest.files.length,2);
    assert.match(manifest.description,/fictional/);
    for(const [name,chars,images] of expected) {
      const record=manifest.files.find(file=>file.name===name);
      assert(record,name+' omitted from manifest');
      assert.equal(record.expected_extracted_characters_without_ocr,chars);
      assert.equal(record.expected_embedded_images,images);
      assert.equal(record.pages,1);
      const body=readFileSync(path.join(out,name));
      assert(body.subarray(0,8).toString().startsWith('%PDF-1.4'),name+' invalid PDF header');
      assert.equal(body.length,record.bytes);
      assert.equal(createHash('sha256').update(body).digest('hex'),record.sha256);
      assert.match(body.toString('latin1'),/\/Type \/Page \/Parent/);
    }
    const selectable=readFileSync(path.join(out,expected[0][0]),'latin1');
    const raster=readFileSync(path.join(out,expected[1][0]),'latin1');
    for(const x of ['Fictional Expense Report','Jan 2026','Feb 2026','Two-month total','$400'])
      assert(selectable.includes(x),'Text source missing '+x);
    assert.match(selectable,/\/BaseFont \/Helvetica/);
    assert.match(raster,/\/Subtype \/Image/);
    assert.doesNotMatch(raster,/\/BaseFont|BT \/F1/,'Raster fixture must not contain a searchable text overlay');
    assert.equal(manifest.files[0].sha256,'dc6cf1244eb9e094d1899d880987ed4d5e89119a3025e84b8a747cb88596895d');
    assert.equal(manifest.files[1].sha256,'76c93bb512ff079007102f8584ef4f30bae98efc5499fad2d8b58552e5d802b0');
  } finally {
    rmSync(tmp,{recursive:true,force:true});
  }
});

test('PDF and security guides show current downloadable primary evidence, not fabricated OCR or account tests', () => {
  const article=readFileSync(path.join(root,'src/content/articles/ai-pdf-summary-missing-tables-ocr-check.md'),'utf8');
  assert.match(article,/updatedDate: "2026-11-02"/);
  for(const [name] of expected)assert(article.includes('/examples/pdf-ocr-fixtures/'+name));
  assert.match(article,/ordinary `page\.get_text\(\)`/);
  assert.match(article,/supersedes the earlier, non-downloadable 134-character example/);
  assert.match(article,/No OCR engine, AI-summary benchmark/);
  const security=readFileSync(path.join(root,'src/content/articles/api-key-pasted-into-chatgpt-incident-response.md'),'utf8');
  assert.match(security,/Space \*\*replaces Library\*\*/);
  assert.match(security,/Do not instruct a Space user/);
  assert.match(security,/updatedDate: "2026-11-02"/);
  const library=readFileSync(path.join(root,'src/pages/evidence.astro'),'utf8');
  assert.match(library,/evidence-pdf-ocr/);
  assert(library.includes('/examples/pdf-ocr-fixtures/fictional-expense-selectable-text.pdf'));
});
