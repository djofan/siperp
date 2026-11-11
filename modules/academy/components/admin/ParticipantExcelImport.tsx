"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { importAcademyParticipants } from "../../api/participant-import";
import type { ParticipantImportRow, ParticipantImportState } from "../../api/participant-import-contracts";
import { downloadWorkbook, MAX_IMPORT_BYTES, participantAccountsWorkbook, participantTemplate, readParticipantWorkbook } from "./participant-workbook";

async function submitImport(_previous: ParticipantImportState, form: FormData): Promise<ParticipantImportState> {
  // Keep downloaded credentials in this client only; never echo them back as
  // previous action state (including Next's development action diagnostics).
  return importAcademyParticipants({ error: "" }, form);
}

export function ParticipantExcelImport({ cohorts, initialCohort = "" }: { cohorts: { id: string; title: string }[]; initialCohort?: string }) {
  const [state, action, pending] = useActionState<ParticipantImportState, FormData>(submitImport, { error: "" });
  const [rows, setRows] = useState<ParticipantImportRow[]>([]);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [cohort, setCohort] = useState(cohorts.some(item => item.id === initialCohort) ? initialCohort : "");
  const [gender, setGender] = useState("");
  const version = useRef(0);
  const [submission, setSubmission] = useState(0);
  const [selection, setSelection] = useState(0);
  const currentResult = !pending && selection === submission ? state : undefined;

  async function read(file?: File) {
    const request = ++version.current;
    setSelection(request);
    setRows([]);
    setError("");
    setReading(false);
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) { setError("Pilih file Excel .xlsx. Untuk file .xls, simpan ulang sebagai .xlsx terlebih dahulu."); return; }
    if (file.size > MAX_IMPORT_BYTES) { setError("Ukuran file maksimal 5 MB."); return; }
    setReading(true);
    try {
      const data = await readParticipantWorkbook(await file.arrayBuffer());
      if (request === version.current) setRows(data);
    } catch (cause) {
      if (request === version.current) setError(cause instanceof Error ? cause.message : "File tidak dapat dibaca.");
    } finally { if (request === version.current) setReading(false); }
  }

  async function download(accounts = false) {
    setDownloading(true);
    setError("");
    try {
      const buffer = accounts && currentResult?.result
        ? await participantAccountsWorkbook(currentResult.result.credentials) : await participantTemplate();
      downloadWorkbook(buffer, accounts ? "akun-peserta-academy.xlsx" : "template-peserta-academy.xlsx");
    } catch { setError("Unduhan belum berhasil. Silakan coba kembali."); }
    finally { setDownloading(false); }
  }

  return <Card className="min-w-0">
    <CardTitle>Impor peserta dari Excel</CardTitle>
    <p className="mt-2 text-sm text-foreground/70">Daftarkan hingga 200 peserta sekaligus. Isi kolom <strong>Nama, No HP, dan Alamat</strong> mulai baris kedua.</p>
    <Button type="button" variant="secondary" className="mt-4" disabled={downloading} onClick={() => void download()}>Unduh template Excel</Button>
    <form action={action} onReset={event => event.preventDefault()} onSubmit={() => setSubmission(selection)} className="mt-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Angkatan peserta impor" htmlFor="import-cohort"><Select id="import-cohort" name="cohortId" required value={cohort} onChange={event => setCohort(event.target.value)} disabled={pending || !cohorts.length}><option value="" disabled>Pilih angkatan</option>{cohorts.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</Select></FormField>
        <FormField label="Grup peserta impor" htmlFor="import-gender" hint="Satu grup per file. Pisahkan file Ikhwan dan Akhwat."><Select id="import-gender" name="gender" required value={gender} onChange={event => setGender(event.target.value)} disabled={pending}><option value="" disabled>Pilih grup</option><option value="IKHWAN">Ikhwan</option><option value="AKHWAT">Akhwat</option></Select></FormField>
      </div>
      {!cohorts.length && <p className="text-sm">Buat angkatan terlebih dahulu di <Link className="font-semibold underline" href="/admin/academy/peserta?tab=angkatan">tab Angkatan</Link>.</p>}
      <FormField label="File peserta (.xlsx)" htmlFor="import-file" hint="Maksimal 5 MB. Nomor HP boleh diawali 08, 628, atau +628; angka 8 dari Excel juga dikenali."><Input id="import-file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="h-auto py-2" disabled={pending} onChange={event => void read(event.target.files?.[0])} /></FormField>
      <input type="hidden" name="rows" value={JSON.stringify(rows)} />
      {reading && <p role="status" className="text-sm">Membaca file Excel…</p>}
      {rows.length > 0 && <div className="space-y-2"><p className="text-sm font-semibold">Pratinjau: {rows.length} peserta</p><div className="max-h-72 overflow-auto rounded-lg border border-border"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-surface-muted"><tr>{["Baris", "Nama", "No HP", "Alamat"].map(title => <th key={title} scope="col" className="px-3 py-2">{title}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.rowNumber} className="border-t border-border"><td className="px-3 py-2">{row.rowNumber}</td><td className="min-w-32 px-3 py-2">{row.name}</td><td className="whitespace-nowrap px-3 py-2">{row.phone}</td><td className="min-w-40 break-words px-3 py-2">{row.address}</td></tr>)}</tbody></table></div></div>}
      {(error || currentResult?.error) && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700"><p>{error || currentResult?.error}</p>{!error && currentResult?.errors && <ul className="mt-2 list-disc space-y-1 pl-5">{currentResult.errors.slice(0, 20).map((message, index) => <li key={index}>{message}</li>)}{currentResult.errors.length > 20 && <li>Masih ada {currentResult.errors.length - 20} kesalahan lainnya. Perbaiki file, lalu unggah ulang.</li>}</ul>}</div>}
      <p className="text-xs text-foreground/70">Semua baris diperiksa sebelum disimpan. Jika ada kesalahan, seluruh impor dibatalkan. Peserta yang sama di angkatan dan grup yang sama dilewati tanpa mengganti password.</p>
      <Button type="submit" disabled={pending || reading || !rows.length || !cohorts.length || !!currentResult?.result}>{pending ? "Mengimpor peserta…" : `Impor${rows.length ? ` ${rows.length}` : ""} peserta`}</Button>
    </form>
    {currentResult?.result && <div role="status" className="mt-5 space-y-3 rounded-xl bg-green-50 p-4 text-sm text-green-900">
      <p className="font-semibold">{currentResult.result.createdCount} peserta berhasil didaftarkan. {currentResult.result.skippedCount} peserta yang sudah terdaftar dilewati.</p>
      {currentResult.result.credentials.length > 0 && <><p>Unduh akun sebelum meninggalkan halaman atau memilih file berikutnya. Bagikan NIP dan password awal kepada masing-masing peserta; peserta wajib mengganti password saat masuk.</p><Button type="button" variant="secondary" disabled={downloading} onClick={() => void download(true)}>Unduh akun peserta</Button></>}
      <Link href="/admin/academy/peserta" className="block font-semibold underline">Lihat Daftar Peserta</Link>
    </div>}
  </Card>;
}
