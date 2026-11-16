"use client";
import type { AidDetail, BantuanStaff } from "@/contracts/modules/bantuan";
import { handoverDocuments } from "../handover-report";
import { day, money } from "../api/client";
import { PhotoReview } from "./PhotoReview";
import s from "./Workspace.module.css";
export function HandoverReport({ row, owner, staff }: {
    row: AidDetail;
    owner: string;
    staff: BantuanStaff[];
}) {
    const report = row.handover, documents = handoverDocuments(row.documents);
    const manual = [...row.events].reverse().find(event => event.action === "handover" && event.manual)?.manual;
    const distributor = row.manualProcess?.distributor?.name ?? staff.find(p => p.id === row.distributorId)?.name ?? (row.distributionType === "direct" ? "Bendahara langsung" : "Belum tercatat");
    const values = [["Penerima manfaat", row.name], ["Penyalur bantuan", distributor], ["Tanggal penyerahan", report?.date ? day(String(report.date)) : "Belum tercatat"], ["Nominal diserahkan", typeof report?.amount === "number" ? money(report.amount) : "Belum tercatat"], ["Metode", report?.method === "transfer" ? "Transfer" : report?.method === "tunai" ? "Tunai" : "Belum tercatat"], ["Catatan", String(report?.notes ?? "Tidak ada catatan tambahan.")]];
    return <section className={s.card}><div className={s.cardHeader}><div><h2>Laporan penyerahan</h2><p>Rincian penyerahan bantuan dan bukti dari penyalur.</p></div><span className={s.pill}>{documents.length} berkas</span></div><div className={s.cardBody}>{!report && <p className={s.notice}>Laporan penyerahan belum tercatat. Periksa riwayat atau lengkapi melalui petugas yang berwenang.</p>}<dl className={s.infoGrid}>{values.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{manual && <p className={s.notice}>Dilaporkan oleh {manual.name}. Dicatat melalui proses manual oleh {manual.recordedByName ?? "petugas"}.</p>}<h3 className={s.sectionTitle} style={{ marginTop: 24 }}>Foto & dokumen penyerahan</h3><p className={s.tiny}>Foto penyerahan, sertifikat, kuitansi, dan bukti pendidikan. Berkas juga tersedia di Dokumen pendukung.</p>{documents.length ? <PhotoReview owner={owner} applicationId={row.id} documents={documents} allDocuments/> : <p className={s.notice}>Belum ada bukti penyerahan dilampirkan.</p>}</div></section>;
}
