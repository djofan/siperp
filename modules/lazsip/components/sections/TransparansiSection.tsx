import Link from "next/link";

import { getSiteContent } from "@/modules/lazsip/api/siteContent";
import { LAZSIP_SITE_CONTENT_DEFAULTS } from "@/modules/lazsip/api/siteContentDefaults";

const icons: Record<string, string> = {
  heart: "M12 21s-8-4.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.5-8 11-8 11Z",
  calculator: "M7 3h10a1 1 0 0 1 1 1v16H6V4a1 1 0 0 1 1-1ZM9 7h6M9 11h1m4 0h1m-6 4h1m4 0h1",
  image: "M4 5h16v14H4V5Zm0 10 5-5 5 5 3-3 3 3M15 8h.01",
};

function safeHref(value: string) {
  if (/^\/(?!\/)/.test(value) && !/[\\\s]/.test(value)) return value;
  try { const url = new URL(value); if (url.protocol === "https:" && !url.username && !url.password) return url.href; } catch {}
  return "/lazsip";
}

export async function TransparansiSection() {
  const content = { ...LAZSIP_SITE_CONTENT_DEFAULTS.transparansi, ...await getSiteContent("transparansi") };
  if (content.visible === "false") return null;
  const services = [1, 2, 3].filter(i => content[`card${i}Visible`] !== "false").map(i => ({
    title: content[`card${i}Title`], description: content[`card${i}Description`],
    action: content[`card${i}Action`], href: safeHref(content[`card${i}Href`]),
    icon: icons[content[`card${i}Icon`]] ?? icons.heart,
  }));
  return <section id="transparansi" className="bg-lazsip-primary-900">
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-6 max-w-2xl sm:mb-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-lazsip-secondary-200">{content.eyebrow}</p>
        <h2 className="text-balance text-2xl font-bold leading-tight tracking-tight text-white sm:text-4xl">{content.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base">{content.description}</p>
      </div>
      <div className={`grid gap-3 sm:gap-4 ${services.length === 1 ? "md:grid-cols-1" : services.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
        {services.map(service => <Link key={service.title + service.href} href={service.href} className="group flex min-w-0 flex-col rounded-2xl bg-white p-5 text-lazsip-primary-900 transition-colors hover:bg-lazsip-primary-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:p-6">
          <div className="mb-3 flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lazsip-primary-50 text-lazsip-primary-700"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d={service.icon}/></svg></span><h3 className="text-base font-bold leading-snug">{service.title}</h3></div>
          <p className="mb-5 text-sm leading-relaxed text-lazsip-primary-900/75">{service.description}</p>
          <span className="mt-auto flex items-center justify-between gap-2 text-sm font-semibold">{service.action}<span aria-hidden="true" className="transition-transform group-hover:translate-x-1 motion-reduce:transform-none">→</span></span>
        </Link>)}
      </div>
    </div>
  </section>;
}
