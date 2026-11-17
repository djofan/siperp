import { AnswerPanel } from "@/modules/academy/pages/pengajar/pertanyaan/[id]/page";

export default function Page(props: { searchParams: Promise<Record<string, string | string[] | undefined>>; params: Promise<{ id: string }> }) {
  return <AnswerPanel {...props} admin />;
}
