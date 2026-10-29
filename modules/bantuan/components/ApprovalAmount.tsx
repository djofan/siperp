"use client";

import { useId, useState } from "react";
import { Wallet, ClipboardList } from "lucide-react";
import type { AidDetail } from "@/contracts/modules/bantuan";
import s from "./ApprovalAmount.module.css";

export function ApprovalAmount({ row }: { row: AidDetail }) {
  const id = useId();
  const [amount, setAmount] = useState(row.amount ? String(row.amount) : "");
  const needs = String(row.survey?.needs || row.applicant.problem || "").trim();

  return <section className={s.panel} aria-label="Penetapan nominal bantuan">
    <div className={s.entry}>
      <div className={s.heading}><span className={s.icon}><Wallet size={22} strokeWidth={1.7}/></span><div><h3>Tetapkan bantuan</h3><p>Sesuaikan dengan hasil survei dan kebutuhan pemohon.</p></div></div>
      <label className={s.label} htmlFor={id}>Nominal bantuan <span>*</span></label>
      <div className={s.amount}><span aria-hidden="true">Rp</span><input
        id={id} type="text" inputMode="numeric" autoComplete="off" placeholder="0" required
        aria-describedby={`${id}-hint`} value={amount ? Number(amount).toLocaleString("id-ID") : ""}
        onChange={event => {
          const digits = event.target.value.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "").slice(0, 13);
          setAmount(digits);
          event.target.setCustomValidity(digits && (Number(digits) < 1 || Number(digits) > 9000000000000) ? "Masukkan nominal antara Rp1 dan Rp9.000.000.000.000." : "");
        }}/></div>
      <input type="hidden" name="amount" value={amount}/>
      <p id={`${id}-hint`} className={s.hint}>Masukkan nominal sesuai kebutuhan pemohon.</p>
      <small>Nominal ini menjadi acuan pengajuan dan pencairan dana.</small>
    </div>
    <aside className={s.context}><span className={s.caption}><ClipboardList size={16}/> Kebutuhan pemohon</span><h4>{row.name}</h4><span className={s.program}>{row.program}</span><p>{needs || "Periksa data pemohon dan hasil survei sebelum menetapkan nominal bantuan."}</p></aside>
  </section>;
}
