import Link from "next/link";
import { AdminPageHeader } from "@/modules/lazsip/components/admin/AdminPageHeader";
import { ActivityTable } from "@/modules/lazsip/components/admin/ActivityTable";
import { listActivities } from "@/modules/lazsip/api/activities";

export default async function KegiatanListPage() {
  const activities = await listActivities();

  return (
    <div>
      <AdminPageHeader
        title="Kegiatan"
        description="Pola pinned + grid di halaman publik."
        action={
          <Link
            href="/admin/lazsip/kegiatan/baru"
            className="inline-flex items-center gap-2 rounded-full bg-lazsip-primary-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800"
          >
            + Tambah Kegiatan
          </Link>
        }
      />
      <ActivityTable activities={activities} />
    </div>
  );
}
