import { Navbar } from "@/modules/sip/components/Navbar";
import { Footer } from "@/modules/sip/components/Footer";
import { FloatingWhatsApp } from "@/modules/sip/components/FloatingWhatsApp";
import { getSiteContent } from "@/modules/sip/api/siteContent";

export default async function SipPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [kontak, tentang] = await Promise.all([getSiteContent("kontak"), getSiteContent("tentang")]);

  const legalitasItems = tentang?.legalitas
    ? tentang.legalitas
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="sip-public flex min-h-screen flex-1 flex-col bg-sip-cream text-sip-ink">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer kontak={kontak ?? {}} legalitasItems={legalitasItems} whatsapp={process.env.NEXT_PUBLIC_SIP_WHATSAPP} />
      <FloatingWhatsApp />
    </div>
  );
}
