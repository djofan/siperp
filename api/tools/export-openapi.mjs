import { readFileSync, writeFileSync } from 'node:fs';

// Preserve the existing partial Core/Academy contract as the baseline. Module
// additions live here; openapi.json is generated, never edited by hand.
const document = JSON.parse(readFileSync(new URL('../docs/openapi.base.json', import.meta.url), 'utf8'));
const image = {
  type: ['string', 'null'], maxLength: 191,
  pattern: '^/uploads/sarsip/[a-fA-F0-9-]{36}\\.(?:jpg|png|webp)$',
  description: 'Image URL returned by the authenticated SARSIP upload endpoint. Null uses the built-in illustration. Omission on update preserves the saved photo for older clients.',
};
const fields = {
  headline: { type: 'string', minLength: 1, maxLength: 191 },
  description: { type: 'string', minLength: 1, maxLength: 10000 },
  contact: { type: ['string', 'null'], maxLength: 191 },
  heroImage: image,
};
document.components.schemas.SarsipProfile = {
  type: 'object', additionalProperties: false,
  required: ['id', ...Object.keys(fields)],
  properties: { id: { type: 'string' }, ...fields },
};
document.components.schemas.SarsipProfileUpdate = {
  type: 'object', required: ['headline', 'description'], properties: fields,
};
const json = schema => ({ 'application/json': { schema } });
const error = { description: 'Request rejected', content: json({ $ref: '#/components/schemas/Error' }) };
document.paths['/api/v1/sarsip/profile'] = {
  get: {
    summary: 'Read public SARSIP profile and hero image', security: [],
    responses: {
      200: { description: 'Public profile', content: json({
        type: 'object', required: ['data'], additionalProperties: false,
        properties: { data: { $ref: '#/components/schemas/SarsipProfile' } },
      }) },
      403: error,
    },
  },
  put: {
    summary: 'Save SARSIP profile and optional hero image',
    description: 'Requires an active user with SARSIP access. Older clients may omit heroImage to keep the current photo; send null to return to the built-in illustration.',
    requestBody: { required: true, content: json({ $ref: '#/components/schemas/SarsipProfileUpdate' }) },
    responses: {
      200: { description: 'Saved', content: json({ type: 'object', required: ['ok'], properties: { ok: { const: true } } }) },
      401: error, 403: error, 422: error,
    },
  },
};
document.components.schemas.BantuanMobileLogin = {
  type: 'object', required: ['code', 'password'],
  properties: {
    code: { type: 'string', minLength: 3, maxLength: 32, pattern: '^[a-zA-Z0-9][a-zA-Z0-9_-]{2,31}$', description: 'Existing ERP account code; outer whitespace is trimmed and lookup is case-insensitive.' },
    password: { type: 'string', minLength: 1, maxLength: 72, writeOnly: true },
  },
};
document.components.schemas.BantuanMobileToken = {
  type: 'object', required: ['data'], additionalProperties: false,
  properties: { data: {
    type: 'object', required: ['token', 'expires_at'], additionalProperties: false,
    properties: { token: { type: 'string', minLength: 1 }, expires_at: { type: 'string', format: 'date-time' } },
  } },
};
document.paths['/api/v1/bantuan/mobile/login'] = { post: {
  summary: 'Log in to Bantuan mobile using an existing ERP account', security: [],
  description: 'Core credentials and live Bantuan module access are checked before issuing a bantuan-mobile Sanctum token. Expiration follows Core TokenIssuer. No session cookie is created or changed. Use the token as Bearer authorization on the existing Bantuan notifications endpoint. Uses the shared throttle:login limiter (5 attempts per minute per normalized account code and IP).',
  requestBody: { required: true, content: json({ $ref: '#/components/schemas/BantuanMobileLogin' }) },
  responses: {
    200: { description: 'Mobile token issued', headers: { 'Cache-Control': { required: true, schema: { type: 'string', pattern: '(^|,\\s*)no-store(,|$)' } } }, content: json({ $ref: '#/components/schemas/BantuanMobileToken' }) },
    401: error, 403: error, 422: error,
    429: { ...error, headers: { 'Retry-After': { required: true, schema: { type: 'string' } } } },
  },
} };

// Bantuan mobile push registration and session lifecycle.
const mobileNoContent = { description: 'Completed; empty response body' };
document.paths['/api/v1/bantuan/mobile/devices'] = {
  post: {
    summary: 'Register or rotate the current mobile sessions FCM device',
    description: 'Requires bantuan-mobile Sanctum token, active user and live Bantuan access. Device token is encrypted at rest. Upsert is idempotent; no token is returned.',
    requestBody: { required: true, content: json({ type: 'object', required: ['token'], properties: { token: { type: 'string', minLength: 1, maxLength: 4096, writeOnly: true } } }) },
    responses: { 204: mobileNoContent, 401: error, 403: error, 422: error, 429: error },
  },
  delete: { summary: 'Unregister devices belonging to the current mobile session', responses: { 204: mobileNoContent, 401: error, 403: error, 429: error } },
};
document.paths['/api/v1/bantuan/mobile/session'] = {
  delete: { summary: 'Revoke the current mobile session and remove its devices', description: 'Requires a bantuan-mobile Sanctum token. Logout remains available after module access is revoked.', responses: { 204: mobileNoContent, 401: error, 403: error } },
};


document.paths['/api/v1/bantuan/santunan/periods'] = {post:{tags:['Bantuan'],summary:'Buat santunan rutin bulan berikutnya',description:'Admin/bendahara saja. Seluruh rutin bulan sumber disalin secara atomik; tidak rutin, laporan dan foto tidak disalin. Tujuan yang sudah memiliki rutin ditolak.',security:[{bearerAuth:[]}],requestBody:{required:true,content:{'application/json':{schema:{type:'object',required:['sourcePeriod'],properties:{sourcePeriod:{type:'string',pattern:'^[0-9]{4}-(0[1-9]|1[0-2])$'}}}}}},responses:{'201':{description:'Periode dibuat',headers:{Location:{schema:{type:'string'}}},content:{'application/json':{schema:{type:'object',required:['data'],properties:{data:{type:'object',required:['period','createdCount'],properties:{period:{type:'string'},createdCount:{type:'integer',minimum:1}}}}}}}},'403':{description:'Peran tidak diizinkan'},'409':{description:'Rutin bulan tujuan sudah ada'},'422':{description:'Input invalid, sumber kosong, atau penyalur tidak aktif'}}}};
// Cookie-authenticated PWA registrations remain separate from native mobile sessions.
const pwaContext = {type:'object',required:['enabled','registered','userId','binding','firebase','vapidKey'],additionalProperties:false,properties:{
  enabled:{type:'boolean'},registered:{type:'boolean'},userId:{type:'string'},binding:{type:'string',pattern:'^[a-f0-9]{64}$'},
  firebase:{anyOf:[{type:'null'},{type:'object',required:['apiKey','projectId','messagingSenderId','appId'],additionalProperties:false,properties:{apiKey:{type:'string'},projectId:{type:'string'},messagingSenderId:{type:'string'},appId:{type:'string'}}}]},
  vapidKey:{type:['string','null']},
}};
document.paths['/api/v1/bantuan/pwa/push-context']={get:{summary:'Read public Firebase Web config and current PWA session binding',description:'Requires next-server session, active user and Bantuan access. No Sanctum token, service-account key or server file path is returned. Cookie callers use the normal Core session.',responses:{200:{description:'Private context; no-store',headers:{'Cache-Control':{schema:{type:'string'}}},content:json({type:'object',required:['data'],properties:{data:pwaContext}})},401:error,403:error,429:error}}};
document.paths['/api/v1/bantuan/pwa/devices']={
  post:{summary:'Register or rotate the current web sessions PWA FCM device',description:'Requires active next-server session, Bantuan access and configured Firebase Web/VAPID. Token encrypted at rest; one registration per web session. Repeat preserves registration start date; a shared browser token changes owner atomically.',requestBody:{required:true,content:json({type:'object',required:['token'],properties:{token:{type:'string',minLength:1,maxLength:4096,writeOnly:true}}})},responses:{204:mobileNoContent,401:error,403:error,422:error,429:error,503:error}},
  delete:{summary:'Unregister the current web sessions PWA device',description:'Remains available after Bantuan access is revoked. Other sessions and native registrations remain untouched.',responses:{204:mobileNoContent,401:error,403:error,429:error}},
};
// Private santunan evidence: only the two original photos are mandatory.
document.paths['/api/v1/bantuan/santunan/{id}/documents'] = {post:{
  tags:['Bantuan'], summary:'Upload private santunan evidence',
  description:'Assigned volunteer or module admin; only after transfer and before completion. transfer_receipt is optional and never replaces aid_paper or recipient_photo. One file per kind; encrypted storage.',
  security:[{bearerAuth:[]}],parameters:[{name:'id',in:'path',required:true,schema:{type:'string',format:'uuid'}}],
  requestBody:{required:true,content:{'multipart/form-data':{schema:{type:'object',required:['kind','file'],properties:{kind:{type:'string',enum:['aid_paper','recipient_photo','transfer_receipt']},file:{type:'string',format:'binary',description:'JPEG, PNG or WEBP; maximum 2048 KiB'}}}}}},
  responses:{201:{description:'Evidence uploaded',content:json({type:'object',required:['data'],properties:{data:{type:'object',required:['id','kind'],properties:{id:{type:'string',format:'uuid'},kind:{type:'string',enum:['aid_paper','recipient_photo','transfer_receipt']}}}}})},401:error,403:error,404:error,409:error,422:error,503:error},
}};
document.paths['/api/v1/bantuan/applications/{id}/actions/survey_submit'] = {post:{tags:['Bantuan'],summary:'Submit an assigned survey',description:'Requires the assigned verifier (or module admin). Completeness and evidence checks remain mandatory. All survey submissions enter survey_cc_review. Call Center officers may review their own assigned surveys and explicitly forward them with survey_review_submit to survey_submitted for independent Approver review. Self approval remains forbidden.',security:[{bearerAuth:[]}],parameters:[{name:'id',in:'path',required:true,schema:{type:'string'}}],requestBody:{required:true,content:json({type:'object',required:['version','survey'],properties:{version:{type:'integer',minimum:1},survey:{type:'object',additionalProperties:true},applicant:{type:'object',additionalProperties:true}}})},responses:{200:{description:'Survey recorded with current application status and version'},403:error,404:error,409:error,422:error}}};
for (const module of ['tanwir','ojol']) {
 const rowProperties={id:{type:'string'},code:{type:'string'},name:{type:'string'},active:{type:'integer'},group_name:{type:['string','null']},group_id:{type:['string','null']},last_submission:{type:['string','null']}};
 for(const field of ['assigned','due','submitted','approved','pending','rejected','on_time','late','attempts','quizzes','missing','overdue','due_submitted']) rowProperties[field]={type:'integer',minimum:0};
 rowProperties.score={type:['number','null']};rowProperties.completion={type:['number','null']};
 document.paths[`/api/v1/${module}/reports/participants`]={get:{summary:'Participant activity and quiz performance report',description:'Admin/superadmin see their module. Guru Tanwir sees current PIC groups and relevant tasks; Ojol guru sees only tasks they own or co-review. Participants denied. Denominator uses current group and task creation dates in WIB; results are current, not historical enrollment snapshots. Missing = assigned minus submitted; overdue = expired minus submitted expired tasks. Consistent = at least 80% assigned tasks submitted on time. Score is average quiz score; summary is weighted by quiz count. Private no-store. Pagination applies to participants; export follows all pages.',security:[{bearerAuth:[]}],parameters:[...['from','to','q','group','teacher','type','active','engagement','min_score','sort','page','per_page'].map(name=>({name,in:'query',schema: name==='page'||name==='per_page'?{type:'integer',minimum:1,...(name==='per_page'?{maximum:100}:{})}:name==='min_score'?{type:'number',minimum:0,maximum:100}:{type:'string',...(name==='type'?{enum:['voice_note','video','quiz']}:name==='active'?{enum:['1','0']}:name==='engagement'?{enum:['consistent','attention','none']}:name==='sort'?{enum:['name','-completion','-score','-missing']}:name==='from'||name==='to'?{format:'date'}:{})}}))],responses:{200:{description:'Paginated participant metrics with filtered summary and authorized filter options',content:json({type:'object',required:['data','meta','links','summary','groups','teachers','scope'],properties:{data:{type:'array',items:{type:'object',properties:rowProperties}},meta:{type:'object',properties:{current_page:{type:'integer'},last_page:{type:'integer'},total:{type:'integer'},per_page:{type:'integer'}}},links:{type:'object'},summary:{type:'object',properties:Object.fromEntries(['participants','assigned','approved','pending','overdue','late','score'].map(k=>[k,{type:k==='score'?['number','null']:'integer'}]))},groups:{type:'array',items:{type:'object'}},teachers:{type:'array',items:{type:'object'}},scope:{type:'string',enum:['admin','guru']}}})},401:error,403:error,422:error}}};
}
document['x-bantuan-application-visibility'] = {
  restrictedRoles: ['requester', 'verifier', 'volunteer'],
  observer: { label: 'Pengurus', scope: 'All applications and private details, documents, timeline and funding groups', allowedApplicationMutations: ['comment'], combinedRoles: 'Other explicitly granted roles retain their own mutation permissions' },
  allApplicationsRoles: ['admin', 'call_center', 'approver', 'chair', 'fund_requester', 'treasurer', 'observer', 'survey_approver'],
  surveyApprover: { role: 'survey_approver', label: 'Penyetuju Survei', allowedApplicationMutations: ['review1_approve', 'review1_reject', 'request_data (review1 only)', 'comment'], forbids: ['amount decisions', 'survey result approval', 'bypass approval', 'self approval'], resolution: 'First valid versioned decision wins; existing Approver and Chair retain first stage access' },
  rule: 'Union of granted roles. Restricted-only accounts see applications they created or are assigned to as verifier/distributor. Any all-applications role sees all applications, including rows without an amount. The ongoing view intersects this scope with active statuses. Mutation permissions and private-document access remain separately authorized.',
};
// Compact location metadata for the authorized Bantuan listing; never full street/NIK/phone.
document.components.schemas.BantuanApplicationSummary = {
  type: 'object', additionalProperties: true,
  properties: { shortLocation: { type: 'string', maxLength: 100, description: 'District and city without administrative prefixes, falling back to region. Empty when unavailable.' } },
};

const output = `${JSON.stringify(document, null, 2)}\n`;
const target = new URL('../docs/openapi.json', import.meta.url);
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== output) {
    throw new Error('OpenAPI contract is stale. Run node api/tools/export-openapi.mjs.');
  }
} else {
  writeFileSync(target, output);
}
