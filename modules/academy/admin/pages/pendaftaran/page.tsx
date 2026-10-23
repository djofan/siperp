import { redirect } from "next/navigation";
import { requireAcademyAdmin } from "../../../api/admin-access";
export default async function IntakePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAcademyAdmin();
  const query = await searchParams;
  const params = new URLSearchParams({ tab: "pendaftaran" });
  for (const key of ["cohort", "disimpan"]) if (typeof query[key] === "string") params.set(key, query[key]);
  redirect(`/admin/academy/peserta?${params}`);
}
