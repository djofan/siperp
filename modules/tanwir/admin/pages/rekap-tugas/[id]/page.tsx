import { TaskRecapDetailPage } from "@/modules/tanwir/components/admin/TaskRecapPages";
import type { RecapParams } from "@/modules/tanwir/api/task-recaps";
export const metadata = { title: "Rincian Tugas · Tanwir Qurani", robots: { index: false, follow: false } };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<RecapParams> }) { return <TaskRecapDetailPage id={(await params).id} params={await searchParams} />; }
