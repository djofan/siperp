import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import vm from "node:vm";
import ts from "typescript";
const require=createRequire(import.meta.url),React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
function load(file,stubs={},globals={}){const ctx={exports:{},FormData,...globals,require(name){return Object.hasOwn(stubs,name)?stubs[name]:require(name);}};vm.runInNewContext(ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,ctx);return ctx.exports;}
const reader=load("modules/academy/components/admin/quiz-review.ts");
const media=load("modules/academy/components/QuestionMedia.tsx",{"next/image":{default:({unoptimized:_unoptimized,...props})=>React.createElement("img",props)}});
const Preview=load("modules/academy/components/admin/QuizReviewQuestions.tsx",{"../QuestionMedia":media});
function question(n=1){return {id:"q"+n,question:"Soal "+n,order:n,weight:2,type:"MULTIPLE",options:[{id:"a"+n,label:"Pilihan satu "+n,isCorrect:true},{id:"b"+n,label:"Pilihan dua "+n,isCorrect:false},{id:"c"+n,label:"Pilihan tiga "+n,isCorrect:true}]};}
function fields(){const f=new FormData();for(const [key,value]of Object.entries({title:"Ujian diedit",kind:"DAILY",description:"Deskripsi ujian",timeLimitMinutes:"90",cohortId:"cohort",quizDate:"2026-12-01T17:00",closesAt:"2026-12-02T17:00","questions[0][id]":"q1","questions[0][question]":"Pertanyaan baru yang belum disimpan","questions[0][type]":"MULTIPLE","questions[0][weight]":"3","questions[0][order]":"0","questions[0][explanation]":"Pembahasan baru","questions[0][options]":JSON.stringify([{id:"a",label:"Opsi terbaru A",isCorrect:false},{id:"b",label:"Opsi terbaru B",isCorrect:true},{id:"c",label:"Opsi terbaru C",isCorrect:true}])}))f.set(key,value);return f;}

test("inline review reads unsaved text/options and preserves every multiple-choice answer and saved media",()=>{
 const old={...question(),mediaMime:"image/png",mediaAlt:"Diagram soal"};const rows=reader.readReviewQuestions(fields(),[old]);
 assert.equal(rows[0].question,"Pertanyaan baru yang belum disimpan");assert.deepEqual(Array.from(rows[0].options,o=>o.isCorrect),[false,true,true]);assert.equal(rows[0].options[0].label,"Opsi terbaru A");assert.equal(rows[0].weight,3);assert.equal(rows[0].explanation,"Pembahasan baru");assert.equal(rows[0].mediaAlt,"Diagram soal");
 const broken=fields();broken.set("questions[0][options]","invalid");assert.throws(()=>reader.readReviewQuestions(broken,[old]));
});

test("preview renders every question and choice, answer keys, explanations and authenticated media URLs",()=>{
 const questions=Array.from({length:12},(_,i)=>question(i+1));questions[0]={...questions[0],mediaMime:"image/png",mediaAlt:"Diagram",explanation:"Penjelasan lengkap"};questions[1]={...questions[1],mediaMime:"audio/mpeg",mediaName:"Rekaman soal.mp3"};
 const html=renderToStaticMarkup(React.createElement(Preview.QuizReviewQuestions,{questions}));
 for(const q of questions){assert.ok(html.includes(q.question));for(const o of q.options)assert.ok(html.includes(o.label));}
 assert.equal((html.match(/✓ Jawaban benar/g)||[]).length,24);assert.match(html,/Penjelasan lengkap/);assert.match(html,/src="\/api\/academy\/questions\/q1\/media"/);assert.match(html,/src="\/api\/academy\/questions\/q2\/media"/);assert.match(html,/<audio/);assert.match(html,/Pilihan ganda \(beberapa jawaban\)/);
});

function harness(props){
 const slots=[];let cursor=0,actionFn;const calls=[];
 const hooks={...React,useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==="function"?initial():initial;return [slots[i],value=>{slots[i]=typeof value==="function"?value(slots[i]):value;}];},useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},useId:()=>"review",useActionState(fn){actionFn=fn;return [{error:""},fn,false];}};
 class BrowserFormData extends FormData{constructor(form){super();if(form?.data)for(const [key,value]of form.data)this.append(key,value);}}
 class Select{constructor(text){this.selectedOptions=[{text}];}}
 const component=load("modules/academy/components/admin/QuizForm.tsx",{"react":hooks,"@/modules/academy/components/ui/ButtonCompat":{Button:({children,variant:_variant,size:_size,...props})=>React.createElement("button",props,children)},"@/modules/academy/components/ui/FieldCompat":{FormField:({children,label})=>React.createElement("label",null,label,children),Input:props=>React.createElement("input",props),Select:props=>React.createElement("select",props)},"@/components/ui/panel":{panelClasses:x=>x},"./QuestionForm":{QuestionFields:()=>null},"./ExamDurationField":{ExamDurationField:()=>null},"../ChapterSelect":{ChapterSelect:()=>null},"./QuizReviewQuestions":Preview,"./quiz-review":reader},{FormData:BrowserFormData,HTMLSelectElement:Select});
 const allProps={initial:{title:"Ujian",description:"",passingScore:0,timeLimitMinutes:90,quizDate:"",isActive:true,isPublished:true,allowRetake:false},action:async(_,f)=>{calls.push(new Map(f));return {error:""};},...props};
 const form={data:fields(),elements:{namedItem:name=>new Select(name==="kind"?"Harian":"Angkatan 1")}};
 function tree(){cursor=0;return component.QuizForm(allProps);}
 const event=confirmed=>({currentTarget:form,nativeEvent:{submitter:{value:"activate",dataset:confirmed?{confirmActivation:"true"}:{}}},preventDefault(){this.prevented=true;}});
 return {tree,event,calls,form,activate:f=>actionFn({error:""},f)};
}
function find(node,predicate){if(!node||typeof node!=="object")return null;if(predicate(node))return node;const children=React.Children.toArray(node.props?.children);for(const child of children){const match=find(child,predicate);if(match)return match;}return null;}

test("activation requires review and confirmation submits the exact reviewed snapshot despite disabled form controls",async()=>{
 const h=harness({withQuestions:true,questions:[question()]});let tree=h.tree();const confirmOnly=new FormData();confirmOnly.set("intent","activate");
 const denied=await h.activate(confirmOnly);assert.match(denied.error,/Periksa/);assert.equal(h.calls.length,0);
 const opening=h.event(false);await tree.props.onSubmit(opening);assert.equal(opening.prevented,true);assert.equal(h.calls.length,0);
 tree=h.tree();const dialog=find(tree,node=>node.props?.role==="dialog");assert.ok(dialog);assert.equal(find(tree,node=>node.type==="fieldset").props.disabled,true);
 const preview=find(dialog,node=>node.type===Preview.QuizReviewQuestions);assert.equal(preview.props.questions[0].question,"Pertanyaan baru yang belum disimpan");
 h.form.data.set("title","Diubah di belakang dialog");
 const confirm=h.event(true);await tree.props.onSubmit(confirm);assert.equal(confirm.prevented,undefined);await h.activate(confirmOnly);
 assert.equal(h.calls.length,1);assert.equal(h.calls[0].get("title"),"Ujian diedit");assert.equal(h.calls[0].get("timeLimitMinutes"),"90");assert.equal(h.calls[0].get("isActive"),"on");assert.match(h.calls[0].get("questions[0][options]"),/Opsi terbaru C/);
});

test("teacher review loads all questions beyond the visible table page and cancel clears activation snapshot",async()=>{
 let loads=0;const all=Array.from({length:12},(_,i)=>question(i+1));const h=harness({questionCount:12,loadReviewQuestions:async()=>{loads++;return {questions:all,error:""};}});
 await h.tree().props.onSubmit(h.event(false));const tree=h.tree();const dialog=find(tree,node=>node.props?.role==="dialog");assert.ok(dialog);assert.equal(find(dialog,node=>node.type===Preview.QuizReviewQuestions).props.questions.length,12);assert.equal(loads,1);assert.equal(h.calls.length,0);
 dialog.props.onKeyDown({key:"Escape",preventDefault(){}});assert.equal(find(h.tree(),node=>node.props?.role==="dialog"),null);
 const form=new FormData();form.set("intent","activate");assert.match((await h.activate(form)).error,/Periksa/);assert.equal(h.calls.length,0);
});

test("failed review loading blocks activation and allows retry",async()=>{
 let fail=true;const h=harness({questionCount:12,loadReviewQuestions:async()=>fail?{questions:[],error:"Soal belum dapat dimuat"}:{questions:[question()],error:""}});
 await h.tree().props.onSubmit(h.event(false));let tree=h.tree();assert.equal(find(tree,node=>node.props?.role==="dialog"),null);assert.equal(find(tree,node=>node.props?.role==="alert").props.children,"Soal belum dapat dimuat");assert.equal(h.calls.length,0);
 fail=false;await tree.props.onSubmit(h.event(false));tree=h.tree();assert.ok(find(tree,node=>node.props?.role==="dialog"));
});

test("review loader uses protected non-paginated read only and strips unknown fields",async()=>{
 const calls=[];class ApiError extends Error{};const q={...question(),mediaPath:"private-storage-path",token:"secret"};let rejected=false;
 const api=load("modules/academy/api/quiz-review.ts",{"@/lib/api":{ApiError,apiRequest:async(path,...args)=>{calls.push({path,args});if(rejected)throw new ApiError("Forbidden");return {quiz:{questions:[q]}};}}});
 const result=await api.loadQuizReviewQuestions("exam/id");assert.equal(calls[0].path,"academy/teacher/quizzes/exam%2Fid");assert.equal(calls[0].args.length,0);assert.equal(result.questions.length,1);assert.equal(result.questions[0].mediaPath,undefined);assert.equal(result.questions[0].token,undefined);
 rejected=true;const denied=await api.loadQuizReviewQuestions("other");assert.equal(denied.error,"Forbidden");assert.equal(denied.questions.length,0);
});


test("edit form uses current exam terminology and Save Changes without removing activation review",()=>{
 const h=harness({withQuestions:true,questions:[question()]});const tree=h.tree();
 const html=renderToStaticMarkup(tree);
 assert.match(html,/Jenis ujian/);assert.match(html,/>Pekanan</);assert.match(html,/>Ujian Akhir</);
 assert.doesNotMatch(html,/Jenis evaluasi|Mingguan|Evaluasi akhir/);
 const button=find(tree,node=>node.props?.name==="intent"&&node.props?.value==="activate");
 assert.equal(button.props.children,"Simpan Perubahan");assert.equal(typeof tree.props.onSubmit,"function");
});


test("participant review marks selected correct and wrong options and every unanswered question",()=>{
 const policy=load("modules/academy/api/policy.ts");
 const review=load("modules/academy/components/QuizReview.tsx",{"../api/policy":policy,"./QuestionMedia":media});
 const questions=[1,2,3].map(n=>question(n));
 const snapshot={passingScore:0,timeLimitMinutes:4,questions,responses:{q1:["a1","c1"],q2:["b2"]}};
 const html=renderToStaticMarkup(React.createElement(review.QuizReview,{snapshot}));
 assert.equal((html.match(/Tidak dijawab/g)||[]).length,1);
 assert.equal((html.match(/Jawaban Anda/g)||[]).length,3);
 assert.match(html,/bg-red-50 text-red-800/);assert.match(html,/bg-green-50 text-green-800/);
 const missed=renderToStaticMarkup(React.createElement(review.QuizReview,{snapshot:{...snapshot,responses:{}}}));
 assert.equal((missed.match(/Tidak dijawab/g)||[]).length,3);
 assert.equal((missed.match(/Jawaban Anda/g)||[]).length,0);
});
