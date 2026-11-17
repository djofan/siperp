import { QuestionsPanel } from "@/modules/academy/pages/pengajar/pertanyaan/page";

export default function Page(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <QuestionsPanel {...props} admin />;
}
