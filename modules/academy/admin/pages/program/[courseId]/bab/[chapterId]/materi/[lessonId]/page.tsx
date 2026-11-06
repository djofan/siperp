import { redirect } from "next/navigation";
export default async function Page({ params }: { params: Promise<{ lessonId: string }> }) { const { lessonId } = await params; redirect(`/admin/academy/materi/${lessonId}`); }
