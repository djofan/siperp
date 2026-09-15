import { getSession } from "@/lib/auth";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

export default async function DashboardHomePage() {
  const session = await getSession();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Selamat datang, {session?.name}</CardTitle>
          <CardDescription>
            Ini adalah dashboard admin platform SIP. Pilih modul di sidebar untuk
            mulai bekerja, atau kelola akun & akses lewat menu Superadmin.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
