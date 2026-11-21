import Link from "next/link";
import { redirect } from "next/navigation";
import { getAffiliate } from "../api/affiliate";
import { LazsipMark } from "../components/LazsipMark";
import { AffiliateAuthForm } from "../components/affiliate/AffiliateAuthForm";
import styles from "../components/affiliate/affiliate.module.css";

export async function AffiliateAuthPage({ register = false }: { register?: boolean }) {
  if (await getAffiliate()) redirect("/lazsip/affiliator");
  return <div className={styles.authPage}>
    <header className={styles.authHeader}><Link href="/lazsip" className={styles.brand}><LazsipMark size={42}/><span>LAZSIP<small>Ruang Affiliator</small></span></Link><Link href="/lazsip" className={styles.back}>Kembali ke website ↗</Link></header>
    <main className={styles.authGrid}>
      <section className={styles.intro}><span className={styles.eyebrow}>KEBAIKAN DIMULAI DARI AJAKAN</span><h1>Ajak lebih banyak orang<br/>menunaikan kebaikan.</h1><p>Bergabung dalam komunitas affiliator LAZSIP. Kelola akun Anda di satu ruang khusus, terpisah dari halaman donatur.</p><ul><li>Pendaftaran terbuka untuk siapa saja</li><li>Akun langsung aktif tanpa persetujuan admin</li><li>Satu akun untuk masuk kembali kapan saja</li></ul><div className={styles.introNote}>Program referral dan komisi akan diumumkan melalui panel. Pendaftaran akun tidak dikenakan biaya.</div></section>
      <section className={styles.authCard}><span className={styles.eyebrow}>AFFILIATOR LAZSIP</span><h2>{register ? "Mulai langkah baik Anda" : "Selamat datang kembali"}</h2><p className={styles.subtitle}>{register ? "Isi data berikut. Setelah mendaftar, Anda langsung masuk. Gunakan email dan password untuk login berikutnya." : "Masuk untuk membuka ruang affiliator Anda."}</p><AffiliateAuthForm register={register}/></section>
    </main><footer className={styles.authFooter}>LAZSIP · Solidaritas Insan Peduli</footer>
  </div>;
}
export default async function AffiliateLoginPage() { return <AffiliateAuthPage/>; }
export async function AffiliateRegisterPage() { return <AffiliateAuthPage register/>; }
