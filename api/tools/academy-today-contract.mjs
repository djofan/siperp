export function applyAcademyTodayContract(document) {
  const jsonBody = schema => ({ required: true, content: { 'application/json': { schema } } });
  const date = {type:'string',format:'date-time'};
  const activity = {type:'object',required:['id','title','opensAt','closesAt'],properties:{id:{type:'string'},title:{type:'string'},opensAt:date,closesAt:date}};
  document.components.schemas.AcademyToday = {type:'object',additionalProperties:false,required:['serverNow','nextChangeAt','material','exam'],properties:{
    serverNow:date,nextChangeAt:{type:['string','null'],format:'date-time'},
    material:{anyOf:[{...activity,required:[...activity.required,'number'],properties:{...activity.properties,number:{type:'integer',minimum:1,maximum:12}}},{type:'null'}]},
    exam:{anyOf:[{...activity,required:[...activity.required,'kind','completed'],properties:{...activity.properties,kind:{enum:['DAILY','WEEKLY','FINAL']},completed:{type:'boolean'}}},{type:'null'}]},
  }};
  document.paths['/api/v1/academy/learning/today'] = {get:{
    tags:['Academy'],summary:'Own current dashboard material and exam',security:[{bearerAuth:[]}],
    description:'Active authenticated participant, initial password changed, Academy active and not under maintenance. Uses current profile cohort and own course enrollment; query selectors cannot select another profile. At most one material and one exam: opening inclusive, closing exclusive, latest opening wins then stable ID. Twelve materials ordered by chapter and material order including draft placeholders; 4 per week for 3 weeks, Sunday-Wednesday 17 WIB, each 24 hours. Materials require an explicitly configured cohort Sunday, published course/chapter/lesson and existing release authorization. Quizzes require publication/active flags, own enrollment, bounded valid opening/closing. Completed exams stay in current slot until closing. Never includes questions, answers, snapshots, files or private participant fields. No business writes. nextChangeAt is earliest future boundary, timestamps UTC. no-store, private. Expired content is only excluded from dashboard, not unpublished or deleted from history.',
    responses:{200:{description:'Current activity',content:{'application/json':{schema:{type:'object',required:['data'],properties:{data:{$ref:'#/components/schemas/AcademyToday'}}}}}},401:{description:'Unauthenticated/inactive'},403:{description:'Module unavailable or initial password change required'},404:{description:'No participant profile'}},
  }};
  document.paths['/api/v1/academy/admin/cohorts/{id}/dashboard-schedule'] = {put:{
    tags:['Academy'],summary:'Configure cohort automatic timetable',security:[{bearerAuth:[]}],
    description:'Academy admin/Superadmin only. startsOn must be Sunday YYYY-MM-DD or null. Atomic. Configures existing and later saved DAILY exams in creation order, including drafts: Monday-Thursday 17 WIB for 3 weeks, each 24 hours; max 12. One FINAL exam Friday of week 4 17 WIB to Sunday 17 WIB. WEEKLY dates stay manual. Changes quiz_date, closes_at and release_day (daily sequence 1-12, final 1) only; never publishes content or removes history. Cannot move/disable anchor after any attempt; automatic synchronization cannot shift attempted deadlines. Null disables material dashboard slots but retains stored exam times. Four relative weeks may cross months. Migration 2026_11_17_000002_add_academy_dashboard_schedule required.',
    parameters:[{name:'id',in:'path',required:true,schema:{type:'string'}}],
    requestBody:jsonBody({type:'object',additionalProperties:false,required:['startsOn'],properties:{startsOn:{type:['string','null'],format:'date'}}}),
    responses:{200:{description:'Saved anchor; no-store, private'},401:{description:'Unauthenticated/inactive'},403:{description:'Not Academy admin'},404:{description:'Unknown cohort'},409:{description:'Attempts already started'},422:{description:'Invalid date or timetable capacity'}},
  }};
}
