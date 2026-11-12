"use client";

import { useRef, useState, type FormEvent } from "react";
import type { BantuanStaff } from "@/contracts/modules/bantuan";
import { money, request } from "../api/client";
import { downloadSantunanTemplate, matchSantunanVerifiers, readSantunanWorkbook, type SantunanImportRow } from "../santunan-workbook";
import { Button } from "./ui";
import s from "./Workspace.module.css";
import d from "./Santunan.module.css";

export function SantunanExcelImport({ volunteers, onImported }: { volunteers: BantuanStaff[]; onImported: (count: number) => Promise<void> }) {
  const [rows, setRows] = useState<SantunanImportRow[]>([]), [error, setError] = useState("");
  const [reading, setReading] = useState(false), [busy, setBusy] = useState(false);
  const version = useRef(0), fileInput = useRef<HTMLInputElement>(null);
  async function read(file?: File) {
    const current = ++version.current;
    setRows([]); setError(""); setReading(false);
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name) || file.size > 5 * 1024 * 1024) { setError("Pilih file .xlsx maksimal 5 MB. Simpan ulang file .xls sebagai .xlsx."); return; }
    setReading(true);
    try { const result = await readSantunanWorkbook(await file.arrayBuffer()); if (current === version.current) setRows(matchSantunanVerifiers(result, volunteers)); }
    catch (cause) { if (current === version.current) setError(cause instanceof Error ? cause.message : "File gagal dibaca."); }
    finally { if (current === version.current) setReading(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || reading || !rows.length) return;
    const form = new FormData(event.currentTarget); setBusy(true); setError("");
    try {
      const result = await request<{ createdCount: number }>("santunan/imports", { method: "POST", body: JSON.stringify({ period: form.get("period"), rows: matchSantunanVerifiers(rows, volunteers) }) });
      setRows([]); if (fileInput.current) fileInput.current.value = "";
      await onImported(result.createdCount);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Impor gagal."); }
    finally { setBusy(false); }
  }
  return <section className={s.card} aria-label="Impor Excel santunan"><div className={s.cardHeader}><div><h2>Impor Excel santunan</h2><p>Kolom: Nama, Program, Nominal Bantuan, Nama Verifikator. Program: Anak Yatim atau Janda Dhuafa. Maksimal 200 penerima.</p></div></div><div className={s.cardBody}>
    <div className={d.importTools}><Button variant="secondary" disabled={busy} onClick={() => void downloadSantunanTemplate(volunteers.map(person => person.name)).catch(() => setError("Template gagal diunduh."))}>Unduh template Excel</Button>
    <Button variant="secondary" disabled={busy || !volunteers.length} onClick={() => void downloadSantunanTemplate(volunteers.map(person => person.name), true).catch(cause => setError(cause instanceof Error ? cause.message : "Unduhan gagal."))}>Unduh data dummy</Button></div>
    <details className={d.importList}><summary>Daftar nama verifikator / penyalur aktif ({volunteers.length})</summary><ul>{volunteers.map(person => <li key={person.id}>{person.name}</li>)}</ul></details>
    <form onSubmit={submit}><fieldset disabled={busy} style={{ border: 0, padding: 0, margin: "16px 0" }}><div className={s.formGrid}>
      <label className={s.field}>Periode<input className={s.input} name="period" type="month" defaultValue={new Date().toLocaleDateString("en-CA").slice(0, 7)} required /></label>
      <label className={s.field}>File Excel (.xlsx)<input ref={fileInput} className={s.input} type="file" accept=".xlsx" onChange={event => void read(event.target.files?.[0])} /></label>
    </div></fieldset>
    <p className={d.importNote}>Semua data dibuat sebagai santunan rutin, belum ditransfer. Periode berlaku untuk seluruh file. Verifikator/penyalur ditentukan dari nama pada setiap baris Excel, sesuai daftar akun aktif. Jika ada kesalahan atau penerima dengan program dan periode yang sama, seluruh impor dibatalkan.</p>
    {!volunteers.length && <p>Tambahkan penyalur aktif di menu Tim & akses terlebih dahulu.</p>}
    {reading && <p role="status">Membaca Excel…</p>}
    {rows.length > 0 && <div className={d.importPreview}><table className={s.table}><caption>Pratinjau {rows.length} penerima · {money(rows.reduce((total, row) => total + row.amount, 0))}</caption><thead><tr><th>Nama</th><th>Program</th><th>Nominal bantuan</th><th>Verifikator / penyalur</th></tr></thead><tbody>{rows.map((row, index) => <tr key={index}><td>{row.recipientName}</td><td>{row.category === "orphan" ? "Anak Yatim" : "Janda Dhuafa"}</td><td>{money(row.amount)}</td><td>{row.verifierName}</td></tr>)}</tbody></table></div>}
    {error && <p role="alert" className={s.fieldError}>{error}</p>}
    <Button type="submit" disabled={busy || reading || !rows.length || !volunteers.length}>{busy ? "Mengimpor…" : `Impor ${rows.length || ""} penerima`}</Button>
    </form></div></section>;
}
