"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { Switch } from "@/components/ui/Switch";
import type { ActionState } from "@/modules/tanwir/api/actions/state";
import { WilayahFields, type WilayahValue } from "@/modules/tanwir/components/app/WilayahFields";

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
  teachingPlace: string | null;
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
    <form action={formAction} className="space-y-8">
      <ErrorText error={state.error} />
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Akun</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nama lengkap" htmlFor="m-name">
            <Input id="m-name" name="name" required maxLength={191} defaultValue={initial?.name} />
          </FormField>
          <FormField label="Kode login" htmlFor="m-code" hint={initial ? "Kode tidak bisa diubah." : "Dibuat otomatis setelah disimpan."}>
            <Input id="m-code" value={initial?.code ?? (role === "guru" ? "GTQ…" : "PTQ…")} disabled readOnly />
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
        <h2 className="text-sm font-semibold text-foreground">Profil</h2>
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
              <FormField label="Tempat mengajar (TPQ)" htmlFor="m-tpq">
                <Input id="m-tpq" name="teachingPlace" maxLength={191} defaultValue={initial?.teachingPlace ?? ""} />
              </FormField>
            </>
          )}
        </div>
        <WilayahFields initial={initial ?? empty} selectClass={selectClass} labelClass="text-sm font-medium text-foreground" />
        <FormField label="Alamat detail" htmlFor="m-address" hint="Nama jalan, perumahan, RT/RW. Lokasi peta diisi otomatis dari kelurahan.">
          <textarea id="m-address" name="address" rows={2} maxLength={1000} defaultValue={initial?.address ?? ""} className={textareaClass} />
        </FormField>
      </section>

      <div className="flex gap-2">
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

export function GroupForm({
  action,
  initial,
  gurus,
}: {
  action: Action;
  initial: { name: string; description: string | null; picId: string | null } | null;
  gurus: { id: string; code: string; user: { name: string } }[];
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  return (
    <form action={formAction} className="space-y-5">
      <ErrorText error={state.error} />
      <FormField label="PIC (guru)" htmlFor="g-pic" hint="Guru yang menaungi kelompok ini. Tugas buatan guru tersebut otomatis terkirim ke kelompok ini.">
        <Select id="g-pic" name="picId" required defaultValue={initial?.picId ?? ""}>
          <option value="" disabled>
            Pilih guru
          </option>
          {gurus.map((guru) => (
            <option key={guru.id} value={guru.id}>
              {guru.user.name} · {guru.code}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label="Nama kelompok" htmlFor="g-name" hint={initial ? undefined : "Kode kelompok dibuat otomatis (TQ001, TQ002, …)."}>
        <Input id="g-name" name="name" required maxLength={191} defaultValue={initial?.name} />
      </FormField>
      <FormField label="Deskripsi / info kelompok" htmlFor="g-desc" hint="Tampil di beranda peserta, mis. jadwal setoran atau tautan grup.">
        <textarea id="g-desc" name="description" rows={4} maxLength={5000} defaultValue={initial?.description ?? ""} className={textareaClass} />
      </FormField>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
        <Link href="/admin/tanwir/kelompok" className={buttonVariants({ variant: "secondary" })}>
          Batal
        </Link>
      </div>
    </form>
  );
}

export function AdminStudentForm({
  action,
  initial,
  owners,
}: {
  action: Action;
  initial: { memberId: string; name: string; age: number | null; className: string | null; parentName: string | null; parentPhone: string | null; progress: string | null } | null;
  owners: { id: string; code: string; user: { name: string } }[];
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });
  return (
    <form action={formAction} className="space-y-5">
      <ErrorText error={state.error} />
      <FormField label="Peserta (guru ngaji)" htmlFor="s-owner">
        <Select id="s-owner" name="memberId" required defaultValue={initial?.memberId ?? ""}>
          <option value="" disabled>
            Pilih peserta
          </option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.user.name} · {owner.code}
            </option>
          ))}
        </Select>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <FormField label="Nama anak" htmlFor="s-name">
          <Input id="s-name" name="name" required maxLength={191} defaultValue={initial?.name} />
        </FormField>
        <FormField label="Usia" htmlFor="s-age">
          <Input id="s-age" name="age" type="number" min={1} max={99} defaultValue={initial?.age ?? ""} />
        </FormField>
      </div>
      <FormField label="Kelas / jilid" htmlFor="s-class">
        <Input id="s-class" name="className" maxLength={191} defaultValue={initial?.className ?? ""} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nama orang tua / wali" htmlFor="s-parent">
          <Input id="s-parent" name="parentName" maxLength={191} defaultValue={initial?.parentName ?? ""} />
        </FormField>
        <FormField label="No. HP orang tua / wali" htmlFor="s-parent-phone">
          <Input id="s-parent-phone" name="parentPhone" type="tel" maxLength={20} defaultValue={initial?.parentPhone ?? ""} />
        </FormField>
      </div>
      <FormField label="Progres belajar / hafalan" htmlFor="s-progress">
        <textarea id="s-progress" name="progress" rows={4} maxLength={5000} defaultValue={initial?.progress ?? ""} className={textareaClass} />
      </FormField>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
        <Link href="/admin/tanwir/anak-didik" className={buttonVariants({ variant: "secondary" })}>
          Batal
        </Link>
      </div>
    </form>
  );
}

/** Hapus dua langkah untuk tabel admin (tema gelap Core). */
export function AdminDeleteButton({ action, confirmText = "Hapus permanen?" }: { action: () => Promise<ActionState>; confirmText?: string }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="text-sm font-medium text-foreground/50 hover:text-danger">
        Hapus
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

export function MemberActiveSwitch({ initial, action }: { initial: boolean; action: (isActive: boolean) => Promise<ActionState> }) {
  const router = useRouter();
  const [active, setActive] = useState(initial);
  const [pending, startTransition] = useTransition();
  return (
    <Switch
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
    />
  );
}
