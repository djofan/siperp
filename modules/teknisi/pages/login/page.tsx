import { redirect } from "next/navigation";
import { ParticipantLoginForm } from "@/components/auth/ParticipantLoginForm";
import { getTeknisiParticipant } from "../../api/participant-access";
import { getTechnicianUser } from "../../api/access";
import Link from "next/link";
import styles from "./login.module.css";
export default async function Page() {
  if ((await getTechnicianUser())?.role === "technician") redirect("/teknisi/panel");
  if (await getTeknisiParticipant()) redirect("/teknisi/peserta");
  return <section className={styles.shell}><div className={styles.card}><aside className={styles.info}><span className={styles.eyebrow}>RUANG KERJA OUTLET</span><h2>Servis terarah.<br/>Outlet terkendali.</h2><p>Catat penerimaan HP, dokumentasikan pengerjaan, dan pantau pembayaran dalam satu tempat.</p><ol>{[["01","Pending","Catat pelanggan, keluhan, dan estimasi."],["02","Proses","Diagnosa, tindakan, dan dokumentasi foto."],["03","Ready → Finish","Konfirmasi pembayaran dan pengambilan."]].map(([number,title,body])=><li key={number}><span>{number}</span><div><strong>{title}</strong><p>{body}</p></div></li>)}</ol><small>Satu akun PTH, akses sesuai outlet Anda.</small></aside><div className={styles.form}><p className={styles.eyebrow}>TEKNISI HP · PLATFORM SIP</p><h1>Masuk ke outlet</h1><p className={styles.description}>Gunakan kode PTH dan password yang diberikan pengelola.</p><ParticipantLoginForm moduleSlug="teknisi" successHref="/teknisi/panel"/><div className={styles.help}><p>Belum punya akun atau lupa password?</p><span>Hubungi pengelola untuk pendaftaran atau bantuan akun.</span></div><Link href="/admin/login" className={styles.core}>Pengelola pusat? Masuk melalui Core ↗</Link></div></div></section>;
}
