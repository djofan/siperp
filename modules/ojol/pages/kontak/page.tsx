import Link from "next/link";
import { Icon } from "@/modules/ojol/components/icons";
import { PageIntro } from "@/modules/ojol/components/site/PageIntro";
import { whatsappAdminHref } from "@/modules/ojol/components/site/content";
import { buttonClass } from "@/modules/ojol/components/ui";

export const metadata = { title: "Kontak" };

export default function OjolContactPage() {
  return (
    <>
      <PageIntro eyebrow="Kontak" title="Ada pertanyaan? Kami siap membantu.">
        Untuk pendaftaran akun baru, reset password, atau kendala teknis, hubungi admin lewat salah satu kanal di bawah.
      </PageIntro>
      <section className="mx-auto grid max-w-6xl gap-5 px-4 sm:px-6 md:grid-cols-2">
        <article className="flex flex-col rounded-3xl bg-ojol-primary p-8 text-white">
          <Icon name="whatsapp" className="h-6 w-6" />
          <h2 className="mt-6 text-xl font-semibold">WhatsApp admin</h2>
          <p className="mt-2 flex-1 leading-relaxed text-white/75">Cara tercepat untuk pendaftaran akun, reset password, atau pertanyaan seputar aplikasi.</p>
          <a href={whatsappAdminHref()} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex h-11 w-fit items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-ojol-primary hover:bg-ojol-paper">
            Chat via WhatsApp
            <Icon name="arrowRight" className="h-4 w-4" />
          </a>
        </article>
        <div className="grid gap-5">
          <article className="rounded-3xl bg-ojol-surface p-7 ring-1 ring-ojol-line">
            <h2 className="font-semibold">Untuk guru & peserta aktif</h2>
            <p className="mt-2 leading-relaxed text-ojol-muted">
              Kendala login atau mengunggah setoran? Sertakan kode akun saat menghubungi admin agar lebih cepat ditangani.
            </p>
            <Link href="/ojol/masuk" className={buttonClass("secondary", "mt-5")}>
              Ke halaman masuk
            </Link>
          </article>
          <article className="rounded-3xl bg-ojol-surface p-7 ring-1 ring-ojol-line">
            <h2 className="font-semibold">Jam layanan admin</h2>
            <p className="mt-2 leading-relaxed text-ojol-muted">Senin – Sabtu, 08.00 – 17.00 WIB. Pesan di luar jam tersebut dibalas pada hari kerja berikutnya.</p>
            <p className="mt-4 text-sm text-ojol-muted">LAZ Solidaritas Insan Peduli — Kabupaten Bogor, Jawa Barat.</p>
          </article>
        </div>
      </section>
    </>
  );
}
