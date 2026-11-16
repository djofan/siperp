"use client";
import { useRef, useState, type FormEvent } from "react";
import { bantuanStatuses, type AidDetail, type BantuanStaff } from "@/contracts/modules/bantuan";
import { request, money } from "../api/client";
import { Fields, type Values } from "./IntakeForm";
import { surveyFields } from "../survey-fields";
import { ApprovalAmount } from "./ApprovalAmount";
import s from "./Workspace.module.css";
export function AdminCorrection({ row, staff, reload }: {
    row: AidDetail;
    staff: BantuanStaff[];
    reload: () => void;
}) {
    const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
    const lock = useRef(false);
    const [survey, setSurvey] = useState<Values>((row.survey ?? {}) as Values);
    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (lock.current)
            return;
        lock.current = true;
        setBusy(true);
        setError("");
        const form = new FormData(event.currentTarget);
        const handover = { ...(row.handover ?? {}), date: form.get("handoverDate") || null, amount: form.get("handoverAmount") ? Number(form.get("handoverAmount")) : null, method: form.get("handoverMethod") || null, notes: form.get("handoverNotes") || null };
        const transfer = {bank: form.get("bank"), account: form.get("account"), recipientName: form.get("recipientName"), recipientRelationship: form.get("recipientRelationship")};
        try {
            await request(`applications/${row.id}/admin-correction`, { method: "PUT", body: JSON.stringify({ version: row.version, reason: form.get("reason"), confirmation: form.get("confirmation"), releaseFundingGroup: form.get("releaseFundingGroup") === "on", status: form.get("status"), source: form.get("source"), program: form.get("program"), region: form.get("region"), ...(row.fundingRequest ? {} : { fundReference: form.get("fundReference") || null }), manualVerifierName: form.get("manualVerifierName"), manualVerifierPhone: form.get("manualVerifierPhone"), manualDistributorName: form.get("manualDistributorName"), manualDistributorPhone: form.get("manualDistributorPhone"), ...(row.manualProcess?.transferRecipient || Object.values(transfer).some(Boolean) ? {transfer} : {}), amount: form.get("amount") ? Number(form.get("amount")) : null, verifierId: form.get("verifierId") || null, distributorId: form.get("distributorId") || null, disbursedAt: form.get("disbursedAt") || null, completedAt: form.get("completedAt") || null, ...(Object.keys(survey).length ? { survey } : {}), ...(row.handover || Object.values(handover).some(Boolean) ? {handover} : {}) }) });
            setOpen(false);
            reload();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Koreksi belum disimpan.");
        }
        finally {
            lock.current = false;
            setBusy(false);
        }
    }
    const field = (name: string, label: string, value: string, type = "text") => <label className={s.field}>{label}<input className={s.input} name={name} type={type} defaultValue={value}/></label>;
    return <section className={s.card}><div className={s.cardHeader}><div><h2>Koreksi admin</h2><p>Perbaiki data, nominal, atau tahap proses. Semua perubahan masuk riwayat.</p></div><button type="button" className={`${s.button} ${s.secondary}`} onClick={() => setOpen(v => !v)} disabled={busy}>{open ? "Tutup" : "Buka koreksi"}</button></div>{open && <form onSubmit={save} className={s.cardBody}><p className={s.notice}>Koreksi mencatat kondisi sebenarnya dan tidak melakukan transfer uang. Data pemohon dapat diubah melalui tombol Edit data di atas.</p><div className={s.formGrid}>{field("program", "Program bantuan", row.program)}{field("region", "Wilayah", row.region)}{!row.fundingRequest && field("fundReference", "Referensi pengajuan dana", row.fundReference ?? "")}<label className={s.field}>Sumber pengajuan<select className={s.input} name="source" defaultValue={row.source}><option value="online">Online / WhatsApp</option><option value="walk_in">Datang ke kantor</option><option value="bypass">Jalur langsung</option></select></label><label className={s.field}>Status pengajuan<select className={s.input} name="status" defaultValue={row.status}>{Object.entries(bantuanStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{[["verifierId", "Verifikator", row.verifierId], ["distributorId", "Penyalur", row.distributorId]].map(([key, label, value]) => <label className={s.field} key={key}>{label}<select className={s.input} name={key!} defaultValue={value ?? ""}><option value="">Tidak ada akun / petugas manual</option>{staff.filter(p => p.active && (p.role === "verifier" || p.roles?.includes("verifier") || key === "distributorId" && (p.role === "volunteer" || p.roles?.includes("volunteer")))).map(p => <option value={p.id} key={p.id}>{p.name} {p.code}</option>)}</select></label>)}{field("disbursedAt", "Tanggal transfer Bendahara", row.disbursedAt ?? "", "date")}{field("completedAt", "Tanggal selesai", row.completedAt ?? "", "date")}</div><div style={{ marginBlock: 20 }}><ApprovalAmount row={row} required={false}/><p className={s.tiny}>Nominal saat ini: {money(row.amount)}. Koreksi nominal setelah transfer harus sesuai hasil pemeriksaan bukti transaksi.</p></div><details><summary className={s.link}>Petugas manual & rekening transfer</summary><p className={s.tiny}>Isi petugas manual jika belum memiliki akun. Pilihan akun di atas diutamakan.</p><div className={s.formGrid}>{field("manualVerifierName", "Nama verifikator manual", row.manualProcess?.verifier?.name ?? "")}{field("manualVerifierPhone", "Nomor HP verifikator manual", row.manualProcess?.verifier?.phone ?? "", "tel")}{field("manualDistributorName", "Nama penyalur manual", row.manualProcess?.distributor?.name ?? "")}{field("manualDistributorPhone", "Nomor HP penyalur manual", row.manualProcess?.distributor?.phone ?? "", "tel")}{(["bank", "account", "recipientName", "recipientRelationship"] as const).map((key, i) => field(key, ["Bank tujuan", "Rekening tujuan", "Nama penerima transfer", "Hubungan penerima"][i], String(row.manualProcess?.transferRecipient?.[key] ?? "")))}</div></details><details><summary className={s.link}>Koreksi hasil survei</summary><Fields required={false} fields={surveyFields} values={survey} set={(key, value) => setSurvey(v => ({ ...v, [key]: value }))}/></details><details><summary className={s.link}>Koreksi laporan penyerahan</summary><div className={s.formGrid}>{field("handoverDate", "Tanggal penyerahan", String(row.handover?.date ?? ""), "date")}{field("handoverAmount", "Nominal diserahkan", String(row.handover?.amount ?? ""), "number")}<label className={s.field}>Metode penyerahan<select className={s.input} name="handoverMethod" defaultValue={String(row.handover?.method ?? "")}><option value="">Belum diisi</option><option value="tunai">Tunai</option><option value="transfer">Transfer</option></select></label><label className={s.field}>Catatan laporan<textarea className={s.input} name="handoverNotes" defaultValue={String(row.handover?.notes ?? "")} maxLength={5000}/></label></div></details>{row.fundingRequest && <label className={s.notice}><input type="checkbox" name="releaseFundingGroup" required/> Saya memahami grup dana aktif akan dibatalkan dan seluruh anggotanya kembali siap diajukan. Rincian grup lama tetap tersimpan.</label>}<label className={s.field} style={{ marginTop: 20 }}>Alasan koreksi<textarea className={s.input} name="reason" required minLength={10} maxLength={5000}/></label><label className={s.field}>Ketik {row.number} untuk konfirmasi<input className={s.input} name="confirmation" autoComplete="off" required pattern={row.number}/></label>{error && <p role="alert" className={s.error}>{error}</p>}<div className={s.actions} style={{ marginTop: 16 }}><button className={s.button} disabled={busy}>{busy ? "Menyimpan..." : "Konfirmasi koreksi admin"}</button><button className={`${s.button} ${s.secondary}`} type="button" disabled={busy} onClick={() => setOpen(false)}>Batal</button></div></form>}</section>;
}
