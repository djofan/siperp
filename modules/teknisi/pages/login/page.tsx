import { redirect } from "next/navigation";
import { ParticipantLoginForm } from "@/components/auth/ParticipantLoginForm";
import { getTeknisiParticipant } from "../../api/participant-access";
import { getTechnicianUser } from "../../api/access";
import Link from "next/link";
import styles from "./login.module.css";
import { ArrowLeft, ArrowUpRight, Smartphone, Wrench, ClipboardCheck, PackageCheck } from "lucide-react";
export default async function Page() {
  if ((await getTechnicianUser())?.role === "technician") redirect("/teknisi/panel");
  if (await getTeknisiParticipant()) redirect("/teknisi/peserta");
  return <main className={styles.shell}>
    <div className={styles.frame}>
      <aside className={styles.intro}>
        <Link href="/teknisi" className={styles.brand}><Smartphone size={23}/><span>Teknisi <strong>HP</strong></span></Link>
        <div className={styles.introContent}>
          <span className={styles.eyebrow}>RUANG KERJA OUTLET</span>
          <h2>Servis terarah.<br/>Pekerjaan lebih mudah.</h2>
          <p>Catat perangkat masuk, lanjutkan perbaikan, dan pastikan setiap serah terima tercatat.</p>
          <div className={styles.steps}>
            <div><ClipboardCheck size={20}/><span>01</span><strong>Terima<br/>perangkat</strong></div>
            <div><Wrench size={20}/><span>02</span><strong>Kerjakan<br/>servis</strong></div>
            <div><PackageCheck size={20}/><span>03</span><strong>Catat<br/>pengambilan</strong></div>
          </div>
        </div>
        <Link href="/teknisi" className={styles.back}><ArrowLeft size={15}/> Kembali ke website</Link>
      </aside>
      <section className={styles.card} aria-labelledby="login-title">
        <div className={styles.formContent}>
          <span className={styles.formTag}>AKSES AKUN</span>
          <h1 id="login-title">Selamat datang kembali.</h1>
          <p className={styles.description}>Masuk untuk melanjutkan pekerjaan Anda.</p>
          <ParticipantLoginForm moduleSlug="teknisi" successHref="/teknisi/panel"/>
          <p className={styles.help}>Lupa password? <span>Hubungi admin modul untuk reset akun.</span></p>
          <Link href="/admin/login" className={styles.core}>Masuk sebagai pengelola <ArrowUpRight size={16}/></Link>
        </div>
      </section>
    </div>
  </main>;
}
