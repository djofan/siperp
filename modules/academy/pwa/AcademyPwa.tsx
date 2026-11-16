"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AcademySurfaceProvider } from "./AcademyNavigation";
import type { AcademyBasePath } from "./navigation";
type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
const PwaContext = createContext({ ready: false, installed: false, install: async () => {} });

export function AcademyPwa({ children, basePath = "/academy" }: { children: ReactNode; basePath?: AcademyBasePath }) {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [offline, setOffline] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [issue, setIssue] = useState("");
  const reloadRequested = useRef(false);
  useEffect(() => {
    let live = true;
    let registration: ServiceWorkerRegistration | undefined;
    let installing: ServiceWorker | null = null;
    const status = () => setOffline(!navigator.onLine);
    const mode = window.matchMedia("(display-mode: standalone)");
    const updateInstalled = () => setInstalled(mode.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone);
    const beforeInstall = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const appInstalled = () => { setInstalled(true); setPrompt(null); };
    const changed = () => { if (reloadRequested.current) window.location.reload(); };
    const stateChanged = () => { if (live && installing?.state === "installed" && registration?.active) setWaiting(registration.waiting ?? installing); };
    const updateFound = () => { installing = registration?.installing ?? null; installing?.addEventListener("statechange", stateChanged); };
    status(); updateInstalled();
    window.addEventListener("online", status); window.addEventListener("offline", status);
    window.addEventListener("beforeinstallprompt", beforeInstall); window.addEventListener("appinstalled", appInstalled);
    mode.addEventListener("change", updateInstalled);
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.addEventListener("controllerchange", changed);
      void navigator.serviceWorker.register(`${basePath}/sw.js`, { scope: `${basePath}/`, updateViaCache: "none" }).then(reg => {
        if (!live) return;
        registration = reg;
        if (reg.waiting) setWaiting(reg.waiting);
        reg.addEventListener("updatefound", updateFound);
      }).catch(() => { if (live) setIssue("Pemasangan Academy belum tersedia. Fitur web tetap dapat digunakan."); });
    }
    return () => {
      live = false;
      window.removeEventListener("online", status); window.removeEventListener("offline", status);
      window.removeEventListener("beforeinstallprompt", beforeInstall); window.removeEventListener("appinstalled", appInstalled);
      mode.removeEventListener("change", updateInstalled);
      registration?.removeEventListener("updatefound", updateFound);
      installing?.removeEventListener("statechange", stateChanged);
      if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("controllerchange", changed);
    };
  }, [basePath]);
  async function install() {
    if (!prompt) return;
    try { await prompt.prompt(); await prompt.userChoice; setPrompt(null); }
    catch { setIssue("Pemasangan belum berhasil. Gunakan menu browser untuk menambahkan Academy ke layar utama."); setPrompt(null); }
  }
  return <AcademySurfaceProvider basePath={basePath}><PwaContext.Provider value={{ ready: !!prompt, installed, install }}>
    {children}
    {(offline || waiting || issue) && <aside aria-label="Status aplikasi Academy" className={`fixed ${basePath === "/academy-app" ? "bottom-24" : "bottom-4"} left-4 right-4 z-40 mx-auto max-w-xl space-y-2 print:hidden`}>
      {offline && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow">Koneksi terputus. Menyimpan materi, menjawab soal, dan mengirim pertanyaan memerlukan internet. Jangan tutup formulir yang belum tersimpan.</p>}
      {waiting && <div className="rounded-xl border border-green-200 bg-white p-4 text-sm shadow"><p>Versi baru Academy tersedia. Selesaikan dan simpan pekerjaan sebelum memperbarui.</p><button type="button" className="mt-2 rounded-lg bg-green-700 px-3 py-2 text-white" onClick={() => {
        if (!window.confirm("Sudah menyimpan semua formulir dan jawaban ujian? Halaman akan dimuat ulang.")) return;
        reloadRequested.current = true;
        waiting.postMessage({ type: "ACADEMY_SKIP_WAITING" });
      }}>Perbarui aplikasi</button></div>}
      {issue && <div role="status" className="rounded-xl border bg-white p-4 text-sm shadow">{issue}<button type="button" onClick={() => setIssue("")} className="ml-3 underline">Tutup</button></div>}
    </aside>}
  </PwaContext.Provider></AcademySurfaceProvider>;
}

export function AcademyInstallPanel() {
  const { ready, installed, install } = useContext(PwaContext);
  return <section className="rounded-2xl border border-gray-200 bg-white p-5">
    <h2 className="font-semibold">{installed ? "Academy sudah dibuka sebagai aplikasi" : "Tambahkan Academy ke layar utama"}</h2>
    {installed ? <p className="mt-3 text-sm text-gray-600">Gunakan ikon Academy untuk membuka kembali pembelajaran Anda.</p> : <>
      {ready && <button type="button" onClick={install} className="mt-4 rounded-xl bg-green-700 px-5 py-3 text-sm font-medium text-white">Pasang Insan Academy</button>}
      <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-gray-600">
        <li>Android / Chrome / Edge: buka menu browser, lalu pilih <strong>Instal aplikasi</strong> atau <strong>Tambahkan ke layar utama</strong>.</li>
        <li>iPhone / iPad: buka melalui Safari, tekan <strong>Bagikan</strong>, lalu pilih <strong>Tambahkan ke Layar Utama</strong>.</li>
        <li>Setelah terpasang, buka ikon <strong>Academy</strong> dan login menggunakan kode akun ERP Anda.</li>
      </ol>
      <p className="mt-4 text-xs text-gray-500">Pilihan pemasangan bergantung browser dan perangkat. Pemasangan memerlukan HTTPS atau localhost.</p>
    </>}
  </section>;
}
