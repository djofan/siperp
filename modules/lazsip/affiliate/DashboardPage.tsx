import { ReferralLink } from "../components/affiliate/ReferralLink";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Wallet, Link2, CircleDollarSign, Send } from "lucide-react";
import { requireAffiliate } from "../api/affiliate";
import styles from "../components/affiliate/affiliate.module.css";

export default async function AffiliateDashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const affiliate = await requireAffiliate();
  const query = await searchParams;
  const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(affiliate.joinedAt));
  return <div className={styles.dashboard}>
    {query.welcome === "1" && <p role="status" className={styles.success}>Pendaftaran berhasil. Akun Anda langsung aktif. Gunakan email <strong>{affiliate.email}</strong> untuk masuk kembali.</p>}
    <section className={styles.welcome}><div><span className={styles.eyebrow}>RUANG KEBAIKAN ANDA</span><h1>Assalamu’alaikum, {affiliate.name}.</h1><p>Selamat bergabung sebagai affiliator LAZSIP. Semua informasi keanggotaan Anda ada di sini.</p></div><BadgeCheck className={styles.welcomeIcon} size={100} aria-hidden="true"/></section>
    <div className={styles.statGrid}>{[["Komisi siap dicairkan", Wallet], ["Komisi dalam proses", CircleDollarSign], ["Komisi sudah dibayarkan", Send]].map(([label, Icon]) => {
      const Symbol = Icon as typeof Wallet;
      return <section key={String(label)} className={styles.stat}><Symbol size={22}/><h2>{String(label)}</h2><strong>—</strong><small>Komisi belum diaktifkan</small></section>;
    })}</div>
    <div className={styles.detailGrid}><section className={styles.card}><div className={styles.cardTitle}><h2>Keanggotaan Anda</h2><span className={styles.active}>Aktif</span></div><dl className={styles.details}><div><dt>Bergabung sejak</dt><dd>{date}</dd></div><div><dt>Email</dt><dd>{affiliate.email}</dd></div><div><dt>Nomor telepon</dt><dd>{affiliate.phone || "Belum dilengkapi"}</dd></div></dl><Link className={styles.textLink} href="/lazsip/affiliator/profil">{affiliate.phone ? "Kelola profil" : "Lengkapi profil Anda"}<ArrowUpRight size={17}/></Link></section>
    <section className={styles.card}><div className={styles.cardTitle}><h2>Link referral Anda</h2><Link2 size={20}/></div>{affiliate.referralPath ? <ReferralLink path={affiliate.referralPath}/> : <p className={styles.subtitle}>Link belum tersedia. Silakan hubungi pengelola LAZSIP.</p>}</section></div>
    <section className={styles.card}><h2>Riwayat komisi & pencairan</h2><div className={styles.empty}><Wallet size={30}/><h3>Belum tersedia riwayat komisi</h3><p>Riwayat akan ditampilkan ketika program komisi mulai berjalan. Tidak ada penarikan dana yang dapat dilakukan saat ini.</p></div></section>
  </div>;
}
