"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { pwaRequest } from "./client";
import { disableWebPush, enableWebPush, pushRegistration, saveSubscription, supportsWebPush, type PushConfiguration } from "./web-push";
import s from "./Pwa.module.css";

export function WebPushSettings({ userId, visible }: { userId: string; visible: boolean }) {
  const [configuration, setConfiguration] = useState<PushConfiguration | null>(null);
  const [status, setStatus] = useState("Memeriksa notifikasi…");
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let current = true;
    async function sync() {
      if (!supportsWebPush()) {
        if (current) setStatus("Browser ini belum mendukung Web Push. Di iPhone/iPad gunakan iOS 16.4+ dan buka PWA dari Layar Utama.");
        return;
      }
      try {
        const config = await pwaRequest<PushConfiguration>("web-push/config");
        if (!current) return;
        setConfiguration(config);
        if (!config.enabled) { setStatus("Notifikasi HP belum diaktifkan oleh pengelola server."); return; }
        const registration = await pushRegistration();
        const subscription = await registration.pushManager.getSubscription();
        if (!current) return;
        if (subscription && Notification.permission === "granted") {
          // Rebind the browser to the current authenticated account after switching accounts.
          await saveSubscription(subscription);
          if (current) { setActive(true); setStatus("Notifikasi HP aktif untuk akun ini di browser ini."); }
        } else if (current) {
          setActive(false);
          setStatus(Notification.permission === "denied" ? "Izin notifikasi diblokir. Ubah izin situs di pengaturan browser/HP." : "Aktifkan agar kabar baru muncul meskipun PWA tidak sedang dibuka.");
        }
      } catch (cause) { if (current) setError(cause instanceof Error ? cause.message : "Status notifikasi belum dapat dimuat."); }
    }
    void sync();
    return () => { current = false; };
  }, [userId, revision]);

  async function toggle() {
    if (busy || !configuration?.publicKey) return;
    // Request permission directly from the click, before any network await (required by Safari).
    const permission = active ? null : Notification.requestPermission();
    setBusy(true); setError("");
    try {
      if (active) { await disableWebPush(); setStatus("Notifikasi HP dinonaktifkan di browser ini."); setActive(false); }
      else { await enableWebPush(configuration.publicKey, await permission!); setStatus("Notifikasi HP aktif untuk akun ini di browser ini."); setActive(true); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Pengaturan notifikasi belum berhasil."); }
    finally { setBusy(false); }
  }

  if (!visible) return null;
  return <section className={s.panel} aria-label="Pengaturan notifikasi HP">
    <h2><Bell size={19}/>Notifikasi HP</h2>
    <p role="status">{status}</p>
    {configuration?.enabled && <><button type="button" className={s.rowLink} disabled={busy} onClick={() => void toggle()}>{busy ? "Memproses…" : active ? "Nonaktifkan notifikasi HP" : "Aktifkan notifikasi HP"}</button><p>Pengiriman diperiksa setiap menit. Tampilan dan suara mengikuti izin browser, pengaturan HP, serta mode Jangan Ganggu. Pesan uji dapat menampilkan teks uji di layar terkunci.</p></>}
    {error && <div role="alert" className={s.error}>{error}<button type="button" onClick={() => { setError(""); setRevision(value => value + 1); }}>Coba lagi</button></div>}
  </section>;
}
