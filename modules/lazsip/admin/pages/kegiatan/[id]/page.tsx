import { notFound } from "next/navigation";
import { BackLink } from "@/modules/lazsip/components/ui/BackLink";
import { ActivityForm } from "@/modules/lazsip/components/admin/ActivityForm";
import { getActivityById } from "@/modules/lazsip/api/activities";

export default async function EditKegiatanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const activity = await getActivityById(id);

  if (!activity) {
    notFound();
  }

  return (
    <div>
      <BackLink href="/admin/lazsip/kegiatan">Semua Kegiatan</BackLink>
      <h2 className="mb-6 mt-4 text-xl font-extrabold tracking-tight text-lazsip-primary-900 dark:text-white">Edit Kegiatan</h2>
      <ActivityForm
        activityId={activity.id}
        initialValues={{
          title: activity.title,
          description: activity.description,
          image: activity.image ?? "",
          date: activity.date.toISOString().slice(0, 10),
          isPinned: activity.isPinned,
        }}
      />
    </div>
  );
}
