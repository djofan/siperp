import Link from "next/link";
import { AdminPageHeader } from "@/components/lazsip/admin/AdminPageHeader";
import { ActivityTable } from "@/components/lazsip/admin/ActivityTable";
import { listActivities } from "@/modules/lazsip/activities";

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
