import Link from "next/link";
import { requireOjolMember } from "@/modules/ojol/api/access";
import { studentGroupInfo } from "@/modules/ojol/api/dashboard";
import { listStudentTasks, statusCounts } from "@/modules/ojol/api/submissions";
import { StudentTaskRow } from "@/modules/ojol/components/app/TaskRow";
import { Card, Empty, Notice, SectionTitle, Stat } from "@/modules/ojol/components/ui";

export default async function PesertaHomePage() {
  const viewer = await requireOjolMember("peserta");
  const [tasks, group] = await Promise.all([listStudentTasks(viewer.member), studentGroupInfo(viewer.member.groupId)]);
  const counts = statusCounts(tasks);
  const actionable = tasks.filter((task) => task.state === "todo" || task.state === "rejected").slice(0, 4);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-ojol-muted">Assalamu&apos;alaikum,</p>
        <h1 className="mt-1 font-[family-name:var(--font-ojol-display)] text-3xl font-bold tracking-tight sm:text-4xl">{viewer.name}</h1>
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
              <Link href="/ojol/peserta/tugas" className="text-sm font-medium text-ojol-primary hover:underline">
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
            <Empty title="Tidak ada setoran yang menunggu.">Semua tugas sudah dikerjakan. Barakallahu fiikum — lanjut narik dengan tenang.</Empty>
          )}
        </section>

        <aside className="space-y-4">
          {group && (
            <Card>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-ojol-gold">Kelompok</p>
              <p className="mt-2 text-lg font-semibold">{group.name}</p>
              <p className="text-sm text-ojol-muted">
                {group.code} · {group._count.members} peserta
              </p>
              {group.description && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ojol-muted">{group.description}</p>}
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
