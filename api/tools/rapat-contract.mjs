/** Local-only private meeting module. Called by the parent OpenAPI exporter. */

export function applyRapatContract(document) {

  document.paths ??= {}; document.components ??= {}; document.components.schemas ??= {};

  const s = {type:'string'}, id = {type:'string',format:'uuid'}, version={type:'integer',minimum:1};

  const nullable = {type:['string','null']};

  const obj=(properties,required=Object.keys(properties))=>({type:'object',additionalProperties:false,properties,required});

  const arr=items=>({type:'array',items});

  const ref=name=>({$ref:'#/components/schemas/'+name});

  const institution=obj({name:{...s,maxLength:1000},heading:{...s,maxLength:2000},address:{...s,maxLength:2000}});

  const participant=obj({name:{...s,minLength:1,maxLength:255},position:{...nullable,maxLength:255}});

  const template={type:'string',enum:['dinas','berita_acara','guru','supervisi','organisasi']};

  const action=obj({task:{...s,minLength:1,maxLength:2000},assignee:{...nullable,maxLength:255},dueDate:{...nullable,format:'date'},status:{type:'string',enum:['open','done']}});

  const minutes=obj({summary:{...s,maxLength:50000},discussion:{...arr({...s,maxLength:10000}),maxItems:500},decisions:{...arr({...s,maxLength:10000}),maxItems:500},actions:{...arr(action),maxItems:500}});

  const media=obj({id,name:s,mime:s,size:{type:'integer',maximum:20971520},sequence:{type:'integer',minimum:1,maximum:500},transcribed:{type:'boolean'}});

  const metadata={title:{...s,minLength:1,maxLength:255},meetingDate:{...s,format:'date'},startTime:{...nullable,pattern:'^([01][0-9]|2[0-3]):[0-5][0-9]$'},endTime:{...nullable,pattern:'^([01][0-9]|2[0-3]):[0-5][0-9]$'},location:{...nullable,maxLength:1000},agenda:{...nullable,maxLength:20000},chair:{...nullable,maxLength:255},notetaker:{...nullable,maxLength:255},template,participants:{...arr(participant),maxItems:500},institution};

  const summary=obj({id,title:s,meetingDate:{...s,format:'date'},location:nullable,template,status:{type:'string',enum:['draft','processing','ready','failed']},archivedAt:{...nullable,format:'date-time'},createdBy:s,version,updatedAt:{...s,format:'date-time'},mediaCount:{type:'integer'},actionCount:{type:'integer'}});

  const segment=obj({start:{type:'number',minimum:0},end:{type:'number',minimum:0},text:s,speaker:nullable});

  const detail=obj({...summary.properties,...metadata,processingMode:{type:['string','null'],enum:['transcribe','minutes',null]},transcriptionProgress:{readOnly:true,anyOf:[{type:'null'},obj({phase:{type:'string',enum:['queued','processing','retrying','complete','failed']},completedParts:{type:'integer',minimum:0},processedAudioSeconds:{type:'number',minimum:0},chunkSeconds:{const:900}})]},transcript:{...s,maxLength:200000},segments:arr(segment),minutes,media:arr(media),error:nullable},[...summary.required,'participants','institution','transcript','segments','minutes','media','error']);

  const settings=obj({institution,participants:{...arr(participant),maxItems:500}});

  Object.assign(document.components.schemas,{RapatInstitution:institution,RapatMinutes:minutes,RapatMedia:media,RapatMeetingSummary:summary,RapatMeeting:detail,RapatSettings:settings});

  const common='Sanctum, active user and module.access:rapat required. Roles admin (including Core Superadmin), secretary (own meetings), viewer (read all, no mutations). All responses private, no-store. Sensitive payload and audio encrypted at rest. Local AI only; no paid/cloud fallback.';

  function add(path,method,title,result,input,status=200,extra={}) {

    const op={tags:['Rapat'],summary:title,description:common,security:[{bearerAuth:[]}],parameters:path.includes('{id}')?[{in:'path',name:'id',required:true,schema:id}]:[],responses:{[status]:{description:'Success',...(result?{content:{'application/json':{schema:obj({data:result})}}}:{})},401:{description:'Unauthenticated/inactive'},403:{description:'Module or role denied'},404:{description:'Missing or outside ownership scope'},409:{description:'Stale version, processing, archived or upload conflict'},422:{description:'Invalid fields, MIME, source or search bound'},503:{description:'Local AI or ZIP extension unavailable'}},...extra};

    if(input)op.requestBody={required:true,content:{'application/json':{schema:input}}};

    document.paths['/api/v1/rapat/'+path]??={};document.paths['/api/v1/rapat/'+path][method]=op;return op;

  }

  add('viewer','get','Current Rapat viewer and local AI readiness',obj({id:s,name:s,role:{type:'string',enum:['admin','secretary','viewer']},canManage:{type:'boolean'},ai:obj({provider:{const:'local'},configured:{type:'boolean'},transcriberReady:{type:'boolean'},summarizerReady:{type:'boolean'}},['provider','configured']),templates:arr(obj({id:template,name:s})),institution})).description+=' Health probe bounded by timeout and cached for 30 seconds.';

  const list=add('meetings','get','List authorized meetings',ref('RapatMeetingSummary'));

  list.parameters=[['q',{...s,maxLength:255}],['status',summary.properties.status],['from',{...s,format:'date'}],['to',{...s,format:'date'}],['archived',{type:'string',enum:['0','1'],default:'0'}],['page',{type:'integer',minimum:1,maximum:100000,default:1}],['perPage',{type:'integer',minimum:1,maximum:100,default:25}]].map(([name,schema])=>({name,in:'query',schema}));

  list.responses[200].content['application/json'].schema=obj({data:arr(ref('RapatMeetingSummary')),meta:obj({total:{type:'integer',minimum:0},currentPage:version,lastPage:version,perPage:version})});

  list.description+=' Search decrypts only authorized rows after filters; maximum 5000 candidate meetings, otherwise 422 requests a narrower date range. Searches title, agenda, transcript and minutes.';

  add('meetings','post','Create a meeting',ref('RapatMeeting'),obj(metadata,['title','meetingDate','template','participants','institution']),201);

  add('meetings/{id}','get','Read private meeting detail',ref('RapatMeeting'));

  add('meetings/{id}','put','Correct meeting metadata transcript or minutes',ref('RapatMeeting'),obj({version,...metadata,transcript:{...s,maxLength:200000},minutes},['version'])).description+=' Partial metadata updates by explicit v1 contract. Omitted fields retained. Transcript corrections clear segments; manual content retained until explicit generation. Processing/archived meetings cannot be changed.';

  const upload=add('meetings/{id}/media','post','Upload an encrypted audio part',ref('RapatMedia'),null,201);

  upload.requestBody={required:true,content:{'multipart/form-data':{schema:obj({file:{type:'string',format:'binary'},clientId:id,sequence:{type:'integer',minimum:1,maximum:500}})}}};

  upload.description+=' Maximum 20 MiB each, 500 active parts. Server MIME and extension must match WAV, MP3, M4A/MP4, OGG, WebM or FLAC. clientId UUID scoped to meeting; exact content/sequence replay returns same media; conflicting or deleted key reuse 409. Sequence unique among active parts. Re-fetch detail for current version.';

  add('media/{id}','delete','Soft-delete private audio',null,obj({version}),204);

  const audio=add('media/{id}','get','Play private audio',null);

  audio.responses[200]={description:'Decrypted audio, private no-store; no storage path',content:{'audio/*':{schema:{type:'string',format:'binary'}}}};

  add('meetings/{id}/transcribe','post','Queue audio transcription without changing minutes',ref('RapatMeeting'),obj({version}),202).description+=' Requires the transcriber only; a missing summarizer does not block transcription. Requires existing audio and current version. Uses rapat-transcription-v2 on the rapat database connection, one streaming window of at most 900 audio seconds per job. Encrypted checkpoints, fenced continuation tokens, bounded automatic retries and scheduler recovery preserve completed work across interruptions. Preserves minutes and workflow finalization; terminal result is ready or failed, partial transcripts persist. Explicit ready regeneration refreshes audio transcripts; failed retries reuse compatible audio cache. Processing mode is read-only.';

  add('meetings/{id}/generate','post','Queue explicit local generation or retry',ref('RapatMeeting'),obj({version,useTranscript:{type:'boolean'}}),202).description+=' Requires the summarizer for useTranscript=true, both engines for useTranscript=false, and nonempty transcript or audio. Dedicated durable rapat connection/table rapat_jobs, queue rapat, timeout 3600, tries 1. Token and atomic processing claim reject stale/duplicate work; Successful audio transcripts are reused on failed retries only when model and decoding-pipeline revisions match. An explicit regeneration from ready with useTranscript=false retranscribes all audio; changing the model invalidates prior cached transcripts. Audio without usable speech fails safely without generating minutes. Generic safe errors; no raw model output errors. Manual minutes replaced only after successful explicit generation.';

  add('meetings/{id}/archive','post','Archive or restore a meeting',ref('RapatMeeting'),obj({version,archived:{type:'boolean'}}));

  for(const method of ['get','put'])add('settings',method,'Administrator institution and participant defaults',ref('RapatSettings'),method==='put'?settings:null).description+=' Admin only.';

  const docx=add('meetings/{id}/docx','get','Export private OOXML minutes',null);

  docx.responses[200]={description:'Real escaped OOXML with institution, metadata, attendance, minutes, actions and signature lines. Requires PHP ZIP; 503 if unavailable.',content:{'application/vnd.openxmlformats-officedocument.wordprocessingml.document':{schema:{type:'string',format:'binary'}}}};

  // Manual records are independent from the optional local AI auxiliary panel.

  const workflow={type:'string',enum:['draft','finalized']};

  participant.properties.attendance={type:'string',enum:['present','absent','excused'],default:'present'};

  participant.required.push('attendance');

  const participantInput={...participant,required:participant.required.filter(k=>k!=='attendance')};

  metadata.participants={...metadata.participants,items:participantInput};

  document.paths['/api/v1/rapat/settings'].put.requestBody.content['application/json'].schema=obj({institution,participants:{...arr(participantInput),maxItems:500}});

  document.paths['/api/v1/rapat/meetings'].post.requestBody.content['application/json'].schema.properties.participants=metadata.participants;

  document.paths['/api/v1/rapat/meetings/{id}'].put.requestBody.content['application/json'].schema.properties.participants=metadata.participants;

  for(const schema of [summary,detail]) {

    Object.assign(schema.properties,{workflowStatus:workflow,finalizedAt:{...nullable,format:'date-time'},createdAt:{...s,format:'date-time'},participantCount:{type:'integer',minimum:0},decisionCount:{type:'integer',minimum:0},doneActionCount:{type:'integer',minimum:0},overdueActionCount:{type:'integer',minimum:0}});

    schema.required=[...new Set([...schema.required,'workflowStatus','finalizedAt','createdAt','participantCount','decisionCount','doneActionCount','overdueActionCount'])];

  }

  detail.properties.historyAvailable={const:true};detail.required.push('historyAvailable');

  const create=document.paths['/api/v1/rapat/meetings'].post;

  Object.assign(create.requestBody.content['application/json'].schema.properties,{minutes,transcript:{...s,maxLength:200000}});

  create.description+=' Optional manual minutes/transcript are saved directly on create; no AI probe, audio or later PUT is needed. Creates draft workflow and a genuine creation revision. Existing legacy records are not backfilled.';

  list.parameters.push({name:'workflowStatus',in:'query',schema:workflow});

  list.responses[200].content['application/json'].schema.properties.meta.properties.stats=obj({total:{type:'integer',minimum:0},draft:{type:'integer',minimum:0},finalized:{type:'integer',minimum:0},openActions:{type:'integer',minimum:0},overdueActions:{type:'integer',minimum:0}});

  list.responses[200].content['application/json'].schema.properties.meta.required.push('stats');

  list.description+=' Stats use the entire authorized filtered set before pagination; all scans bound to 5000 authorized candidates. Workflow filter independent of AI status. Overdue uses Asia/Jakarta calendar, excludes due today and done tasks.';

  document.paths['/api/v1/rapat/viewer'].get.description=common+' Reads cached readiness only, defaults configured=false; never starts Python or calls HTTP. Fetch ai/status only when opening AI settings/panel.';

  add('ai/status','get','Explicitly probe optional local AI readiness',obj({provider:{const:'local'},configured:{type:'boolean'},transcriberReady:{type:'boolean'},summarizerReady:{type:'boolean'}},['provider','configured'])).description+=' All authorized readers. Bounded health probe cached 30 seconds. Manual endpoints never require this probe.';

  const snapshot=obj({metadata:obj({...metadata,participants:{...metadata.participants,items:participant}}),minutes,workflowStatus:workflow,finalizedAt:{...nullable,format:'date-time'},transcript:s,segments:arr(segment),archivedAt:{...nullable,format:'date-time'}});

  const history=obj({id,version,action:{type:'string',enum:['create','update','finalize','reopen','task_status','ai_generate','ai_transcribe','archive','attachment_added','attachment_removed']},actor:obj({id:nullable,name:s}),createdAt:{...s,format:'date-time'},changedFields:arr(s),reason:nullable,before:{anyOf:[snapshot,{type:'null'}]},after:snapshot});

  Object.assign(document.components.schemas,{RapatHistoryEntry:history,RapatHistorySnapshot:snapshot});

  const historyOp=add('meetings/{id}/history','get','Read immutable encrypted meeting revisions',history);

  historyOp.parameters.push({name:'page',in:'query',schema:{type:'integer',minimum:1,maximum:100000,default:1}});

  const pagination=obj({total:{type:'integer',minimum:0},currentPage:version,lastPage:version,perPage:version});

  historyOp.responses[200].content['application/json'].schema=obj({data:arr(ref('RapatHistoryEntry')),meta:pagination});

  historyOp.description+=' Same meeting read scope, 20 revisions per page ordered by version descending. No fabricated legacy history; before=null on genuine create. Actor id=null/name=AI lokal for completed AI job; never attributes AI edits to meeting creator. Snapshots include full metadata/minutes plus transcript/segments and lifecycle state, encrypted at rest. No tokens or storage paths.';

  const finalize=add('meetings/{id}/finalize','post','Finalize or explicitly reopen manual minutes',ref('RapatMeeting'),obj({version,finalized:{type:'boolean'},reason:{...nullable,maxLength:2000}},['version','finalized']));

  finalize.description+=' Writer scope, optimistic lock. Finalizing requires at least one summary/discussion/decision entry containing 10 letters/digits, and each action must have a nonblank assignee (422 minutes.actions.N.assignee); deadline optional. Reopening requires a trimmed reason of 10–2000 characters. No AI dependency. Finalized locks metadata/minutes/transcript/media/attachments/generation; archive/restore and dedicated task status are still allowed. Processing and archived records cannot finalize/reopen.';

  const actionOp=add('meetings/{id}/actions/{index}','put','Set a task status with an audited version lock',ref('RapatMeeting'),obj({version,status:{type:'string',enum:['open','done']}}));

  actionOp.parameters.push({name:'index',in:'path',required:true,schema:{type:'integer',minimum:0}});

  actionOp.description+=' Zero-based index in current minutes.actions. Same admin/own secretary writer policy, including finalized AND archived records; processing disallowed. Entire meeting version must match before resolving index, so stale/reordered lists return409. Only status changes; content remains frozen. Creates encrypted history.';

  const task=obj({meetingId:id,meetingTitle:s,meetingDate:{...s,format:'date'},index:{type:'integer',minimum:0},task:s,assignee:nullable,dueDate:{...nullable,format:'date'},status:{type:'string',enum:['open','done']},version,canEdit:{type:'boolean'},workflowStatus:workflow,archivedAt:{...nullable,format:'date-time'}});

  document.components.schemas.RapatTask=task;

  const tasks=add('tasks','get','List scoped actions across active and archived meetings',task);

  tasks.parameters=[['q',{...s,maxLength:255}],['status',{type:'string',enum:['open','done','overdue','all'],default:'all'}],['assignee',{...s,maxLength:255}],['from',{...s,format:'date'}],['to',{...s,format:'date'}],['workflowStatus',workflow],['archived',{type:'string',enum:['0','1','all'],default:'all'}],['page',{type:'integer',minimum:1,maximum:100000,default:1}],['perPage',{type:'integer',minimum:1,maximum:100,default:25}]].map(([name,schema])=>({name,in:'query',schema}));

  tasks.responses[200].content['application/json'].schema=obj({data:arr(ref('RapatTask')),meta:pagination});

  tasks.description+=' Includes archived and active by default (archived=all); 0 excludes archived, 1 archived only. q matches meeting title/task/assignee, assignee case-insensitive substring. from/to inclusive task dueDate, excluding no-deadline tasks when used. Overdue means open with dueDate strictly before today in Asia/Jakarta. Ordered meetingDate descending, meeting ID, then task index. Bounded encrypted scan of at most5000 authorized meetings. canEdit false for viewers/processing; finalized and archived statuses remain editable by owner/admin.';

  const attachment=obj({id,name:s,mime:s,size:{type:'integer'},createdAt:{...s,format:'date-time'}});

  document.components.schemas.RapatAttachment=attachment;

  add('meetings/{id}/attachments','get','List private supporting documents',arr(ref('RapatAttachment')));

  const attachmentUpload=add('meetings/{id}/attachments','post','Upload an encrypted supporting document',ref('RapatAttachment'),null,201);

  attachmentUpload.requestBody={required:true,content:{'multipart/form-data':{schema:obj({file:{type:'string',format:'binary'},version})}}};

  attachmentUpload.description+=' Writer scope and meeting version; finalized/processing/archived disallowed. Maximum 10 MiB per nonempty file, 50 active documents per meeting. PDF, JPG/JPEG, PNG, WEBP, TXT, CSV, DOCX, XLSX, PPTX only; server MIME/extension and OOXML container validation reject malformed and macro content. Private encrypted storage; MIME and extension validated. Re-fetch meeting version. Attachment metadata changes audited. No private paths returned.';

  const download=add('attachments/{id}','get','Download an authorized supporting document',null);

  download.responses[200]={description:'Private document download, no-store, nosniff, never HTML inline',content:{'application/octet-stream':{schema:{type:'string',format:'binary'}}}};

  add('attachments/{id}','delete','Remove a supporting document with audited version',null,obj({version}),204).description+=' Writer scope; finalized/processing/archived disallowed. Re-fetch meeting version.';

  for(const route of ['meetings/{id}','media/{id}','meetings/{id}/generate','meetings/{id}/transcribe'])for(const [method,op] of Object.entries(document.paths['/api/v1/rapat/'+route]))if(['put','delete','post'].includes(method))op.description+=' Finalized workflow locks this operation until explicit reopen.';

  document.paths['/api/v1/rapat/meetings/{id}'].put.description+=' Timestamp segments retained when submitted transcript is unchanged; clear only for actual transcript text corrections.';

  docx.responses[200].description+=' Manual export requires no AI; labels DRAF/FINAL, finalization date in Asia/Jakarta WIB, participant attendance Hadir/Tidak hadir/Izin, explicit unrecorded-section placeholders; plaintext XML escaped.';

  // Current Rapat scope: audio and transcription only. Keep legacy response fields read-only.
  for (const suffix of ['settings','tasks','meetings/{id}/history','meetings/{id}/finalize','meetings/{id}/actions/{index}','meetings/{id}/generate','meetings/{id}/docx','meetings/{id}/attachments','attachments/{id}']) {
    for (const op of Object.values(document.paths['/api/v1/rapat/'+suffix])) {
      op.deprecated=true;
      op.summary='Removed Rapat capability';
      op.description=common+' Removed in the transcription-only workspace. Always returns 410 for authorized module users, without reading or changing legacy records or files.';
      delete op.requestBody;
      op.responses={401:{description:'Unauthenticated'},403:{description:'Module or role denied'},410:{description:'Feature removed; use recording and transcription instead'}};
    }
  }
  for (const method of ['post','put']) {
    const op=method==='post'?create:document.paths['/api/v1/rapat/meetings/{id}'].put;
    const schema=op.requestBody.content['application/json'].schema;
    delete schema.properties.minutes;
    schema.properties.title={...nullable,maxLength:255};
    schema.properties.meetingDate={...nullable,format:'date'};
    schema.properties.participants={type:'array',maxItems:500,items:obj({name:{...nullable,maxLength:255},position:{...nullable,maxLength:255},attendance:{type:'string',enum:['present','absent','excused']}},[])};
    schema.required=method==='post'?[]:['version'];
    op.description=common+' All meeting metadata and participants optional. Blank participant rows ignored. Create supplies a generated title, Jakarta current date, empty participants and internal document defaults. Blank title/date on update retain existing values. Legacy minutes remain unchanged and cannot be supplied (410). Transcript edits clear timestamps only when text actually changes. Processing/archived locks and optimistic version checks remain; legacy finalization does not block transcription or metadata edits.';
    op.responses[410]={description:'Manual minutes are removed'};
  }
  for(const key of ['ready','processing','failed']) list.responses[200].content['application/json'].schema.properties.meta.properties.stats.properties[key]={type:'integer',minimum:0};
  list.responses[200].content['application/json'].schema.properties.meta.properties.stats.required.push('ready','processing','failed');
  list.description=common+' Scoped search over title, agenda and transcript only. All statistics are computed over the full filtered set before pagination; ready/processing/failed refer to transcription status. Legacy workflow statistics remain for compatibility.';
  detail.properties.historyAvailable={const:false};
  detail.properties.minutes={...minutes,readOnly:true,description:'Preserved legacy data; minutes feature removed.'};
  document.paths['/api/v1/rapat/ai/status'].get.description=common+' Whisper readiness only, cached for 30 seconds; configured equals transcriberReady and summarizerReady is always false. No Ollama or summarizer request.';
  document.paths['/api/v1/rapat/viewer'].get.description=common+' Cached readiness only; no AI probe or retired settings lookup.';
  document.paths['/api/v1/rapat/meetings/{id}/transcribe'].post.description=common+' Requires audio and ready transcriber only. Durable 15-minute chunks, automatic resume and one combined transcript; no summarizer dispatch, including legacy in-flight generation. Finalized legacy workflow does not lock transcription; archive/processing locks, writer ownership and versions remain. Legacy data preserved.';

  return document;

}
