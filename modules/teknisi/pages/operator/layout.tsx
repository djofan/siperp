import { apiRequest } from "@/lib/api";
import type { Response10 } from "@/modules/teknisi/api/contracts";
import { requireTechnicianOperator } from "../../api/access";
import { OperatorShell } from "../../components/OperatorShell";
export const metadata = { title: { default: "Panel Outlet", template: "%s | Teknisi HP" }, robots: { index: false, follow: false } };
export default async function Layout({ children }: {
    children: React.ReactNode;
}) {
    const user = await requireTechnicianOperator();
    const [outlets, profile] = await Promise.all([apiRequest<Response10["outlet"][]>("teknisi/outlets"), apiRequest<Response10["profile"]>("teknisi/profile")]);
    const outlet = outlets[0]!;
    return <OperatorShell user={{ name: user.name, nip: profile?.nip ?? "NIP belum tersedia" }} outletName={outlet.name}>{children}</OperatorShell>;
}
