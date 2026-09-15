import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { AkunForm } from "@/components/admin-shell/AkunForm";
import { listModules } from "@/modules/core/modules";

export default async function TambahAkunPage() {
  const modules = await listModules();

  return (
    <div>
      <Link
        href="/admin/super/akun"
        className="mb-4 inline-block text-sm text-foreground/50 hover:text-foreground"
      >
        ← Kembali ke Kelola Akun
      </Link>
      <PageHeader
        title="Tambah Akun"
        description="Buat akun admin baru dan tentukan modul yang boleh diakses."
      />
      <AkunForm modules={modules} />
    </div>
  );
}
