import { BookOpen, ChevronDown } from "lucide-react";
import s from "./Usability.module.css";

export function PageGuide({title,steps}:{title:string;steps:string[]}){
  return <details className={s.guide}><summary><BookOpen size={17}/><span>{title}</span><small>Panduan singkat</small><ChevronDown size={15}/></summary><ol>{steps.map((step,i)=><li key={step}><span>{i+1}</span>{step}</li>)}</ol></details>;
}
