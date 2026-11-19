import { TaskRecapIndexPage } from "@/modules/tanwir/components/admin/TaskRecapPages";
import type { RecapParams } from "@/modules/tanwir/api/task-recaps";
export const metadata = { title: "Rekap Tugas · Tanwir Qurani", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<RecapParams> }) { return <TaskRecapIndexPage params={await searchParams} />; }
