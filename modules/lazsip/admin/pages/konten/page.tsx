import { AdminPageHeader } from "@/modules/lazsip/components/admin/AdminPageHeader";
import { KontenUmumTabs } from "@/modules/lazsip/components/admin/KontenUmumTabs";
import { getSiteContent } from "@/modules/lazsip/api/siteContent";
import { LAZSIP_SITE_CONTENT_DEFAULTS } from "@/modules/lazsip/api/siteContentDefaults";

export default async function KontenUmumPage() {
  const [hero, tentang, legalitas, kontak, zakatFitrah, transparansi] = await Promise.all([
    getSiteContent("hero"),
    getSiteContent("tentang"),
    getSiteContent("legalitas"),
    getSiteContent("kontak"),
    getSiteContent("zakatFitrah"),
    getSiteContent("transparansi"),
  ]);

  return (
    <div>
      <AdminPageHeader
        title="Konten Umum"
        description="Kelola teks dan angka yang tampil di halaman publik LAZSIP — perubahan langsung aktif tanpa deploy ulang."
      />
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
              { key: "totalVerifikator", label: "Jumlah Verifikator Lapangan Terlatih", hint: "Angka saja." },
              { key: "totalMitra", label: "Jumlah Mitra Kerja Sama", hint: "Angka saja." },
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
            description: "Alamat, nomor, dan tautan media sosial yang tampil di halaman Kontak dan footer.",
            fields: [
              { key: "address", label: "Alamat", multiline: true, rows: 3 },
              { key: "phone", label: "Telepon / WhatsApp" },
              { key: "email", label: "Email" },
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
          {
            sectionKey: "transparansi",
            title: "Transparansi (Beranda)",
            description: "Angka statistik di section Transparansi — diisi manual, bukan dihitung otomatis dari database.",
            fields: [
              { key: "totalDana", label: "Total Dana Terkumpul (Rp)", hint: "Angka saja." },
              { key: "totalDonatur", label: "Jumlah Donatur & Muzakki", hint: "Angka saja." },
              { key: "totalPenerima", label: "Jumlah Penerima Manfaat Terbantu", hint: "Angka saja." },
            ],
            initialValue: { ...LAZSIP_SITE_CONTENT_DEFAULTS.transparansi, ...(transparansi ?? {}) },
          },
        ]}
      />
    </div>
  );
}
