export type ReceiptData = {
  moduleSource: string; sourceType: string; donorName: string; label: string;
  trackingCode: string; amount: number; adminFee: number; paidAt: Date; gateway: string;
};

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function receiptTemplate(data: ReceiptData) {
  const sar = data.moduleSource === "sarsip";
  const zakat = data.sourceType === "zakat";
  const brand = sar ? "SARSIP" : "LAZSIP";
  const test = data.gateway === "midtrans_sandbox" || data.gateway === "simulation";
  const title = zakat ? "Pembayaran zakat berhasil" : `Donasi ${brand} berhasil`;
  const message = zakat
    ? "Terima kasih telah menunaikan zakat melalui LAZSIP. Semoga Allah menerima zakat Anda dan memberikan keberkahan."
    : sar ? "Terima kasih atas dukungan Anda untuk misi pencarian, pertolongan, dan kemanusiaan SARSIP."
    : "Terima kasih telah berbagi melalui LAZSIP. Dukungan Anda berarti bagi penerima manfaat campaign ini.";
  const money = (value: number) => `Rp${value.toLocaleString("id-ID")}`;
  const details = [
    [zakat ? "Jenis zakat" : "Campaign", data.label],
    [zakat ? "Nominal zakat" : "Nominal donasi", money(data.amount)],
    ["Biaya admin", money(data.adminFee)], ["Total pembayaran", money(data.amount + data.adminFee)],
    ["Tanggal pembayaran", data.paidAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB"],
    ["Kode transaksi", data.trackingCode],
  ];
  const subject = `${test ? "[SIMULASI] " : ""}${title} — ${data.trackingCode}`;
  const note = test ? "Ini konfirmasi pengujian/simulasi, bukan bukti penerimaan uang nyata." : "Pembayaran Anda telah dikonfirmasi berhasil.";
  const text = [`${brand} — ${title}`, note, `Assalamu'alaikum, ${data.donorName}.`, message,
    ...details.map(([key, value]) => `${key}: ${value}`), "Simpan kode transaksi untuk memeriksa status pembayaran Anda.", `Salam, Tim ${brand}`].join("\n\n");
  const color = sar ? "#0f172a" : "#163322";
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#172033"><div style="padding:24px;background:${color};color:white"><h1>${brand}</h1><h2>${title}</h2></div><div style="padding:24px"><p>${note}</p><p>Assalamu'alaikum, ${escapeHtml(data.donorName)}.</p><p>${message}</p><table style="width:100%;border-collapse:collapse">${details.map(([key, value]) => `<tr><td style="padding:10px 0;border-bottom:1px solid #ddd">${key}</td><td style="padding:10px 0;border-bottom:1px solid #ddd;text-align:right">${escapeHtml(value)}</td></tr>`).join("")}</table><p>Simpan kode transaksi untuk memeriksa status pembayaran Anda.</p><p>Salam,<br>Tim ${brand}</p></div></div>`;
  return { subject, text, html };
}
