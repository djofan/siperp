import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ref = name => ({ $ref: `#/components/schemas/${name}` });
const object = (properties, required = Object.keys(properties), additionalProperties = false) => ({ type: 'object', properties, required, additionalProperties });
const string = {type:'string'};
const json = schema => ({'application/json':{schema}});
const error = description => ({description,content:json(ref('Error'))});
const errors = Object.fromEntries([[400,'Malformed request'],[401,'Missing or invalid Bearer token'],[403,'Access denied'],[404,'Resource not found'],[409,'Conflict'],[422,'Validation failed'],[429,'Rate limited'],[500,'Internal error']].map(([status,description])=>[status,error(description)]));
errors[429].headers={'Retry-After':{schema:{type:'string'},description:'Seconds before retry'}};
const success = (schema,description='Success') => ({description,content:json(schema)});
const schemas={
 Error:object({error:object({code:string,message:string,details:{type:'object',additionalProperties:{type:'array',items:string}}})}),
 Health:object({data:object({status:{enum:['ok','degraded']},database:object({status:{enum:['connected','unavailable']}})})}),
 PaymentAttempt:object({id:{type:'string',pattern:'^c[a-z0-9]{24}$'},name:string,amount:{type:'integer',minimum:1},status:{enum:['pending','cancelled']}}),
 PaymentAttemptResponse:object({data:ref('PaymentAttempt')}),
 PaymentAttemptCollection:object({data:{type:'array',items:ref('PaymentAttempt')},meta:object({current_page:{type:'integer'},per_page:{type:'integer',maximum:100},total:{type:'integer'},last_page:{type:'integer'},from:{type:['integer','null']},to:{type:['integer','null']},path:string,links:{type:'array',items:object({url:{type:['string','null']},label:string,active:{type:'boolean'}},['url','label','active'],true)}},['current_page','per_page','total','last_page','from','to','path','links'],true),links:object({first:string,last:string,prev:{type:['string','null']},next:{type:['string','null']}})}),
};
const base={openapi:'3.1.0',info:{title:'Siperp API',version:'1.0.0',description:'Foundation only. The checked-in contract is authoritative for frontend/backend integration.'},servers:[{url:'http://localhost:8000'}],security:[{bearerAuth:[]}],components:{securitySchemes:{bearerAuth:{type:'http',scheme:'bearer',description:'Sanctum personal access token; absolute lifetime seven days. No session cookies.'}},schemas}};
const body=(schema)=>({required:true,content:json(schema)});
const live={...base,paths:{
 '/api/v1/health':{get:{operationId:'getHealth',tags:['Foundation'],security:[],summary:'Application and database health',responses:{200:success(ref('Health')),503:success(ref('Health'),'Degraded database health'),500:errors[500]}}},
 '/api/v1/auth/login':{post:{operationId:'loginPlaceholder',tags:['Foundation'],security:[],summary:'Login placeholder; does not issue tokens yet',description:'Explicit POST action exception. Five attempts per minute per normalized email/IP. Returns 501 after valid input.',requestBody:body(object({email:{type:'string',format:'email',maxLength:191},password:{type:'string',minLength:1}},['email','password'],true)),responses:{400:errors[400],422:errors[422],429:errors[429],500:errors[500],501:error('Not implemented; internal details omitted')}}},
}};
const idParam={name:'payment_attempt',in:'path',required:true,schema:{type:'string'},description:'CUID v1 identifier; unknown identifiers return 404'};
const query=[
 {name:'page',in:'query',schema:{type:'integer',minimum:1,default:1}},
 {name:'per_page',in:'query',schema:{type:'integer',minimum:1,maximum:100,default:25}},
 {name:'filter',in:'query',style:'deepObject',explode:true,schema:object({status:{enum:['pending','cancelled']}},[],false)},
 {name:'sort',in:'query',schema:{type:'string',enum:['name','-name','amount','-amount'],default:'name'}},
 {name:'q',in:'query',schema:{type:'string',maxLength:200}},
];
const fields={name:{type:'string',minLength:1,maxLength:100},amount:{type:'integer',minimum:1},status:{enum:['pending','cancelled']}};
const created={...success(ref('PaymentAttemptResponse'),'Created; replay returns the original status, representation and Location'),headers:{Location:{schema:{type:'string',format:'uri'},description:'Canonical URI of the created resource'}}};
const resource='/api/v1/examples/payment-attempts';
const example={...base,info:{...base.info,title:'Siperp REST example (test only)',description:'Non-production reference. Routes are registered only by tests; in-memory idempotency does not provide cross-process durability.'},'x-example-only':true,paths:{
 [resource]:{
 get:{operationId:'examplesIndex',tags:['Examples'],parameters:query,responses:{200:success(ref('PaymentAttemptCollection')),...errors}},
 post:{operationId:'examplesStore',tags:['Examples'],parameters:[{name:'Idempotency-Key',in:'header',required:true,schema:{type:'string',minLength:1,maxLength:128,pattern:'^[A-Za-z0-9._:-]+$'},description:'Scoped to authenticated principal and creation operation; different payload with the same key returns 409'}],requestBody:body(object({name:fields.name,amount:fields.amount},['name','amount'],true)),responses:{201:created,...errors}},
 },
 [resource+'/{payment_attempt}']:{parameters:[idParam],
 get:{operationId:'examplesShow',tags:['Examples'],responses:{200:success(ref('PaymentAttemptResponse')),...errors}},
 put:{operationId:'examplesReplace',tags:['Examples'],description:'Full replacement of all writable fields; read-only and internal fields remain server-owned.',requestBody:body(object(fields,Object.keys(fields),true)),responses:{200:success(ref('PaymentAttemptResponse')),...errors}},
 patch:{operationId:'examplesUpdate',tags:['Examples'],description:'Partial update; at least one writable field required.',requestBody:body({...object(fields,[],true),anyOf:Object.keys(fields).map(field=>({required:[field]}))}),responses:{200:success(ref('PaymentAttemptResponse')),...errors}},
 delete:{operationId:'examplesDestroy',tags:['Examples'],responses:{204:{description:'Deleted; no response body'},...errors}},
 },
}};
export const specifications={'openapi.json':live,'openapi.example.json':example};
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 for(const [name,spec] of Object.entries(specifications)) {
  const target=path.join(root,'docs',name),text=JSON.stringify(spec,null,2)+'\n';
  if(process.argv.includes('--check')) {if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==text)throw Error(`OpenAPI drift: regenerate ${name}`);}
  else fs.writeFileSync(target,text);
 }
 console.log(process.argv.includes('--check')?'OpenAPI artifacts are current':'OpenAPI artifacts exported to api/docs');
}
