import { randomUUID } from "node:crypto";
import { getSettings } from "../api/workflow";
import { getKeuanganOverview } from "../api/overview";
import { FinanceForm } from "../components/FinanceForm";
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const [data, overview, q] = await Promise.all([getSettings(), getKeuanganOverview(), searchParams]);
  const canWrite = overview.permissions.writeMasters && !overview.readOnly;
  return <><h2>Jenis program & pengaturan pengajuan</h2>{q.saved && <p role="status" className="finance-success">Pengaturan berhasil disimpan.</p>}
    <section className="finance-panel"><h2>Jenis program</h2><p>Daftar awal berasal dari kategori program pada data keuangan lama. Tambahkan program yang belum tersedia.</p><ul>{data.programs.map(item => <li key={item.id}>{item.name}{item.archived ? " (Arsip)" : ""}</li>)}</ul>
      {canWrite && <FinanceForm kind="programs" requestId={randomUUID()} label="Tambah jenis program"><label>Nama program<input name="name" required maxLength={255} /></label></FinanceForm>}
    </section>
    <div className="finance-grid"><section className="finance-panel"><h2>Kategori pengajuan</h2><ul>{["Cash Advance", "Kegiatan Sosial", "Operasional", "Lain-lain"].map(name => <li key={name}>{name}</li>)}</ul></section>
      <section className="finance-panel"><h2>Sumber dana</h2><ul>{["Kas Infaq", "Kas Amil", "Kas Riba", "Kas Zakat"].map(name => <li key={name}>{name}</li>)}</ul></section></div>
    <section className="finance-panel"><h2>Pihak yang menyetujui</h2><p>Hanya akun Bendahara SIP aktif yang dapat menerima penugasan dan menyetujui pengajuan.</p>{data.approvers.length ? <ul>{data.approvers.map(a => <li key={a.id}>Bendahara SIP · {a.name}</li>)}</ul> : <p>Belum ada akun Bendahara SIP aktif. Atur akses akun melalui Core.</p>}</section>
  </>;
}
