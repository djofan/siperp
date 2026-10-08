import { requireModulePublic } from "@/modules/core/module-access";
import { ojolDisplay } from "@/modules/ojol/components/fonts";

export const metadata = {
  title: { default: "Ojol Mengaji", template: "%s · Ojol Mengaji" },
  description: "Setoran hafalan Qur'an untuk driver ojek online — program LAZ Solidaritas Insan Peduli.",
};

// Akar semua halaman /ojol/**. Selama modul nonaktif: 404 untuk umum, superadmin tetap bisa menguji.
export default async function OjolRootLayout({ children }: { children: React.ReactNode }) {
  await requireModulePublic("ojol");
  return <div className={`${ojolDisplay.variable} flex min-h-dvh flex-col bg-ojol-paper text-ojol-ink`}>{children}</div>;
}
