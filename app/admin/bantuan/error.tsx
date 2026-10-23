"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main style={{ padding: 40 }}><h1>Modul belum dapat dimuat</h1><p>Coba kembali. Data pengajuan yang sudah tersimpan tidak berubah.</p><button onClick={reset}>Coba lagi</button></main>;
}
