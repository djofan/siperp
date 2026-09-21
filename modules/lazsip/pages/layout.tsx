import { Plus_Jakarta_Sans } from "next/font/google";
import { Navbar } from "@/modules/lazsip/components/Navbar";
import { Footer } from "@/modules/lazsip/components/Footer";
import { FloatingWhatsApp } from "@/modules/lazsip/components/FloatingWhatsApp";
import { getSiteContent } from "@/modules/lazsip/api/siteContent";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-lazsip-sans",
  subsets: ["latin"],
});

// Semua halaman publik LAZSIP baca konten dari DB (Konten Umum, berita, program, dll) —
// harus selalu render dinamis, bukan di-prerender statis saat build, supaya perubahan lewat
// admin panel langsung tampil tanpa redeploy.
export const dynamic = "force-dynamic";

export default async function LazsipPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [kontak, legalitas] = await Promise.all([
    getSiteContent("kontak"),
    getSiteContent("legalitas"),
  ]);

  const legalitasItems = legalitas?.body
    ? Object.fromEntries(
        legalitas.body
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line, i) => [`item-${i}`, line])
      )
    : null;

  return (
    <div
      className={`${plusJakartaSans.variable} lazsip-public flex min-h-screen flex-1 flex-col bg-lazsip-cream font-[family-name:var(--font-lazsip-sans)] text-lazsip-ink`}
    >
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer
        kontak={kontak ?? {}}
        legalitas={legalitasItems}
        whatsapp={process.env.NEXT_PUBLIC_LAZSIP_WHATSAPP}
      />
      <FloatingWhatsApp />
    </div>
  );
}
