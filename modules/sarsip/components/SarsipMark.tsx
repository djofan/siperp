import Image from "next/image";
import { SARSIP_LOGO } from "@/modules/sarsip/brand";

export function SarsipMark({ className = "h-12 w-12" }: { className?: string }) {
  return <Image src={SARSIP_LOGO} alt="Logo SARSIP — Solidaritas Insan Peduli" width={356} height={353} className={`shrink-0 object-contain ${className}`} />;
}
