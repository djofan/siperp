import { readFileSync, writeFileSync } from 'node:fs';

// Preserve the existing partial Core/Academy contract as the baseline. Module
// additions live here; openapi.json is generated, never edited by hand.
const document = JSON.parse(readFileSync(new URL('../docs/openapi.base.json', import.meta.url), 'utf8'));
document.paths['/api/v1/bantuan/santunan/imports'] = { post: {
  tags: ['Bantuan'], summary: 'Impor santunan rutin dari Excel yang telah dibaca klien',
  description: 'Admin/bendahara, maksimal 200 baris; atomik. Nama/program/periode yang sama ditolak, termasuk impor ulang. Penyalur aktif wajib. Status awal pending/process. Dibatasi 10/menit; no-store, private.',
  security: [{ bearerAuth: [] }],
  requestBody: { required: true, content: { 'application/json': { schema: {
    type: 'object', required: ['period', 'volunteerId', 'rows'], properties: {
      period: { type: 'string', pattern: '^[0-9]{4}-(0[1-9]|1[0-2])$' }, volunteerId: { type: 'string', maxLength: 191 },
      rows: { type: 'array', minItems: 1, maxItems: 200, items: { type: 'object', additionalProperties: false,
        required: ['recipientName', 'category', 'amount'], properties: {
          recipientName: { type: 'string', minLength: 1, maxLength: 191 }, category: { type: 'string', enum: ['orphan', 'widow'] },
          amount: { type: 'integer', minimum: 1, maximum: 9000000000000 },
        } } },
    },
  } } } },
  responses: { 200: { description: 'Impor berhasil', content: { 'application/json': { schema: { type: 'object', required: ['data'], properties: { data: { type: 'object', required: ['createdCount'], properties: { createdCount: { type: 'integer', minimum: 1, maximum: 200 } } } } } } } }, 403: { description: 'Peran tidak diizinkan' }, 422: { description: 'Data invalid, penerima ganda, atau penyalur tidak aktif; tidak ada baris disimpan' }, 429: { description: 'Batas impor tercapai' } },
} };
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
document['x-lazsip-campaign-target'] = { field: 'targetAmount', required: false, nullable: true, minimum: 0, maximum: 2147483647, description: 'Campaign target is optional. Missing on create, null and zero mean no target (stored and returned as zero). Missing on update preserves existing target. Donations remain available without a target.' };

document.paths['/api/v1/lazsip/admin/transactions/{source}/{id}'] = { delete: { summary: 'Delete a test donation or zakat ledger record (LAZSIP admin or Superadmin)', description: 'Requires confirmationCode matching tracking code (legacy: ID), and accepted testTransaction acknowledgement, including Production tests. Does not call iPaymu or refund. Blocks active session creation/email delivery and Core-reconciled payments. Removes receipts and orphan zakat details, preserves donor/campaign and idempotency tombstones, and logs administrator deletion without donor PII. Limited to 10/minute.', parameters: [{name:'source',in:'path',required:true,schema:{type:'string',enum:['payment','legacy-donation','zakat']}},{name:'id',in:'path',required:true,schema:{type:'string'}}], requestBody:{required:true,content:{'application/json':{schema:{type:'object',required:['confirmationCode','testTransaction'],properties:{confirmationCode:{type:'string',maxLength:191},testTransaction:{type:'boolean',const:true}}}}}},responses:{200:{description:'Test transaction deleted; no-store, private'},401:{description:'Authentication required'},403:{description:'LAZSIP admin or Superadmin required'},404:{description:'Unknown source or LAZSIP transaction'},409:{description:'Reconciled or busy transaction'},422:{description:'Missing acknowledgement or mismatching confirmation code'}} } };

const json = schema => ({ 'application/json': { schema } });

document.paths['/api/v1/bantuan/reports/full'] = {
  get: {
    summary: 'Export complete Bantuan report for module admin, Superadmin and Call Center',
    description: 'Uses application listing filters and access scope. Other operational roles are forbidden, including Monitoring. Records an export audit event and returns Cache-Control: no-store, private. Limited to 5 requests per minute.',
    responses: {
      200: { description: 'Private report rows for XLSX generation, without pagination.' },
      401: { description: 'Authentication required' },
      403: { description: 'Requires module admin, Superadmin or Call Center role' },
      422: { description: 'Invalid application filters' },
      429: { description: 'Export rate limit exceeded' },
    },
  },
};

const error = { description: 'Request rejected', content: json({ $ref: '#/components/schemas/Error' }) };
document.components.schemas.AcademyParticipantImport = {
  type: 'object', required: ['cohortId', 'gender', 'rows'],
  properties: {
    cohortId: { type: 'string', description: 'Existing Academy cohort ID; no program or open registration required.' },
    gender: { type: 'string', enum: ['IKHWAN', 'AKHWAT'], description: 'One group for every participant in the workbook.' },
    rows: { type: 'array', minItems: 1, maxItems: 200, items: {
      type: 'object', additionalProperties: false, required: ['rowNumber', 'name', 'phone', 'address'],
      properties: {
        rowNumber: { type: 'integer', minimum: 2, maximum: 10001 },
        name: { type: 'string', minLength: 2, maxLength: 100 },
        phone: { type: 'string', description: 'Indonesian mobile number; 08, 8, 628 and +628 prefixes accepted. Spaces, parentheses, dots and hyphens removed; stored as 628 followed by 7–12 digits. Duplicate normalized numbers within one batch rejected.' },
        address: { type: 'string', minLength: 1, maxLength: 2000 },
      },
    } },
  },
};
document.components.schemas.AcademyParticipantImportResult = {
  type: 'object', additionalProperties: false, required: ['createdCount', 'skippedCount', 'credentials'],
  properties: {
    createdCount: { type: 'integer', minimum: 0, maximum: 200 },
    skippedCount: { type: 'integer', minimum: 0, maximum: 200 },
    credentials: { type: 'array', maxItems: 200, items: {
      type: 'object', additionalProperties: false, required: ['name', 'phone', 'code', 'password'],
      properties: { name: { type: 'string' }, phone: { type: 'string' }, code: { type: 'string' }, password: { type: 'string', description: 'Default initial password 12345678 for newly imported participants. Must be changed on first login; persisted only as a password hash. Existing accounts are never reset by re-importing.' } },
    } },
  },
};
document.paths['/api/v1/academy/admin/participant-imports'] = { post: {
  tags: ['Academy'], summary: 'Import participant registrations from parsed Excel rows', security: [{ bearerAuth: [] }],
  description: 'Explicit bulk-registration action returning 200. Active Academy admin/superadmin only. The browser reads one .xlsx worksheet (up to 5 MiB) with Nama, No HP, Alamat headers; only parsed rows are sent to Laravel. Atomic transaction: any invalid/conflicting row rolls back the batch. Exact existing active participants (same normalized phone, case-insensitive name, trimmed address, cohort membership and group) are skipped; passwords and memberships remain unchanged. Other matches are rejected with row-specific 422 details; old accounts are never moved to another cohort. New accounts receive PAZ login codes, mandatory password change and cohort/program enrollment. Response has Cache-Control: no-store, private; no stored import file or plaintext-password history. Re-imports never return old passwords.',
  requestBody: { required: true, content: json({ $ref: '#/components/schemas/AcademyParticipantImport' }) },
  responses: {
    200: { description: 'Atomic import result; download credentials before leaving the page.', headers: { 'Cache-Control': { schema: { type: 'string', const: 'no-store, private' } } }, content: json({ type: 'object', required: ['data'], properties: { data: { $ref: '#/components/schemas/AcademyParticipantImportResult' } } }) },
    401: error, 403: error, 404: error, 422: error,
  },
} };
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
  properties: { shortLocation: { type: 'string', maxLength: 100, description: 'District and city without administrative prefixes. Falls back to locality segments from applicant.street, then region. House numbers and the street line are excluded. Empty when unavailable.' } },
};

document['x-bantuan-application-notes'] = { field: 'applicant.applicationNotes', type: 'string', nullable: true, maxLength: 10000, required: false, description: 'Optional per-application message from the applicant, supported for every intake source and drafts. Included in authorized application details; separate from survey notes and internal comments.' };

document.paths['/api/v1/bantuan/applications/{id}/actions/survey_review_withdraw'] = {post:{tags:['Bantuan'],summary:'Withdraw survey results for Call Center review',description:'Call Center or module admin only. Allowed from survey_submitted or review2 before an Approver decision. Preserves applicant, survey and documents; transitions to survey_cc_review. Repeated review and submission are supported. Version locking prevents withdrawing after a concurrent decision.',security:[{bearerAuth:[]}],parameters:[{name:'id',in:'path',required:true,schema:{type:'string'}}],requestBody:{required:true,content:json({type:'object',required:['version'],properties:{version:{type:'integer',minimum:1}}})},responses:{200:{description:'Current application with incremented version'},403:error,404:error,409:error,422:error}}};

document['x-bantuan-permanent-deletion'] = { authorizedRoles: ['superadmin','admin','call_center'], description: 'May permanently delete applications at any stage, including applications created by another officer. Non-draft deletion requires exact application number confirmation; version locking remains mandatory. Other operational roles retain owned-draft deletion only.' };

document.paths['/api/v1/bantuan/applications/{id}/manual-processes'] = {post:{tags:['Bantuan'],summary:'Record an externally performed workflow step',description:'Call Center, module admin or Superadmin only. Executes the existing stage transition and completeness/evidence/version checks without impersonating the field officer. No arbitrary status writes. manual identifies the real performer (active matching account or external name), channel, actual date and source note; recorder identity comes from authentication. Survey and handover performer must match assignment. Funding groups remain protected. External verifier becomes distributor automatically after amount approval. Phones and source notes are encrypted and shown only in authorized detail/history. Other roles cannot use this endpoint or bypass checks through the regular action endpoint.',security:[{bearerAuth:[]}],parameters:[{name:'id',in:'path',required:true,schema:{type:'string'}}],requestBody:{required:true,content:json({type:'object',required:['action','version','manual'],properties:{action:{type:'string'},version:{type:'integer',minimum:1},manual:{type:'object',required:['channel','date','note'],properties:{actorId:{type:'string',nullable:true},name:{type:'string',maxLength:191,description:'Required without actorId'},phone:{type:'string',maxLength:30,nullable:true},channel:{enum:['whatsapp','telegram','other']},date:{type:'string',format:'date'},note:{type:'string',minLength:5,maxLength:5000}}},survey:{type:'object'},applicant:{type:'object'},handover:{type:'object'},surveyAddress:{type:'string'},amount:{type:'integer'},transferDate:{type:'string',format:'date'},transferAmount:{type:'integer'},account:{type:'string'},reason:{type:'string'},reference:{type:'string'}}})},responses:{200:{description:'Authorized application detail with persisted manual attribution'},403:error,404:error,409:error,422:error}}};

document['x-bantuan-application-search'] = {parameter:'search',maxLength:191,matching:'Case-insensitive literal tokens; all tokens may match different supported fields. Pagination, menu filters, task assignment and row visibility remain in force.',fields:['name','number','program','region','status','source','amount','created date','creator name/code','verifier name/code','distributor name/code','manual field officer names'],privateFields:'Address, survey address, phone, job, problem and application notes only for rows the current officer can read sensitively. NIK only exact 16 digits. Encrypted private fields are streamed in the scoped server query, never stored as plaintext indexes or returned by search.'};

document.paths['/api/v1/bantuan/funding-requests/{id}/manual-decision']={post:{tags:['Bantuan'],summary:'Record external decision for a complete funding group',description:'Call Center or module admin/Superadmin. Same decision, reason, group version and complete item versions as the normal decision endpoint plus manual attribution (actorId or name, channel, date, note). The entire group is updated atomically, existing state/version/amount checks apply, and every application audit preserves the real performer and authenticated recorder.',security:[{bearerAuth:[]}],parameters:[{name:'id',in:'path',required:true,schema:{type:'string'}}],requestBody:{required:true,content:json({type:'object',required:['version','decision','items','manual'],properties:{version:{type:'integer'},decision:{enum:['approved','rejected']},reason:{type:'string',nullable:true},manual:{type:'object'},items:{type:'array',minItems:1,maxItems:100,items:{type:'object',required:['id','version'],properties:{id:{type:'string'},version:{type:'integer'}}}}}})},responses:{200:{description:'Funding group with synchronized application decisions'},403:error,404:error,409:error,422:error}}};

document['x-lazsip-contact-validation'] = {
  endpoint: '/api/v1/lazsip/site-content/kontak', method: 'PUT',
  requiredContentFields: { address: 'string, 10-2000 characters', phone: 'string, 8-50 characters; optional leading +, digits, spaces, parentheses, dots and hyphens', email: 'RFC-valid email, max 191 characters' },
  optionalSocialFields: ['instagram', 'facebook', 'youtube'],
  invalidResponse: 422, description: 'Invalid updates preserve the previously saved public contact details.',
};


// Photo pins stay on the same private, authorized document representation.
const photoLocation = {type:['object','null'],additionalProperties:false,required:['latitude','longitude','source'],properties:{
 latitude:{type:'number',minimum:-90,maximum:90},longitude:{type:'number',minimum:-180,maximum:180},source:{type:'string',enum:['exif','device']},accuracy:{type:['number','null'],minimum:0,maximum:10000000}
},description:'Uploader-provided coordinates, not verified proof. exif = GPS from original metadata; device = device position at upload, not capture. Encrypted at rest. Legacy photos have null location.'};
document.components.schemas.BantuanPhotoLocation=photoLocation;
const photoLocationInput={...photoLocation,type:'object'};
const photoUploadPath='/api/v1/bantuan/applications/{id}/documents';
document.paths[photoUploadPath]={post:{tags:['Bantuan'],summary:'Upload private application photo with optional location',security:[{bearerAuth:[]}],parameters:[{name:'id',in:'path',required:true,schema:{type:'string',format:'uuid'}}],description:'Existing stage, role and sensitive-document permissions apply. Use multipart fields location[latitude], location[longitude], location[source] and optionally location[accuracy]. No location is inferred for old photos. clientId replay preserves the first upload and its location.',requestBody:{required:true,content:{'multipart/form-data':{schema:{type:'object',required:['kind','file'],properties:{kind:{type:'string',enum:['face','ktp','kk','supporting','sktm','survey_recipient','survey_front','survey_inside','survey_environment','survey_other','transfer','handover','certificate','receipt','education_other','return']},file:{type:'string',format:'binary',description:'JPEG, PNG or WEBP; maximum 2048 KiB'},clientId:{type:'string',format:'uuid'},caption:{type:'string',maxLength:1000},location:photoLocationInput}}}}},responses:{200:{description:'Existing upload replayed'},201:{description:'Photo created; data contains id and kind'},401:error,403:error,404:error,409:error,422:error,503:error}}};
document.paths['/api/v1/bantuan/santunan/{id}/documents'].post.requestBody.content['multipart/form-data'].schema.properties.location=photoLocationInput;
document.components.schemas.BantuanPhotoDocument={type:'object',required:['id','kind','location'],properties:{id:{type:'string'},kind:{type:'string'},location:{$ref:'#/components/schemas/BantuanPhotoLocation'}},additionalProperties:true};
const photoDocuments={type:'array',items:{$ref:'#/components/schemas/BantuanPhotoDocument'}};
document.paths['/api/v1/bantuan/applications/{id}']={get:{tags:['Bantuan'],summary:'Read authorized application details and private photo pins',security:[{bearerAuth:[]}],parameters:[{name:'id',in:'path',required:true,schema:{type:'string',format:'uuid'}}],description:'Preserves existing record scope and sensitive-document filtering. Private no-store. Location is returned only for visible documents.',responses:{200:{description:'Application detail',content:json({type:'object',required:['data'],properties:{data:{type:'object',required:['documents'],properties:{documents:photoDocuments},additionalProperties:true}}})},401:error,403:error,404:error}}};
document.paths['/api/v1/bantuan/santunan'].get={tags:['Bantuan'],summary:'Read authorized santunan and photo pins',security:[{bearerAuth:[]}],description:'Existing role scope and filters apply. Volunteers only see assigned records. Private no-store.',responses:{200:{description:'Authorized santunan records',content:json({type:'object',required:['data'],properties:{data:{type:'array',items:{type:'object',required:['documents'],properties:{documents:photoDocuments},additionalProperties:true}}}})},401:error,403:error,422:error}};
document['x-bantuan-photo-locations']={applicationDetail:'Authorized GET /api/v1/bantuan/applications/{id}: documents[].location',santunanList:'Authorized GET /api/v1/bantuan/santunan: data[].documents[].location',schema:{$ref:'#/components/schemas/BantuanPhotoLocation'},visibility:'Same document filtering and record ownership as private photos. No public location endpoint. Browser builds a map link only after authorization. Opening it shares coordinates with the map provider.'};

document.components.schemas.BantuanTelephone = {type:'string',minLength:8,maxLength:30,pattern:'^\\+?[0-9 ()-]+$',description:'Applicant phone and optional reporterPhone on application create/update: 8–15 digits, optional leading + (international code cannot start with 0), spaces/hyphens and balanced numeric area-code parentheses. Letters, extensions and invalid digit counts return 422. Enforced on drafts too when present; reporterPhone remains nullable. Formatting is preserved.'};
document.paths['/api/v1/core/module-accounts/{id}/password-reset'] = { post: {
  tags: ['Core'], summary: 'Reset an operational account password without its old password',
  security: [{bearerAuth: []}], parameters: [{name:'id',in:'path',required:true,schema:{type:'string'}}],
  description: 'Active module admins may reset operational accounts only when every target module is managed by that admin. Superadmin may reset operational accounts across modules. Admin identities, superadmin, self and unassigned accounts are excluded. Writes only a password hash, revokes every target token and logs actor/target without credentials. No password is returned. Rate limit 10 requests/minute.',
  requestBody: {required:true,content:json({type:'object',required:['password','password_confirmation'],properties:{password:{type:'string',minLength:12,maxLength:72,writeOnly:true},password_confirmation:{type:'string',minLength:12,maxLength:72,writeOnly:true}}})},
  responses: {200:{description:'Reset completed; Cache-Control: no-store, private',content:json({type:'object',properties:{ok:{const:true},data:{type:'object',properties:{id:{type:'string'},code:{type:'string'}}}}})},401:error,403:error,404:error,422:error,429:error},
} };
document['x-core-operational-password-reset'] = {accountList:'GET /api/v1/core/module-accounts: accounts[].canResetPassword is a UI hint only; authorization is repeated on mutation.',passwordVisibility:'Only the new password entered in the browser can be copied after success. Existing passwords are never retrievable.'};

Object.assign(document.components.schemas.Error.properties.error.properties, {
  diagnosticCode: {type:'string',description:'Stable public diagnostic category such as DB_SCHEMA_MISMATCH, DB_UNAVAILABLE or APP_KEY_MISSING. Does not expose SQL or configuration values.'},
  requestId: {type:'string',format:'uuid',description:'Server-generated support reference, also returned as X-Request-ID and recorded in api_request_failed logs for server failures.'},
  retryAfter: {type:['integer','null'],minimum:0,description:'Seconds until retry when the server supplies Retry-After.'},
});
document['x-api-error-diagnostics']={compatibility:'Existing error.code/message/details remain. Diagnostic metadata is additive. Database duplicates/constraints and busy states return 409; unavailable connections return 503; schema mismatches and unknown database errors return 500.',privacy:'No SQL, bindings, password, exception message, stack or configuration values in public diagnostics. api_request_failed logs include correlation ID, category, route template, exception class and source location, with SQLSTATE/driver code for database failures; request bodies, full URLs, SQL and bindings are not logged by this handler.'};

document['x-ipaymu-request-authentication'] = {method:'POST',serialization:'One JSON string with JSON_UNESCAPED_SLASHES and JSON_UNESCAPED_UNICODE (literal UTF-8); the same bytes are signed and sent as application/json.',stringToSign:'POST:VA:lowercase(SHA256(body)):ApiKey',signature:'HMAC-SHA256 hexadecimal using ApiKey as key',timestamp:'Asia/Jakarta YYYYMMDDHHmmss',credentials:'Trim surrounding whitespace from VA/API key consistently; reject internal whitespace in API key. Snapshot the normalized VA on new transactions.',diagnostics:'payment:ipaymu-check validates configuration; --remote calls /api/v2/balance and discards financial values. Never prints key, VA or signature. Checkout distinguishes IPAYMU_SIGNATURE_REJECTED from IP/domain rejection; definite HTTP 4xx rejections allow retrying the same pending transaction.'};

document.components.schemas.SipDocumentationPhoto = {type:'object',additionalProperties:false,required:['id','image'],properties:{id:{type:'string',format:'uuid'},image:{type:'string',maxLength:191,pattern:'^(?:/uploads/sip/[a-f0-9-]{36}\\.(?:jpg|png|webp)|https?://[^\\s]+)$'},caption:{type:['string','null'],maxLength:500},isDemo:{type:'boolean'}}};
document['x-sip-content-galleries'] = {resources:['news','program-bantuan','penyaluran-bantuan'],field:'documentationPhotos',schema:{type:'array',maxItems:50,items:{$ref:'#/components/schemas/SipDocumentationPhoto'}},behavior:'Optional ordered public gallery. Omitted on update preserves existing photos; [] clears gallery. IDs must be distinct. Authenticated SIP content editors only can mutate. Draft news galleries remain private.'};
document['x-bantuan-survey-photo-replacement'] = 'DELETE documents permits assigned survey document corrections during survey_assigned and survey_cc_review, including previously used survey evidence. Uploader/Admin ownership and document-role authorization still apply. Files are retained for audit; deleted photos do not count toward requirements. Evidence is locked after forwarding to approval.';
const academyMaterialUpload = {
  type:'object', properties:{
    cohortId:{type:'string',description:'Required when creating a material; existing scoped material cannot move cohorts.'},
    title:{type:'string',maxLength:191}, order:{type:'integer',minimum:1},
    isPublished:{type:'boolean'}, shortDescription:{type:['string','null'],maxLength:2000},
    file:{type:'string',format:'binary',description:'Optional replacement audio, maximum 50 MiB. MP3, WAV, OGG or M4A.'},
    pdfFile:{type:'string',format:'binary',description:'Optional PDF attachment, maximum 10 MiB. MIME and file header validated. Appends to existing attachments.'},
  },
};
document.components.schemas.AcademyMaterialUpload = academyMaterialUpload;
for (const [path, method] of [['/api/v1/academy/admin/materials','post'],['/api/v1/academy/admin/materials/{id}','put']]) {
  document.paths[path] ??= {};
  document.paths[path][method] = {
    tags:['Academy'],summary:method==='post'?'Create audio or PDF material':'Update material and optionally upload audio or PDF',
    description:'Academy administrators only. Combined audio and PDF maximum 50 MiB. PDF-only material can be published. Omitted files preserve existing content. Database changes and stored files are rolled back on failure. Private attachments retain enrollment and release checks; no public file URL is created.',
    security:[{bearerAuth:[]}],
    ...(method==='put'?{parameters:[{name:'id',in:'path',required:true,schema:{type:'string'}}]}:{}),
    requestBody:{required:true,content:{'multipart/form-data':{schema:method==='post'?{allOf:[{$ref:'#/components/schemas/AcademyMaterialUpload'},{type:'object',required:['cohortId','title']}]}:{$ref:'#/components/schemas/AcademyMaterialUpload'}}}},
    responses:{200:{description:'Saved material ID in data.id'},401:error,403:error,404:error,409:error,422:error},
  };
}
document['x-academy-material-pdfs'] = {listing:'Material listing _count.pdfs counts PDF attachments alongside existing _count.attachments. File links are disclosed only in authorized detail/admin contexts.',access:'Existing private file endpoint and enrollment/release checks remain unchanged.'};
const academyOwnProfile = {
  type:'object',additionalProperties:false,required:['name','code','email','nis','phone','address','gender'],
  properties:{name:{type:'string'},code:{type:['string','null']},email:{type:['string','null']},nis:{type:['string','null']},phone:{type:['string','null']},address:{type:['string','null']},gender:{type:['string','null'],enum:['IKHWAN','AKHWAT',null]}},
};
document.paths['/api/v1/academy/profile'] = {get:{
  tags:['Academy'], summary:'Read the signed-in participant profile',
  description:'Authenticated active account only. Always resolves participant by authenticated user; no userId/profileId input is accepted to select another account. Available before the initial password change. Returns Cache-Control: no-store, private. No cohort metadata, password hash, token, or other users are returned.',
  security:[{bearerAuth:[]}], responses:{200:{description:'Own profile',content:json({type:'object',required:['data'],properties:{data:academyOwnProfile}})},401:error,403:error,404:error},
}};
document.paths['/api/v1/bantuan/applications/{id}/actions/survey_revise'] = {post:{tags:['Bantuan'],summary:'Reopen the assigned verifier survey for correction',description:'Only the assigned verifier, from survey_cc_review or survey_submitted before amount approval. Returns to survey_assigned, preserves survey data and evidence, and requires resubmission through Call Center review. Version locking prevents concurrent decisions.',security:[{bearerAuth:[]}],parameters:[{name:'id',in:'path',required:true,schema:{type:'string'}}],requestBody:{required:true,content:json({type:'object',required:['version'],properties:{version:{type:'integer',minimum:1}}})},responses:{200:{description:'Survey reopened with preserved evidence'},403:error,404:error,409:error,422:error}}};
const login = document.paths['/api/v1/auth/login'].post;
login.requestBody.content['application/json'].schema.properties.pwa = {type:'boolean',description:'Bantuan PWA login. Requires active module access. Issues a persistent 30-day cookie/token exempt from the shorter Sanctum browser age. Explicit logout, account deactivation and token revocation still apply.'};
document['x-bantuan-verifier-intake-edit'] = 'Verifiers may correct applications they created during draft, needs_data, screening, review1, survey_assignment, survey_assigned and bypass_review. Existing source restrictions, authorization, completeness and optimistic locking apply. Other users and approved applications are not unlocked.';
for (const module of ['tanwir','ojol']) {
  const media = {type:'object',required:['index','name','mime','size'],properties:{index:{type:'integer',minimum:0,maximum:9},name:{type:'string',maxLength:191},mime:{type:'string'},size:{type:['integer','null'],minimum:0}}};
  document.paths[`/api/v1/${module}/submissions`] = {post:{tags:[module],summary:'Submit one or multiple private audio/video files',description:'Participant in the assigned task group, before deadline. 1–10 files, combined maximum 50 MiB. Every file is inspected and must match the task type. Legacy file field remains supported but cannot be combined with files. Atomically replaces the entire rejected attempt; pending/approved submissions reject duplicates. One review and attempt count per batch.',security:[{bearerAuth:[]}],requestBody:{required:true,content:{'multipart/form-data':{schema:{type:'object',required:['taskId'],properties:{taskId:{type:'string'},file:{type:'string',format:'binary'},files:{type:'array',minItems:1,maxItems:10,items:{type:'string',format:'binary'}}},oneOf:[{required:['file']},{required:['files']}]}}}},responses:{200:{description:'Batch submitted for review'},403:error,404:error,409:error,422:error}}};
  document.paths[`/api/v1/${module}/files/submission/{id}`] = {get:{tags:[module],summary:'Play a private submission attachment',description:'Same owner/assigned teacher/module-admin authorization for every file; index defaults to zero for legacy players. Private no-store; storage paths are not exposed in files metadata.',security:[{bearerAuth:[]}],parameters:[{name:'id',in:'path',required:true,schema:{type:'string'}},{name:'index',in:'query',schema:{type:'integer',minimum:0,maximum:9,default:0}}],responses:{200:{description:'Authorized media stream'},403:error,404:error,422:error}}};
  document.components.schemas[`${module}SubmissionMedia`] = {type:'array',maxItems:10,items:media,description:'files returned in authorized teacher-review and student-task detail. Legacy single-file submissions return one item.'};
}
const output = `${JSON.stringify(document, null, 2)}\n`;
const target = new URL('../docs/openapi.json', import.meta.url);
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== output) {
    throw new Error('OpenAPI contract is stale. Run node api/tools/export-openapi.mjs.');
  }
} else {
  writeFileSync(target, output);
}
