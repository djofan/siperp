import { AdminPageHeader } from "@/modules/lazsip/components/admin/AdminPageHeader";
import { KontenUmumTabs } from "@/modules/lazsip/components/admin/KontenUmumTabs";
import { getSiteContent } from "@/modules/lazsip/api/siteContent";
import { LAZSIP_SITE_CONTENT_DEFAULTS } from "@/modules/lazsip/api/siteContentDefaults";
import { getLazsipStatistics } from "@/modules/lazsip/api/statistics";
import { formatNumber, formatRupiah } from "@/modules/lazsip/components/format";

export default async function KontenUmumPage() {
  const [hero, tentang, legalitas, kontak, zakatFitrah, statistics] = await Promise.all([
    getSiteContent("hero"),
    getSiteContent("tentang"),
    getSiteContent("legalitas"),
    getSiteContent("kontak"),
    getSiteContent("zakatFitrah"),
    getLazsipStatistics(),
  ]);

  return (
    <div>
      <AdminPageHeader
        title="Konten Umum"
        description="Kelola teks dan angka yang tampil di halaman publik LAZSIP — perubahan langsung aktif tanpa deploy ulang."
      />
      <section className="mb-6 rounded-2xl border border-lazsip-primary-100 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <h2 className="text-base font-bold text-lazsip-primary-900 dark:text-white">Statistik otomatis</h2>
        <p className="mt-1 text-sm text-lazsip-primary-800/70 dark:text-white/60">
          Angka di beranda mengikuti database dan tidak perlu diisi manual.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ["Total dana terkumpul", formatRupiah(statistics.totalDana)],
            ["Donatur & muzakki", formatNumber(statistics.totalDonatur)],
            ["Penerima manfaat", formatNumber(statistics.totalPenerima)],
            ["Mitra kerja sama", formatNumber(statistics.totalMitra)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-lazsip-primary-800/70 dark:text-white/60">{label}</dt>
              <dd className="mt-1 text-lg font-bold text-lazsip-primary-900 dark:text-white">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-lazsip-primary-800/60 dark:text-white/50">
          Dana berasal dari donasi dan zakat yang sudah dibayar, ditambah penyesuaian saldo campaign, tanpa biaya admin.
          Donatur dihitung sekali meski bertransaksi berulang. Penerima dan mitra mengikuti data terdaftar.
          Jumlah verifikator diatur manual melalui tab Tentang LAZSIP.
        </p>
      </section>
      <KontenUmumTabs
        sections={[
          {
            sectionKey: "hero",
            title: "Hero (Beranda)",
            description: "Judul dan subjudul besar yang tampil paling atas di halaman utama LAZSIP.",
            fields: [
              { key: "title", label: "Judul" },
              { key: "subtitle", label: "Subjudul", multiline: true, rows: 3 },
            ],
            initialValue: { ...LAZSIP_SITE_CONTENT_DEFAULTS.hero, ...(hero ?? {}) },
          },
          {
            sectionKey: "tentang",
            title: "Tentang LAZSIP",
            description: "Isi section \"Tentang Kami\" di beranda — visi, misi, dan statistik ringkasnya.",
            fields: [
              { key: "body", label: "Isi", multiline: true, rows: 4 },
              { key: "visi", label: "Visi", multiline: true, rows: 3 },
              { key: "misi", label: "Misi", multiline: true, rows: 4, hint: "Satu poin per baris." },
              { key: "totalVerifikator", label: "Jumlah Verifikator Lapangan Terlatih", hint: "Isi jumlah verifikator yang ditampilkan di beranda. Angka saja." },
            ],
            initialValue: { ...LAZSIP_SITE_CONTENT_DEFAULTS.tentang, ...(tentang ?? {}) },
          },
          {
            sectionKey: "legalitas",
            title: "Legalitas",
            description: "Daftar status hukum/legalitas yang tampil di kartu \"Legalitas\" pada section Tentang Kami.",
            fields: [{ key: "body", label: "Isi", multiline: true, rows: 3, hint: "Satu poin per baris." }],
            initialValue: { ...LAZSIP_SITE_CONTENT_DEFAULTS.legalitas, ...(legalitas ?? {}) },
          },
          {
            sectionKey: "kontak",
            title: "Kontak",
            description: "Lengkapi alamat kantor, email resmi, dan telepon aktif sesuai identitas bisnis iPaymu. Data tampil di halaman Kontak dan footer publik; tautan media sosial opsional.",
            fields: [
              { key: "address", label: "Alamat kantor lengkap", multiline: true, rows: 3, required: true, hint: "Cantumkan jalan, nomor/blok, kelurahan, kecamatan, kota/kabupaten, provinsi, dan kode pos." },
              { key: "phone", label: "Telepon / WhatsApp", required: true, type: "tel" },
              { key: "email", label: "Email resmi", required: true, type: "email" },
              { key: "instagram", label: "URL Instagram" },
              { key: "facebook", label: "URL Facebook" },
              { key: "youtube", label: "URL YouTube" },
            ],
            initialValue: { ...LAZSIP_SITE_CONTENT_DEFAULTS.kontak, ...(kontak ?? {}) },
          },
          {
            sectionKey: "zakatFitrah",
            title: "Zakat Fitrah",
            description: "Nominal default per jiwa yang dipakai kalkulator zakat fitrah di beranda.",
            fields: [
              { key: "pricePerJiwa", label: "Nominal per Jiwa (Rp)", hint: "Sesuaikan dengan harga makanan pokok setempat." },
            ],
            initialValue: { ...LAZSIP_SITE_CONTENT_DEFAULTS.zakatFitrah, ...(zakatFitrah ?? {}) },
          },
        ]}
      />
    </div>
  );
}
