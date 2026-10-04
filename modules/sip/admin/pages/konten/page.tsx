import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { SipKontenUmumEditor, type SipKontenSection } from "@/modules/sip/components/admin/SipKontenUmumEditor";
import type { FieldDef } from "@/modules/sip/components/admin/SipSiteContentSectionForm";
import { getSiteContent, SIP_SITE_CONTENT_KEYS, type SipSiteContentSectionKey } from "@/modules/sip/api/siteContent";
import { SIP_SITE_CONTENT_DEFAULTS } from "@/modules/sip/api/siteContentDefaults";

const VISIBLE_FIELD: FieldDef = {
  key: "visible",
  label: "Tampilkan di landing page",
  hint: "Kalau dimatikan, section ini disembunyikan dan menunya ikut hilang dari navbar & footer.",
  toggle: true,
};

const SECTION_HEADING_FIELDS: FieldDef[] = [
  VISIBLE_FIELD,
  { key: "eyebrow", label: "Label kecil (eyebrow)", hint: "Teks kecil di atas judul section.", group: "Judul section" },
  { key: "title", label: "Judul section", hint: "Bungkus kata dengan *bintang* untuk warna hijau, mis. Kabar *Terbaru*." },
  { key: "description", label: "Deskripsi", multiline: true, rows: 3 },
  { key: "seeAllLabel", label: "Label tombol “Lihat semua”" },
];

export default async function SipKontenUmumPage() {
  const saved = await Promise.all(SIP_SITE_CONTENT_KEYS.map((key) => getSiteContent(key)));
  const initial = Object.fromEntries(
    SIP_SITE_CONTENT_KEYS.map((key, i) => [key, { ...SIP_SITE_CONTENT_DEFAULTS[key], ...(saved[i] ?? {}) }])
  ) as Record<SipSiteContentSectionKey, Record<string, string>>;

  const sections: SipKontenSection[] = [
    {
      sectionKey: "hero",
      title: "Hero (Beranda)",
      description: "Bagian paling atas landing page: foto, judul utama, tombol aksi, dan strip Profil di bawahnya.",
      previewHref: "/sip#beranda",
      fields: [
        { key: "backgroundImage", label: "Foto hero", image: true },
        { key: "badge", label: "Label kecil di atas judul", wide: true },
        { key: "title", label: "Judul" },
        { key: "subtitle", label: "Subjudul", multiline: true, rows: 3 },
        { key: "infaqLabel", label: "Label tombol utama", group: "Tombol aksi" },
        { key: "infaqUrl", label: "Link tombol utama", hint: "Kosongkan untuk ke halaman donasi LAZSIP." },
        { key: "bantuanLabel", label: "Label tombol kedua" },
        { key: "whatsappUrl", label: "Link tombol kedua", hint: "Format: https://wa.me/62xxxxxxxxxx" },
        { key: "values", label: "Nilai yayasan (centang di bawah tombol)", multiline: true, rows: 4, hint: "Satu nilai per baris." },
        { key: "profilVisible", label: "Tampilkan strip Profil", hint: "Strip berisi teks profil + statistik jumlah program & penyaluran.", toggle: true, group: "Strip profil" },
        { key: "profilEyebrow", label: "Label kecil" },
        { key: "profilTitle", label: "Judul" },
        { key: "profilBody", label: "Deskripsi", multiline: true, rows: 2 },
      ],
      initialValue: initial.hero,
    },
    {
      sectionKey: "berita",
      title: "Section Berita",
      description: "Judul & deskripsi di atas daftar berita terbaru.",
      previewHref: "/sip#berita",
      fields: SECTION_HEADING_FIELDS,
      initialValue: initial.berita,
    },
    {
      sectionKey: "program",
      title: "Section Program",
      description: "Judul & deskripsi di atas kartu program bantuan.",
      previewHref: "/sip#program",
      fields: SECTION_HEADING_FIELDS,
      initialValue: initial.program,
    },
    {
      sectionKey: "penyaluranBantuan",
      title: "Section Penyaluran",
      description: "Judul & deskripsi di atas dokumentasi penyaluran bantuan.",
      previewHref: "/sip#penyaluran-bantuan",
      fields: SECTION_HEADING_FIELDS,
      initialValue: initial.penyaluranBantuan,
    },
    {
      sectionKey: "tentang",
      title: "Tentang SIP",
      description: "Sejarah, visi, misi, dan legalitas yayasan.",
      previewHref: "/sip#tentang",
      fields: [
        VISIBLE_FIELD,
        { key: "eyebrow", label: "Label kecil (eyebrow)", group: "Judul section" },
        { key: "title", label: "Judul section", hint: "Bungkus kata dengan *bintang* untuk warna hijau, mis. Kabar *Terbaru*." },
        { key: "body", label: "Sejarah", multiline: true, rows: 6, group: "Isi" },
        { key: "visi", label: "Visi", multiline: true, rows: 3 },
        { key: "misi", label: "Misi", multiline: true, rows: 5, hint: "Satu poin per baris." },
        { key: "legalitas", label: "Legalitas", multiline: true, rows: 4, hint: "Akta, izin LAZ, dll — satu poin per baris. Tampil juga di footer." },
      ],
      initialValue: initial.tentang,
    },
    {
      sectionKey: "jangkauanBantuan",
      title: "Jangkauan Bantuan",
      description: "Angka statistik dan daftar kota yang sudah dijangkau.",
      previewHref: "/sip#jangkauan-bantuan",
      fields: [
        { ...VISIBLE_FIELD, hint: "Section juga otomatis tersembunyi kalau semua angka & daftar kota masih kosong." },
        { key: "eyebrow", label: "Label kecil (eyebrow)", group: "Judul section" },
        { key: "title", label: "Judul section", hint: "Bungkus kata dengan *bintang* untuk warna hijau, mis. Kabar *Terbaru*." },
        { key: "description", label: "Deskripsi", multiline: true, rows: 2 },
        { key: "verifikatorCount", label: "Jumlah verifikator", group: "Angka" },
        { key: "kotaCount", label: "Jumlah kota/kabupaten" },
        { key: "provinsiCount", label: "Jumlah provinsi" },
        { key: "kotaList", label: "Daftar kota", multiline: true, rows: 6, hint: "Satu kota per baris." },
      ],
      initialValue: initial.jangkauanBantuan,
    },
    {
      sectionKey: "laporan",
      title: "Section Laporan",
      description: "Judul & deskripsi di atas kartu laporan keuangan.",
      previewHref: "/sip#laporan",
      fields: SECTION_HEADING_FIELDS,
      initialValue: initial.laporan,
    },
    {
      sectionKey: "kontak",
      title: "Kontak",
      description: "Alamat, kanal kontak, dan media sosial — tampil di footer semua halaman.",
      previewHref: "/sip",
      fields: [
        { key: "address", label: "Alamat", multiline: true, rows: 3 },
        { key: "mapsUrl", label: "Link Google Maps", hint: "Tombol “Lihat di peta” di footer. Kosongkan untuk menyembunyikan.", wide: true },
        { key: "phone", label: "Telepon / WhatsApp" },
        { key: "email", label: "Email" },
        { key: "jamLayanan", label: "Jam layanan", hint: "mis. Senin–Sabtu, 08.00–16.00 WIB", wide: true },
        { key: "instagram", label: "URL Instagram", group: "Media sosial" },
        { key: "facebook", label: "URL Facebook" },
        { key: "youtube", label: "URL YouTube" },
        { key: "tiktok", label: "URL TikTok" },
      ],
      initialValue: initial.kontak,
    },
    {
      sectionKey: "footer",
      title: "Footer",
      description: "Tagline, tombol, daftar program, dan teks hak cipta di bagian paling bawah.",
      previewHref: "/sip",
      fields: [
        { key: "tagline", label: "Tagline", wide: true },
        { key: "description", label: "Deskripsi singkat", multiline: true, rows: 2 },
        { key: "ctaPrimaryLabel", label: "Label tombol WhatsApp", group: "Tombol", hint: "Tujuannya nomor WhatsApp SIP." },
        { key: "ctaSecondaryLabel", label: "Label tombol kedua" },
        { key: "ctaSecondaryUrl", label: "Link tombol kedua", wide: true },
        { key: "showPrograms", label: "Tampilkan kolom daftar program", hint: "Otomatis berisi program bantuan (yang di-pin didahulukan).", toggle: true, group: "Kolom program" },
        { key: "programsTitle", label: "Judul kolom program", wide: true },
        { key: "copyright", label: "Teks hak cipta", hint: "Tahun ditambahkan otomatis di depannya.", group: "Baris bawah", wide: true },
        { key: "bottomNote", label: "Catatan kanan bawah", wide: true },
      ],
      initialValue: initial.footer,
    },
  ];

  return (
    <div>
      <SipAdminPageHeader
        title="Konten Umum"
        description="Semua teks, gambar, dan tampil/sembunyi section di landing page SIP — perubahan langsung tampil tanpa deploy ulang."
      />
      <SipKontenUmumEditor sections={sections} />
    </div>
  );
}
