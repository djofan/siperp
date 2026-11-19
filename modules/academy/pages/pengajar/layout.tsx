import { redirect } from "next/navigation";
import { requireAcademyAdmin } from "../../api/admin-access";

// Preserve old bookmarks without exposing a separate teacher workspace.
export default async function Layout() {
  await requireAcademyAdmin();
  redirect("/admin/academy/progres");
}
