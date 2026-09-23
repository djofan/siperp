"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { normalizeDonorPhone } from "@/modules/payment/api/donorIdentity";
import { calculateFee } from "@/modules/lazsip/api/feeCalculation";
const money = (v: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
type Method = { method: string; feeAmount: number | null; feePercentage: number | null };

export function DonationForm({ campaignId, methods }: { campaignId: string; methods: Method[] }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [method, setMethod] = useState(methods[0]?.method ?? "");
  const [coversFee, setCoversFee] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const nominal = Number(amount) || 0;
  const fee = coversFee ? calculateFee(methods.find((m) => m.method === method), nominal) : 0;
  const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-100";
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!name.trim() || !normalizeDonorPhone(phone) || nominal <= 0 || !method) {
      setError("Isi nama, nomor WhatsApp yang valid, nominal, dan metode pembayaran."); return;
    }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/payment/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleSource: "sarsip", sourceType: "campaign", sourceId: campaignId, fundType: "donasi",
          donorName: name, donorPhone: phone, amount: nominal, paymentMethod: method, isAnonymous: anonymous, coversFee }),
      });
      const data = await response.json();
      if (!response.ok || typeof data.transactionId !== "string") throw new Error(data.error ?? "Gagal membuat transaksi.");
      router.push(`/payment/checkout/${data.transactionId}`);
    } catch (err) { setError(err instanceof Error ? err.message : "Koneksi gagal. Coba kembali."); }
    finally { setBusy(false); }
  }
  return <form id="donasi" onSubmit={submit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
    <div><p className="text-xs font-bold uppercase tracking-widest text-orange-700">Dukung misi kemanusiaan</p><h2 className="mt-2 text-2xl font-bold">Form donasi</h2></div>
    <div className="flex flex-wrap gap-2">{[50000,100000,250000].map((v) => <button key={v} type="button" onClick={() => setAmount(String(v))} className={`rounded-full border px-3 py-2 text-sm ${nominal === v ? "border-orange-600 bg-orange-600 text-white" : "border-slate-200"}`}>{money(v)}</button>)}</div>
    <label className="block space-y-2 text-sm font-medium"><span>Nominal donasi (Rp)</span><input required type="number" min="1" max="2147483647" step="1" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass}/></label>
    <label className="block space-y-2 text-sm font-medium"><span>Nama lengkap</span><input required autoComplete="name" maxLength={191} value={name} onChange={(e) => setName(e.target.value)} className={inputClass}/></label>
    <label className="block space-y-2 text-sm font-medium"><span>Nomor WhatsApp</span><input required type="tel" autoComplete="tel" placeholder="081234567890" maxLength={25} value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass}/></label>
    <label className="flex items-start gap-3 text-sm text-slate-600"><input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="mt-1 accent-orange-600"/><span>Tampilkan sebagai Hamba Allah. Nama asli dan nomor WhatsApp tetap dicatat untuk admin.</span></label>
    <label className="block space-y-2 text-sm font-medium"><span>Metode pembayaran</span><select required value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>{methods.map((m) => <option key={m.method}>{m.method}</option>)}</select></label>
    {!methods.length && <p role="status" className="text-sm text-orange-800">Metode pembayaran belum tersedia. Hubungi pengelola SARSIP.</p>}
    <label className="flex items-start gap-3 text-sm text-slate-600"><input type="checkbox" checked={coversFee} onChange={(e) => setCoversFee(e.target.checked)} className="mt-1 accent-orange-600"/>Saya menanggung biaya admin.</label>
    <dl className="space-y-2 border-t border-slate-200 pt-4 text-sm"><div className="flex justify-between"><dt>Donasi</dt><dd>{money(nominal)}</dd></div><div className="flex justify-between"><dt>Biaya admin</dt><dd>{money(fee)}</dd></div><div className="flex justify-between font-bold"><dt>Total</dt><dd>{money(nominal + fee)}</dd></div></dl>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button disabled={busy || !methods.length} className="w-full rounded-full bg-orange-600 px-5 py-3 font-bold text-white hover:bg-orange-700 disabled:opacity-50">{busy ? "Memproses…" : "Lanjut ke pembayaran"}</button>
    <p className="text-xs leading-relaxed text-slate-500">Pembayaran diproses melalui modul Payment SIP. Nomor WhatsApp tidak ditampilkan di halaman publik.</p>
  </form>;
}

