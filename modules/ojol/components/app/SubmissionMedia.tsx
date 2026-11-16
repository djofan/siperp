import {submissionFileUrl} from "./media";

type Media = {index:number;name:string;mime:string;size:number|null};
export function SubmissionMedia({submission}:{submission:{id:string;files?:Media[];fileMime:string|null}}){
 const files=submission.files??(submission.fileMime?[{index:0,name:"Setoran",mime:submission.fileMime,size:null}]:[]);
 if(!files.length)return null;
 return <div className="space-y-4">{files.map((file,index)=><section key={file.index} className="space-y-2">
   <p className="break-all text-sm font-medium">{index+1}. {file.name}</p>
   {file.mime.startsWith("video/")?<video src={submissionFileUrl(submission.id,file.index)} controls playsInline preload="metadata" className="aspect-video w-full rounded-xl bg-ojol-ink"/>:<audio src={submissionFileUrl(submission.id,file.index)} controls preload="metadata" className="w-full"/>}
 </section>)}</div>;
}
