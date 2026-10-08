import { requireModulePublic } from "@/modules/core/module-access";
import { tanwirSerif } from "@/modules/tanwir/components/fonts";

export const metadata = {
  title: { default: "Tanwir Qurani", template: "%s · Tanwir Qurani" },
  description: "Program pembinaan hafalan Qur'an untuk guru ngaji TPQ — LAZ Solidaritas Insan Peduli.",
};

// Akar semua halaman /tanwir/**. Selama modul nonaktif: 404 untuk umum, superadmin tetap bisa menguji.
export default async function TanwirRootLayout({ children }: { children: React.ReactNode }) {
  await requireModulePublic("tanwir");
  return <div className={`${tanwirSerif.variable} flex min-h-dvh flex-col bg-tanwir-paper text-tanwir-ink`}>{children}</div>;
}
