import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/FormField";
import { buttonVariants } from "@/components/ui/Button";
import { panelClasses } from "@/components/ui/panel";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { requireOjolAdmin } from "@/modules/ojol/api/access";
import { getMemberForEdit, listMembers } from "@/modules/ojol/api/members";
import { groupOptions } from "@/modules/ojol/api/groups";
import { deleteMemberAction, saveMemberAction, toggleMemberActiveAction } from "@/modules/ojol/api/actions/admin";
import { AdminDeleteButton, MemberActiveSwitch, MemberForm } from "./AdminForms";

const LABEL = { guru: { one: "Guru", many: "Guru" }, peserta: { one: "Peserta", many: "Peserta" } } as const;

export async function MemberListPage({ role, searchParams }: { role: "guru" | "peserta"; searchParams: Promise<{ q?: string; dibuat?: string }> }) {
  await requireOjolAdmin();
  const { q = "", dibuat } = await searchParams;
  const members = await listMembers(role, q);
  const base = `/admin/ojol/${role}`;

  return (
    <div>
      <PageHeader
        title={LABEL[role].many}
        description={
          role === "guru"
            ? "Guru / musyrif pembimbing. Login di /ojol/masuk dengan kode akun GOM…"
            : "Peserta = driver ojek online. Login di /ojol/masuk dengan kode akun POM…"
        }
        actions={
          <Link href={`${base}/baru`} className={buttonVariants()}>
            Tambah {LABEL[role].one.toLowerCase()}
          </Link>
        }
      />
      {dibuat && (
        <p role="status" className="mb-4 rounded-lg bg-success-soft px-4 py-3 text-sm text-success">
          Akun dibuat dengan kode <strong className="tabular-nums">{dibuat}</strong>. Berikan kode ini beserta password kepada pemilik akun.
        </p>
      )}
      <form className="mb-4 max-w-sm" role="search">
        <Input name="q" defaultValue={q} placeholder="Cari nama, kode, atau nomor HP" aria-label="Cari" />
      </form>
      {members.length ? (
        <div className={panelClasses("overflow-x-auto")}>
          <Table>
            <Thead>
              <Tr>
                <Th>Kode</Th>
                <Th>Nama</Th>
                {role === "peserta" && <Th>Kelompok</Th>}
                <Th>No. HP</Th>
                <Th>{role === "guru" ? "Tugas" : "Setoran"}</Th>
                <Th>Aktif</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {members.map((member) => (
                <Tr key={member.id}>
                  <Td className="font-medium tabular-nums">{member.code}</Td>
                  <Td>
                    <Link href={`${base}/${member.id}`} className="font-medium text-foreground hover:underline">
                      {member.user.name}
                    </Link>
                  </Td>
                  {role === "peserta" && <Td className="text-foreground/70">{member.group?.name ?? "—"}</Td>}
                  <Td className="tabular-nums text-foreground/70">{member.phone ?? "—"}</Td>
                  <Td className="tabular-nums">{role === "guru" ? member._count.tasks : member._count.submissions}</Td>
                  <Td>
                    <MemberActiveSwitch initial={member.user.isActive} action={toggleMemberActiveAction.bind(null, member.id)} />
                  </Td>
                  <Td className="whitespace-nowrap text-right">
                    <Link href={`${base}/${member.id}`} className="mr-4 text-sm font-medium text-accent hover:text-accent-hover">
                      Ubah
                    </Link>
                    <AdminDeleteButton action={deleteMemberAction.bind(null, role, member.id)} confirmText={`Hapus ${member.user.name}?`} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      ) : (
        <EmptyState>{q ? "Tidak ada yang cocok dengan pencarian." : `Belum ada ${LABEL[role].one.toLowerCase()}.`}</EmptyState>
      )}
    </div>
  );
}

export async function MemberEditPage({ role, memberId }: { role: "guru" | "peserta"; memberId: string | null }) {
  await requireOjolAdmin();
  const [member, groups] = await Promise.all([memberId ? getMemberForEdit(memberId, role) : null, groupOptions()]);
  if (memberId && !member) notFound();
  const base = `/admin/ojol/${role}`;

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
