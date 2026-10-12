"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
type Result = { error?: string; message?: string; success?: string };
export function AccountDeleteButton({ action, name }: { action: (state: Result, form: FormData) => Promise<Result>; name: string }) {
  const [state, dispatch, pending] = useActionState(action, {});
  return <form action={dispatch} onSubmit={event => { if (!window.confirm(`Hapus akun ${name}? Akun tidak bisa login lagi. Riwayat belajar atau servis tetap tersimpan.`)) event.preventDefault(); }}><Button type="submit" variant="danger" size="sm" disabled={pending}>{pending ? "Menghapus…" : "Hapus"}</Button>{state.error && <p role="alert" className="mt-2 max-w-xs text-xs text-danger">{state.error}</p>}</form>;
}
