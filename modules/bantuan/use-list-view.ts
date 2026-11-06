"use client";
import { useSyncExternalStore } from "react";
type View = "cards" | "table";
const eventName = "bantuan-list-view";
const fallback=new Map<string,View>();
function subscribe(notify:()=>void){
  window.addEventListener("storage",notify);
  window.addEventListener(eventName,notify);
  return ()=>{window.removeEventListener("storage",notify);window.removeEventListener(eventName,notify);};
}
export function useListView(accountId?:string):[View,(view:View)=>void]{
  const key=`bantuan:list-view:${accountId??"session"}`;
  const view=useSyncExternalStore(subscribe,()=>{
    try{return localStorage.getItem(key)==="table"?"table":"cards";}catch{return fallback.get(key)??"cards";}
  },()=>"cards" as View);
  return [view,(value)=>{
    fallback.set(key,value);
    try{localStorage.setItem(key,value);}catch{/* Keep selection for this session when storage is unavailable. */}
    window.dispatchEvent(new Event(eventName));
  }];
}
