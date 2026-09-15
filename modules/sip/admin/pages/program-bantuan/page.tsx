import Link from "next/link";
import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { ProgramBantuanTable } from "@/modules/sip/components/admin/ProgramBantuanTable";
import { listProgramBantuan } from "@/modules/sip/api/programBantuan";

export default async function ProgramBantuanListPage() {
  const programs = await listProgramBantuan();

  return (
    <div>
      <SipAdminPageHeader
        title="Program Bantuan"
        description="Halaman info program bantuan SIP — bukan campaign donasi, tombol infaq link ke LAZSIP."
        action={
          <Link
            href="/admin/sip/program-bantuan/baru"
            className="inline-flex items-center gap-2 rounded-full bg-sip-primary-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sip-primary-800"
          >
            + Tambah Program
          </Link>
        }
      />
      <ProgramBantuanTable programs={programs} />
    </div>
  );
}
