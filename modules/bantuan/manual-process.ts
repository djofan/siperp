export const manualStages:Record<string,{action:string;label:string;roles:string[]}[]>={
 draft:[{action:"submit",label:"Catat pengajuan telah dikirim",roles:["requester","call_center"]}],
 needs_data:[{action:"submit",label:"Kirim pengajuan yang telah dilengkapi",roles:["requester","call_center"]}],
 screening:[{action:"screen_pass",label:"Catat lolos pemeriksaan awal",roles:["call_center"]},{action:"screen_reject",label:"Catat penolakan awal",roles:["call_center"]}],
 review1:[{action:"review1_approve",label:"Catat persetujuan untuk survei",roles:["approver","chair","survey_approver"]},{action:"review1_reject",label:"Catat penolakan survei",roles:["approver","chair","survey_approver"]},{action:"request_data",label:"Catat permintaan kelengkapan",roles:["approver","chair","survey_approver"]}],
 survey_assignment:[{action:"assign_survey",label:"Catat penugasan survei",roles:["verifier"]}],
 survey_assigned:[{action:"survey_submit",label:"Catat hasil survei dari WA / Telegram",roles:["verifier"]},{action:"assign_survey",label:"Ganti pelaksana survei",roles:["verifier"]}],
 survey_cc_review:[{action:"survey_review_submit",label:"Periksa & kirim hasil ke Approver",roles:["call_center"]},{action:"survey_return",label:"Minta perbaikan kepada Verifikator",roles:["call_center"]}],
 survey_submitted:[{action:"approve",label:"Catat keputusan nominal bantuan",roles:["approver","chair"]},{action:"review_reject",label:"Catat penolakan bantuan",roles:["approver","chair"]},{action:"survey_again",label:"Catat permintaan survei ulang",roles:["approver","chair"]}],
 approved:[{action:"assign_distributor",label:"Catat penyalur bantuan",roles:["verifier"]}],
 fund_ready:[{action:"fund_submit",label:"Catat dana telah diajukan",roles:["fund_requester"]}],
 fund_submitted:[{action:"fund_approve",label:"Catat persetujuan dana",roles:["fund_requester"]},{action:"fund_reject",label:"Catat penolakan dana",roles:["fund_requester"]}],
 fund_approved:[{action:"disburse",label:"Catat transfer ke penyalur",roles:["treasurer"]}],
 disbursed:[{action:"handover",label:"Catat laporan penyerahan bantuan",roles:["verifier","volunteer"]},{action:"delivery_fail",label:"Catat kendala penyaluran",roles:["verifier","volunteer"]}],
 delivery_failed:[{action:"return_funds",label:"Catat pengembalian dana",roles:["treasurer"]}],
};
manualStages.review2=manualStages.survey_submitted;
manualStages.bypass_review=manualStages.survey_submitted;
export const manualReasonActions=["screen_reject","request_data","review1_reject","review_reject","survey_again","survey_return","fund_reject","delivery_fail"];
