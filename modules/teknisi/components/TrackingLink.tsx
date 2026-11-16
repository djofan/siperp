"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Copy, Check, ExternalLink } from "lucide-react";
import styles from "./TrackingLink.module.css";
export function TrackingLink({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const codeElement = useRef<HTMLElement>(null);
  const path = `/teknisi#cek-status?kode=${token}`;
  async function copy(kind: "code" | "link") {
    const value = kind === "code" ? token : new URL(path, window.location.origin).href;
    try {
      let copied = false;
      if (navigator.clipboard?.writeText) {
        try { await navigator.clipboard.writeText(value); copied = true; } catch { /* Use the selection fallback below. */ }
      }
      if (!copied) {
        const active = document.activeElement as HTMLElement | null;
        const field = document.createElement("textarea");
        field.value = value;
        field.readOnly = true;
        field.style.cssText = "position:fixed;left:0;top:0;opacity:0;pointer-events:none";
        document.body.appendChild(field);
        try { field.select(); copied = document.execCommand("copy"); }
        finally { field.remove(); active?.focus({ preventScroll: true }); }
      }
      if (!copied) throw new Error("Clipboard unavailable");
      setMessage(kind === "code" ? "Kode disalin" : "Tautan disalin");
    } catch {
      if (codeElement.current) {
        const range = document.createRange();
        range.selectNodeContents(codeElement.current);
        const selection = window.getSelection();
        selection?.removeAllRanges(); selection?.addRange(range);
      }
      setMessage("Browser membatasi penyalinan. Kode sudah dipilih; tekan Salin atau Ctrl+C.");
    }
  }
  return <div className={styles.box}>
    <span className={styles.label}>Kode pelacakan pelanggan</span>
    <code ref={codeElement} className={styles.code}>{token}</code>
    <div className={styles.actions}>
      <button type="button" onClick={()=>copy("code")}><Copy size={13}/> Salin kode</button>
      <button type="button" onClick={()=>copy("link")}><Copy size={13}/> Salin tautan</button>
      <Link href={path} target="_blank" rel="noopener noreferrer" aria-label="Lihat status pelanggan di tab baru"><ExternalLink size={14}/></Link>
    </div>
    {message&&<p role="status" className={styles.message}><Check size={12}/>{message}</p>}
  </div>;
}
