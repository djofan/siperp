import Link from "next/link";
import { getMergedSiteContent, splitLines } from "@/modules/sip/api/siteContent";
import { InfoPage } from "@/modules/sip/components/InfoPage";
export default async function FaqPage() {
  const content = await getMergedSiteContent("layanan");
  return <InfoPage title="Pertanyaan Umum" description="Panduan singkat untuk mengenal SIP dan menemukan layanan yang sesuai.">
    <div className="space-y-4">{splitLines(content.faq).map((line,i) => {const separator = line.indexOf("|");if (separator < 0) return null;const question = line.slice(0,separator).trim(), answer = line.slice(separator+1).trim();return question && answer ? <details key={i} className="group rounded-2xl border border-sip-primary-100 p-6"><summary className="cursor-pointer text-lg font-semibold text-sip-primary-900">{question}</summary><p className="mt-4 whitespace-pre-line leading-8 text-sip-primary-900/65">{answer}</p></details> : null;})}</div>
    <div className="mt-9 rounded-3xl bg-sip-primary-50 p-7"><h2 className="text-xl font-semibold text-sip-primary-900">Masih membutuhkan informasi?</h2><Link href="/kontak" className="mt-4 inline-block font-semibold text-sip-primary-600">Hubungi SIP →</Link></div>
  </InfoPage>;
}
