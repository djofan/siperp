import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(root,'../package.json'));
// Use the JSON Schema validator already pinned by the root development lockfile.
const Ajv=require('ajv');
const input=JSON.parse(fs.readFileSync(0,'utf8'));
const spec=JSON.parse(fs.readFileSync(path.join(root,'docs',input.example?'openapi.example.json':'openapi.json'),'utf8'));
const pathname=new URL(input.path,'http://localhost').pathname;
const entry=Object.entries(spec.paths).find(([p])=>new RegExp('^'+p.replace(/\{[^}]+\}/g,'[^/]+')+'$').test(pathname));
if(!entry)throw Error('Path is missing from OpenAPI');
const response=entry[1][input.method.toLowerCase()]?.responses[input.status];
if(!response)throw Error('Method/status is missing from OpenAPI');
if(input.status===204){if(input.content!=='')throw Error('204 must have no body');}
else {
 const schema=response.content['application/json'].schema;
 const ajv=new Ajv({allErrors:true,strictKeywords:false});
 const validate=ajv.compile({...schema,components:spec.components});
 if(!validate(JSON.parse(input.content)))throw Error(JSON.stringify(validate.errors));
}
for(const name of Object.keys(response.headers||{}))if(!input.headers[name.toLowerCase()])throw Error(`Missing documented header: ${name}`);
console.log('Contract response valid');
