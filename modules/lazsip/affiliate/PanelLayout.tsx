import Link from "next/link";
import { requireAffiliate } from "../api/affiliate";
import { AffiliateNavigation } from "../components/affiliate/AffiliateNavigation";
import { LazsipMark } from "../components/LazsipMark";
import styles from "../components/affiliate/affiliate.module.css";

export default async function AffiliatePanelLayout({ children }: { children: React.ReactNode }) {
  const affiliate = await requireAffiliate();
  return <div className={styles.panel}>
    <a href="#affiliate-content" className={styles.skip}>Lewati ke konten</a>
    <aside className={styles.sidebar}><Link className={styles.brand} href="/lazsip/affiliator"><LazsipMark size={42}/><span>LAZSIP<small>Ruang Affiliator</small></span></Link><span className={styles.menuLabel}>PANEL SAYA</span><AffiliateNavigation/><div className={styles.sidebarUser}><span className={styles.avatar}>{affiliate.name.slice(0, 1).toUpperCase()}</span><div><strong>{affiliate.name}</strong><small>Affiliator LAZSIP</small></div></div></aside>
    <div className={styles.workspace}><header className={styles.panelHeader}><div><span className={styles.eyebrow}>MITRA PENGHIMPUNAN</span><p>Panel Affiliator</p></div><span className={styles.active}>● Akun aktif</span></header><main id="affiliate-content" className={styles.content}>{children}</main></div>
  </div>;
}
