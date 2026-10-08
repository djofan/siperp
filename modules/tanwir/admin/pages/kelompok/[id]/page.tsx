import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { panelClasses } from "@/components/ui/panel";
import { requireTanwirAdmin } from "@/modules/tanwir/api/access";
import { getGroupDetail, guruOptions } from "@/modules/tanwir/api/groups";
import { saveGroupAction } from "@/modules/tanwir/api/actions/admin";
import { GroupForm } from "@/modules/tanwir/components/admin/AdminForms";

export const metadata = { title: "Kelompok · Tanwir Qurani" };

export default async function TanwirGroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTanwirAdmin();
  const { id } = await params;
  const [group, gurus] = await Promise.all([getGroupDetail(id), guruOptions()]);
  if (!group) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={group.name} description={`${group.code} · ${group.members.length} anggota · ${group._count.tasks} tugas terkirim`} />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className={panelClasses("p-6")}>
          <GroupForm action={saveGroupAction.bind(null, group.id)} initial={group} gurus={gurus} />
        </section>
        <section className={panelClasses("p-6")}>
          <h2 className="mb-4 font-semibold text-foreground">Anggota</h2>
          {group.members.length ? (
            <ul className="space-y-3">
              {group.members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/admin/tanwir/peserta/${member.id}`} className="min-w-0 hover:underline">
                    <span className={`block truncate font-medium ${member.user.isActive ? "text-foreground" : "text-foreground/40 line-through"}`}>{member.user.name}</span>
                    <span className="text-xs text-foreground/50">
                      {member.code}
                      {member.teachingPlace ? ` · ${member.teachingPlace}` : ""}
                    </span>
                  </Link>
                  <span className="shrink-0 tabular-nums text-xs text-foreground/50">{member.phone ?? ""}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-foreground/60">Belum ada anggota. Atur kelompok peserta dari halaman Peserta.</p>
          )}
        </section>
      </div>
    </div>
  );
}
