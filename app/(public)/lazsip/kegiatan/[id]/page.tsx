import { notFound } from "next/navigation";
import { getActivityById, listActivities } from "@/modules/lazsip/activities";
import { formatDate } from "@/components/lazsip/format";
import { ImagePlaceholder } from "@/components/lazsip/ui/ImagePlaceholder";
import { Button } from "@/components/lazsip/ui/Button";
import { BackLink } from "@/components/lazsip/ui/BackLink";
import { ActivityCard } from "@/components/lazsip/ActivityCard";

export default async function LazsipKegiatanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const activity = await getActivityById(id);

  if (!activity) {
    notFound();
  }

  const allActivities = await listActivities();
  const otherActivities = allActivities.filter((a) => a.id !== id).slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <article className="mx-auto max-w-3xl">
        <BackLink href="/lazsip/kegiatan">Semua Kegiatan</BackLink>

        <h1 className="mt-6 text-balance text-[2rem] font-extrabold leading-[1.15] tracking-tight text-lazsip-primary-900 sm:text-5xl">
          {activity.title}
        </h1>

        <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-lazsip-primary-800/55">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v3M16 3v3M3.5 9h17M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" />
          </svg>
          {formatDate(activity.date)}
        </div>

        <ImagePlaceholder variant="activity" src={activity.image} alt={activity.title} className="mt-8 aspect-[16/9] w-full rounded-3xl" />

        <div className="mt-8 flex flex-col gap-5">
          <p className="whitespace-pre-line text-base leading-[1.7] text-lazsip-primary-900/80 sm:text-lg">
            {activity.description}
          </p>
        </div>

        <div className="mt-12 border-t border-lazsip-primary-100 pt-8">
          <Button href="/lazsip/kegiatan" variant="secondary">
            Kembali ke Semua Kegiatan
          </Button>
        </div>
      </article>

      {otherActivities.length > 0 && (
        <div className="mt-16 border-t border-lazsip-primary-100 pt-12">
          <h2 className="text-xl font-extrabold tracking-tight text-lazsip-primary-900 sm:text-2xl">Kegiatan Lainnya</h2>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {otherActivities.map((a) => (
              <ActivityCard key={a.id} id={a.id} title={a.title} description={a.description} image={a.image} date={a.date} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
