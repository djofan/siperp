"use client";
/* eslint-disable @next/next/no-img-element -- authenticated private attachment preview */
import { FileText } from "lucide-react";
import { attachmentType, isPhoto } from "../attachments";

export function AttachmentPreview({src,mime,title}:{src:string;mime?:string;title:string}) {
  return isPhoto(mime)?<img src={src} alt={title}/>:<span style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,padding:18,color:"#245740",minHeight:100,width:"100%"}}><FileText size={32} strokeWidth={1.4}/><strong>{attachmentType(mime)}</strong><small style={{overflowWrap:"anywhere"}}>{title}</small></span>;
}
