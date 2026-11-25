"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, Bell, Check, LoaderCircle, X } from "lucide-react";
import Link from "@/modules/academy/pwa/AcademyNavigation";
import type { ExamNotification } from "../api/notifications";
import { markReminderRead } from "../api/notification-actions";

const labels = { upcoming: "Segera dibuka", due: "Batas ujian kurang dari 24 jam", open: "Ujian tersedia", missed: "Batas ujian terlewat" };
function schedule(item: ExamNotification) {
  const value = item.state === "upcoming" ? item.opensAt : item.closesAt ?? item.opensAt;
  const date = value instanceof Date ? value : new Date(value);
  return `${item.state === "upcoming" ? "Buka" : item.closesAt ? "Tutup" : "Dibuka"}: ${date.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })} WIB`;
}

export function NotificationBell({ items }: { items: ExamNotification[] }) {
  const [open, setOpen] = useState(false);
  const [readKeys, setReadKeys] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const unread = items.filter(item => !item.read && !readKeys.has(item.key)).length;

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  async function markRead(key: string) {
    if (saving) return;
    setSaving(key); setError("");
    try {
      const result = await markReminderRead(key);
      if (result.error) setError(result.error);
      else setReadKeys(current => new Set([...current, key]));
    } catch { setError("Notifikasi belum berhasil ditandai. Silakan coba lagi."); }
    finally { setSaving(null); }
  }

  return <div ref={container} className="academy-notifications">
    <button ref={trigger} type="button" className="academy-notification-trigger" aria-label={`Notifikasi ujian${unread ? `, ${unread} belum dibaca` : ""}`} aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? id : undefined} onClick={() => setOpen(value => !value)}>
      <Bell size={20}/>{unread > 0 && <span className="academy-notification-dot" aria-hidden="true"/>}
    </button>
    {open && <div ref={panel} id={id} className="academy-notification-panel" role="dialog" aria-labelledby={`${id}-title`} tabIndex={-1}>
      <div className="academy-notification-heading"><div><h2 id={`${id}-title`}>Notifikasi ujian</h2><p role="status">{!items.length ? "Jadwal dan pembaruan ujian" : unread ? `${unread.toLocaleString("id-ID")} belum dibaca` : "Semua notifikasi sudah dibaca"}</p></div><button type="button" className="academy-notification-close" aria-label="Tutup notifikasi" onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={18}/></button></div>
      {error && <p role="alert" className="academy-notification-error">{error}</p>}
      {items.length ? <ul className="academy-notification-list" aria-label="Daftar notifikasi ujian" tabIndex={0}>
        {items.map(item => {
          const read = item.read || readKeys.has(item.key);
          return <li key={item.key} className={read ? "" : "is-unread"}>
            <p className="academy-notification-state">{labels[item.state]}</p>
            <Link href={`/academy/kuis/${encodeURIComponent(item.quizId)}`} onClick={() => setOpen(false)}>{item.title}<ArrowUpRight size={15} aria-hidden="true"/></Link>
            <p className="academy-notification-course">{item.course}</p><p className="academy-notification-date">{schedule(item)}</p>
            <button type="button" className="academy-notification-read" disabled={read || saving !== null} onClick={() => void markRead(item.key)}>{saving === item.key ? <LoaderCircle size={14} className="animate-spin"/> : read ? <Check size={14}/> : null}{saving === item.key ? "Menyimpan…" : read ? "Sudah dibaca" : "Tandai sudah dibaca"}</button>
          </li>;
        })}
      </ul> : <div className="academy-notification-empty"><Bell size={28} aria-hidden="true"/><p>Belum ada notifikasi ujian saat ini.</p></div>}
    </div>}
  </div>;
}
