import Image from "next/image";

// Logo resmi Yayasan Solidaritas Insan Peduli (public/sip-logo.png, diambil dari
// insanpeduli.org — cropped-Logo_SIP_1.png). Dibungkus lingkaran putih supaya garis hijau
// tua logo tetap terlihat di latar gelap (footer, sidebar admin).
export function SipMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-0.5 shadow-sm ${className}`}
      style={{ width: size, height: size }}
    >
      <Image src="/sip-logo.png" alt="Logo Solidaritas Insan Peduli" width={200} height={200} className="h-full w-full object-contain" priority />
    </span>
  );
}
