import { requireModuleAdmin } from "@/modules/core/module-access";

export const metadata = { title: "Pengajuan Bantuan · SIP" };
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireModuleAdmin("bantuan");
  return children;
}
