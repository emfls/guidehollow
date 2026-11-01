import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

// Reproducible, fictional 1-page PDF pair for the published PDF/OCR guide.
// Node built-ins only. No AI, OCR, remote files, fonts, or paid services.
// The compressed monochrome bitmap is a deliberately frozen rendering of the
// same fictional table; it is not a customer document or an OCR result.
const root=process.cwd();
const output=join(root,'public/examples/pdf-ocr-fixtures');
const bitmapFile=join(root,'data/pdf-ocr-fixtures/expense-bitmap-deflate.base64');
const rows=[
  ['Jan 2026','$120','$80','$200'],
  ['Feb 2026','$95','$105','$200'],
  ['Two-month total','','','$400'],
];
function pdf(objects) {
  const parts=[Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n','latin1')];
  const offsets=[0];
  let pos=parts[0].length;
  for(let i=0;i<objects.length;i++){
    offsets.push(pos);
    const start=Buffer.from((i+1)+' 0 obj\n','ascii');
    const value=Buffer.isBuffer(objects[i])?objects[i]:Buffer.from(objects[i],'ascii');
    const end=Buffer.from('\nendobj\n','ascii');
    parts.push(start,value,end);
    pos+=start.length+value.length+end.length;
  }
  let tail='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';
  for(const offset of offsets.slice(1))tail+=String(offset).padStart(10,'0')+' 00000 n \n';
  tail+='trailer\n<< /Root 1 0 R /Size '+(objects.length+1)+' >>\nstartxref\n'+pos+'\n%%EOF\n';
  return Buffer.concat([...parts,Buffer.from(tail,'ascii')]);
}
function stream(bytes,settings=''){
  return Buffer.concat([
    Buffer.from('<< /Length '+bytes.length+' '+settings+' >>\nstream\n','ascii'),
    bytes,
    Buffer.from('\nendstream','ascii')
  ]);
}
function line(value,x,y,font='F1',size=11){
  const text=value.replaceAll('\\','\\\\').replaceAll('(','\\(').replaceAll(')','\\)');
  return 'BT /'+font+' '+size+' Tf 1 0 0 1 '+x+' '+(792-y)+' Tm ('+text+') Tj ET';
}
const instructions=[
  '.7 .75 .79 RG 1 w 40 332 532 418 re S',
  line('Fictional Expense Report',56,83,'F1',20),
  line('GuideHollow teaching fixture - not real records',56,116,'F1',10),
  ...[['Month',56],['Travel',216],['Supplies',315],['Row total',425]].map(([label,x])=>line(label,x,153,'F2')),
  '.45 .5 .54 RG 56 625 m 552 625 l S',
];
for(const [i,row] of rows.entries()){
  const y=194+36*i;
  row.forEach((label,j)=>{if(label)instructions.push(line(label,[56,216,315,425][j],y));});
  instructions.push('.82 .85 .88 RG .6 w 56 '+(792-y-12)+' m 552 '+(792-y-12)+' l S');
}
instructions.push(line('Compare row values with the page image.',56,349,'F1',10));
instructions.push(line('OCR has not been performed on the image-only copy.',56,372,'F1',10));
const text=pdf([
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
  stream(Buffer.from(instructions.join('\n')+'\n','ascii')),
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
]);
const bitmap=Buffer.from(readFileSync(bitmapFile,'utf8').trim(),'base64');
if(bitmap.length<1000 || bitmap.length>10000)throw new Error('Bitmap preflight failed');
const image=pdf([
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im1 5 0 R >> >> /Contents 4 0 R >>',
  stream(Buffer.from('q 612 0 0 792 0 0 cm /Im1 Do Q\n','ascii')),
  stream(bitmap,'/Type /XObject /Subtype /Image /Width 918 /Height 1188 /ColorSpace /DeviceGray /BitsPerComponent 1 /Filter /FlateDecode'),
]);
mkdirSync(output,{recursive:true});
const manifest={
  description:'Two original fictional, one-page PDFs with the same displayed expense facts. Not AI, OCR, or customer data.',
  method:'Node.js built-ins; the raster is stored as a frozen compressed black-and-white bitmap.',
  files:[]
};
for(const [name,bytes,characters,images] of [
  ['fictional-expense-selectable-text.pdf',text,263,0],
  ['fictional-expense-image-only.pdf',image,0,1],
]){
  writeFileSync(join(output,name),bytes);
  manifest.files.push({
    name,bytes:bytes.length,
    sha256:createHash('sha256').update(bytes).digest('hex'),
    pages:1,
    expected_extracted_characters_without_ocr:characters,
    expected_embedded_images:images,
  });
}
writeFileSync(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Generated 2 fictional PDF examples and the evidence manifest.');
