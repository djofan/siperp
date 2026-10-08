import { Icon } from "@/modules/ojol/components/icons";
import { PageIntro } from "@/modules/ojol/components/site/PageIntro";
import { FAQ, whatsappAdminHref } from "@/modules/ojol/components/site/content";
import { buttonClass } from "@/modules/ojol/components/ui";

export const metadata = { title: "FAQ" };

export default function OjolFaqPage() {
  return (
    <>
      <PageIntro eyebrow="FAQ" title="Pertanyaan yang sering ditanyakan.">
        Belum ketemu jawabannya? Langsung tanya admin lewat WhatsApp.
      </PageIntro>
      <section className="mx-auto max-w-3xl space-y-3 px-4 sm:px-6">
        {FAQ.map((item) => (
          <details key={item.q} className="group rounded-2xl bg-ojol-surface ring-1 ring-ojol-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-medium [&::-webkit-details-marker]:hidden">
              {item.q}
              <Icon name="plus" className="h-4 w-4 shrink-0 text-ojol-muted transition-transform group-open:rotate-45" />
            </summary>
            <p className="px-6 pb-6 leading-relaxed text-ojol-muted">{item.a}</p>
          </details>
        ))}
        <div className="pt-8 text-center">
          <a href={whatsappAdminHref()} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>
            Tanya admin
          </a>
        </div>
      </section>
    </>
  );
}
