"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Check, Eye, EyeOff, KeyRound, Layers3, LoaderCircle, LockKeyhole, Save, ShieldCheck, UserRound } from "lucide-react";
import { AksesForm, initialAccountAccess, type AccountModuleOption } from "./AksesForm";
import styles from "./AccountForm.module.css";

export interface EditableAccount {
  id: string;
  name: string;
  code: string;
  isSuperadmin: boolean;
  access: { moduleId: string; role: string }[];
}

function responseError(body: unknown): string {
  if (body && typeof body === "object" && "error" in body) {
    const error = body.error;
    if (typeof error === "string") return error;
    if (error && typeof error === "object") {
      if ("details" in error && error.details && typeof error.details === "object") {
        const first = Object.values(error.details).flat().find(value => typeof value === "string");
        if (first) return first;
      }
      if ("message" in error && typeof error.message === "string") return error.message;
    }
  }
  return "Akun belum dapat disimpan. Silakan coba lagi.";
}

export function AccountForm({ modules, account }: { modules: AccountModuleOption[]; account?: EditableAccount }) {
  const router = useRouter();
  const submitting = useRef(false);
  const [name, setName] = useState(account?.name ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [access, setAccess] = useState(() => initialAccountAccess(modules, account?.access));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const operational = Boolean(account && !account.isSuperadmin
    && !/^AMSIP[0-9]+$/.test(account.code)
    && !account.access.some(entry => entry.role === "admin"));
  const selected = Object.values(access).filter(entry => entry.enabled).length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    setIsSubmitting(true);
    const entries = Object.entries(access).filter(([, state]) => state.enabled)
      .map(([moduleId, state]) => ({ moduleId, role: state.role }));
    try {
      const response = await fetch(account ? `/api/super/akun/${encodeURIComponent(account.id)}` : "/api/super/akun", {
        method: account ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(account
          ? { name: name.trim(), password: password || undefined, ...(account.isSuperadmin || operational ? {} : { entries }) }
          : { name: name.trim(), password, moduleIds: entries.map(entry => entry.moduleId) }),
      });
      if (!response.ok) throw new Error(responseError(await response.json().catch(() => null)));
      router.push(account ? "/admin/super/akun?diubah=1" : "/admin/super/akun?dibuat=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Koneksi terputus. Isian Anda tetap tersimpan di form ini.");
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} aria-busy={isSubmitting}>
      <div className={styles.layout}>
        <section className={styles.panel} aria-labelledby="account-information">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}><UserRound size={20} strokeWidth={1.7} /></span>
            <div><h2 id="account-information">Informasi akun</h2><p>Identitas dan password untuk masuk.</p></div>
          </div>
          {account ? <div className={styles.codeCard}>
            <KeyRound size={19} strokeWidth={1.6} />
            <div><span>Kode login</span><strong>{account.code}</strong></div>
            <span className={styles.fixedCode}>Tetap</span>
          </div> : <div className={styles.codeNotice}>
            <KeyRound size={19} strokeWidth={1.6} />
            <p><strong>Kode admin AMSIP dibuat otomatis</strong><span>Kode login dapat dilihat di daftar akun setelah disimpan.</span></p>
          </div>}
          <div className={styles.fields}>
            <div className={styles.field}>
              <label htmlFor="account-name">Nama lengkap <span>*</span></label>
              <input id="account-name" name="name" type="text" required maxLength={191} autoComplete="off"
                placeholder="Masukkan nama admin" className={styles.textInput} value={name}
                onChange={event => setName(event.target.value)} disabled={isSubmitting} />
            </div>
            <div className={styles.field}>
              <label htmlFor="account-password">{account ? "Password baru" : "Password"} {account ? <small>Opsional</small> : <span>*</span>}</label>
              <div className={styles.passwordField}>
                <LockKeyhole size={17} aria-hidden="true" />
                <input id="account-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password"
                  required={!account} minLength={8} maxLength={72} value={password} disabled={isSubmitting}
                  placeholder={account ? "Isi untuk mengganti password" : "Buat password admin"}
                  onChange={event => setPassword(event.target.value)} />
                <button type="button" onClick={() => setShowPassword(value => !value)}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} aria-pressed={showPassword}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className={styles.hint}>{account ? "Kosongkan jika password tidak perlu diubah." : "Minimal 8 karakter. Gunakan kombinasi huruf dan angka."}</p>
            </div>
          </div>
          <div className={styles.securityNote}><ShieldCheck size={18} /><p>Login menggunakan kode akun dan password.<br />Superadmin tetap menggunakan <strong>SASIP01</strong>.</p></div>
        </section>
        <section className={styles.panel} aria-labelledby="account-modules">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}><Layers3 size={20} strokeWidth={1.7} /></span>
            <div><h2 id="account-modules">{operational ? "Modul akun operasional" : "Modul yang bisa diakses"}</h2><p>{operational ? "Akun ini khusus untuk bekerja di modul asalnya." : account?.isSuperadmin ? "Superadmin memiliki akses penuh ke seluruh modul." : "Pilih modul yang boleh dibuka dan dikelola akun ini."}</p></div>
            <span className={styles.count}>{operational ? "Akses tetap" : account?.isSuperadmin ? "Semua modul" : `${selected} dipilih`}</span>
          </div>
          {operational ? <div className={styles.fullAccess}>
            <ShieldCheck size={28} />
            <h3>{modules.filter(module => account?.access.some(entry => entry.moduleId === module.id)).map(module => module.name).join(", ") || "Akun operasional"}</h3>
            <p>Peran dan penugasan dikelola melalui menu akun di modul terkait. Akun ini tidak dapat diberi akses ke modul lain melalui Core.</p>
          </div> : account?.isSuperadmin ? <div className={styles.fullAccess}><ShieldCheck size={28} /><h3>Akses penuh superadmin</h3><p>Akun ini dapat mengelola semua modul dan pengaturan platform.</p></div>
            : <AksesForm modules={modules} access={access} onChange={setAccess} disabled={isSubmitting} editing={Boolean(account)} />}
        </section>
      </div>
      {error && <div role="alert" className={styles.error}>{error}</div>}
      <div className={styles.footer}>
        <div className={styles.footerNote}><Check size={17} /><p>{operational || account?.isSuperadmin ? "Perubahan hanya berlaku untuk identitas dan password akun." : selected ? `${selected} modul akan dapat diakses oleh akun ini.` : "Belum ada modul dipilih. Akses dapat diatur kembali nanti."}</p></div>
        <div className={styles.actions}>
          <Link href="/admin/super/akun" aria-disabled={isSubmitting} onClick={event => { if (isSubmitting) event.preventDefault(); }} className={styles.cancel}><ArrowLeft size={16} />Batal</Link>
          <button type="submit" disabled={isSubmitting} className={styles.save}>{isSubmitting ? <LoaderCircle className={styles.spinner} size={17} /> : <Save size={17} />}{isSubmitting ? "Menyimpan…" : account ? "Simpan perubahan" : "Simpan akun"}</button>
        </div>
      </div>
    </form>
  );
}
