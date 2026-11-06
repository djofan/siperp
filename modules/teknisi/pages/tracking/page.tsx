import { apiRequest, ApiError } from "@/lib/api";
import type { Response8 } from "@/modules/teknisi/api/contracts";
import { dateTime } from "../../api/queries";
import { StatusBadge } from "../../components/StatusBadge";
import { isStatus, statuses } from "../../api/policy";
export const metadata = { title: "Cek Status Servis", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function Page({ searchParams }: {
    searchParams: Promise<{
        kode?: string;
    }>;
}) {
    const { kode } = await searchParams;
    const code = (kode ?? "").trim();
    let ticket: Response8["ticket"] = null;
    if (/^[a-f0-9]{48}$/.test(code)) {
        try {
            ticket = await apiRequest<Response8["ticket"]>(`teknisi/tracking/${code}`);
        }
        catch (error) {
            if (!(error instanceof ApiError && [403, 404].includes(error.status)))
                throw error;
        }
    }
    const timeline = ticket?.events.filter((event, index, all) => index === 0 || event.status !== all[index - 1].status);
    return <section className="mx-auto max-w-2xl px-6 py-16"><h1 className="text-3xl font-bold">Cek Status Servis</h1><p className="mt-3 leading-7 text-slate-600">Masukkan kode pelacakan dari staf outlet untuk melihat perkembangan servis Anda.</p><form className="mt-8 space-y-4"><label className="block text-sm font-medium" htmlFor="tracking-code">Kode pelacakan</label><input id="tracking-code" name="kode" defaultValue={code} required maxLength={48} autoComplete="off" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm focus:outline-emerald-600" placeholder="Masukkan kode pelacakan"/><button className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white">Lihat Status</button></form>{code && !ticket && <p role="alert" className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Kode tidak ditemukan. Periksa kembali kode pelacakan atau hubungi outlet.</p>}{ticket && <article className="mt-8 rounded-2xl border border-slate-200 bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{ticket.number}</h2><StatusBadge status={ticket.status}/></div><p className="mt-4 text-sm text-slate-600">{ticket.outlet.name} · {ticket.outlet.phone}</p><p className="mt-2 text-xs text-slate-500">Diperbarui {dateTime(ticket.updatedAt)} WIB</p>{ticket.dueAt && <p className="mt-2 text-sm text-slate-600">Target selesai: {dateTime(ticket.dueAt)} WIB</p>}<ol className="mt-6 space-y-4 border-t border-slate-100 pt-6">{timeline?.map((event, index) => <li key={index} className="border-l-2 border-emerald-200 pl-4"><p className="text-sm font-medium">{isStatus(event.status) ? statuses[event.status] : event.status}</p><p className="mt-1 text-xs text-slate-500">{dateTime(event.createdAt)} WIB</p></li>)}</ol></article>}</section>;
}
