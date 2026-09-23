import Link from "next/link";
import { AdminPageHeader } from "@/modules/lazsip/components/admin/AdminPageHeader";
import { ProgramTable } from "@/modules/lazsip/components/admin/ProgramTable";
import { listPrograms } from "@/modules/lazsip/api/programs";

export default async function ProgramListPage() {
  const programs = await listPrograms();

  return (
    <div>
      <AdminPageHeader
        title="Program Pemberdayaan"
        description="Pola pinned + grid di halaman publik, plus toggle buka/tutup pendaftaran."
        action={
          <Link
            href="/admin/lazsip/program/baru"
            className="inline-flex items-center gap-2 rounded-full bg-lazsip-primary-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800 dark:bg-lazsip-primary-700 dark:hover:bg-lazsip-primary-600"
          >
            + Tambah Program
          </Link>
        }
      />
      <ProgramTable programs={programs} />
    </div>
  );
}
