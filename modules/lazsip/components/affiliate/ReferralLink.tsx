"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import { Copy, ExternalLink } from "lucide-react";
import styles from "./affiliate.module.css";
const subscribe = () => () => {};
const getOrigin = () => window.location.origin;
const serverOrigin = () => "";

export function ReferralLink({ path }: { path: string }) {
  const origin = useSyncExternalStore(subscribe, getOrigin, serverOrigin);
  const [message, setMessage] = useState("");
  const field = useRef<HTMLInputElement>(null);
  const link = origin + path;
  return <div className={styles.referral}>
    <p className={styles.subtitle}>Bagikan tautan ini untuk mengajak orang menunaikan zakat melalui LAZSIP.</p>
    <label>Link referral<input ref={field} readOnly value={link} onFocus={event => event.target.select()}/></label>
    <div className={styles.referralActions}><button type="button" disabled={!origin} className={styles.primary} onClick={async () => {
      try { await navigator.clipboard.writeText(link); setMessage("Link referral berhasil disalin."); }
      catch { field.current?.focus(); field.current?.select(); setMessage("Pilih Salin pada kolom link untuk menyalin secara manual."); }
    }}><Copy size={15}/>Salin link</button><a className={styles.textLink} href={path} target="_blank" rel="noopener noreferrer">Buka link<ExternalLink size={15}/></a></div>
    {message && <p role="status" className={styles.hint}>{message}</p>}
    <p className={styles.hint}>Link sudah bisa dibagikan. Pencatatan transaksi referral, komisi, dan penarikan dana belum diaktifkan.</p>
  </div>;
}
