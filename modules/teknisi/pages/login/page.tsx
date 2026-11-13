import { redirect } from "next/navigation";
import { ParticipantLoginForm } from "@/components/auth/ParticipantLoginForm";
import { getTeknisiParticipant } from "../../api/participant-access";
import { getTechnicianUser } from "../../api/access";
import Link from "next/link";
import styles from "./login.module.css";
export default async function Page() {
  if ((await getTechnicianUser())?.role === "technician") redirect("/teknisi/panel");
  if (await getTeknisiParticipant()) redirect("/teknisi/peserta");
  return <main className={styles.shell}><section className={styles.card}><Link href="/teknisi" className={styles.brand}>Teknisi HP</Link><h1>Masuk</h1><p className={styles.description}>Gunakan kode akun dan password Anda.</p><ParticipantLoginForm moduleSlug="teknisi" successHref="/teknisi/panel"/><p className={styles.help}>Lupa password? Hubungi admin modul untuk mereset password.</p><Link href="/admin/login" className={styles.core}>Masuk sebagai pengelola</Link></section></main>;
}
