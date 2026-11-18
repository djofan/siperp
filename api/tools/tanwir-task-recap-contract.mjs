export function applyTanwirTaskRecapContract(document) {
  const text={type:'string'}, date={type:'string',format:'date-time'}, int={type:'integer'}, bool={type:'boolean'};
  const nullable=schema=>({anyOf:[schema,{type:'null'}]});
  const ref=name=>({$ref:`#/components/schemas/TanwirRecap${name}`});
  const array=items=>({type:'array',items});
  const object=properties=>({type:'object',additionalProperties:false,required:Object.keys(properties),properties});
  const status={type:'string',enum:['pending','approved','rejected']};
  const type={type:'string',enum:['voice_note','video','quiz']};
  const person={id:text,code:text,name:text};
  const group={id:text,code:text,name:text};
  const task={id:text,title:text,description:text,type,createdAt:date,deadline:date,originalDeadline:date,teacher:nullable(ref('Person')),groups:array(ref('Group'))};
  const submission={id:text,status,score:nullable(int),attemptsCount:int,isLate:bool,submittedAt:date};
  const question={id:text,order:int,question:text,optionA:text,optionB:text,optionC:nullable(text),optionD:nullable(text),correctOption:text};
  Object.assign(document.components.schemas, {
    TanwirRecapPerson:object(person),TanwirRecapGroup:object(group),
    TanwirRecapGroupOption:object({...group,pic:nullable(ref('Person'))}),
    TanwirRecapCounts:object(Object.fromEntries(['participants','submitted','missing','pending','approved','rejected'].map(key=>[key,{type:'integer',minimum:0}]))),
    TanwirRecapMeta:object({current_page:int,last_page:int,total:int,per_page:int}),
    TanwirRecapTask:object(task),TanwirRecapQuestion:object(question),
    TanwirRecapIndex:object({tasks:array(object({...task,counts:ref('Counts')})),groups:array(ref('GroupOption')),teachers:array(ref('Person')),meta:ref('Meta')}),
    TanwirRecapDetail:object({task:object({...task,questions:array(ref('Question'))}),summary:ref('Counts'),groups:array(ref('GroupOption')),meta:ref('Meta'),participants:array(object({...person,active:bool,group:nullable(ref('Group')),currentlyAssigned:bool,submission:nullable(object(submission))}))}),
    TanwirRecapSubmission:object({...submission,task:ref('Task'),student:object({...person,group:nullable(object({name:text}))}),fileMime:nullable(text),
      files:array(object({index:int,name:text,mime:text,size:nullable(int)})),
      answers:array(object({questionId:text,selectedOption:text,isCorrect:bool,question:nullable(ref('Question'))})),
      logs:array(object({id:text,status,feedback:nullable(text),attemptNumber:int,createdAt:date,reviewer:nullable(object({user:object({name:text})}))}))}),
  });
  const query=(name,schema)=>({name,in:'query',required:false,schema});
  const shared=[query('group',text),query('q',{type:'string',maxLength:200}),query('page',{type:'integer',minimum:1}),query('per_page',{type:'integer',minimum:1,maximum:50,default:25})];
  const operation=(summary,schema,parameters)=>({tags:['Tanwir'],summary,security:[{bearerAuth:[]}],parameters,
    description:'Tanwir administrator or Superadmin only. Read-only; Cache-Control private, no-store. Uses existing tasks, current group membership, submissions and review logs without writes or migrations. Historical submissions remain visible after participant transfers or changes to task audience. Current inactive participants are included. No private storage paths, credentials, or participant contact details. Media remains on the existing authorized /tanwir/files/submission/{id}?index=N route. Index group filter selects task audience; index counts cover all target groups. Detail group filter selects participants by current group; summary follows group before name/status filters.',
    responses:{200:{description:'Read-only private recap',content:{'application/json':{schema:object({data:schema})}}},401:{description:'Unauthenticated or inactive account'},403:{description:'Not a Tanwir administrator'},404:{description:'Module unavailable or record not found'},422:{description:'Invalid filters or pagination'}}});
  document.paths['/api/v1/tanwir/admin/task-recaps']={get:operation('List PIC tasks and submission counts',ref('Index'),[...shared,query('teacher',text),query('type',type)]) };
  document.paths['/api/v1/tanwir/admin/task-recaps/{id}']={get:operation('Inspect task instructions, questions and participant results',ref('Detail'),[{name:'id',in:'path',required:true,schema:text},...shared,query('status',{type:'string',enum:['missing','pending','approved','rejected']})])};
  document.paths['/api/v1/tanwir/admin/task-recaps/submissions/{id}']={get:operation('Read participant media, quiz answers and correction history',ref('Submission'),[{name:'id',in:'path',required:true,schema:text}])};
}
