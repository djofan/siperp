import Link from "next/link";
import { AdminPageHeader } from "@/components/lazsip/admin/AdminPageHeader";
import { ProgramTable } from "@/components/lazsip/admin/ProgramTable";
import { listPrograms } from "@/modules/lazsip/programs";

export default async function ProgramListPage() {
  const programs = await listPrograms();

  return (
    <div>
      <AdminPageHeader
        title="Program Pemberdayaan"
        description="Pendaftaran bisa dibuka/tutup tanpa menghapus program dari listing publik."
        action={
          <Link
            href="/admin/lazsip/program/baru"
            className="inline-flex items-center gap-2 rounded-full bg-lazsip-primary-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800"
          >
            + Tambah Program
          </Link>
        }
      />
      <ProgramTable programs={programs} />
    </div>
  );
}
