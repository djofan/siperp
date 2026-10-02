import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { bankDate } from "./policy";
const rp = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
export async function OperationalOverview({ from, to }: { from?: string; to?: string }) {
  const today = new Date(new Date().getTime()+7*3600000).toISOString().slice(0,10);
  const since = from ?? today.slice(0,7)+"-01", until = to ?? today;
  let start: Date, end: Date;
  try { start = bankDate(since); end = new Date(bankDate(until).getTime()+86400000); if (end <= start) throw new Error(); }
  catch { return <p className="mt-5 text-red-600">Rentang tanggal tidak valid. <Link href="/admin/super" className="underline">Reset filter</Link></p>; }
  const [income, expenses, pending, applications, courses, enrollments, unanswered, unmatched, beneficiaryLaz, beneficiarySar, contacts, recent] = await Promise.all([
    prisma.paymentTransaction.groupBy({ by: ["moduleSource", "fundType"], where: { status: "paid", gateway: { notIn: ["simulation", "midtrans_sandbox"] }, paidAt: { gte: start, lt: end } }, _sum: { amount: true, adminFee: true }, _count: true }),
    prisma.coreExpense.aggregate({ where: { spentAt: { gte: start, lt: end } }, _sum: { amount: true }, _count: true }),
    prisma.paymentTransaction.count({ where: { status: "pending", gateway: { notIn: ["simulation", "midtrans_sandbox"] } } }),
    prisma.lazsipProgramApplicant.count({ where: { status: { in: ["baru", "diproses"] } } }),
    prisma.zakatAcademyCourse.findMany({ where: { isSimulation: false }, select: { id: true, title: true, quota: true, isPublished: true, registrationOpen: true, _count: { select: { enrollments: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.zakatAcademyEnrollment.count({ where: { course: { isSimulation: false } } }),
    prisma.academyDiscussion.count({ where: { answer: null, course: { isSimulation: false } } }),
    prisma.coreBankLine.count({ where: { paymentId: null, expenseId: null } }),
    prisma.lazsipBeneficiary.count({ where: { createdAt: { gte: start, lt: end } } }),
    prisma.sarsipBeneficiary.count({ where: { archivedAt: null, receivedAt: { gte: start, lt: end } } }),
    prisma.coreContact.count(),
    prisma.paymentTransaction.findMany({ where: { status: "paid", gateway: { notIn: ["simulation", "midtrans_sandbox"] }, paidAt: { gte: start, lt: end } }, select: { id: true, trackingCode: true, amount: true, moduleSource: true, fundType: true, paidAt: true }, orderBy: { paidAt: "desc" }, take: 6 }),
  ]);
  const cards = [
    { label: "Dana diterima pada periode", value: rp(income.reduce((n,v) => n+(v._sum.amount ?? 0),0)), href: "/admin/super/keuangan" },
    { label: "Pengeluaran tercatat pada periode", value: rp(expenses._sum.amount ?? 0), href: "/admin/super/keuangan" },
    { label: "Penerima bantuan LAZSIP / SARSIP pada periode", value: `${beneficiaryLaz} / ${beneficiarySar}`, href: "/admin/lazsip/penyaluran-bantuan" },
    { label: "Pendaftaran peserta Academy resmi (semua waktu)", value: enrollments, href: "/admin/academy" },
    { label: "Kontak terpadu", value: contacts, href: "/admin/super/kontak" },
  ];
  const tasks = [ { label: "Pembayaran menunggu", count: pending, href: "/admin/lazsip/transaksi" }, { label: "Pengajuan bantuan perlu diproses", count: applications, href: "/admin/lazsip/pendaftar" }, { label: "Pertanyaan Academy belum dijawab", count: unanswered, href: "/academy/pengajar/pertanyaan" }, { label: "Mutasi bank belum cocok", count: unmatched, href: "/admin/super/keuangan?status=unmatched" } ];
  return <section className="mt-7 space-y-5"><h2 className="font-semibold">Operasional lintas modul</h2><p className="text-sm text-foreground/60">Ringkasan dana mengecualikan pembayaran simulasi dan sandbox. Academy menampilkan angkatan resmi.</p><form className="flex flex-wrap items-end gap-3"><label className="text-sm">Dari<input name="from" type="date" defaultValue={since} className="ml-2 rounded-lg border border-border bg-surface p-2" /></label><label className="text-sm">Sampai<input name="to" type="date" defaultValue={until} className="ml-2 rounded-lg border border-border bg-surface p-2" /></label><button className="rounded-lg border border-border px-4 py-2 text-sm">Terapkan periode</button></form>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(c => <Link key={c.label} href={c.href} className="rounded-xl border border-border bg-surface p-5"><p className="text-sm text-foreground/60">{c.label}</p><p className="mt-2 text-2xl font-semibold">{c.value}</p></Link>)}</div>
    <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-xl border border-border bg-surface p-5"><h3 className="font-semibold">Perlu tindakan · semua waktu</h3>{tasks.map(t => <Link key={t.label} href={t.href} className="flex justify-between gap-3 border-b border-border py-3 text-sm"><span>{t.label}</span><strong>{t.count}</strong></Link>)}</section><section className="rounded-xl border border-border bg-surface p-5"><h3 className="font-semibold">Penerimaan menurut modul dan dana</h3>{income.map(i => <p key={`${i.moduleSource}/${i.fundType}`} className="border-b border-border py-3 text-sm">{i.moduleSource} / {i.fundType}: {rp(i._sum.amount ?? 0)} · {i._count} transaksi</p>)}{!income.length && <p className="py-3 text-sm">Belum ada penerimaan pada periode ini.</p>}</section></div>
    <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-xl border border-border bg-surface p-5"><h3 className="font-semibold">Angkatan Academy resmi</h3>{courses.map(c => <Link key={c.id} href="/admin/academy/angkatan" className="block border-b border-border py-3 text-sm">{c.title} · {c._count.enrollments}/{c.quota} peserta · {c.isPublished && c.registrationOpen ? "Pendaftaran dibuka" : "Pendaftaran ditutup/draft"}</Link>)}</section><section className="rounded-xl border border-border bg-surface p-5"><h3 className="font-semibold">Penerimaan terbaru pada periode</h3>{recent.map(p => <p key={p.id} className="border-b border-border py-3 text-sm">{p.trackingCode} · {p.moduleSource}/{p.fundType} · {rp(p.amount)}</p>)}</section></div>
  </section>;
}
