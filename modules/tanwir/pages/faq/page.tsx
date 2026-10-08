import { Icon } from "@/modules/tanwir/components/icons";
import { PageIntro } from "@/modules/tanwir/components/site/PageIntro";
import { FAQ, whatsappAdminHref } from "@/modules/tanwir/components/site/content";
import { buttonClass } from "@/modules/tanwir/components/ui";

export const metadata = { title: "Pertanyaan Umum" };

export default function TanwirFaqPage() {
  return (
    <>
      <PageIntro eyebrow="Pertanyaan umum" title="Yang biasa ditanyakan sebelum mulai.">
        Kalau jawabannya belum ada di sini, langsung hubungi admin.
      </PageIntro>
      <section className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6">
        {FAQ.map((group) => (
          <div key={group.group} className="grid gap-6 md:grid-cols-[220px_1fr]">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-tanwir-muted">{group.group}</h2>
            <div className="space-y-3">
              {group.items.map((item) => (
                <details key={item.q} className="group rounded-2xl bg-tanwir-surface ring-1 ring-tanwir-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-medium [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <Icon name="plus" className="h-4 w-4 shrink-0 text-tanwir-muted transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="px-6 pb-6 leading-relaxed text-tanwir-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        ))}
      </section>
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-tanwir-surface p-8 ring-1 ring-tanwir-line sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-semibold">Masih ada pertanyaan?</h2>
            <p className="mt-1 text-tanwir-muted">Kirim pesan lewat WhatsApp, biasanya dibalas di jam kerja.</p>
          </div>
          <a href={whatsappAdminHref()} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>
            Hubungi admin
          </a>
        </div>
      </section>
    </>
  );
}
