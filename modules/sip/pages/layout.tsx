import { Manrope } from "next/font/google";
import { Navbar } from "@/modules/sip/components/Navbar";
import { Footer } from "@/modules/sip/components/Footer";
import { FloatingWhatsApp } from "@/modules/sip/components/FloatingWhatsApp";
import { getMergedSiteContent, splitLines } from "@/modules/sip/api/siteContent";
import { getHiddenLandingAnchors } from "@/modules/sip/api/landing";
import { listProgramBantuan } from "@/modules/sip/api/programBantuan";
import { ScrollReveal } from "@/modules/sip/components/ui/ScrollReveal";

const manrope = Manrope({ variable: "--font-sip-sans", subsets: ["latin"] });

// Semua halaman publik SIP baca konten dari DB (Konten Umum, berita, program, dll) — harus
// selalu render dinamis, bukan di-prerender statis saat build, supaya perubahan lewat admin
// panel langsung tampil tanpa redeploy.
export const dynamic = "force-dynamic";

export default async function SipPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [kontak, tentang, footer, hiddenAnchors, programs] = await Promise.all([
    getMergedSiteContent("kontak"),
    getMergedSiteContent("tentang"),
    getMergedSiteContent("footer"),
    getHiddenLandingAnchors(),
    listProgramBantuan(),
  ]);

  return (
    <div
      className={`${manrope.variable} sip-public flex min-h-screen flex-1 flex-col bg-white font-[family-name:var(--font-sip-sans)] text-sip-ink`}
    >
      <Navbar hiddenAnchors={hiddenAnchors} />
      <main className="flex-1">{children}</main>
      <Footer
        kontak={kontak}
        footer={footer}
        legalitasItems={splitLines(tentang.legalitas)}
        programs={programs.slice(0, 6).map((p) => ({ slug: p.slug, title: p.title }))}
        hiddenAnchors={hiddenAnchors}
        whatsapp={process.env.NEXT_PUBLIC_SIP_WHATSAPP}
      />
      <FloatingWhatsApp />
      <ScrollReveal />
    </div>
  );
}
