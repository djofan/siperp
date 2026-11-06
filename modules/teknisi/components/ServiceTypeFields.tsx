"use client";
import type { WarrantyTicket } from "../api/workflow";
import { Choice } from "./Fields";

export function ServiceTypeFields({tickets,parentId}:{tickets:WarrantyTicket[];parentId?:string}) {
  function selectParent(event:React.ChangeEvent<HTMLDivElement>) {
    if (!(event.target instanceof HTMLSelectElement)) return;
    const form=event.target.form; if(!form)return;
    const type=form.elements.namedItem("serviceType");
    const parent=form.elements.namedItem("warrantyParentId");
    if (!(type instanceof HTMLSelectElement) || !(parent instanceof HTMLSelectElement))return;
    parent.required=type.value==="warranty";
    if (type.value!=="warranty")return;
    const ticket=tickets.find(row=>row.id===parent.value); if(!ticket)return;
    for(const [name,value] of Object.entries({customerName:ticket.customerName,customerPhone:ticket.customerPhone,device:ticket.device,outletId:ticket.outletId,estimate:"0"})) {
      const control=form.elements.namedItem(name);
      if(control instanceof HTMLInputElement && control.type!=="hidden" || control instanceof HTMLSelectElement)control.value=value;
    }
  }
  return <div className="tech-form-grid full" onChange={selectParent}>
    <Choice name="serviceType" label="Tipe servis" value={parentId?"warranty":"normal"} required><option value="normal">Servis normal</option><option value="warranty">Servis garansi</option></Choice>
    <Choice name="warrantyParentId" label="Tiket asal (wajib untuk garansi)" required={!!parentId} value={parentId??""}><option value="">Pilih tiket yang masih bergaransi</option>{tickets.map(ticket=><option key={ticket.id} value={ticket.id}>{ticket.number} · {ticket.device} · {ticket.customerName}</option>)}</Choice>
  </div>;
}
