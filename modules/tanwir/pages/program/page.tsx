import Link from "next/link";
import { Icon } from "@/modules/tanwir/components/icons";
import { PageIntro } from "@/modules/tanwir/components/site/PageIntro";
import { ROLES, whatsappAdminHref } from "@/modules/tanwir/components/site/content";
import { buttonClass } from "@/modules/tanwir/components/ui";

export const metadata = { title: "Program & Fitur" };

export default function TanwirProgramPage() {
  return (
    <>
      <PageIntro eyebrow="Program & fitur" title="Satu platform untuk tiga peran.">
        Tiap peran punya alurnya sendiri, tetapi semuanya bertemu di satu tempat yang sama — supaya tidak ada yang tercecer.
      </PageIntro>

      <section className="mx-auto max-w-6xl space-y-5 px-4 sm:px-6">
        {ROLES.map((role) => (
          <article key={role.eyebrow} className="grid gap-8 rounded-3xl bg-tanwir-surface p-7 ring-1 ring-tanwir-line sm:p-10 md:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-tanwir-gold">Untuk {role.eyebrow.toLowerCase()}</p>
              <h2 className="mt-3 text-2xl font-semibold">{role.title}</h2>
              <p className="mt-3 leading-relaxed text-tanwir-muted">{role.body}</p>
            </div>
            <ul className="grid content-start gap-3">
              {role.points.map((point) => (
                <li key={point} className="flex items-center gap-3 rounded-2xl bg-tanwir-paper px-4 py-3.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tanwir-primary-soft text-tanwir-primary">
                    <Icon name="check" className="h-4 w-4" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16 text-center sm:px-6">
        <h2 className="font-[family-name:var(--font-tanwir-serif)] text-4xl tracking-tight">Siap mulai?</h2>
        <p className="mx-auto mt-3 max-w-lg text-tanwir-muted">Belum punya akun? Hubungi admin untuk didaftarkan sesuai peran dan kelompok Anda.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/tanwir/masuk" className={buttonClass("primary")}>
            Masuk sekarang
          </Link>
          <a href={whatsappAdminHref()} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary")}>
            Hubungi admin
          </a>
        </div>
      </section>
    </>
  );
}
