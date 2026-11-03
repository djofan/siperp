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
document.paths['/api/v1/bantuan/santunan/periods'] = {post:{tags:['Bantuan'],summary:'Buat santunan rutin bulan berikutnya',description:'Admin/bendahara saja. Seluruh rutin bulan sumber disalin secara atomik; tidak rutin, laporan dan foto tidak disalin. Tujuan yang sudah memiliki rutin ditolak.',security:[{bearerAuth:[]}],requestBody:{required:true,content:{'application/json':{schema:{type:'object',required:['sourcePeriod'],properties:{sourcePeriod:{type:'string',pattern:'^[0-9]{4}-(0[1-9]|1[0-2])$'}}}}}},responses:{'201':{description:'Periode dibuat',headers:{Location:{schema:{type:'string'}}},content:{'application/json':{schema:{type:'object',required:['data'],properties:{data:{type:'object',required:['period','createdCount'],properties:{period:{type:'string'},createdCount:{type:'integer',minimum:1}}}}}}}},'403':{description:'Peran tidak diizinkan'},'409':{description:'Rutin bulan tujuan sudah ada'},'422':{description:'Input invalid, sumber kosong, atau penyalur tidak aktif'}}}};
const output = `${JSON.stringify(document, null, 2)}\n`;
const target = new URL('../docs/openapi.json', import.meta.url);
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== output) {
    throw new Error('OpenAPI contract is stale. Run node api/tools/export-openapi.mjs.');
  }
} else {
  writeFileSync(target, output);
}
