import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const read = path => readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
function load(path, globals = {}) { const exports = {}; vm.runInNewContext(ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>name==='../api/workflow'?load('modules/rapat/api/workflow.ts'):require(name),Blob,setTimeout,clearTimeout,...globals});return exports; }
test('manual finalization needs substantive minutes and each task PIC, never audio or AI',() => {
  const {emptyMinutes,finalizeIssues,cleanMinutes}=load('modules/rapat/api/workflow.ts');
  assert.equal(finalizeIssues(emptyMinutes()).length,1);
  assert.equal(finalizeIssues({...emptyMinutes(),summary:'... ok'}).length,1);
  const minutes={summary:'Kesepakatan jadwal kegiatan',discussion:[],decisions:[],actions:[{task:'Susun jadwal',assignee:'  ',dueDate:null,status:'open'}]};
  assert.match(finalizeIssues(minutes)[0],/penanggung jawab/);
  assert.equal(finalizeIssues({...minutes,actions:[{...minutes.actions[0],assignee:'Tim acara'}]}).length,0);
  assert.equal(finalizeIssues({...emptyMinutes(),discussion:['Topik dibahas']} ).length,0);
  assert.deepEqual(Array.from(cleanMinutes({...minutes,discussion:['','Pokok bahasan','  ']}).discussion),['Pokok bahasan']);
});
test('minutes editor preserves real line breaks as separate discussion and decision points',()=>{
  const Editor=load('modules/rapat/components/minutes.tsx').default;
  const value={summary:'Rapat',discussion:['Poin satu','Poin dua'],decisions:[],actions:[]};let changed;
  const tree=Editor({value,onChange:next=>{changed=next;},disabled:false,includeActions:false});
  const fields=[];const visit=node=>{if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(visit);return;}if(node.type==='textarea')fields.push(node);visit(node.props?.children);};visit(tree);
  assert.equal(fields[1].props.value,'Poin satu\nPoin dua');
  fields[1].props.onChange({target:{value:'Satu\nDua\nTiga'}});assert.deepEqual(Array.from(changed.discussion),['Satu','Dua','Tiga']);
});
test('overdue task dates use due dates, exclude completed and never require a deadline',() => {
  const {isOverdue}=load('modules/rapat/api/workflow.ts');
  assert.equal(isOverdue('2026-11-19','open','2026-11-20'),true);
  assert.equal(isOverdue('2026-11-20','open','2026-11-20'),false);
  assert.equal(isOverdue('2026-11-19','done','2026-11-20'),false);
  assert.equal(isOverdue(null,'open','2026-11-20'),false);
});
test('422 retains field-level backend validation for a readable error summary',async()=>{
  const {request,RequestError}=load('modules/rapat/api/client.ts',{Headers,FormData,fetch:async()=>({ok:false,status:422,json:async()=>({message:'The given data was invalid.',errors:{'minutes.actions.0.assignee':['Penanggung jawab wajib diisi.']}})})});
  await assert.rejects(request('meetings/id/finalize',{method:'POST',body:'{}'}),error=>{assert.ok(error instanceof RequestError);assert.equal(error.fields['minutes.actions.0.assignee'][0],'Penanggung jawab wajib diisi.');assert.doesNotMatch(error.message,/given data/);return true;});
  const {fieldLabel}=load('modules/rapat/api/workflow.ts');
  assert.equal(fieldLabel('minutes.actions.0.assignee'),'Tindak lanjut 1 · PIC');assert.equal(fieldLabel('participants.1.attendance'),'Peserta 2 · Kehadiran');
});
test('print blank sections are explicit and do not create empty tables',()=>{
  const PrintDocument=load('modules/rapat/components/print-document.tsx').default;
  const meeting={title:'Rapat manual',workflowStatus:'finalized',status:'draft',finalizedAt:'2026-11-20T09:00:00Z',institution:{name:'Instansi',heading:'',address:''},meetingDate:'2026-11-20',participants:[],minutes:{summary:'Rangkuman manual',discussion:[],decisions:[],actions:[]}};
  const html=renderToStaticMarkup(React.createElement(PrintDocument,{meeting}));
  assert.match(html,/FINAL/);assert.doesNotMatch(html,/DRAF|<table/);assert.match(html,/Tidak ada keputusan yang dicatat/);assert.match(html,/Tidak ada peserta yang dicatat/);
});
test('recording queue retains failed audio and retries with the same id until acknowledged',async () => {
  const {deliverClip} = load('modules/rapat/components/queue.ts');
  const rows = new Map(); const events = [];
  const store = {put:async clip => {events.push('persist');rows.set(clip.clientId,clip);},remove:async id => {events.push('remove');rows.delete(id);}};
  const clip = {clientId:'stable-id',ownerId:'user-1',meetingId:'meeting-1',sequence:2,blob:new Blob(['audio']),name:'record.webm'};
  await assert.rejects(deliverClip(clip,'user-1',async () => {events.push('send');throw new Error('offline');},store),/offline/);
  assert.equal(rows.get('stable-id'),clip);assert.deepEqual(events,['persist','send']);
  await deliverClip(rows.get('stable-id'),'user-1',async sent => {assert.equal(sent.clientId,'stable-id');assert.equal(rows.size,1);events.push('ack');},store);
  assert.equal(rows.size,0);assert.deepEqual(events,['persist','send','persist','ack','remove']);
});
test('failed local persistence never claims successful delivery',async () => {
  const {deliverClip} = load('modules/rapat/components/queue.ts');let sent=false;
  await assert.rejects(deliverClip({ownerId:'user-1'},'user-1',async () => {sent=true;},{put:async () => {throw new Error('quota');},remove:async () => {throw new Error('unexpected');}}),/quota/);assert.equal(sent,false);
});
test('shared browser queue never restores or delivers another account audio or legacy unowned audio',async () => {
  const {ownedClips,deliverClip}=load('modules/rapat/components/queue.ts');
  const rows=[{clientId:'a',ownerId:'alice',meetingId:'same-meeting'},{clientId:'b',ownerId:'bob',meetingId:'same-meeting'},{clientId:'old',meetingId:'same-meeting'},{clientId:'c',ownerId:'alice',meetingId:'other-meeting'}];
  assert.deepEqual(Array.from(ownedClips(rows,'alice','same-meeting'),c=>c.clientId),['a']);
  assert.deepEqual(Array.from(ownedClips(rows,'bob','same-meeting'),c=>c.clientId),['b']);
  let sent=false;let persisted=false;
  const store={put:async()=>{persisted=true;},remove:async()=>assert.fail('must retain foreign clip')};
  for(const clip of [rows[0],rows[2]]) await assert.rejects(deliverClip(clip,'bob',async()=>{sent=true;},store),/bukan milik akun aktif/);
  assert.equal(sent,false);assert.equal(persisted,false);
  const recorder=read('modules/rapat/components/recorder.tsx');
  assert.match(recorder,/request<Viewer>\('viewer'\)/);assert.match(recorder,/String\(current.id\) !== ownerId/);assert.match(recorder,/tidak terenkripsi/);
});
test('sixty second clips are finalized by stop and a fresh recorder uses the same stream',() => {
  let timer; let duration; const recorders=[]; const clips=[];let stopped=0;
  class FakeRecorder { constructor(stream) {this.stream=stream;this.mimeType='audio/webm';this.state='inactive';recorders.push(this);}start(...args){assert.equal(args.length,0);this.state='recording';}stop(){this.state='inactive';this.ondataavailable({data:new Blob(['complete-container'])});this.onstop();} }
  const {recordClips} = load('modules/rapat/components/queue.ts',{setTimeout:(fn,ms)=>{timer=fn;duration=ms;return 1;},clearTimeout:()=>{}});
  const stream = {getTracks:()=>[{stop:()=>stopped++,addEventListener:()=>{}}]};
  const stop = recordClips(stream,clip => clips.push(clip),error => assert.fail(error),FakeRecorder);
  assert.equal(duration,60000);assert.equal(clips.length,0);timer();assert.equal(clips.length,1);assert.equal(clips[0].size,18);assert.equal(recorders.length,2);assert.equal(recorders[1].stream,stream);
  stop();assert.equal(clips.length,2);assert.equal(recorders.length,2);assert.equal(stopped,1);
});
test('interrupted microphone stops cycling and asks for manual continuation',() => {
  let ended;let error;let timer;let count=0;
  class Recorder {constructor(){count++;this.mimeType='audio/webm';}start(){this.state='recording';}stop(){this.state='inactive';this.onstop();}}
  const {recordClips} = load('modules/rapat/components/queue.ts',{setTimeout:fn=>{timer=fn;return 1;},clearTimeout:()=>{}});
  recordClips({getTracks:()=>[{stop(){},addEventListener:(_name,fn)=>{ended=fn;}}]},()=>{},value=>{error=value;},Recorder);
  ended();assert.match(error,/Mikrofon terputus/);timer();assert.equal(count,1);
});
test('manual stop remains finalizing until the final asynchronous clip has arrived',() => {
  const events=[];const instances=[];
  class AsyncRecorder {constructor(){instances.push(this);this.mimeType='audio/webm';}start(){this.state='recording';}stop(){this.state='inactive';}}
  const {recordClips}=load('modules/rapat/components/queue.ts',{setTimeout:()=>1,clearTimeout:()=>{}});
  const stop=recordClips({getTracks:()=>[{stop(){},addEventListener(){}}]},()=>events.push('clip'),error=>assert.fail(error),AsyncRecorder,()=>events.push('stopped'));
  stop();assert.deepEqual(events,[]);const recorder=instances[0];
  recorder.ondataavailable({data:new Blob(['last audio'])});recorder.onstop();
  assert.deepEqual(events,['clip','stopped']);
  assert.match(read('modules/rapat/components/recorder.tsx'),/requesting \|\| finalizing/);
});
test('unexpected recorder stop preserves its audio without silently starting another recorder',() => {
  const instances=[];let count=0;const events=[];
  class Recorder {constructor(){instances.push(this);count++;this.mimeType='audio/webm';}start(){this.state='recording';}}
  const {recordClips}=load('modules/rapat/components/queue.ts',{setTimeout:()=>1,clearTimeout:()=>{}});
  recordClips({getTracks:()=>[{stop(){},addEventListener(){}}]},()=>events.push('clip'),()=>events.push('error'),Recorder,()=>events.push('stopped'));
  const recorder=instances[0];recorder.ondataavailable({data:new Blob(['retained'])});recorder.state='inactive';recorder.onstop();
  assert.equal(count,1);assert.deepEqual(events,['clip','error','stopped']);
});
test('viewer cannot create/edit and secretary can edit only their own meeting',() => {
  const {canEdit,canCreate}=load('modules/rapat/api/policy.ts');
  for (const role of ['admin','secretary','viewer']) for(const owner of ['self','other']) {
    const viewer={id:'self',role,canManage:true};
    assert.equal(canEdit(viewer,{createdBy:owner}),role==='admin'||role==='secretary'&&owner==='self');assert.equal(canCreate(viewer),role!=='viewer');
  }
});
test('print renders full attendance, actions and signatures while escaping untrusted text',() => {
  const PrintDocument=load('modules/rapat/components/print-document.tsx').default;
  const unsafe='<script>alert("private")</script>';
  const meeting={title:unsafe,status:'ready',workflowStatus:'draft',createdAt:'2026-11-20T08:00:00Z',updatedAt:'2026-11-20T09:00:00Z',version:2,institution:{name:unsafe,heading:'Kop',address:'Alamat'},meetingDate:'2026-11-20',startTime:'09:00',endTime:'10:00',location:'Ruang A',agenda:unsafe,chair:'Ketua',notetaker:'Notulis',participants:[{name:unsafe,position:'Anggota'},{name:'Peserta kedua',position:'Guru',attendance:'excused'}],minutes:{summary:unsafe,discussion:[unsafe],decisions:['Sepakat'],actions:[{task:unsafe,assignee:'Tim',dueDate:'2026-11-21',status:'open'}]}};
  const html=renderToStaticMarkup(React.createElement(PrintDocument,{meeting}));
  assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);assert.match(html,/Peserta kedua/);assert.match(html,/Tanda tangan/);assert.match(html,/21 Nov 2026/);assert.match(html,/DRAF/);assert.match(html,/Pimpinan rapat/);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(PrintDocument,{meeting:{...meeting,status:'draft',workflowStatus:'finalized',finalizedAt:'2026-11-20T09:00:00Z'}})),/DRAF/);
});
test('polling protects unsaved drafts, cookie media and backend DOCX stay private',() => {
  const detail=read('modules/rapat/pages/detail.tsx');
  assert.match(detail,/if\(!dirtyRef.current\)setDraft\(next\)/);assert.match(detail,/meeting\?\.status!=='processing'/);assert.match(detail,/canEdit\(viewer,meeting\)/);assert.match(detail,/version:meeting.version/);assert.match(read('modules/rapat/components/auxiliary.tsx'),/\/api\/rapat\/media\//);assert.match(detail,/\/docx/);
  assert.doesNotMatch(detail,/dangerouslySetInnerHTML|speechRecognition|api.openai.com/);
  assert.match(read('modules/rapat/workspace.css'),/@page\{size:A4/);
});
