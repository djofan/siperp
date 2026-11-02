import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { AkunForm } from "@/components/admin-shell/AkunForm";
import { listModules } from "@/modules/core/modules";

export default async function TambahAkunPage() {
  const modules = await listModules();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/super/akun"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground"
        >
          ← Kembali ke Kelola Akun
        </Link>
        <PageHeader
          title="Tambah admin"
          description="Isi identitas dan pilih akses modul, lalu simpan untuk kembali ke daftar akun."
        />
      </div>
      <AkunForm modules={modules} />
    </div>
  );
}
