import Image from "next/image";

// Ikon daun dari logo resmi LAZSIP (public/lazsip-mark.png, di-crop dari
// LOGO LAZ TERBARU.png), dibungkus lingkaran putih supaya konsisten dengan
// referensi tampilan admin/publik yang sudah ada.
export function LazsipMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-white p-1.5 shadow-sm ring-1 ring-lazsip-primary-100 dark:bg-white/10 dark:ring-white/15 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/lazsip-mark.png"
        alt="Logo LAZSIP"
        width={463}
        height={449}
        className="h-full w-full object-contain"
        priority
      />
    </span>
  );
}
