import type { SantunanCategory } from "@/contracts/modules/bantuan";

export const routineCardTemplates = {
  widow: { label: "Janda dhuafa", image: "/bantuan/templates/janda-dhuafa-rutin.png" },
  orphan: { label: "Anak yatim rutin", image: "/bantuan/templates/yatim-rutin.png" },
  foster_child: { label: "Anak asuh", image: "/bantuan/templates/anak-asuh-rutin.png" },
  tahfidz: { label: "Lembaga Tahfidz", image: "/bantuan/templates/lembaga-tahfidz.png" },
} satisfies Record<SantunanCategory, {label:string;image:string}>;

export interface SantunanCardValues { category: SantunanCategory; amount: number; verifier: string; recipient: string; date: string }

function centered(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, maxWidth: number, size: number) {
  ctx.font = `900 ${size}px Arial, sans-serif`;
  const measured = ctx.measureText(value).width;
  if (measured > maxWidth) ctx.font = `900 ${size * maxWidth / measured}px Arial, sans-serif`;
  ctx.fillText(value, x, y);
}
function name(ctx: CanvasRenderingContext2D, value: string, x: number) {
  // Keep full long names within the space beneath each signature line.
  let size = 12.5, lines: string[] = [];
  for (; size >= 5; size -= 0.5) {
    ctx.font = `bold ${size}px Arial, sans-serif`;
    lines = [""];
    for (const word of value.trim().split(/\s+/)) {
      const last = lines.length - 1;
      const candidate = lines[last] ? `${lines[last]} ${word}` : word;
      if (ctx.measureText(candidate).width <= 260) lines[last] = candidate;
      else if (ctx.measureText(word).width <= 260) lines.push(word);
      else {
        for (const char of word) {
          const index = lines.length - 1;
          if (ctx.measureText(lines[index] + char).width > 260) lines.push(char);
          else lines[index] += char;
        }
      }
    }
    if (lines.length * size * 1.1 <= 25) break;
  }
  const top = 476 - ((lines.length - 1) * size * 1.1) / 2;
  lines.forEach((line, i) => ctx.fillText(line.trim(), x, top + i * size * 1.1));
}
export async function renderSantunanCard(canvas: HTMLCanvasElement, values: SantunanCardValues) {
  const image = new Image();
  image.src = routineCardTemplates[values.category].image;
  await image.decode();
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pembuatan kartu.");
  ctx.drawImage(image, 0, 0);
  ctx.scale(canvas.width / 842.25, canvas.height / 595.5);
  ctx.fillStyle = "#00671a"; ctx.textAlign = "center";
  centered(ctx, `Rp ${new Intl.NumberFormat("id-ID").format(values.amount)}`, 421, 331, 685, 82);
  name(ctx, values.verifier, 215);
  name(ctx, values.recipient, 494);
  centered(ctx, "TANGGAL", 698, 386, 114, 12);
  const date = new Date(`${values.date}T12:00:00`);
  centered(ctx, date.toLocaleDateString("id-ID", {day:"numeric",month:"long"}), 698, 434, 114, 15);
  centered(ctx, String(date.getFullYear()), 698, 455, 114, 16);
}
