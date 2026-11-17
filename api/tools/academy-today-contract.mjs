export function applyAcademyTodayContract(document) {
  const schedule = {type:['string','null'],pattern:'^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$',description:'Manual WIB local datetime. Both endpoints must be set together, close after open. Null pair removes the dashboard window only; history stays published.'};
  Object.assign(document.components.schemas.AcademyMaterialUpload.properties, {dashboardOpensAt:schedule,dashboardClosesAt:schedule});
  const date = {type:'string',format:'date-time'};
  const activity = {type:'object',required:['id','title','opensAt','closesAt'],properties:{id:{type:'string'},title:{type:'string'},opensAt:date,closesAt:date}};
  document.components.schemas.AcademyToday = {type:'object',additionalProperties:false,required:['serverNow','nextChangeAt','material','exam'],properties:{
    serverNow:date,nextChangeAt:{type:['string','null'],format:'date-time'},
    material:{anyOf:[{...activity,required:[...activity.required,'number'],properties:{...activity.properties,number:{type:'integer',minimum:1}}},{type:'null'}]},
    exam:{anyOf:[{...activity,required:[...activity.required,'kind','completed'],properties:{...activity.properties,kind:{enum:['DAILY','WEEKLY','FINAL']},completed:{type:'boolean'}}},{type:'null'}]},
  }};
  document.paths['/api/v1/academy/learning/today'] = {get:{
    tags:['Academy'],summary:'Own current dashboard material and exam',security:[{bearerAuth:[]}],
    description:'Active authenticated participant, initial password changed, Academy active and not under maintenance. Uses current profile cohort and own course enrollment; query selectors cannot select another profile. At most one material and one exam: opening inclusive, closing exclusive, latest opening wins then stable ID. Materials use independent admin-configured dashboardOpensAt/dashboardClosesAt windows, with no cohort anchor or limit of twelve. Requires published course/chapter/lesson and existing release authorization. Dates are never generated or changed by dashboard reads. Quizzes require publication/active flags, own enrollment, bounded valid opening/closing. Completed exams stay in current slot until closing. Never includes questions, answers, snapshots, files or private participant fields. No business writes. nextChangeAt is earliest future boundary, timestamps UTC. no-store, private. Expired content is only excluded from dashboard, not unpublished or deleted from history.',
    responses:{200:{description:'Current activity',content:{'application/json':{schema:{type:'object',required:['data'],properties:{data:{$ref:'#/components/schemas/AcademyToday'}}}}}},401:{description:'Unauthenticated/inactive'},403:{description:'Module unavailable or initial password change required'},404:{description:'No participant profile'}},
  }};
  delete document.paths['/api/v1/academy/admin/cohorts/{id}/dashboard-schedule'];
}
