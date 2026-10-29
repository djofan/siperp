import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

test("returning applicants can be searched and reused without copying old workflow state or photos",()=>{
  const intake=readFileSync("modules/bantuan/components/IntakeForm.tsx","utf8");
  const picker=readFileSync("modules/bantuan/components/ReturningApplicantPicker.tsx","utf8");
  assert.match(picker,/role="combobox"/);
  assert.match(picker,/role="listbox"/);
  assert.match(picker,/applicants\/search/);
  assert.match(picker,/Isi otomatis dari data terakhir/);
  assert.match(picker,/Isi ulang, gunakan nama & NIK/);
  assert.match(intake,/problem:"",intakeType:"returning"/);
  assert.match(intake,/name:detail.applicant.name,nik:detail.applicant.nik/);
  assert.match(intake,/if\(hasInput\)setReuse/);
  const apply=intake.match(/function applyPrevious\([\s\S]*?\n  \}/)[0];
  assert.doesNotMatch(apply,/setDocuments|setSaved|detail\.status|detail\.amount|detail\.documents/);
});

test("transfer proof is optional and uploaded within the disbursement form",()=>{
  const actions=readFileSync("modules/bantuan/components/ActionPanel.tsx","utf8");
  const workspace=readFileSync("modules/bantuan/components/Workspace.tsx","utf8");
  assert.match(actions,/kind:"transfer",minimum:0/);
  assert.match(actions,/key==="disburse"&&!transferPhotosReady/);
  assert.doesNotMatch(actions,/Unggah bukti transfer terlebih dahulu pada bagian dokumen/);
  assert.match(workspace,/Bukti transfer \(opsional\)/);
  assert.doesNotMatch(workspace,/Unggah bukti transfer untuk pencairan massal/);
});

test("failed draft saves leave saving state and keep the form available for retry",()=>{
  const intake=readFileSync("modules/bantuan/components/IntakeForm.tsx","utf8");
  const client=readFileSync("modules/bantuan/api/client.ts","utf8");
  assert.match(intake,/then\(job\)\.catch\(error=>\{setSaveState\("local"\);throw error;\}\)/);
  assert.match(client,/Server belum dapat memproses permintaan/);
});

test("same applicant history lists previous programs dates statuses and amounts without blocking intake",()=>{
  const history=readFileSync("modules/bantuan/components/ApplicantHistory.tsx","utf8");
  const intake=readFileSync("modules/bantuan/components/IntakeForm.tsx","utf8");
  const workspace=readFileSync("modules/bantuan/components/Workspace.tsx","utf8");
  for(const field of ["item.program","item.createdAt","item.status","item.amount","item.number"])assert.ok(history.includes(field));
  assert.match(history,/Pengajuan baru tetap dapat dilanjutkan/);
  assert.match(history,/target="_blank"/);
  assert.match(intake,/excludeId:saved\?\.id\?\?initial\?\.id/);
  assert.match(intake,/duplicate.nik===String\(form.applicant.nik/);
  assert.match(workspace,/<ApplicantHistory count=\{row.duplicateCount\}/);
});

test("santunan uses compact cards without changing its transfer and two evidence workflow",()=>{
  const page=readFileSync("modules/bantuan/components/Santunan.tsx","utf8");
  const policy=readFileSync("modules/bantuan/policy.ts","utf8");
  assert.match(page,/className=\{d.cards\}/);
  assert.match(page,/hidden=\{!showCreate\}/);
  assert.match(page,/hidden=\{expanded!==row.id\}/);
  assert.match(page,/for\(const kind of \["aid_paper","recipient_photo"\]\)/);
  assert.match(page,/santunan\/\$\{row.id\}\/transferred/);
  assert.match(page,/santunan\/\$\{row.id\}\/complete/);
  assert.match(page,/version:row.version/);
  assert.match(page,/role==="volunteer"&&viewer.id===row.volunteerId/);
  assert.match(policy,/if\(viewer.role==="volunteer"\)return route.length===1&&route\[0\]==="santunan"/);
});

test("survey evidence uploads inside survey entry and remains visible in the document gallery",()=>{
  const actions=readFileSync("modules/bantuan/components/ActionPanel.tsx","utf8");
  const documentUpload=actions.slice(actions.indexOf("export function DocumentUpload"),actions.indexOf("export function ActionPanel"));
  assert.match(documentUpload,/if\(k.startsWith\("survey_"\)\|\|k==="sktm"\|\|k==="transfer"\|\|\["handover","certificate","receipt"\].includes\(k\)\)return false/);
  assert.match(actions,/aria-label="Foto hasil survei"/);
  assert.match(actions,/<PhotoSlots owner=\{viewer.id\} applicationId=\{row.id\} documents=\{row.documents\} requirements=\{surveyPhotos\}/);
  assert.match(actions,/minimumTotal=\{viewer.settings.minimumSurveyPhotos\}/);
  assert.match(actions,/onUploaded=\{reload\}/);
  assert.match(actions,/key==="survey_submit"&&!surveyPhotosReady/);
  assert.match(documentUpload,/documents=\{row.documents\} allDocuments/);
});

test("survey entry is a compact two column form with no resize corner or field borders",()=>{
  const actions=readFileSync("modules/bantuan/components/ActionPanel.tsx","utf8");
  const css=readFileSync("modules/bantuan/components/Workspace.module.css","utf8");
  const fields=actions.match(/const surveyFields=\[([\s\S]*?)\n\];/)[1];
  assert.doesNotMatch(fields,/wide:true/);
  assert.match(actions,/className=\{active==="survey_submit"\?s.surveyForm:undefined\}/);
  assert.match(css,/\.surveyForm \.formGrid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/\.surveyForm \.input\{border:0/);
  assert.match(css,/\.surveyForm \.field textarea\{[^}]*resize:none/);
  assert.match(css,/@media\(max-width:760px\)\{\.surveyForm \.formGrid\{grid-template-columns:minmax\(0,1fr\)/);
});

test("detail follows applicant documents action history order with survey entry only for its assigned verifier",()=>{
  const workspace=readFileSync("modules/bantuan/components/Workspace.tsx","utf8");
  const actions=readFileSync("modules/bantuan/components/ActionPanel.tsx","utf8");
  assert.match(workspace,/const detailTabs=\[\{id:"pemohon",label:"Data pemohon"\},\{id:"dokumen",label:"Dokumen pendukung"\},\{id:"tindakan",label:isSurveyEntry\?"Hasil survei":"Tindakan"\},\{id:"riwayat",label:"Riwayat"\}\]/);
  assert.match(workspace,/viewer.role==="verifier"&&row.verifierId===viewer.id&&row.status==="survey_assigned"/);
  assert.match(workspace,/row.survey&&!isSurveyEntry/);
  assert.match(actions,/row.status==="survey_assigned"\?"survey_submit":null/);
});

test("completed actions and explicit server draft saves show feedback and return to the list",()=>{
  const feedback=readFileSync("modules/bantuan/components/ProcessSuccess.tsx","utf8");
  const actions=readFileSync("modules/bantuan/components/ActionPanel.tsx","utf8");
  const intake=readFileSync("modules/bantuan/components/IntakeForm.tsx","utf8");
  const workspace=readFileSync("modules/bantuan/components/Workspace.tsx","utf8");
  assert.match(feedback,/setTimeout\(proceed,2200\)/);
  assert.match(feedback,/clearTimeout\(timer\)/);
  assert.match(feedback,/router.replace\("\/admin\/bantuan\/pengajuan"\)/);
  assert.match(feedback,/if\(leaving.current\)return/);
  assert.match(actions,/if\(key==="comment"\)/);
  assert.match(actions,/setSuccess\(key==="survey_save"\?"Draft survei tersimpan"/);
  assert.match(actions,/if\(success\)return <ProcessSuccess/);
  assert.match(intake,/if\(result\)return <ProcessSuccess/);
  assert.match(intake,/if\(manualDraft\)return <ProcessSuccess/);
  assert.match(intake,/const draft=await persist\(form\);stopping.current=true;operation.current="done";setManualDraft\(draft\)/);
  assert.match(workspace,/setBatchSuccess\(true\)/);
  assert.match(workspace,/batchSuccess&&<ProcessSuccess/);
});

test("document detail uses the same photo cards for all authorized evidence",()=>{
  const actions=readFileSync("modules/bantuan/components/ActionPanel.tsx","utf8");
  const gallery=readFileSync("modules/bantuan/components/PhotoReview.tsx","utf8");
  assert.match(actions,/<PhotoReview owner=\{viewer.id\} applicationId=\{row.id\} documents=\{row.documents\} allDocuments/);
  assert.match(gallery,/allDocuments\|\|kinds.includes\(doc.kind\)/);
  assert.match(gallery,/!allDocuments&&!ids.has/);
});

test("photo cards fill edge to edge with overlaid captions like LAZSIP",()=>{
  const css=readFileSync("modules/bantuan/components/Workspace.module.css","utf8");
  assert.match(css,/\.reviewPhotoCard>button\{[^}]*height:280px;[^}]*padding:0/);
  assert.match(css,/\.reviewPhotoCard img\{[^}]*object-fit:cover;object-position:center/);
  assert.match(css,/\.reviewPhotoCard>div\{position:absolute;[^}]*background:linear-gradient/);
  const thumbnailRules=[...css.matchAll(/\.photoPreview img\{([^}]+)\}/g)];
  assert.match(thumbnailRules.at(-1)[1],/object-fit:cover/);
});

test("review includes private photo cards and a draft source selector",()=>{
  const review=readFileSync("modules/bantuan/components/PhotoReview.tsx","utf8");
  const form=readFileSync("modules/bantuan/components/IntakeForm.tsx","utf8");
  assert.match(form,/<PhotoReview owner=/);
  assert.match(form,/<h3>Tipe pengajuan<\/h3>/);
  assert.doesNotMatch(form,/disabled=\{!!initial\|\|direct\}/);
  assert.match(review,/\/api\/bantuan\/documents\//);
  assert.match(review,/photo.caption/);
  assert.match(review,/subscribePhotos/);
});

test("intake photos follow source and preserve individual captions in the upload queue",()=>{
  const slots=readFileSync("modules/bantuan/components/PhotoSlots.tsx","utf8");
  const form=readFileSync("modules/bantuan/components/IntakeForm.tsx","utf8");
  const queue=readFileSync("modules/bantuan/api/photo-queue.ts","utf8");
  assert.match(form,/requirements=\{intakePhotos\(form.source\)\}/);
  assert.match(slots,/minimum:source==="online"\?0:1/);
  assert.match(slots,/kind:"kk",minimum:0/);
  assert.match(slots,/kind:"supporting",minimum:0/);
  assert.match(slots,/Keterangan foto \$\{i\+1\}/);
  assert.match(slots,/doc.caption/);
  assert.match(queue,/body.set\("caption",photo.caption\)/);
});

test("dependent editor keeps actions outside the aligned responsive input grid",()=>{
  const editor=readFileSync("modules/bantuan/components/Dependents.tsx","utf8");
  const css=readFileSync("modules/bantuan/components/Dependents.module.css","utf8");
  assert.match(editor,/className=\{d.personHeader\}/);
  assert.match(editor,/className=\{d.fields\}/);
  assert.match(editor,/className=\{d.footer\}/);
  assert.doesNotMatch(editor,/<fieldset|<legend|s\.ghost/);
  for(const name of ["Nama tanggungan","Hubungan tanggungan","Umur tanggungan","Status tanggungan","Hapus tanggungan"])assert.ok(editor.includes(name));
  assert.match(css,/@media\(max-width:1000px\)/);
  assert.match(css,/@media\(max-width:480px\)/);
});

test("SKTM willingness is only shown and required when SKTM is not yet owned",()=>{
  const intake=readFileSync("modules/bantuan/components/IntakeForm.tsx","utf8");
  assert.match(intake,/key:"hasSktm",label:"Sudah punya SKTM\?"/);
  assert.match(intake,/f.key==="willingSktm"&&values.hasSktm!==false\)continue/);
  assert.match(intake,/f.key!=="willingSktm"\|\|values.hasSktm===false/);
  assert.match(intake,/if\(f.key==="hasSktm"\)set\("willingSktm",""\)/);
});

test("Bantuan is internal and enters through the Core access guard", () => {
  const layout = readFileSync("app/admin/bantuan/layout.tsx", "utf8");
  assert.match(layout, /requireModuleAdmin\("bantuan"\)/);
  assert.equal(existsSync("app/(public)/bantuan"), false);
  const routes = readFileSync("api/app/Modules/Bantuan/Providers/BantuanServiceProvider.php", "utf8");
  assert.match(routes, /auth:sanctum/);
  assert.match(routes, /module\.access:bantuan/);
});

test("form mutations preserve version guards and partial drafts", () => {
  const intake = readFileSync("modules/bantuan/components/IntakeForm.tsx", "utf8");
  const actions = readFileSync("modules/bantuan/components/ActionPanel.tsx", "utf8");
  assert.match(intake, /draft:!final/);
  assert.match(intake, /Simpan draft/);
  assert.match(actions, /version:row\.version/);
  assert.match(actions, /Simpan draft survei/);
  assert.doesNotMatch(intake + actions, /localStorage|sessionStorage/);
});

test("private evidence is only linked through authenticated module endpoints", () => {
  const evidence = readFileSync("modules/bantuan/components/PhotoReview.tsx", "utf8");
  assert.match(evidence, /\/api\/bantuan\/documents\//);
  assert.doesNotMatch(evidence, /\/storage\//);
  const photos = readFileSync("modules/bantuan/api/photos.ts", "utf8");
  assert.match(photos, /createImageBitmap/);
  assert.match(photos, /blob\.size<=1024\*1024/);
});

test("layout keeps field and navigation spacing on desktop and mobile", () => {
  const css = readFileSync("modules/bantuan/components/Workspace.module.css", "utf8");
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /overflow-y:auto/);
  assert.match(css, /prefers-reduced-motion/);
});

test("photo refresh does not unmount active forms or rehydrate entered values", () => {
  const workspace=readFileSync("modules/bantuan/components/Workspace.tsx","utf8");
  const intake=readFileSync("modules/bantuan/components/IntakeForm.tsx","utf8");
  const refresh=workspace.match(/const reload=useCallback\(\(\)=>\{([^}]+)\}/)?.[1];
  assert.ok(refresh);
  assert.doesNotMatch(refresh,/setLoading/);
  assert.match(workspace, /ActionPanel key=\{row\.id\}/);
  assert.doesNotMatch(workspace,/key=\{row\.id\+.*row\.version/);
  const photoRefresh=intake.match(/const refreshDocuments=useCallback\(async\(\)=>\{([\s\S]*?)\},\[\]\)/)?.[1];
  assert.ok(photoRefresh);
  assert.match(photoRefresh,/setDocuments\(latest\.documents\)/);
  assert.doesNotMatch(photoRefresh,/setForm|setLoaded|router|location|reload/);
  assert.match(intake,/const initial=initialSnapshot\.current/);
  assert.match(intake,/\},\[viewer\.id,vaultKey\]\)/);
  assert.match(intake,/hidden=\{form\.step!==2\}/);
});

test("light Bantuan shell shares card and table presentation while keeping actions discoverable",()=>{
  const workspace=readFileSync("modules/bantuan/components/Workspace.tsx","utf8");
  const listing=readFileSync("modules/bantuan/components/ApplicationList.tsx","utf8");
  const css=readFileSync("modules/bantuan/components/Workspace.module.css","utf8");
  assert.match(workspace,/<ApplicationList /);
  assert.match(listing,/className=\{shared.stickyAction\}/);
  assert.match(workspace,/aria-label="Langkah berikutnya"/);
  assert.match(workspace,/navigation\(viewer\)/);
  assert.match(css,/\.table \.stickyAction\{position:sticky;right:0/);
  assert.match(css,/\.desktopTable\{display:none\}/);
  assert.match(css,/\.nav\{display:flex;flex-direction:column/);
  assert.match(css,/linear-gradient\(135deg,#f4faf0,#fff/);
});

test("compact detail panels retain mounted forms when switching sections",()=>{
  const workspace=readFileSync("modules/bantuan/components/Workspace.tsx","utf8");
  const css=readFileSync("modules/bantuan/components/Workspace.module.css","utf8");
  assert.match(workspace,/role="tablist" aria-label="Bagian pengajuan"/);
  assert.match(workspace,/hidden=\{section!=="tindakan"\}/);
  assert.match(workspace,/hidden=\{section!=="dokumen"\}/);
  assert.match(workspace,/ActionPanel key=\{row\.id\}/);
  assert.match(workspace,/\[\.\.\.row\.events\]\.reverse\(\)/);
  assert.match(css,/\.historyScroll\{[^}]*max-height:440px;overflow-y:auto/);
  assert.match(css,/\.casePanel\[hidden\]\{display:none\}/);
});

test("intake does not ask for or require an assignment region",()=>{
  const intake=readFileSync("modules/bantuan/components/IntakeForm.tsx","utf8");
  assert.doesNotMatch(intake,/Wilayah penugasan|current\.region|aid-regions/);
});

test("intake uses four steps without reporter fields or required reporter data",()=>{
  const intake=readFileSync("modules/bantuan/components/IntakeForm.tsx","utf8");
  const workspace=readFileSync("modules/bantuan/components/Workspace.tsx","utf8");
  assert.match(intake,/const labels=\["Data pemohon","Kondisi & kebutuhan","Foto & dokumen","Periksa & kirim"\]/);
  assert.doesNotMatch(intake,/Data pelapor|reporterFields|validateFields\([^,]+,form\.reporter/);
  assert.doesNotMatch(workspace,/case-panel-pelapor/);
  assert.match(intake,/form\.step===1\)\{operation.current="advance";setBusy\(true\);try\{await persist/);
  assert.match(intake,/formVersion:2/);
  assert.match(intake,/form\.step===3\?"Kirim pengajuan"/);
  assert.doesNotMatch(intake,/form\.step===4/);
});
