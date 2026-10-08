import Link from "next/link";
import { requireOjolMember } from "@/modules/ojol/api/access";
import { listReviewQueue } from "@/modules/ojol/api/submissions";
import { Icon } from "@/modules/ojol/components/icons";
import { Empty, Notice, PageTitle, Pill, TypePill, formatDateTime } from "@/modules/ojol/components/ui";

export const metadata = { title: "Antrean Koreksi" };

export default async function GuruReviewQueuePage({ searchParams }: { searchParams: Promise<{ selesai?: string }> }) {
  const viewer = await requireOjolMember("guru");
  const { selesai } = await searchParams;
  const queue = await listReviewQueue(viewer.member.id);

  return (
    <div>
      <PageTitle title="Antrean koreksi" description="Setoran voice note & video yang menunggu, dari yang paling lama dikirim. Kuis dinilai otomatis dan tidak masuk antrean." />
      {selesai && (
        <div className="mb-5">
          <Notice tone="success">{selesai === "approved" ? "Setoran disetujui." : "Setoran ditolak — peserta bisa mengirim ulang."}</Notice>
        </div>
      )}
      {queue.length ? (
        <div className="space-y-2">
          {queue.map((item, index) => (
            <Link
              key={item.id}
              href={`/ojol/guru/koreksi/${item.id}`}
              className="flex items-center gap-4 rounded-2xl bg-ojol-surface p-4 ring-1 ring-ojol-line transition-colors hover:ring-ojol-primary/40 sm:p-5"
            >
              <span className="w-6 shrink-0 text-center text-sm tabular-nums text-ojol-muted">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.student.user.name}</p>
                <p className="truncate text-sm text-ojol-muted">{item.task.title}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 sm:hidden">
                  <TypePill type={item.task.type} />
                  {item.attemptsCount > 1 && <Pill tone="gold">Percobaan ke-{item.attemptsCount}</Pill>}
                </div>
              </div>
              <div className="hidden flex-col items-end gap-1.5 sm:flex">
                <div className="flex gap-1.5">
                  {item.attemptsCount > 1 && <Pill tone="gold">Percobaan ke-{item.attemptsCount}</Pill>}
                  {item.isLate && <Pill tone="danger">Terlambat</Pill>}
                  <TypePill type={item.task.type} />
                </div>
                <span className="text-xs text-ojol-muted">{formatDateTime(item.submittedAt)}</span>
              </div>
              <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-ojol-muted" />
            </Link>
          ))}
        </div>
      ) : (
        <Empty title="Antrean kosong.">Semua setoran sudah dikoreksi. Setoran baru dari peserta akan muncul di sini.</Empty>
      )}
    </div>
  );
}
