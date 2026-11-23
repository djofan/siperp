import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Ajv from "ajv";
const document = JSON.parse(fs.readFileSync("api/docs/openapi.json", "utf8"));
const ajv = new Ajv({strict:false,allErrors:true,allowUnionTypes:true});
const profile = {id:"affiliate-id",name:"Test Affiliate",email:"affiliate@example.test",phone:null,referralCode:"1234567890abcdef1234",referralPath:"/lazsip/r/1234567890abcdef1234",isActive:true,joinedAt:"2026-11-20T00:00:00.000Z",features:{referralTracking:false,commissions:false,withdrawals:false}};
test("affiliate contract excludes credentials, roles and unimplemented financial data",()=>{
 const validate=ajv.compile(document.components.schemas.LazsipAffiliate);
 assert.equal(validate(profile),true,JSON.stringify(validate.errors));
 for(const field of ["code","token","password_hash","user_id","isSuperadmin","balance","donors"]){
  assert.equal(validate({...profile,[field]:"unexpected"}),false,field);
 }
 assert.equal(validate({...profile,features:{...profile.features,withdrawals:true}}),false);
});
test("registration contract requires all contact fields and rejects short passwords and invalid phones",()=>{
 const schema=document.paths["/api/v1/lazsip/affiliate/registrations"].post.requestBody.content["application/json"].schema;
 const validate=ajv.compile(schema);
 const input={name:"Test Affiliate",email:"affiliate@example.test",phone:"+6281234567890",password:"test-password-only",password_confirmation:"test-password-only"};
 assert.equal(validate(input),true,JSON.stringify(validate.errors));
 assert.equal(validate({...input,phone:"08letters"}),false);
 assert.equal(validate({...input,password:"short"}),false);
 for(const field of ["name","email","phone","password","password_confirmation"]){const missing={...input};delete missing[field];assert.equal(validate(missing),false,field);}
});

test("affiliate login requires email rather than account code",()=>{
 const schema=document.paths["/api/v1/lazsip/affiliate/sessions"].post.requestBody.content["application/json"].schema;
 const validate=ajv.compile(schema);
 assert.equal(validate({email:"affiliate@example.test",password:"test-password-only"}),true);
 assert.equal(validate({code:"SIP-000123",password:"test-password-only"}),false);
});
