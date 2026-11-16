"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChangePassword } from "@/modules/core/ChangePassword";
import { describeApiProblem } from "@/lib/api-problem";
import s from "./AccountSettings.module.css";
export function AccountSettings({ name, phone, address, code, outlet }: {
    name: string;
    phone: string;
    address: string;
    code: string;
    outlet: string;
}) {
    const router = useRouter(), lock = useRef(false);
    const [busy, setBusy] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState("");
    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (lock.current)
            return;
        lock.current = true;
        setBusy(true);
        setError("");
        setSuccess("");
        const data = new FormData(event.currentTarget);
        try {
            const response = await fetch("/api/teknisi/profile", { method: "PUT", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(Object.fromEntries(data)) });
            const result = await response.json().catch(() => null);
            if (!response.ok)
                throw new Error(describeApiProblem(result, response.status));
            setSuccess("Profil berhasil diperbarui.");
            router.refresh();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Profil belum berhasil disimpan.");
        }
        finally {
            setBusy(false);
            lock.current = false;
        }
    }
    return <div className={s.layout}><section className={s.profile}><header><h2>Profil & kontak</h2><p><strong>{code}</strong> <span aria-hidden="true"> / </span> {outlet}</p></header><form onSubmit={save}><div className={s.fields}><label>Nama lengkap<input name="name" defaultValue={name} required minLength={2} maxLength={191} autoComplete="name" disabled={busy}/></label><label>Nomor HP<input name="phone" defaultValue={phone} required maxLength={32} type="tel" autoComplete="tel" disabled={busy}/></label><label className={s.wide}>Alamat<textarea name="address" defaultValue={address} required maxLength={1000} autoComplete="street-address" rows={3} disabled={busy}/></label></div>{error && <p role="alert" className={s.error}>{error}</p>}{success && <p role="status">{success}</p>}<footer><small>Kode akun dan penempatan outlet dikelola admin.</small><button disabled={busy}>{busy ? "Menyimpan..." : "Simpan profil"}</button></footer></form></section><ChangePassword initiallyOpen theme="dark"/></div>;
}
