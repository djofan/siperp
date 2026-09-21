import { Resend } from "resend";

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

/**
 * Kode pelacakan SELALU tampil di layar juga (bukan cuma lewat email) — lihat
 * prd-lazsip.md §7. Kalau RESEND_API_KEY belum diisi atau pengiriman gagal, checkout
 * tetap berhasil; ini cuma kenyamanan tambahan, bukan satu-satunya jalan donatur tahu kodenya.
 */
export async function sendTrackingCodeEmail(to: string, trackingCode: string, totalAmount: number) {
  const client = getClient();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!client || !from) {
    console.log(`[email disabled] Kode pelacakan ${trackingCode} untuk ${to} tidak dikirim (RESEND_API_KEY/RESEND_FROM_EMAIL belum diisi).`);
    return;
  }

  await client.emails.send({
    from,
    to,
    subject: `Kode Pelacakan Transaksi Anda: ${trackingCode}`,
    html: `
      <p>Assalamu'alaikum,</p>
      <p>Terima kasih atas transaksi Anda sebesar <strong>${formatRupiah(totalAmount)}</strong>.</p>
      <p>Kode pelacakan Anda:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:2px;">${trackingCode}</p>
      <p>Simpan kode ini untuk memeriksa status pembayaran Anda kapan saja lewat menu "Cek Status" di beranda.</p>
    `,
  });
}

interface HistoryItem {
  trackingCode: string;
  type: "donasi" | "zakat";
  label: string;
  amount: number;
  status: string;
  createdAt: Date;
}

const STATUS_LABEL: Record<string, string> = { pending: "Menunggu", paid: "Lunas", failed: "Gagal" };

/**
 * Dipanggil HANYA setelah dipastikan ada riwayat untuk email ini — pemanggil tetap
 * mengembalikan respons netral ke publik terlepas dari hasil pencarian (prd-lazsip.md
 * §3.11.B & §6 aturan #8), supaya endpoint ini tidak bisa dipakai menebak email terdaftar.
 */
export async function sendHistoryEmail(to: string, items: HistoryItem[]) {
  const client = getClient();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!client || !from) {
    console.log(`[email disabled] Riwayat transaksi untuk ${to} (${items.length} transaksi) tidak dikirim.`);
    return;
  }

  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;">${item.createdAt.toLocaleDateString("id-ID")}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;">${item.type === "donasi" ? "Donasi" : "Zakat"} — ${item.label}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;">${formatRupiah(item.amount)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;">${STATUS_LABEL[item.status] ?? item.status}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;font-family:monospace;">${item.trackingCode}</td>
        </tr>
      `
    )
    .join("");

  await client.emails.send({
    from,
    to,
    subject: "Riwayat Transaksi Anda",
    html: `
      <p>Assalamu'alaikum,</p>
      <p>Berikut riwayat transaksi (donasi &amp; zakat) yang tercatat dengan email ini:</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:6px 10px;">Tanggal</th>
            <th style="text-align:left;padding:6px 10px;">Jenis</th>
            <th style="text-align:left;padding:6px 10px;">Nominal</th>
            <th style="text-align:left;padding:6px 10px;">Status</th>
            <th style="text-align:left;padding:6px 10px;">Kode</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:16px;">Kalau Anda tidak merasa melakukan pencarian ini, abaikan email ini saja.</p>
    `,
  });
}
