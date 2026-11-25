import { randomUUID } from "node:crypto";
import { getSettings } from "../api/workflow";
import { getKeuanganOverview } from "../api/overview";
import { FinanceForm } from "../components/FinanceForm";
import { SettingsList } from "../components/SettingsList";
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const [data, overview, q] = await Promise.all([getSettings(), getKeuanganOverview(), searchParams]);
  const canWrite = overview.permissions.writeMasters && !overview.readOnly;
  return <><h2>Jenis program & pengaturan pengajuan</h2>{q.saved && <p role="status" className="finance-success">Pengaturan berhasil disimpan.</p>}
    <SettingsList kind="programs" items={data.programs}>
      {canWrite && <><h3>Tambah jenis program</h3><FinanceForm kind="programs" requestId={randomUUID()} label="Tambah program"><label><span>Nama program<span aria-hidden="true" className="ml-1 text-red-600 dark:text-red-400">*</span></span><input name="name" required maxLength={255} placeholder="Masukkan nama program" /></label></FinanceForm></>}
    </SettingsList>
    <div className="finance-grid finance-settings-options">
      <SettingsList kind="categories" items={["Cash Advance", "Kegiatan Sosial", "Operasional", "Lain-lain"].map(name => ({ id: name, name }))}/>
      <SettingsList kind="sources" items={["Kas Infaq", "Kas Amil", "Kas Riba", "Kas Zakat"].map(name => ({ id: name, name }))}/>
    </div>
    <section className="finance-panel"><h2>Pihak yang menyetujui</h2><p>Hanya akun Bendahara SIP aktif yang dapat menerima penugasan dan menyetujui pengajuan.</p>{data.approvers.length ? <ul className="finance-settings-list">{data.approvers.map(a => <li key={a.id}><span className="finance-settings-dot" aria-hidden="true"/><span className="finance-settings-name">Bendahara SIP · {a.name}</span></li>)}</ul> : <p>Belum ada akun Bendahara SIP aktif. Atur akses akun melalui Core.</p>}</section>
  </>;
}
