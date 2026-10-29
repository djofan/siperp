import Link from "next/link";
import styles from "./site.module.css";
import { TrackingPopup } from "../components/TrackingPopup";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className={styles.site}><header><div className={styles.navigation}><Link href="/teknisi" className={styles.brand}>Teknisi<span>HP.</span></Link><nav aria-label="Navigasi layanan"><Link href="/teknisi#proses">Cara kerja</Link><Link href="/teknisi#outlet">Outlet</Link><TrackingPopup className={styles.trackButton}>Cek status servis</TrackingPopup><Link href="/teknisi/masuk">Masuk teknisi ↗</Link></nav></div></header><main>{children}</main><footer className={styles.footer}><Link href="/teknisi" className={styles.brand}>Teknisi<span>HP.</span></Link><p>Servis perangkat. Proses tercatat. Progres terpantau.</p><span>Bagian dari Platform SIP</span></footer></div>;
}
