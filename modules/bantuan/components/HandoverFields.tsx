"use client";

import { useState } from "react";
import { Banknote, Landmark, Wallet } from "lucide-react";
import type { AidDetail } from "@/contracts/modules/bantuan";
import s from "./HandoverFields.module.css";

export function HandoverFields({ row, today }: { row: AidDetail; today: string }) {
  const [method, setMethod] = useState("tunai");
  const [amount, setAmount] = useState(row.amount ? String(row.amount) : "");
  return <section className={s.panel} aria-label="Rincian penyerahan bantuan">
    <div className={s.nominal}>
      <span className={s.kicker}><Wallet size={17}/> Nominal penyerahan</span>
      <label className={s.field}>Nominal diserahkan <em>*</em>
        <span className={s.amount}><span aria-hidden="true">Rp</span><input type="text" inputMode="numeric" autoComplete="off" required placeholder="0"
          value={amount ? Number(amount).toLocaleString("id-ID") : ""} onChange={event => {
            const digits = event.target.value.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "").slice(0, 13);
            setAmount(digits);
            event.target.setCustomValidity(digits && Number(digits) < 1 ? "Nominal minimal Rp1." : "");
          }}/></span>
      </label>
      <input type="hidden" name="handoverAmount" value={amount}/>
      <p>Isi sesuai nominal yang benar-benar diterima pemohon.</p>
      {row.amount !== null && <small>Bantuan ditetapkan: <strong>Rp{Number(row.amount).toLocaleString("id-ID")}</strong></small>}
    </div>
    <div className={s.details}>
      <fieldset className={s.methods}><legend>Metode penyerahan</legend><div>{[
        { value: "tunai", label: "Tunai", icon: Banknote },
        { value: "transfer", label: "Transfer", icon: Landmark },
      ].map(option => <label key={option.value} data-selected={method === option.value}><input type="radio" name="method" value={option.value} checked={method === option.value} onChange={() => setMethod(option.value)}/><option.icon size={17}/>{option.label}</label>)}</div></fieldset>
      <label className={s.field}>Tanggal penyerahan <em>*</em><input className={s.input} type="date" name="date" defaultValue={today} max={today} required/></label>
    </div>
    <label className={`${s.field} ${s.notes}`}><span>Catatan <small>Opsional</small></span><textarea className={s.input} name="notes" maxLength={5000} placeholder="Tambahkan informasi singkat tentang penyerahan bantuan…"/></label>
  </section>;
}
