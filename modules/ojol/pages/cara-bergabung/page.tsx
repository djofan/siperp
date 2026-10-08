import Link from "next/link";
import { Icon } from "@/modules/ojol/components/icons";
import { PageIntro } from "@/modules/ojol/components/site/PageIntro";
import { JOIN_STEPS, whatsappAdminHref } from "@/modules/ojol/components/site/content";
import { buttonClass } from "@/modules/ojol/components/ui";

export const metadata = { title: "Cara Bergabung" };

export default function OjolJoinPage() {
  return (
    <>
      <PageIntro eyebrow="Cara bergabung" title="Empat langkah menuju kode akun pertama.">
        Tidak ada pendaftaran online mandiri — semua akun didaftarkan admin, supaya setiap peserta langsung tersambung ke kelompok dan guru
        pembimbingnya.
      </PageIntro>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <ol className="grid gap-4 md:grid-cols-2">
          {JOIN_STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-5 rounded-3xl bg-ojol-surface p-7 ring-1 ring-ojol-line">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ojol-primary font-[family-name:var(--font-ojol-display)] text-lg font-extrabold text-white">
                {index + 1}
              </span>
              <div>
                <h2 className="text-lg font-semibold">{step.title}</h2>
                <p className="mt-1.5 leading-relaxed text-ojol-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <a href={whatsappAdminHref("Assalamu'alaikum, saya ingin bergabung di program Ojol Mengaji. Nama saya: ")} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "h-12 px-6")}>
            <Icon name="whatsapp" className="h-4 w-4" />
            Hubungi admin sekarang
          </a>
          <Link href="/ojol/masuk" className={buttonClass("secondary", "h-12 px-6")}>
            Sudah punya kode? Masuk
          </Link>
        </div>
      </section>
    </>
  );
}
