import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { panelClasses } from "@/components/ui/panel";
import { requireOjolAdmin } from "@/modules/ojol/api/access";
import { getGroupDetail } from "@/modules/ojol/api/groups";
import { saveGroupAction } from "@/modules/ojol/api/actions/admin";
import { GroupForm } from "@/modules/ojol/components/admin/AdminForms";

export const metadata = { title: "Kelompok · Ojol Mengaji" };

export default async function OjolGroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOjolAdmin();
  const { id } = await params;
  const group = await getGroupDetail(id);
  if (!group) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={group.name} description={`${group.code} · ${group.members.length} anggota · ${group._count.tasks} tugas terkirim`} />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section className={panelClasses("p-6")}>
          <GroupForm action={saveGroupAction.bind(null, group.id)} initial={group} />
        </section>
        <section className={panelClasses("p-6")}>
          <h2 className="mb-4 font-semibold text-foreground">Anggota</h2>
          {group.members.length ? (
            <ul className="space-y-3">
              {group.members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/admin/ojol/peserta/${member.id}`} className="min-w-0 hover:underline">
                    <span className={`block truncate font-medium ${member.user.isActive ? "text-foreground" : "text-foreground/40 line-through"}`}>{member.user.name}</span>
                    <span className="text-xs text-foreground/50">{member.code}</span>
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
