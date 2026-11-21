"use client";
import Link from "next/link";
export default function AffiliateError({ reset }: { reset: () => void }) {
  return <div className="mx-auto max-w-xl p-8 text-center"><h1 className="text-2xl font-bold">Panel belum dapat dimuat</h1><p className="my-4">Periksa koneksi dan coba kembali. Jika masih bermasalah, hubungi pengelola LAZSIP.</p><button className="rounded-full bg-green-800 px-5 py-3 text-white" onClick={reset}>Coba lagi</button><Link className="ml-4 underline" href="/lazsip">Ke website LAZSIP</Link></div>;
}
