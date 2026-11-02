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
const output = `${JSON.stringify(document, null, 2)}\n`;
const target = new URL('../docs/openapi.json', import.meta.url);
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== output) {
    throw new Error('OpenAPI contract is stale. Run node api/tools/export-openapi.mjs.');
  }
} else {
  writeFileSync(target, output);
}
