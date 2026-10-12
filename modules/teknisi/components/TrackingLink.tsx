"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
export function TrackingLink({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const path = `/teknisi/cek-status?kode=${token}`;
  async function copyLink() {
    try { await navigator.clipboard.writeText(new URL(path, window.location.origin).href); setMessage("Tautan berhasil disalin."); }
    catch { setMessage("Buka tautan, lalu salin alamat halaman dari browser."); }
  }
  return <div className="space-y-3"><Link href={path} className="text-sm text-accent">Buka halaman cek status →</Link><Button type="button" variant="secondary" size="sm" onClick={copyLink}>Salin Tautan Pelanggan</Button>{message && <p role="status" className="text-xs text-foreground/60">{message}</p>}<p className="break-all rounded-lg bg-surface-muted p-3 font-mono text-xs">{token}</p></div>;
}
