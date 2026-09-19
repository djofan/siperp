import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { saveAcademyCourse } from "@/modules/academy/api/actions";
import { AdminHeading } from "@/modules/academy/components/admin/AdminUi";
import { ContentForm } from "@/modules/academy/components/admin/ContentForm";
export default async function Page() {
  await requireAcademyAdmin();
  return <><AdminHeading title="Tambah program" backHref="/admin/academy/program" /><ContentForm kind="course" action={saveAcademyCourse.bind(null, null)} /></>;
}

