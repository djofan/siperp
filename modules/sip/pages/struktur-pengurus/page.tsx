import { listPengurus } from "@/modules/sip/api/pengurus";
import { SectionHeading } from "@/modules/sip/components/ui/SectionHeading";
import { ImagePlaceholder } from "@/modules/sip/components/ui/ImagePlaceholder";

const LEVEL_LABEL: Record<string, string> = {
  pembina: "Pembina",
  pengurus_inti: "Pengurus Inti",
  pengawas: "Pengawas",
  tim: "Tim",
};

const LEVEL_ORDER = ["pembina", "pengurus_inti", "pengawas", "tim"];

export default async function StrukturPengurusPage() {
  const pengurus = await listPengurus();

  const grouped = LEVEL_ORDER.map((level) => ({
    level,
    label: LEVEL_LABEL[level],
    members: pengurus.filter((p) => p.level === level),
  })).filter((group) => group.members.length > 0);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <SectionHeading eyebrow="Profil" title="Struktur Pengurus SIP" />

      {grouped.length === 0 ? (
        <p className="mt-10 text-sm text-sip-primary-800/60">Struktur pengurus belum diisi.</p>
      ) : (
        <div className="mt-10 flex flex-col gap-10">
          {grouped.map((group) => (
            <div key={group.level}>
              <h2 className="mb-5 text-sm font-bold uppercase tracking-wide text-sip-primary-800/60">{group.label}</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {group.members.map((person) => (
                  <div key={person.id} className="flex flex-col items-center rounded-2xl border border-sip-primary-100 bg-white p-4 text-center">
                    <ImagePlaceholder variant="person" src={person.photo} alt={person.name} className="h-20 w-20 rounded-full" />
                    <p className="mt-3 text-sm font-bold text-sip-primary-900">{person.name}</p>
                    <p className="mt-0.5 text-xs text-sip-primary-800/60">{person.position}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
