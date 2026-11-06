import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareMaterialForm } from '../modules/academy/api/material-form.ts';

test('editing a title omits the empty audio input and preserves draft status', () => {
  const form = new FormData();
  form.set('title', 'Judul baru');
  form.set('isPublished', '0');
  form.set('file', new File([], 'undefined', { type: 'application/octet-stream' }));
  const result = prepareMaterialForm(form);
  assert.equal(result.has('file'), false);
  assert.equal(result.get('title'), 'Judul baru');
  assert.equal(result.get('isPublished'), '0');
  assert.equal(form.has('file'), true);
});

test('a replacement audio file is preserved for backend validation', async () => {
  const form = new FormData();
  form.set('file', new File(['ID3audio'], 'audio.mp3', { type: 'audio/mpeg' }));
  const file = prepareMaterialForm(form).get('file');
  assert.equal(file.name, 'audio.mp3');
  assert.equal(await file.text(), 'ID3audio');
});
