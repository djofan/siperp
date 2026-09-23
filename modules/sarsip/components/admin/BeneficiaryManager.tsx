"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BENEFICIARY_CATEGORIES } from "@/modules/sarsip/beneficiaryCategories";
type Row = { id: string; name: string; phone: string | null; location: string; assistance: string; receivedAt: string; notes: string | null; publicName: string | null; category: string; amount: number; image: string | null; isPublished: boolean };
export function BeneficiaryManager({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const field = "mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground";
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form);
    setBusy(true); setError("");
    try {
      let image = values.removeImage === "on" ? "" : editing?.image ?? "";
      const file = form.get("photo");
      if (file instanceof File && file.size) {
        if (file.size > 2 * 1024 * 1024) throw new Error("Ukuran gambar maksimal 2 MB.");
        const upload = new FormData(); upload.append("file", file);
        const response = await fetch("/api/sarsip/upload", { method: "POST", body: upload });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Gagal mengunggah foto.");
        image = result.url;
      }
      delete values.photo; delete values.removeImage;
      values.image = image;
      values.isPublished = form.has("isPublished") ? "on" : "";
      const response = await fetch(editing ? `/api/sarsip/beneficiaries/${editing.id}` : "/api/sarsip/beneficiaries", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Gagal menyimpan data.");
      setEditing(null); setVersion((v) => v + 1); router.refresh();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  async function archive(id: string) {
    if (busy || !confirm("Arsipkan penerima manfaat ini? Data tidak lagi dihitung dalam ringkasan publik.")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/sarsip/beneficiaries/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Gagal mengarsipkan data.");
      if (editing?.id === id) { setEditing(null); setVersion((v) => v + 1); }
      router.refresh();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <form key={`${editing?.id ?? "new"}-${version}`} onSubmit={save} className="rounded-2xl border border-border bg-surface p-6 text-foreground">
      <h2 className="mb-5 text-lg font-bold">{editing ? "Edit penerima manfaat" : "Tambah penerima manfaat"}</h2>
      <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm">Nama penerima<input name="name" required maxLength={191} defaultValue={editing?.name} className={field}/></label>
        <label className="text-sm">Nomor telepon (opsional)<input name="phone" type="tel" maxLength={25} defaultValue={editing?.phone ?? ""} className={field}/></label>
        <label className="text-sm">Lokasi<input name="location" required maxLength={191} defaultValue={editing?.location} className={field}/></label>
        <label className="text-sm">Bantuan yang diterima<input name="assistance" required maxLength={191} defaultValue={editing?.assistance} className={field}/></label>
        <label className="text-sm">Tanggal menerima bantuan<input name="receivedAt" required type="date" defaultValue={editing?.receivedAt} className={field}/></label>
        <label className="text-sm">Kategori bantuan<select name="category" defaultValue={editing?.category ?? "Lainnya"} className={field}>{BENEFICIARY_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="text-sm">Nominal bantuan tersalurkan (Rp)<input name="amount" type="number" min={0} max={2147483647} step={1} required defaultValue={editing?.amount ?? 0} className={field}/></label>
        <label className="text-sm">Nama tampilan publik<input name="publicName" maxLength={191} defaultValue={editing?.publicName ?? ""} placeholder="Nama yang diizinkan atau nama samaran" className={field}/></label>
        <div className="text-sm sm:col-span-2"><label>Foto dokumentasi<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" className={field}/></label><p className="mt-2 text-xs text-foreground/60">JPG, PNG, atau WebP, maksimal 2 MB. Foto baru menggantikan foto sebelumnya.</p>{editing?.image && <div className="mt-3"><Image unoptimized src={editing.image} width={200} height={160} alt="Foto penerima manfaat" className="max-h-40 rounded-lg object-contain"/><label className="mt-2 flex items-center gap-2"><input type="checkbox" name="removeImage"/>Hapus foto lama</label></div>}</div>
        <label className="flex items-start gap-3 text-sm sm:col-span-2"><input name="isPublished" type="checkbox" defaultChecked={editing?.isPublished} className="mt-1"/><span>Tampilkan di daftar penerima manfaat publik. Pastikan nama tampilan, foto, kategori, dan nominal boleh dipublikasikan. Telepon, lokasi, serta catatan internal tidak ditampilkan.</span></label>
        <label className="text-sm sm:col-span-2">Catatan (opsional)<textarea name="notes" rows={3} maxLength={5000} defaultValue={editing?.notes ?? ""} className={field}/></label>
        <div className="flex gap-3 sm:col-span-2"><button className="rounded-full bg-orange-600 px-6 py-3 text-sm font-bold text-white">{busy ? "Menyimpan…" : "Simpan"}</button>{editing && <button type="button" onClick={() => { setEditing(null); setVersion((v) => v + 1); }} className="rounded-full border border-border px-6 py-3 text-sm">Batal edit</button>}</div>
      </fieldset>
    </form>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface"><table className="w-full min-w-[800px] text-left text-sm text-foreground"><thead><tr className="border-b border-border">{["Nama", "Telepon", "Lokasi", "Bantuan", "Tanggal", "Aksi"].map((label) => <th key={label} className="p-4">{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-border"><td className="p-4">{row.name}</td><td className="p-4">{row.phone || "—"}</td><td className="p-4">{row.location}</td><td className="p-4">{row.assistance}</td><td className="p-4">{row.receivedAt}</td><td className="space-x-3 whitespace-nowrap p-4"><button disabled={busy} onClick={() => { setEditing(row); setError(""); }} className="text-orange-600">Edit</button><button disabled={busy} onClick={() => archive(row.id)} className="text-foreground/60">Arsipkan</button></td></tr>)}</tbody></table>{!rows.length && <p className="p-6 text-sm text-foreground/60">Belum ada penerima manfaat tercatat.</p>}</div>
  </div>;
}
