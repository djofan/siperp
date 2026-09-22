import Link from "next/link";
import { AdminPageHeader } from "@/modules/lazsip/components/admin/AdminPageHeader";
import { PartnerTable } from "@/modules/lazsip/components/admin/PartnerTable";
import { listPartners } from "@/modules/lazsip/api/partners";

export default async function MitraListPage() {
  const partners = await listPartners();

  return (
    <div>
      <AdminPageHeader
        title="Mitra Kerja Sama"
        description="Logo mitra yang tampil di running text marquee halaman publik."
        action={
          <Link
            href="/admin/lazsip/mitra/baru"
            className="inline-flex items-center gap-2 rounded-full bg-lazsip-primary-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800 dark:bg-lazsip-primary-700 dark:hover:bg-lazsip-primary-600"
          >
            + Tambah Mitra
          </Link>
        }
      />
      <PartnerTable partners={partners} />
    </div>
  );
}
