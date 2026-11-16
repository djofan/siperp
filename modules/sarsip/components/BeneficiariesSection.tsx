import { previewBeneficiaries } from "./landingPreview";
import { listPublicBeneficiaries } from "@/modules/sarsip/api/beneficiaries";
import { BeneficiaryCards } from "@/modules/sarsip/components/BeneficiaryCards";
export async function BeneficiariesSection({ full = false, preview = false }: { full?: boolean; preview?: boolean }) {
  const published = await listPublicBeneficiaries();
  const rows = [...published, ...(preview && process.env.NODE_ENV === "development" ? previewBeneficiaries.slice(0, Math.max(0, 8 - published.length)) : [])];
  const Heading = full ? "h1" : "h2";
  return <section id="penerima-manfaat" className="scroll-mt-32 bg-[#f0f1eb]">
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-widest text-orange-700">Dampak kepedulian</p>
      <Heading className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Penerima Manfaat SARSIP</Heading>
      <p className="mt-5 max-w-2xl leading-7 text-slate-600">Sebagian penerima manfaat yang telah dibantu. Nama tampilan dan dokumentasi dipublikasikan sesuai pengaturan privasi penerima.</p>
      <BeneficiaryCards rows={rows} limit={full ? undefined : 8}/>
    </div>
  </section>;
}
