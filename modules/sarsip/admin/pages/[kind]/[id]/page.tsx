import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import styles from "@/modules/sarsip/components/admin/Admin.module.css";
import { notFound } from "next/navigation";
import { getEntry, isEntryKind } from "@/modules/sarsip/api/data";
import { EntryEditor } from "@/modules/sarsip/components/admin/EntryEditor";
export default async function EditEntry({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params; if (!isEntryKind(kind)) notFound();
  const entry = id === "baru" ? null : await getEntry(id, kind, true);
  if (id !== "baru" && !entry) notFound();
  return <div><Link href={`/admin/sarsip/${kind}`} className={styles.back}><ArrowLeft size={14}/>Kembali ke daftar {kind}</Link><header className={styles.header}><div><p className={styles.eyebrow}>Konten & publikasi</p><h1>{entry?"Edit":"Tambah"} {kind}</h1><p>Lengkapi isi dan dokumentasi, lalu tentukan kapan konten siap ditampilkan.</p></div></header><EntryEditor kind={kind} entry={entry ? { ...entry, eventDate: entry.eventDate?.toISOString().slice(0,10) ?? "" } : undefined}/></div>;
}
