import Link from "next/link";
import { inputClass } from "./ui";
export function ListFilters({ base, q = "", status = "", cohort = "", cohorts, discussion = false, hidden }: {
  base: string; q?: string; status?: string; cohort?: string; cohorts?: { id: string; title: string }[];
  discussion?: boolean; hidden?: Record<string, string>;
}) {
  return <form method="get" className="flex w-full flex-wrap items-end gap-3 p-5 sm:w-auto">
    {Object.entries(hidden ?? {}).map(([name, value]) => <input key={name} type="hidden" name={name} value={value}/>)}
    <label className="min-w-0 basis-full text-sm sm:flex-1 sm:basis-auto">Cari<input name="q" defaultValue={q} maxLength={100} className={inputClass} placeholder={discussion ? "Isi pertanyaan" : "Judul atau nama"}/></label>
    {cohorts && <label className="text-sm">Angkatan<select name="cohort" defaultValue={cohort} className={inputClass}><option value="">Semua angkatan</option>{cohorts.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
    <label className="text-sm">Status<select name="status" defaultValue={status} className={inputClass}><option value="">Semua status</option>{(discussion ? [["waiting", "Belum dijawab"], ["answered", "Sudah dijawab"]] : [["draft", "Draft"], ["published", "Terpublikasi"]]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <button className="min-h-11 rounded-xl bg-green-700 px-4 py-3 text-sm font-medium text-white">Terapkan</button><Link href={base} className="px-2 py-3 text-sm underline">Reset</Link>
  </form>;
}
