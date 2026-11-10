"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Copy, Eye, EyeOff, KeyRound, X } from "lucide-react";
import s from "./ResetOperationalPassword.module.css";
import { describeApiProblem } from "@/lib/api-problem";

export function ResetOperationalPassword({ id, name, code, theme = "dark" }: { id: string; name: string; code: string; theme?: "light" | "dark" }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [saved, setSaved] = useState(false);
  const [password, setPassword] = useState(""), [confirmation, setConfirmation] = useState(""), [visible, setVisible] = useState(false);
  const [error, setError] = useState(""), [copied, setCopied] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null), lock = useRef(false), titleId = useId();
  useEffect(() => {
    if (!open || !dialog.current) return;
    const element = dialog.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => { element.close(); document.body.style.overflow = previous; };
  }, [open]);
  function close() {
    if (lock.current) return;
    setOpen(false); setPassword(""); setConfirmation(""); setError(""); setSaved(false); setCopied(false); setVisible(false);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    if (password !== confirmation) { setError("Konfirmasi password belum sama."); return; }
    lock.current = true; setBusy(true); setError("");
    try {
      const response = await fetch(`/api/core/module-accounts/${encodeURIComponent(id)}/password-reset`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ password, password_confirmation: confirmation }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(describeApiProblem(result, response.status, "Password belum berhasil direset. Periksa akses dan coba lagi."));
      setSaved(true); setConfirmation("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Tidak dapat terhubung ke server."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(`Kode akun: ${code}\nPassword baru: ${password}`); setCopied(true); setError(""); }
    catch { setError("Tidak dapat menyalin otomatis. Tampilkan password lalu salin secara manual."); }
  }
  return <>
    <button type="button" className={s.trigger} onClick={() => setOpen(true)}><KeyRound size={15}/>Reset password</button>
    {open && <dialog ref={dialog} className={s.dialog} data-theme={theme} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); close(); }}>
      <header className={s.header}><span className={s.icon}><KeyRound size={20}/></span><div><h2 id={titleId}>{saved ? "Password berhasil direset" : "Reset password akun"}</h2><p>{name} · <strong>{code}</strong></p></div><button type="button" disabled={busy} aria-label="Tutup" onClick={close}><X size={19}/></button></header>
      <p className={s.description}>{saved ? "Bagikan password baru kepada pemilik akun. Password ini hanya ditampilkan pada sesi ini." : "Tetapkan password baru tanpa memasukkan password lama. Pemilik akun perlu login kembali setelah reset."}</p>
      {error && <p role="alert" className={s.error}>{error}</p>}
      {saved ? <div className={s.form}><label>Password baru<div className={s.password}><input readOnly type={visible ? "text" : "password"} value={password} aria-label="Password baru yang disimpan"/><button type="button" aria-label={visible ? "Sembunyikan password" : "Tampilkan password"} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label><button type="button" className={s.primary} onClick={copy}><Copy size={16}/>{copied ? "Kode dan password tersalin" : "Salin kode & password baru"}</button><button type="button" className={s.trigger} onClick={close}>Selesai</button></div> : <form className={s.form} onSubmit={submit}><fieldset disabled={busy}>
        <label>Password baru<div className={s.password}><input autoFocus autoComplete="new-password" type={visible ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} required minLength={12} maxLength={72} placeholder="Minimal 12 karakter"/><button type="button" aria-label={visible ? "Sembunyikan password" : "Tampilkan password"} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
        <label>Konfirmasi password baru<input autoComplete="new-password" type={visible ? "text" : "password"} value={confirmation} onChange={event => setConfirmation(event.target.value)} required minLength={12} maxLength={72} placeholder="Ketik ulang password baru"/></label>
        <p className={s.note}>Seluruh sesi login lama akun ini akan diakhiri. Data dan penugasannya tetap tersimpan.</p>
        <div className={s.actions}><button type="button" className={s.trigger} onClick={close}>Batal</button><button type="submit" className={s.primary}>{busy ? "Menyimpan…" : "Simpan password baru"}</button></div>
      </fieldset></form>}
    </dialog>}
  </>;
}
