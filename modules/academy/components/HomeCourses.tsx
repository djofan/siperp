import Link from "next/link";
import { listMaterials } from "../api/materials";
import { EmptyState } from "./ui";
import { AcademyIcon } from "./icons";
export async function HomeCourses() {
  const result = await listMaterials();
  if (!result.items.length) return <EmptyState>Materi belajar segera hadir.</EmptyState>;
  return <div className="space-y-3">{result.items.slice(0, 6).map(item => <Link key={item.id} href={`/academy/materi/${item.id}`} className="academy-card academy-program-row hover:border-green-200"><span className="academy-icon-tile"><AcademyIcon name="BookOpen" className="h-5 w-5" /></span><div className="flex-1"><h3 className="text-sm font-semibold">{item.title}</h3><p className="academy-muted">{item.shortDescription}</p></div><span className="text-sm text-green-700">Pelajari →</span></Link>)}<Link href="/academy/materi" className="mt-5 block text-center text-sm font-semibold text-green-700">Lihat semua materi →</Link></div>;
}
