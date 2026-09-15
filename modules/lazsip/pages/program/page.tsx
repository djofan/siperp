import { listProgramsByCategory } from "@/modules/lazsip/api/programs";
import { ProgramCard } from "@/modules/lazsip/components/ProgramCard";
import { BackLink } from "@/modules/lazsip/components/ui/BackLink";
import { FilterChips } from "@/modules/lazsip/components/ui/FilterChips";

const CATEGORY_LABEL: Record<string, string> = {
  umum: "Program Pemberdayaan",
  pendidikan: "Divisi Pendidikan",
  sarsip: "SARSIP",
};

export default async function LazsipProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string }>;
}) {
  const { kategori } = await searchParams;
  const category = kategori && CATEGORY_LABEL[kategori] ? kategori : "umum";
  const items = await listProgramsByCategory(category);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <BackLink href={`/lazsip#${category === "umum" ? "program" : category === "pendidikan" ? "divisi-pendidikan" : "sarsip"}`}>
        Kembali ke Beranda
      </BackLink>

      <span className="mb-4 mt-6 inline-flex items-center rounded-full bg-lazsip-primary-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-lazsip-primary-800">
        {CATEGORY_LABEL[category]}
      </span>
      <h1 className="text-balance text-[2rem] font-extrabold leading-[1.15] tracking-tight text-lazsip-primary-900 sm:text-5xl">
        Semua {CATEGORY_LABEL[category]}
      </h1>

      <div className="mt-8">
        <FilterChips
          options={Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label }))}
          value={category}
          buildHref={(value) => (value === "umum" ? "/lazsip/program" : `/lazsip/program?kategori=${value}`)}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ProgramCard key={item.id} id={item.id} title={item.title} description={item.description} image={item.image} registrationOpen={item.registrationOpen} />
        ))}
      </div>

      {items.length === 0 && <p className="mt-8 text-sm text-lazsip-primary-800/60">Belum ada program untuk kategori ini.</p>}
    </div>
  );
}
