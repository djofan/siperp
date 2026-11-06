export type LearningModule = "tanwir" | "ojol";
export interface ParticipantReport {
  id:string;code:string;name:string;active:number;group_name:string|null;
  assigned:number;due:number;submitted:number;approved:number;pending:number;rejected:number;
  on_time:number;late:number;attempts:number;quizzes:number;score:number|null;
  missing:number;overdue:number;completion:number|null;last_submission:string|null;
}
export interface ReportResponse {
  data:ParticipantReport[];
  meta:{current_page:number;last_page:number;total:number;per_page:number};
  summary:{participants:number;assigned:number;approved:number;pending:number;overdue:number;late:number;score:number|null};
  groups:{id:string;name:string;code:string}[];teachers:{id:string;name:string;code:string}[];scope:"admin"|"guru";
}
export function engagement(row:ParticipantReport){return !Number(row.assigned)?"Belum ada tugas":Number(row.on_time)/Number(row.assigned)>=.8?"Konsisten":!Number(row.submitted)?"Belum mengumpulkan":"Perlu perhatian";}
