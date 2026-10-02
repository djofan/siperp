/* eslint-disable @next/next/no-img-element -- Logo lokal dari project referensi. */
"use client";

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          {/* Logo & tagline */}
          <div className="flex flex-col items-center gap-2 md:items-start">
            <div className="flex items-center gap-2">
              <img src="/academy/logo-lazsip.webp" alt="LAZSIP" className="h-6 w-6 object-contain" />
              <span className="font-semibold text-gray-900">Insan Academy</span>
            </div>
            <p className="text-xs text-gray-400">Belajar bersama Ustadz Irham</p>
          </div>

          {/* Links */}
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="/academy/#programs" className="transition-colors hover:text-green-600">Program</a>
            <a href="https://wa.me/628111186626" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-green-600">Hubungi Kami</a>
            <a href="/academy/masuk" className="transition-colors hover:text-green-600">Masuk</a>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Insan Academy &middot; LAZSIP. Semua hak dilindungi.
        </div>
      </div>
    </footer>
  );
}
