import { listPartners } from "@/modules/lazsip/api/partners";

function MitraBadge({ name, logo }: { name: string; logo: string | null }) {
  return (
    <span className="flex shrink-0 items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL gambar bebas dari admin
        <img src={logo} alt={name} className="h-6 w-6 shrink-0 rounded-full object-cover" />
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0 text-lazsip-secondary-300">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 21V5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v16M12 21v-9a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v9M3 21h18M7.5 7.5h1M7.5 11h1M7.5 14.5h1M15.5 12h1M15.5 15.5h1"
          />
        </svg>
      )}
      {name}
    </span>
  );
}

export async function MitraMarquee() {
  const partners = await listPartners();
  if (partners.length === 0) return null;

  const doubled = [...partners, ...partners];

  return (
    <section aria-label="Mitra kerja sama" className="bg-lazsip-primary-900 pt-7 pb-14 sm:pb-16">
      <p className="mb-5 text-center text-xs font-bold uppercase tracking-wide text-lazsip-secondary-200/70">
        Mitra Kami
      </p>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-lazsip-primary-900 to-transparent sm:w-28" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-lazsip-primary-900 to-transparent sm:w-28" />
        <div className="lazsip-animate-marquee flex w-max gap-3">
          {doubled.map((p, i) => (
            <MitraBadge key={`${p.id}-${i}`} name={p.name} logo={p.logo} />
          ))}
        </div>
      </div>
    </section>
  );
}
