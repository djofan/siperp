import { requireTanwirMember } from "@/modules/tanwir/api/access";
import { ProfilePage } from "@/modules/tanwir/components/app/ProfilePage";

export const metadata = { title: "Profil" };

export default async function GuruProfilePage() {
  const viewer = await requireTanwirMember("guru");
  return <ProfilePage memberId={viewer.member.id} />;
}
