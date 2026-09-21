import Link from "next/link";
import { notFound } from "next/navigation";
import { getEntry, isEntryKind } from "@/modules/sarsip/api/data";
import { EntryEditor } from "@/modules/sarsip/components/admin/EntryEditor";
export default async function EditEntry({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params; if (!isEntryKind(kind)) notFound();
  const entry = id === "baru" ? null : await getEntry(id, kind, true);
  if (id !== "baru" && !entry) notFound();
  return <div><Link href={`/admin/sarsip/${kind}`} className="text-sm text-orange-600">← Kembali</Link><h1 className="mb-6 mt-4 text-2xl font-bold capitalize text-foreground">{entry ? "Edit" : "Tambah"} {kind}</h1><EntryEditor kind={kind} entry={entry ? { ...entry, eventDate: entry.eventDate?.toISOString().slice(0,10) ?? "" } : undefined}/></div>;
}

