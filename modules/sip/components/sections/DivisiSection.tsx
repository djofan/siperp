import Link from "next/link";
import { SectionHeading } from "@/modules/sip/components/ui/SectionHeading";

interface Divisi {
  name: string;
  description: string;
  href: string | null;
  icon: string;
}

const DIVISI: Divisi[] = [
  {
    name: "LAZ SIP",
    description: "Lembaga Amil Zakat — donasi, zakat, dan program pemberdayaan umat.",
    href: "/lazsip",
    icon: "M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z",
  },
  {
    name: "SAR SIP",
    description: "Tim siaga & relawan tanggap bencana.",
    href: null,
    icon: "M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z",
  },
  {
    name: "Mahad Tahfidz SIP",
    description: "Mahad Tahfidz IDN As Sakinah — pendidikan Al-Qur'an gratis.",
    href: null,
    icon: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V4a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 4.5v15z",
  },
];

function DivisiCard({ divisi }: { divisi: Divisi }) {
  const content = (
    <>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sip-primary-50 text-sip-primary-700">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
          <path strokeLinecap="round" strokeLinejoin="round" d={divisi.icon} />
        </svg>
      </span>
      <h3 className="mt-4 text-base font-bold text-sip-primary-900">{divisi.name}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-sip-primary-800/60">{divisi.description}</p>
      {divisi.href ? (
        <span className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-sip-primary-800">
          Kunjungi
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      ) : (
        <span className="mt-4 inline-flex w-fit items-center rounded-full bg-sip-primary-900/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-sip-primary-800/50">
          Segera Hadir
        </span>
      )}
    </>
  );

  const className =
    "flex flex-col rounded-3xl border border-sip-primary-100 bg-white p-6 transition-colors" +
    (divisi.href ? " hover:border-sip-primary-300 hover:shadow-lg hover:shadow-sip-primary-900/5" : " opacity-80");

  if (divisi.href) {
    return (
      <Link href={divisi.href} className={className}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}

export function DivisiSection() {
  return (
    <section id="divisi" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
      <SectionHeading
        eyebrow="Divisi"
        title="Satu Yayasan, Banyak Jalan Kebaikan"
        description="SIP menaungi beberapa divisi yang bergerak di bidangnya masing-masing."
      />
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {DIVISI.map((divisi) => (
          <DivisiCard key={divisi.name} divisi={divisi} />
        ))}
      </div>
    </section>
  );
}
