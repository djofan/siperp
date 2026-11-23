"use client";
import { RupiahNumberInput } from "@/components/ui/RupiahNumberInput";

import styles from "./Detail.module.css";
import { GatewayHandoff } from "@/modules/payment/components/GatewayHandoff";
import { useRef } from "react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { normalizeDonorPhone } from "@/modules/payment/api/donorIdentity";
import { calculateFee } from "@/lib/payments/feeCalculation";
const money = (v: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
type Method = { method: string; feeAmount: number | null; feePercentage: number | null };

export function DonationForm({ campaignId, methods, preview = false }: { campaignId: string; methods: Method[]; preview?: boolean }) {
  const router = useRouter();
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const checkoutKey = useRef<string | null>(null);
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [method, setMethod] = useState(methods[0]?.method ?? "");
  const [coversFee, setCoversFee] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const nominal = Number(amount) || 0;
  const isIpaymu = preview || method === "iPaymu" || method === "iPaymu Sandbox";
  const fee = !isIpaymu && coversFee ? calculateFee(methods.find((m) => m.method === method), nominal) : 0;
  const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-50";
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || preview) return;
    if (!name.trim() || !normalizeDonorPhone(phone) || nominal <= 0 || !method) {
      setError("Isi nama, nomor WhatsApp yang valid, nominal, dan metode pembayaran."); return;
    }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/payment/checkout", {
        method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": checkoutKey.current ??= crypto.randomUUID() },
        body: JSON.stringify({ moduleSource: "sarsip", sourceType: "campaign", sourceId: campaignId, fundType: "donasi",
          donorName: name, donorPhone: phone, donorEmail: email, amount: nominal, paymentMethod: method, isAnonymous: anonymous, coversFee: !isIpaymu && coversFee }),
      });
      const data = await response.json();
      if (!response.ok || typeof data.transactionId !== "string") throw new Error(data.error?.message ?? data.error ?? "Gagal membuat transaksi.");
      if (isIpaymu) setTransactionId(data.transactionId);
      else router.push(`/payment/checkout/${data.transactionId}`);
    } catch (err) { setError(err instanceof Error ? err.message : "Koneksi gagal. Coba kembali."); }
    finally { setBusy(false); }
  }
  if (transactionId) return <div className={styles.form}><GatewayHandoff transactionId={transactionId}/></div>;
  return <form id="donasi" onSubmit={submit} className={styles.form}>
    <div><p className="text-xs font-bold uppercase tracking-widest text-orange-700">Dukung misi kemanusiaan</p><h2 className="mt-2 text-2xl font-bold">Form donasi</h2></div>
    <p className={styles.fieldTitle}>Nominal donasi</p>
    <div className={styles.presets}> { [50000,100000,250000,500000,1000000].map((v) => <button key={v} type="button" onClick={() => setAmount(String(v))} aria-pressed={nominal === v}>{money(v)}</button>)}</div>
    <label className="block space-y-2 text-sm font-medium"><span className="sr-only">Nominal donasi (Rp)</span><RupiahNumberInput required type="number" min="1" max="2147483647" step="1" inputMode="numeric" placeholder="Rp Nominal lainnya" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass}/></label>
    {!(isIpaymu && (preview || methods.length === 1)) && <label className="block space-y-2 text-sm font-medium"><span>Metode pembayaran</span><select required disabled={preview} value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>{preview && <option value="">iPaymu · Pratinjau</option>}{methods.map((m) => <option key={m.method}>{m.method}</option>)}</select></label>}
    {isIpaymu && <p className={styles.paymentHint}>Pilih metode pembayaran langsung di iPaymu. Biaya ditampilkan sebelum pembayaran.</p>}
    <div className={styles.identity}><label className="block space-y-2 text-sm font-medium"><span>Nama lengkap</span><input required placeholder="Nama Anda" autoComplete="name" maxLength={191} value={name} onChange={(e) => setName(e.target.value)} className={inputClass}/></label>
    <label className="block space-y-2 text-sm font-medium"><span>Nomor WhatsApp</span><input required type="tel" autoComplete="tel" placeholder="081234567890" maxLength={25} value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass}/></label></div>
    <label className="block space-y-2 text-sm font-medium"><span>Email (opsional)</span><input type="email" placeholder="nama@email.com" autoComplete="email" maxLength={191} value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass}/><span className="block text-xs text-slate-500">Kode pelacakan dikirim ke email ini.</span></label>
    <label className="flex items-start gap-3 text-sm text-slate-600"><input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="mt-1 accent-orange-600"/><span>Sembunyikan nama publik (Hamba Allah). Identitas tetap tercatat untuk admin.</span></label>

    {!preview && !methods.length && <p role="status" className="text-sm text-orange-800">Metode pembayaran belum tersedia. Hubungi pengelola SARSIP.</p>}
    {!isIpaymu && <label className="flex items-start gap-3 text-sm text-slate-600"><input type="checkbox" checked={coversFee} onChange={(e) => setCoversFee(e.target.checked)} className="mt-1 accent-orange-600"/>Saya menanggung biaya admin.</label>}
    <dl className="space-y-2 border-t border-slate-200 pt-4 text-sm"><div className="flex justify-between"><dt>Donasi</dt><dd>{money(nominal)}</dd></div><div className="flex justify-between"><dt>Biaya admin</dt><dd>{isIpaymu ? "Mengikuti iPaymu" : money(fee)}</dd></div><div className="flex justify-between font-bold"><dt>Total</dt><dd>{money(nominal + fee)}</dd></div></dl>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button disabled={preview || busy || !methods.length} className={styles.payButton}>{preview ? "Pembayaran nonaktif · Contoh desain" : busy ? "Memproses…" : `Donasi ${nominal > 0 ? money(nominal + fee) : "sekarang"}`}</button>
    {!isIpaymu && <p className="text-xs leading-relaxed text-slate-500">Nomor WhatsApp tidak ditampilkan di halaman publik.</p>}
  </form>;
}
