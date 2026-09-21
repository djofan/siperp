"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ImageUploadField } from "@/modules/lazsip/components/admin/ImageUploadField";
import { LoadingButton } from "@/modules/lazsip/components/admin/LoadingButton";
import { Toggle } from "@/modules/lazsip/components/admin/Toggle";
import { panelClasses } from "@/components/ui/panel";

interface BeneficiaryFormValues {
  name: string;
  address: string;
  problemFaced: string;
  birthDate: string; // yyyy-mm-dd
  gender: string;
  referralSource: string;
  photo: string;
  needs: string;
  aidType: string;
  amountReceived: string;
  verifierName: string;
  verifierArea: string;
  maritalStatus: string;
  nik: string;
  occupation: string;
  monthlyIncome: string;
  dependentsCount: string;
  dependentsDetail: string;
}

function hitungUmur(tanggalLahir: string): number | null {
  if (!tanggalLahir) return null;
  const lahir = new Date(tanggalLahir);
  if (Number.isNaN(lahir.getTime())) return null;
  const now = new Date();
  let umur = now.getFullYear() - lahir.getFullYear();
  const belumUlangTahun = now.getMonth() < lahir.getMonth() || (now.getMonth() === lahir.getMonth() && now.getDate() < lahir.getDate());
  if (belumUlangTahun) umur -= 1;
  return Math.max(0, umur);
}

const inputClass =
  "rounded-full bg-lazsip-primary-50/70 dark:bg-white/5 px-4 py-2.5 text-sm text-lazsip-primary-900 dark:text-white outline-none focus:ring-2 focus:ring-lazsip-primary-400";
const adminInputClass =
  "rounded-full border border-rose-200 dark:border-rose-500/30 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-lazsip-primary-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-300";
const textareaClass =
  "rounded-2xl bg-lazsip-primary-50/70 dark:bg-white/5 px-4 py-2.5 text-sm text-lazsip-primary-900 dark:text-white outline-none focus:ring-2 focus:ring-lazsip-primary-400";
const adminTextareaClass =
  "rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-lazsip-primary-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-300";

export function BeneficiaryForm({
  beneficiaryId,
  initialValues,
}: {
  beneficiaryId?: string;
  initialValues?: Partial<BeneficiaryFormValues> & { isPinned?: boolean };
}) {
  const router = useRouter();
  const isEdit = !!beneficiaryId;

  const [isPinned, setIsPinned] = useState(initialValues?.isPinned ?? false);
  const [values, setValues] = useState<BeneficiaryFormValues>({
    name: initialValues?.name ?? "",
    address: initialValues?.address ?? "",
    problemFaced: initialValues?.problemFaced ?? "",
    birthDate: initialValues?.birthDate ?? "",
    gender: initialValues?.gender ?? "perempuan",
    referralSource: initialValues?.referralSource ?? "",
    photo: initialValues?.photo ?? "",
    needs: initialValues?.needs ?? "",
    aidType: initialValues?.aidType ?? "kebutuhan_pokok",
    amountReceived: initialValues?.amountReceived ?? "",
    verifierName: initialValues?.verifierName ?? "",
    verifierArea: initialValues?.verifierArea ?? "",
    maritalStatus: initialValues?.maritalStatus ?? "menikah",
    nik: initialValues?.nik ?? "",
    occupation: initialValues?.occupation ?? "",
    monthlyIncome: initialValues?.monthlyIncome ?? "",
    dependentsCount: initialValues?.dependentsCount ?? "",
    dependentsDetail: initialValues?.dependentsDetail ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const age = useMemo(() => hitungUmur(values.birthDate), [values.birthDate]);

  function set<K extends keyof BeneficiaryFormValues>(key: K, value: BeneficiaryFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isEdit && !values.photo) {
      setError("Foto wajib diunggah.");
      return;
    }

    setIsSubmitting(true);

    const url = beneficiaryId ? `/api/lazsip/beneficiaries/${beneficiaryId}` : "/api/lazsip/beneficiaries";
    const method = beneficiaryId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        age: age ?? 0,
        amountReceived: Number(values.amountReceived) || 0,
        isPinned,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Gagal menyimpan data penerima manfaat.");
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/lazsip/penyaluran-bantuan");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className={panelClasses("p-6")}>
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lazsip-secondary-50 text-lazsip-secondary-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            </svg>
          </span>
          <h3 className="text-base font-bold text-lazsip-primary-900 dark:text-white">Tampil di Publik</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ImageUploadField label="Foto" initialUrl={values.photo} onChange={(url) => set("photo", url ?? "")} required={!isEdit} />
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-lazsip-primary-50/60 dark:bg-white/5 px-4 py-3.5 sm:col-span-2">
            <span className="text-sm font-medium text-lazsip-primary-900 dark:text-white">Pin di beranda</span>
            <Toggle checked={isPinned} onChange={setIsPinned} label="Pin" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">
              Nama<span className="ml-0.5 text-red-600">*</span>
            </label>
            <input required value={values.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">Jenis Kelamin</label>
            <select value={values.gender} onChange={(e) => set("gender", e.target.value)} className={inputClass}>
              <option value="perempuan">Perempuan</option>
              <option value="laki-laki">Laki-laki</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">Usia (dihitung otomatis)</label>
            <div className="rounded-full bg-lazsip-primary-50/60 dark:bg-white/5 px-4 py-2.5 text-sm text-lazsip-primary-800/70 dark:text-white/60">
              {age !== null ? `${age} tahun` : "Isi tanggal lahir di bagian khusus admin"}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">Cara Mengetahui LAZSIP</label>
            <input value={values.referralSource} onChange={(e) => set("referralSource", e.target.value)} className={inputClass} />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">Masalah yang Dihadapi</label>
            <textarea rows={2} value={values.problemFaced} onChange={(e) => set("problemFaced", e.target.value)} className={textareaClass} />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">Kebutuhan</label>
            <textarea rows={2} value={values.needs} onChange={(e) => set("needs", e.target.value)} className={textareaClass} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">Tipe Bantuan</label>
            <select value={values.aidType} onChange={(e) => set("aidType", e.target.value)} className={inputClass}>
              <option value="pendidikan">Pendidikan</option>
              <option value="kesehatan">Kesehatan</option>
              <option value="kebutuhan_pokok">Kebutuhan Pokok</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">Jumlah Bantuan Diterima (Rp)</label>
            <input
              inputMode="numeric"
              value={values.amountReceived}
              onChange={(e) => set("amountReceived", e.target.value.replace(/[^0-9]/g, ""))}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">Nama Verifikator</label>
            <input value={values.verifierName} onChange={(e) => set("verifierName", e.target.value)} className={inputClass} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">Wilayah Cakupan Verifikator</label>
            <input value={values.verifierArea} onChange={(e) => set("verifierArea", e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border-2 border-dashed border-rose-200 bg-rose-50/40 p-6 dark:border-rose-500/30 dark:bg-rose-500/10">
        <div className="mb-2 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 10V7a6 6 0 1 1 12 0v3M5 10h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" />
            </svg>
          </span>
          <h3 className="text-base font-bold text-rose-900 dark:text-rose-300">Khusus Admin (Tidak Tampil ke Publik)</h3>
        </div>
        <p className="mb-5 text-xs text-rose-700/80 dark:text-rose-300/70">
          🔒 Data pada bagian ini tidak akan pernah ditampilkan ke halaman publik manapun.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">
              Tanggal Lahir<span className="ml-0.5 text-red-600">*</span>
            </label>
            <input type="date" required value={values.birthDate} onChange={(e) => set("birthDate", e.target.value)} className={adminInputClass} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">Status Pernikahan</label>
            <select value={values.maritalStatus} onChange={(e) => set("maritalStatus", e.target.value)} className={adminInputClass}>
              <option value="menikah">Menikah</option>
              <option value="janda-cerai">Janda (cerai)</option>
              <option value="janda-meninggal">Janda (suami meninggal)</option>
              <option value="duda-cerai">Duda (cerai)</option>
              <option value="duda-meninggal">Duda (istri meninggal)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">NIK</label>
            <input
              inputMode="numeric"
              maxLength={16}
              value={values.nik}
              onChange={(e) => set("nik", e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="16 digit NIK KTP"
              className={adminInputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">Pekerjaan</label>
            <input value={values.occupation} onChange={(e) => set("occupation", e.target.value)} className={adminInputClass} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">Penghasilan per Bulan (Rp)</label>
            <input
              inputMode="numeric"
              value={values.monthlyIncome}
              onChange={(e) => set("monthlyIncome", e.target.value.replace(/[^0-9]/g, ""))}
              className={adminInputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">Jumlah Tanggungan</label>
            <input
              inputMode="numeric"
              value={values.dependentsCount}
              onChange={(e) => set("dependentsCount", e.target.value.replace(/[^0-9]/g, ""))}
              className={adminInputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">Rincian Tanggungan</label>
            <textarea
              rows={2}
              value={values.dependentsDetail}
              onChange={(e) => set("dependentsDetail", e.target.value)}
              placeholder="mis. Istri (ibu rumah tangga), 2 anak (SD & SMP)"
              className={adminTextareaClass}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-lazsip-primary-900 dark:text-white">
              Alamat Lengkap<span className="ml-0.5 text-red-600">*</span>
            </label>
            <textarea rows={2} required value={values.address} onChange={(e) => set("address", e.target.value)} className={adminTextareaClass} />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <LoadingButton type="submit" loading={isSubmitting} className="w-fit px-8">
        {isEdit ? "Simpan Perubahan" : "Tambah Data"}
      </LoadingButton>
    </form>
  );
}
