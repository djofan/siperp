"use client";
export function PrintButton({label="Cetak nota"}:{label?:string}){return <button type="button" onClick={()=>window.print()}>{label}</button>;}
