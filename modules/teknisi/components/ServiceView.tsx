"use client";
import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";
export function ServiceView({cards,list}:{cards:React.ReactNode;list:React.ReactNode}){
 const [view,setView]=useState<"cards"|"list">("cards");
 return <><div className="tech-list-controls"><div className="tech-view-switch" role="group" aria-label="Tampilan daftar servis"><button type="button" aria-pressed={view==="cards"} onClick={()=>setView("cards")}><LayoutGrid size={15} aria-hidden="true"/>Kartu</button><button type="button" aria-pressed={view==="list"} onClick={()=>setView("list")}><List size={16} aria-hidden="true"/>Tabel</button></div></div>{view==="cards"?cards:list}</>;
}
