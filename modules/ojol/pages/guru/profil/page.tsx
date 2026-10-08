import { requireOjolMember } from "@/modules/ojol/api/access";
import { ProfilePage } from "@/modules/ojol/components/app/ProfilePage";

export const metadata = { title: "Profil" };

export default async function GuruProfilePage() {
  const viewer = await requireOjolMember("guru");
  return <ProfilePage memberId={viewer.member.id} />;
}
