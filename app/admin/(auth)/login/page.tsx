import { Suspense } from "react";
import { LoginForm } from "@/components/admin-shell/LoginForm";
import { listModules } from "@/modules/core/modules";

export default async function LoginPage() {
  const modules = await listModules();
  const activeModules = modules.filter((module) => module.isActive);

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#0b0e0c]">
      {/* Background: netral, abstrak — bukan foto satu divisi tertentu */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(115,174,67,0.20), transparent 42%)," +
            "radial-gradient(circle at 88% 12%, rgba(184,188,196,0.10), transparent 40%)," +
            "radial-gradient(circle at 55% 105%, rgba(255,255,255,0.06), transparent 55%)," +
            "linear-gradient(160deg, #12150f 0%, #191d15 38%, #0b0e0b 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.25] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <div aria-hidden className="absolute inset-0 bg-black/60" />

      {/* Logo, tanpa navigasi */}
      <div className="relative z-10 px-6 pt-6 sm:px-10 sm:pt-8">
        <span className="text-lg font-bold tracking-tight text-white">SIP Platform</span>
      </div>

      {/* Watermark monogram */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-6 bottom-4 z-0 hidden select-none text-[9rem] leading-none font-black text-white/[0.06] xl:block"
      >
        SIP
      </span>

      {/* Panel login + info, simetris di tengah layar */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10 sm:px-10 lg:flex-row lg:items-stretch lg:gap-8 lg:px-16">
        <div className="flex w-full max-w-md flex-col justify-center rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl sm:p-9">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>

        <div className="hidden w-full max-w-sm flex-col justify-center rounded-2xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl lg:flex">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#73AE43] uppercase">Platform Terpadu</p>
          <h2 className="mt-3 text-2xl font-bold text-white">Satu portal untuk seluruh program SIP.</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#B8BCC4]">
            Dashboard ini menyatukan pengelolaan seluruh divisi Solidaritas Insan Peduli, dengan
            akses tiap modul yang diatur per akun.
          </p>

          <ul className="mt-8 flex flex-col gap-4">
            {activeModules.map((module) => (
              <li key={module.id} className="flex items-start gap-3">
                <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#73AE43]" />
                <div>
                  <p className="text-sm font-semibold text-white">{module.name}</p>
                  {module.description && (
                    <p className="text-xs text-[#B8BCC4]">{module.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 border-t border-white/10 pt-5">
            <p className="text-xs text-[#B8BCC4]">
              Akses tiap modul diatur oleh superadmin melalui otorisasi akun — hubungi superadmin
              bila Anda memerlukan akses tambahan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
