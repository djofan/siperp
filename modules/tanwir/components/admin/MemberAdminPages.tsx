import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { panelClasses } from "@/components/ui/panel";
import { Icon } from "@/modules/tanwir/components/icons";
import { MemberDirectory } from "./MemberDirectory";
import { requireTanwirAdmin } from "@/modules/tanwir/api/access";
import { getMemberForEdit, listMembers } from "@/modules/tanwir/api/members";
import { groupOptions } from "@/modules/tanwir/api/groups";
import { deleteMemberAction, saveMemberAction, toggleMemberActiveAction } from "@/modules/tanwir/api/actions/admin";
import { AdminDeleteButton, MemberActiveSwitch, MemberForm } from "./AdminForms";

const LABEL = { guru: { one: "Guru", many: "Guru" }, peserta: { one: "Peserta", many: "Peserta" } } as const;

export async function MemberListPage({ role, searchParams }: { role: "guru" | "peserta"; searchParams: Promise<{ q?: string; dibuat?: string }> }) {
  await requireTanwirAdmin();
  const { q = "", dibuat } = await searchParams;
  const members = await listMembers(role);
  const base = `/admin/tanwir/${role}`;

  return (
    <div>
      <PageHeader
        title={LABEL[role].many}
        description={
          role === "guru"
            ? "Guru pembimbing (PIC). Login di /tanwir/masuk dengan kode akun GTQ…"
            : "Peserta = guru ngaji TPQ. Login di /tanwir/masuk dengan kode akun PTQ…"
        }
        actions={
          <Link href={`${base}/baru`} className={buttonVariants()}>
            <Icon name="plus" className="h-4 w-4" />
            Tambah {LABEL[role].one.toLowerCase()}
          </Link>
        }
      />
      {dibuat && (
        <p role="status" className="mb-4 rounded-lg bg-success-soft px-4 py-3 text-sm text-success">
          Akun dibuat dengan kode <strong className="tabular-nums">{dibuat}</strong>. Berikan kode ini beserta password kepada pemilik akun.
        </p>
      )}
      <MemberDirectory role={role} initialQuery={q} members={members.map(member => ({
        id: member.id, name: member.user.name, code: member.code, phone: member.phone,
        teachingPlace: role === "peserta" ? member.teachingPlace : null,
        groups: role === "guru" ? member.picGroups.map(group => group.name) : member.group ? [member.group.name] : [],
        active: member.user.isActive, count: role === "guru" ? member._count.tasks : member._count.submissions,
        activeControl: <MemberActiveSwitch initial={member.user.isActive} showLabel action={toggleMemberActiveAction.bind(null, member.id)} />,
        deleteControl: <AdminDeleteButton iconOnly action={deleteMemberAction.bind(null, role, member.id)} confirmText={`Hapus ${member.user.name}?`} />,
      }))} />
    </div>
  );
}

export async function MemberEditPage({ role, memberId }: { role: "guru" | "peserta"; memberId: string | null }) {
  await requireTanwirAdmin();
  const [member, groups] = await Promise.all([memberId ? getMemberForEdit(memberId, role) : null, groupOptions()]);
  if (memberId && !member) notFound();
  const base = `/admin/tanwir/${role}`;

  return (
    <div className="max-w-3xl">
      <PageHeader title={member ? member.user.name : `Tambah ${LABEL[role].one.toLowerCase()}`} description={member ? `Kode ${member.code}` : undefined} />
      <div className={panelClasses("p-6")}>
        <MemberForm
          role={role}
          action={saveMemberAction.bind(null, role, member?.id ?? null)}
          groups={groups}
          cancelHref={base}
          initial={
            member
              ? {
                  code: member.code,
                  name: member.user.name,
                  email: member.user.email.endsWith(".invalid") ? null : member.user.email,
                  isActive: member.user.isActive,
                  phone: member.phone,
                  gender: member.gender,
                  teachingPlace: member.teachingPlace,
                  groupId: member.groupId,
                  address: member.address,
                  provinceId: member.provinceId,
                  provinceName: member.provinceName,
                  cityId: member.cityId,
                  cityName: member.cityName,
                  districtId: member.districtId,
                  districtName: member.districtName,
                  villageId: member.villageId,
                  villageName: member.villageName,
                }
              : null
          }
        />
      </div>
    </div>
  );
}
