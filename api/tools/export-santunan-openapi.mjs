import { applySantunanContract } from './santunan-contract.mjs';
import fs from 'node:fs';
const path = new URL('../docs/openapi.json', import.meta.url);
const doc = JSON.parse(fs.readFileSync(path, 'utf8'));
applySantunanContract(doc);
fs.writeFileSync(path, JSON.stringify(doc, null, 2)+'\n');
