import { TaskSubmissionRecapPage } from "@/modules/tanwir/components/admin/TaskRecapPages";
import type { RecapParams } from "@/modules/tanwir/api/task-recaps";
export const metadata = { title: "Hasil Tugas Peserta · Tanwir Qurani", robots: { index: false, follow: false } };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<RecapParams> }) { return <TaskSubmissionRecapPage id={(await params).id} params={await searchParams} />; }
