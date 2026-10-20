"use client";
import { useState } from "react";
export function ServiceView({cards,list}:{cards:React.ReactNode;list:React.ReactNode}){
 const [view,setView]=useState<"cards"|"list">("cards");
 return <><div className="tech-view-switch" role="group" aria-label="Tampilan daftar servis"><button type="button" aria-pressed={view==="cards"} onClick={()=>setView("cards")}>Kartu</button><button type="button" aria-pressed={view==="list"} onClick={()=>setView("list")}>Tabel</button></div>{view==="cards"?cards:list}</>;
}
