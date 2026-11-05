import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

for (const frequency of ['routine', 'non_routine']) {
  test(`orphan card renders ${frequency} with its own heading and recipient data`, async () => {
    const texts = [], clears = [];
    class Image { naturalWidth = 2800; naturalHeight = 1980; async decode() {} }
    const context = {exports:{}, Image, Intl, Date};
    vm.runInNewContext(ts.transpileModule(readFileSync('modules/bantuan/api/santunan-card.ts','utf8'), {
      compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
    }).outputText,context);
    const canvas = {getContext:()=>({drawImage(){},scale(){},measureText:value=>({width:value.length*6}),
      fillText:value=>texts.push(value),fillRect:(...rect)=>clears.push(rect)})};
    await context.exports.renderSantunanCard(canvas,{category:'orphan',frequency,amount:300000,verifier:'Penyalur QA',recipient:'Penerima QA',date:'2026-11-05'});
    assert.ok(texts.includes('Rp 300.000'));
    assert.ok(texts.includes('Penyalur QA'));
    assert.ok(texts.includes('Penerima QA'));
    assert.ok(texts.includes('2026'));
    assert.equal(texts.includes('BANTUAN YATIM TIDAK RUTIN'),frequency==='non_routine');
    assert.equal(clears.length,frequency==='non_routine'?1:0);
    assert.equal(canvas.width,2800);
  });
}

test('print action covers both frequencies and transfer evidence input remains optional',()=>{
  const page=readFileSync('modules/bantuan/components/Santunan.tsx','utf8');
  assert.ok(page.includes('<Button variant="secondary" onClick={()=>setCard(row)}>Cetak kertas bantuan</Button>'));
  assert.doesNotMatch(page,/row.frequency==="routine"&&<Button[^>]*onClick=\{\(\)=>setCard/);
  const input=page.match(/<input name="transfer_receipt"[^>]*\/>/)[0];
  assert.doesNotMatch(input,/\brequired\b/);
  assert.match(page,/doc.kind==="transfer_receipt"\?"Foto bukti transfer"/);
});
