"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/modules/ojol/components/admin/FormControls";
import { Switch } from "@/components/ui/Switch";
import { Icon } from "@/modules/ojol/components/icons";
import type { ActionState } from "@/modules/ojol/api/actions/state";
import { WilayahFields, type WilayahValue } from "@/modules/ojol/components/app/WilayahFields";

type Action = (state: ActionState, form: FormData) => Promise<ActionState>;

const textareaClass =
  "min-h-24 w-full rounded-lg bg-surface-muted px-3 py-2.5 text-base text-foreground outline-none focus:ring-2 focus:ring-accent-soft sm:text-sm";
const selectClass =
  "h-11 min-w-0 w-full rounded-lg bg-surface-muted px-3 text-base text-foreground outline-none focus:ring-2 focus:ring-accent-soft disabled:opacity-50 sm:text-sm";

function ErrorText({ error }: { error: string }) {
  return error ? (
    <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
      {error}
    </p>
  ) : null;
}

export interface MemberFormValues extends WilayahValue {
  code: string | null;
  name: string;
  email: string | null;
  isActive: boolean;
  phone: string | null;
  gender: "laki_laki" | "perempuan" | null;
  groupId: string | null;
  address: string | null;
}

export function MemberForm({
  action,
  role,
  initial,
  groups,
  cancelHref,
}: {
  action: Action;
  role: "guru" | "peserta";
  initial: MemberFormValues | null;
  groups: { id: string; code: string; name: string }[];
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  const [active, setActive] = useState(initial?.isActive ?? true);
  const empty: WilayahValue = { provinceId: null, provinceName: null, cityId: null, cityName: null, districtId: null, districtName: null, villageId: null, villageName: null };

  return (
    <form action={formAction} className="crud-form space-y-8">
      <ErrorText error={state.error} />
      <section className="space-y-4">
        <div><h2 className="text-sm font-medium text-foreground">Informasi akun</h2><p className="form-section-note">Identitas dan akses login. Kode akun dibuat otomatis oleh sistem.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nama lengkap" htmlFor="m-name">
            <Input id="m-name" name="name" required maxLength={191} defaultValue={initial?.name} />
          </FormField>
          <FormField label="Kode login" htmlFor="m-code" hint={initial ? "Kode tidak bisa diubah." : "Dibuat otomatis setelah disimpan."}>
            <Input id="m-code" value={initial?.code ?? (role === "guru" ? "GOM…" : "POM…")} disabled readOnly />
          </FormField>
          <FormField label="Email (opsional)" htmlFor="m-email">
            <Input id="m-email" name="email" type="email" maxLength={191} defaultValue={initial?.email ?? ""} />
          </FormField>
          <FormField label={initial ? "Password baru" : "Password"} htmlFor="m-password" hint={initial ? "Kosongkan bila tidak diganti." : "Minimal 8 karakter."}>
            <Input id="m-password" name="password" type="password" minLength={8} maxLength={72} required={!initial} autoComplete="new-password" />
          </FormField>
        </div>
        <label className="flex items-center gap-3 text-sm text-foreground">
          <Switch checked={active} onChange={setActive} aria-label="Status aktif" />
          {active ? "Akun aktif — bisa login" : "Akun nonaktif — tidak bisa login"}
        </label>
        {active && <input type="hidden" name="isActive" value="on" />}
      </section>

      <section className="space-y-4">
        <div><h2 className="text-sm font-medium text-foreground">Profil dan kelompok</h2><p className="form-section-note">Lengkapi kontak, kelompok, dan alamat anggota.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nomor HP / WhatsApp" htmlFor="m-phone">
            <Input id="m-phone" name="phone" type="tel" maxLength={20} defaultValue={initial?.phone ?? ""} />
          </FormField>
          <FormField label="Jenis kelamin" htmlFor="m-gender">
            <Select id="m-gender" name="gender" defaultValue={initial?.gender ?? ""}>
              <option value="">Pilih</option>
              <option value="laki_laki">Laki-laki</option>
              <option value="perempuan">Perempuan</option>
            </Select>
          </FormField>
          {role === "peserta" && (
            <>
              <FormField label="Kelompok" htmlFor="m-group">
                <Select id="m-group" name="groupId" defaultValue={initial?.groupId ?? ""}>
                  <option value="">Belum ada kelompok</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.code} · {group.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </>
          )}
        </div>
        <WilayahFields initial={initial ?? empty} selectClass={selectClass} labelClass="text-sm font-medium text-foreground" />
        <FormField label="Alamat detail" htmlFor="m-address" hint="Nama jalan, perumahan, RT/RW. Lokasi peta diisi otomatis dari kelurahan.">
          <textarea id="m-address" name="address" rows={2} maxLength={1000} defaultValue={initial?.address ?? ""} className={textareaClass} />
        </FormField>
      </section>

      <div className="form-actions">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
        <Link href={cancelHref} className={buttonVariants({ variant: "secondary" })}>
          Batal
        </Link>
      </div>
    </form>
  );
}

export function GroupForm({ action, initial }: { action: Action; initial: { name: string; description: string | null } | null }) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  return (
    <form action={formAction} className="crud-form compact-group-form space-y-5">
      <ErrorText error={state.error} />
      <FormField label="Nama kelompok" htmlFor="g-name" hint={initial ? undefined : "Kode kelompok dibuat otomatis (OM001, OM002, …). Guru memilih kelompok penerima saat membuat tugas."}>
        <Input id="g-name" name="name" required maxLength={191} defaultValue={initial?.name} />
      </FormField>
      <FormField label="Deskripsi / info kelompok" htmlFor="g-desc" hint="Tampil di beranda peserta, mis. wilayah/basecamp, jadwal setoran, atau tautan grup.">
        <textarea id="g-desc" name="description" rows={4} maxLength={5000} defaultValue={initial?.description ?? ""} className={textareaClass} />
      </FormField>
      <div className="form-actions">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
        <Link href="/admin/ojol/kelompok" className={buttonVariants({ variant: "secondary" })}>
          Batal
        </Link>
      </div>
    </form>
  );
}


/** Hapus dua langkah untuk tabel admin (tema gelap Core). */
export function AdminDeleteButton({ action, confirmText = "Hapus permanen?", iconOnly = false }: { action: () => Promise<ActionState>; confirmText?: string; iconOnly?: boolean }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} aria-label={iconOnly ? confirmText : undefined} title={iconOnly ? "Hapus" : undefined} className={iconOnly ? "directory-icon-button hover:text-danger" : "text-sm font-medium text-foreground/50 hover:text-danger"}>
        {iconOnly ? <Icon name="trash" className="h-4 w-4" /> : "Hapus"}
      </button>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-2 text-xs">
      <span className="text-danger">{error || confirmText}</span>
      <Button
        size="sm"
        variant="danger"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await action();
            if (result.error) setError(result.error);
            else router.refresh();
          })
        }
      >
        {pending ? "…" : "Ya"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>
        Batal
      </Button>
    </span>
  );
}

export function MemberActiveSwitch({ initial, action, showLabel = false }: { initial: boolean; action: (isActive: boolean) => Promise<ActionState>; showLabel?: boolean }) {
  const router = useRouter();
  const [active, setActive] = useState(initial);
  const [pending, startTransition] = useTransition();
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap"><Switch
      checked={active}
      disabled={pending}
      aria-label={active ? "Nonaktifkan akun" : "Aktifkan akun"}
      onChange={(next) => {
        setActive(next);
        startTransition(async () => {
          const result = await action(next);
          if (result.error) setActive(!next);
          router.refresh();
        });
      }}
    />{showLabel && <span className="text-xs">{active ? "Aktif" : "Nonaktif"}</span>}</span>
  );
}
