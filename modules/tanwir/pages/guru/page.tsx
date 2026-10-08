import Link from "next/link";
import { requireTanwirMember } from "@/modules/tanwir/api/access";
import { teacherSummary } from "@/modules/tanwir/api/dashboard";
import { listReviewQueue } from "@/modules/tanwir/api/submissions";
import { Icon } from "@/modules/tanwir/components/icons";
import { ButtonLink, Card, Empty, Notice, Pill, SectionTitle, Stat, TypePill, formatDateTime } from "@/modules/tanwir/components/ui";

export default async function GuruHomePage() {
  const viewer = await requireTanwirMember("guru");
  const [summary, queue] = await Promise.all([teacherSummary(viewer.member.id), listReviewQueue(viewer.member.id)]);
  const memberCount = summary.groups.reduce((total, group) => total + group.members.length, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-tanwir-muted">Assalamu&apos;alaikum, Ustadz/Ustadzah</p>
          <h1 className="mt-1 font-[family-name:var(--font-tanwir-serif)] text-4xl tracking-tight">{viewer.name}</h1>
        </div>
        <ButtonLink href="/tanwir/guru/tugas/baru">
          <Icon name="plus" className="h-4 w-4" />
          Buat tugas
        </ButtonLink>
      </div>

      {!summary.groups.length && (
        <Notice tone="warning">Anda belum menjadi PIC kelompok mana pun, jadi tugas yang dibuat belum terkirim ke peserta. Hubungi admin.</Notice>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Menunggu koreksi" value={summary.pending} emphasis={summary.pending > 0} hint={summary.pending ? "Segera periksa" : "Semua sudah dikoreksi"} />
        <Stat label="Tugas dibuat" value={summary.tasks} />
        <Stat label="Koreksi selesai" value={summary.reviewed} />
        <Stat label="Peserta binaan" value={memberCount} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <SectionTitle
            action={
              queue.length > 0 && (
                <Link href="/tanwir/guru/koreksi" className="text-sm font-medium text-tanwir-primary hover:underline">
                  Lihat semua
                </Link>
              )
            }
          >
            Antrean koreksi
          </SectionTitle>
          {queue.length ? (
            <div className="space-y-2">
              {queue.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  href={`/tanwir/guru/koreksi/${item.id}`}
                  className="flex items-center gap-4 rounded-2xl bg-tanwir-surface p-4 ring-1 ring-tanwir-line hover:bg-tanwir-paper"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.student.user.name}</p>
                    <p className="truncate text-sm text-tanwir-muted">{item.task.title}</p>
                  </div>
                  <div className="hidden flex-col items-end gap-1 text-xs text-tanwir-muted sm:flex">
                    <TypePill type={item.task.type} />
                    <span>{formatDateTime(item.submittedAt)}</span>
                  </div>
                  <Icon name="chevronRight" className="h-4 w-4 text-tanwir-muted" />
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="Tidak ada setoran yang menunggu.">Setoran baru dari peserta akan muncul di sini.</Empty>
          )}
        </section>

        <section>
          <SectionTitle>Kelompok binaan</SectionTitle>
          {summary.groups.length ? (
            <div className="space-y-3">
              {summary.groups.map((group) => (
                <Card key={group.id} className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{group.name}</p>
                    <Pill>{group.code}</Pill>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {group.members.map((member) => (
                      <li key={member.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className={member.user.isActive ? "" : "text-tanwir-muted line-through"}>{member.user.name}</span>
                        <span className="text-xs tabular-nums text-tanwir-muted">
                          {member._count.submissions} setoran · {member._count.students} santri
                        </span>
                      </li>
                    ))}
                    {!group.members.length && <li className="text-sm text-tanwir-muted">Belum ada peserta.</li>}
                  </ul>
                </Card>
              ))}
            </div>
          ) : (
            <Empty title="Belum ada kelompok." />
          )}
        </section>
      </div>
    </div>
  );
}
