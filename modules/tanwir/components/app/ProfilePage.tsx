import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { changePasswordAction, updateProfileAction } from "@/modules/tanwir/api/actions/profile";
import { Card, PageTitle, Pill, SectionTitle } from "@/modules/tanwir/components/ui";
import { photoUrl } from "./media";
import { PasswordForm, ProfileForm } from "./ProfileForms";

/** Halaman profil bersama guru & peserta (server component). */
export async function ProfilePage({ memberId }: { memberId: string }) {
  const member = await prisma.tanwirMember.findUnique({
    where: { id: memberId },
    include: { user: { select: { name: true, email: true } }, group: { select: { name: true, code: true } } },
  });
  if (!member) notFound();
  const isPeserta = member.role === "peserta";
  const email = member.user.email.endsWith(".invalid") ? null : member.user.email;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Profil"
        description="Data diri Anda. Kode akun dan kelompok diatur oleh admin."
        action={
          <div className="flex flex-wrap gap-2">
            <Pill tone="primary">Kode {member.code}</Pill>
            {member.group && <Pill>{member.group.name}</Pill>}
          </div>
        }
      />
      <Card>
        <ProfileForm
          action={updateProfileAction}
          isPeserta={isPeserta}
          initial={{
            name: member.user.name,
            email,
            phone: member.phone,
            gender: member.gender,
            teachingPlace: member.teachingPlace,
            address: member.address,
            photoUrl: photoUrl(member),
            provinceId: member.provinceId,
            provinceName: member.provinceName,
            cityId: member.cityId,
            cityName: member.cityName,
            districtId: member.districtId,
            districtName: member.districtName,
            villageId: member.villageId,
            villageName: member.villageName,
          }}
        />
      </Card>
      <Card>
        <SectionTitle>Ganti password</SectionTitle>
        <PasswordForm action={changePasswordAction} />
      </Card>
    </div>
  );
}
