export function applyAcademyProgressContract(document) {
  const number = {type:'number'}, integer = {type:'integer'}, text = {type:'string'}, bool = {type:'boolean'};
  const summary = {completedQuizzes:integer,totalQuizzes:integer,allCompleted:bool,score:number,predicate:text,finalCompleted:bool,averageScore:{type:['number','null']}};
  const cohort = {type:'object',properties:{id:text,title:text},required:['id','title']};
  const person = {id:text,name:text,nis:{type:['string','null']},gender:{type:['string','null'],enum:['IKHWAN','AKHWAT',null]},active:bool};
  const query = (name,schema,required=false)=>({name,in:'query',required,schema});
  const responses = schema=>({200:{description:'Private admin progress projection; no answer keys or private participant notes.',content:{'application/json':{schema:{type:'object',properties:{data:schema}}}}},401:{description:'Unauthenticated'},403:{description:'Requires Academy administrator or Superadmin'},404:{description:'Cohort or membership not found'},422:{description:'Invalid filter'}});
  const operation = (title,parameters,schema)=>({tags:['Academy'],summary:title,security:[{bearerAuth:[]}],parameters,description:'Academy administrators and Superadmin only. Read-only, no-store/private. Counts published exams in published chapters/courses for the selected cohort; inactive/future exams remain in the published total. Includes inactive participants but excludes deleted profiles and manager accounts. Uses current Academy weights, best completed score per exam and zero for uncompleted exams. Does not finalize expired attempts or fabricate scores.',responses:responses(schema)});
  document.paths['/api/v1/academy/admin/progress']={get:operation('Participant exam progress by cohort',[
    query('cohort',text),query('q',{type:'string',maxLength:100}),query('group',{type:'string',enum:['IKHWAN','AKHWAT']}),query('page',{type:'integer',minimum:1,maximum:100000}),
  ],{type:'object',properties:{cohorts:{type:'array',items:cohort},cohort:{anyOf:[cohort,{type:'null'}]},items:{type:'array',items:{type:'object',properties:{...person,...summary}}},total:integer,page:integer,pages:integer,totalQuizzes:integer,fullyCompletedParticipants:integer}})};
  const date={type:['string','null'],format:'date-time'};
  document.paths['/api/v1/academy/admin/progress/{profileId}']={get:operation('Participant exam completion and scores',[
    {name:'profileId',in:'path',required:true,schema:text},query('cohort',text,true),
  ],{type:'object',properties:{cohort,person:{type:'object',properties:person},summary:{type:'object',properties:summary},quizzes:{type:'array',items:{type:'object',properties:{id:text,title:text,kind:{type:'string',enum:['DAILY','WEEKLY','FINAL']},number:integer,status:{type:'string',enum:['completed','expired','missed','inactive','upcoming','in_progress','not_started']},score:{type:['number','null']},startedAt:date,submittedAt:date,opensAt:date,closesAt:date,timeLimitMinutes:integer}}}}})};
  for(const [path,item] of Object.entries(document.paths)) {
    if(path.startsWith('/api/v1/academy/teacher/')) for(const operation of Object.values(item)) {
      if(operation && typeof operation==='object') operation.description=(operation.description??'')+' Legacy URL retained for admin components only; the teacher role has been retired. Requires Academy admin or Superadmin.';
    }
  }
  const viewer=document.paths['/api/v1/academy/viewer']?.get;
  if(viewer) viewer.description=(viewer.description??'')+' Academy viewer adds isAdmin. isTeacher is retained as false for wire compatibility; teacher accounts no longer grant Academy management access.';
}
