import { requireAffiliate } from "../api/affiliate";
import { AffiliateProfileForm } from "../components/affiliate/AffiliateProfileForm";
import styles from "../components/affiliate/affiliate.module.css";
export default async function AffiliateProfilePage() {
  const affiliate = await requireAffiliate();
  return <><div className={styles.pageHeading}><span className={styles.eyebrow}>AKUN SAYA</span><h1>Profil affiliator</h1><p>Pastikan kontak Anda benar agar informasi program dapat diterima.</p></div><section className={`${styles.card} ${styles.profileCard}`}><AffiliateProfileForm affiliate={affiliate}/></section></>;
}
