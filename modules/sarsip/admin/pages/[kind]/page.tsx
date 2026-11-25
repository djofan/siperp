import { notFound } from "next/navigation";
import { isEntryKind, listEntries } from "@/modules/sarsip/api/data";
import { EntryManager } from "@/modules/sarsip/components/admin/EntryManager";
export default async function AdminEntries({params}:{params:Promise<{kind:string}>}){
 const {kind}=await params;if(!isEntryKind(kind))notFound();
 const entries=await listEntries(kind,true);
 return <EntryManager kind={kind} entries={entries.map(e=>({...e,eventDate:e.eventDate?.toISOString()??null}))}/>;
}
