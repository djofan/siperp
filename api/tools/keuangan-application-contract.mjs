export function applyKeuanganApplicationContract(document) {
  const text={type:'string'}, nullable={type:['string','null']};
  const fields={programId:nullable,program:nullable,requestedOn:{type:['string','null'],format:'date'},recipientIdentity:nullable,treasurerId:nullable,treasurer:nullable,createdBy:nullable};
  for(const name of ['FinanceExpense','FinanceExpenseDetail']) {
    const schema=document.components.schemas[name];Object.assign(schema.properties,fields);schema.required.push(...Object.keys(fields));
  }
  const person={type:'object',required:['id','name'],properties:{id:text,name:text}};
  const programs={type:'array',items:{type:'object',required:['id','name','archived'],properties:{id:text,name:text,archived:{type:'boolean'}}}};
  const signoffs={type:'array',items:{type:'object',required:['name','decision','closed'],properties:{name:text,decision:{enum:['waiting','approved','rejected']},closed:{type:'boolean'}}}};
  document.components.schemas.FinanceExpenseDetail.properties.signoffs=signoffs;
  document.components.schemas.FinanceExpenseDetail.required.push('signoffs');
  const overview=document.paths['/api/v1/keuangan/overview'].get.responses[200].content['application/json'].schema.properties.data;
  overview.properties.role.enum=overview.properties.role.enum.filter(role=>role!=='approver');
  const options=document.paths['/api/v1/keuangan/expense-options'].get;
  const optionData=options.responses[200].content['application/json'].schema.properties.data;
  optionData.properties.programs={type:'array',items:person};optionData.properties.treasurers={type:'array',items:person};optionData.required.push('programs','treasurers');
  options.description='Expense writers only. Fixed active categories: Cash Advance, Kegiatan Sosial, Operasional, Lain-lain. Fixed active sources: Kas Infaq, Kas Amil, Kas Riba, Kas Zakat. Programs use the editable program master initialized from legacy category/program labels. Treasury choices include active Keuangan treasurer accounts only, excluding the requester.';
  const settings=document.paths['/api/v1/keuangan/settings'].get;
  const settingData=settings.responses[200].content['application/json'].schema.properties.data;
  settingData.properties.programs=programs;settingData.required.push('programs');
  settings.description='Master readers only; program master plus historical sources/categories/rules retained. Approver candidates are Bendahara SIP (treasurer) only. New application forms select treasury explicitly rather than nominal rules.';
  for(const path of ['expenses','expenses/{id}']) {
    const method=path==='expenses'?'post':'put';const operation=document.paths['/api/v1/keuangan/'+path][method];
    const input=operation.requestBody.content['application/json'].schema;
    Object.assign(input.properties,{programId:nullable,requestedOn:{type:['string','null'],format:'date'},recipientIdentity:{type:['string','null'],maxLength:2000},treasurerId:nullable,recipient:{type:['string','null'],maxLength:255}});
    input.required=input.required.filter(key=>key!=='recipient');
    operation.description+=' Modern applications supply programId, requestedOn and treasurerId together. Program must be active and source/category must be one of the fixed choices; assigned user must be an active treasury account other than the requester. This direct treasury assignment is independent of nominal rules. A modern revision cannot remove these fields. Recipient name/identity optional. Legacy clients without all three new fields retain nominal-rule compatibility, but only treasury accounts are eligible. All new fields enter revision audit. No transfer of money.';
  }
  document.paths['/api/v1/keuangan/expenses/{id}'].get.description+=' All authorized Keuangan roles receive minimal current-revision signoffs (name, decision, closed) for printing. Operator still receives no audit details or approval notes. Waiting assignments closed by chair-role retirement are excluded from the derived expense status; prior approved/rejected decisions remain unchanged.';
  document.paths['/api/v1/keuangan/masters/programs']=structuredClone(document.paths['/api/v1/keuangan/masters/categories']);
  document.paths['/api/v1/keuangan/masters/programs'].post.summary='Add program name';
  document.paths['/api/v1/keuangan/approvals/{id}/decisions'].post.description+=' Only the treasurer role can decide, including revisions. Admins, finance admins and Superadmin cannot substitute for treasury. The requester cannot decide their own application. Retired chair accounts cannot access the module; identity and prior financial history remain retained.';
  const requestApproval=structuredClone(document.paths['/api/v1/keuangan/expenses/{id}'].put);
  requestApproval.summary='Request treasury approval for an existing unassigned expense';
  requestApproval.description='Expense writers only; active module/account, optimistic version and actor-scoped idempotency UUID required. Only an unassigned, non-archived expense is eligible. Creates a new revision and waiting task for the selected active treasury account, excluding sender and original creator. Preserves all original financial facts, original creation timestamp, origin and history. Does not approve or pay. Waiting/approved/rejected expenses cannot be rerouted through this endpoint. Atomic append-only expense and approval events; private no-store response.';
  const input=requestApproval.requestBody.content['application/json'].schema;
  const prior=input.properties;
  input.properties={requestId:prior.requestId,version:prior.version,treasurerId:{type:'string',maxLength:191},reason:{type:'string',minLength:10,maxLength:2000}};
  input.required=Object.keys(input.properties);
  document.paths['/api/v1/keuangan/expenses/{id}/approval-requests']={post:requestApproval};
}
