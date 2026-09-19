"use client";
import { linkButton } from "../components/ui";

export default function AcademyError({ reset }: { reset: () => void }) {
  return <div className="mx-auto max-w-2xl px-4 py-20"><h1 className="text-3xl font-bold">Halaman belum dapat dimuat.</h1><p className="mt-4 leading-7">Silakan coba kembali beberapa saat lagi.</p><button onClick={reset} className={`${linkButton} mt-6`}>Coba lagi</button></div>;
}
