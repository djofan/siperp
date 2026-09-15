import { listProgramsByCategory } from "@/modules/lazsip/api/programs";
import { ProgramCard } from "@/modules/lazsip/components/ProgramCard";
import { PinnedGridSection } from "@/modules/lazsip/components/ui/PinnedGridSection";
import { SectionHeading } from "@/modules/lazsip/components/ui/SectionHeading";

export async function ProgramSection({
  id,
  category,
  eyebrow,
  title,
  description,
  seeAllHref,
  tinted = false,
}: {
  id: string;
  category: string;
  eyebrow: string;
  title: string;
  description: string;
  seeAllHref: string;
  tinted?: boolean;
}) {
  const items = await listProgramsByCategory(category);
  const pinned = items.filter((p) => p.isPinned);
  const rest = items.filter((p) => !p.isPinned);

  if (items.length === 0) return null;

  return (
    <section id={id} className={tinted ? "bg-lazsip-primary-50/60" : undefined}>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        <SectionHeading eyebrow={eyebrow} title={title} description={description} />
        <div className="mt-10">
          <PinnedGridSection
            pinnedItems={pinned}
            gridItems={rest}
            renderItem={(item) => (
              <ProgramCard
                id={item.id}
                title={item.title}
                description={item.description}
                image={item.image}
                registrationOpen={item.registrationOpen}
              />
            )}
            renderPinnedItem={(item) => (
              <ProgramCard
                id={item.id}
                title={item.title}
                description={item.description}
                image={item.image}
                registrationOpen={item.registrationOpen}
                featured
              />
            )}
            seeAllHref={seeAllHref}
          />
        </div>
      </div>
    </section>
  );
}
