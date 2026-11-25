import styles from "@/modules/sarsip/components/Landing.module.css";
import { Footer } from "@/modules/sarsip/components/Footer";
import Navbar from "@/modules/sarsip/components/Navbar";
import { getProfile } from "@/modules/sarsip/api/data";
export default async function SarsipLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  return <div data-sarsip-site className={`min-h-screen ${styles.site}`}>
    <Navbar />
    <main>{children}</main>
    <Footer teamContact={profile.contact}/>
  </div>;
}

