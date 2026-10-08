import { requireOjolMember } from "@/modules/ojol/api/access";
import { ProfilePage } from "@/modules/ojol/components/app/ProfilePage";

export const metadata = { title: "Profil" };

export default async function PesertaProfilePage() {
  const viewer = await requireOjolMember("peserta");
  return <ProfilePage memberId={viewer.member.id} />;
}
