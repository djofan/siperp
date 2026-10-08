import Link from "next/link";
import { requireTanwirMember } from "@/modules/tanwir/api/access";
import { studentGroupInfo } from "@/modules/tanwir/api/dashboard";
import { listStudentTasks, statusCounts } from "@/modules/tanwir/api/submissions";
import { prisma } from "@/lib/prisma";
import { StudentTaskRow } from "@/modules/tanwir/components/app/TaskRow";
import { Card, Empty, Notice, SectionTitle, Stat } from "@/modules/tanwir/components/ui";
import { Icon } from "@/modules/tanwir/components/icons";

export default async function PesertaHomePage() {
  const viewer = await requireTanwirMember("peserta");
  const [tasks, group, studentCount] = await Promise.all([
    listStudentTasks(viewer.member),
    studentGroupInfo(viewer.member.groupId),
    prisma.tanwirStudent.count({ where: { memberId: viewer.member.id } }),
  ]);
  const counts = statusCounts(tasks);
  const actionable = tasks.filter((task) => task.state === "todo" || task.state === "rejected").slice(0, 4);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-tanwir-muted">Assalamu&apos;alaikum,</p>
        <h1 className="mt-1 font-[family-name:var(--font-tanwir-serif)] text-4xl tracking-tight">{viewer.name}</h1>
      </div>

      {!group && <Notice tone="warning">Anda belum tergabung di kelompok mana pun, jadi belum ada tugas yang tampil. Hubungi admin untuk dimasukkan ke kelompok.</Notice>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Belum dikerjakan" value={counts.todo} emphasis={counts.todo > 0} />
        <Stat label="Menunggu koreksi" value={counts.pending} />
        <Stat label="Perlu diulang" value={counts.rejected} />
        <Stat label="Selesai" value={counts.approved} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <SectionTitle
            action={
              <Link href="/tanwir/peserta/tugas" className="text-sm font-medium text-tanwir-primary hover:underline">
                Semua tugas
              </Link>
            }
          >
            Perlu dikerjakan
          </SectionTitle>
          {actionable.length ? (
            <div className="space-y-3">
              {actionable.map((task) => (
                <StudentTaskRow key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <Empty title="Tidak ada tugas yang menunggu.">Semua tugas sudah dikerjakan. Barakallahu fiikum.</Empty>
          )}
        </section>

        <aside className="space-y-4">
          {group && (
            <Card>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-tanwir-gold">Kelompok</p>
              <p className="mt-2 text-lg font-semibold">{group.name}</p>
              <p className="text-sm text-tanwir-muted">
                {group.code} · {group._count.members} peserta
              </p>
              {group.pic && (
                <p className="mt-4 text-sm">
                  <span className="text-tanwir-muted">Guru PIC</span>
                  <br />
                  <span className="font-medium">{group.pic.user.name}</span>
                </p>
              )}
              {group.description && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-tanwir-muted">{group.description}</p>}
            </Card>
          )}
          <Link href="/tanwir/peserta/anak-didik" className="flex items-center gap-4 rounded-2xl bg-tanwir-surface p-5 ring-1 ring-tanwir-line hover:ring-tanwir-primary/40">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-tanwir-gold-soft text-tanwir-gold">
              <Icon name="students" />
            </span>
            <div className="flex-1">
              <p className="font-medium">Anak didik</p>
              <p className="text-sm text-tanwir-muted">{studentCount} santri tercatat</p>
            </div>
            <Icon name="chevronRight" className="h-4 w-4 text-tanwir-muted" />
          </Link>
        </aside>
      </div>
    </div>
  );
}
