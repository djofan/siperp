import type { SipSiteContentSectionKey } from "@/modules/sip/api/siteContent";

// Salinan persis dari teks yang tampil di halaman publik (Hero, section, tentang, footer, dst)
// saat admin belum pernah mengisi Konten Umum. Dipakai untuk (1) mengisi form admin dengan
// konten yang SEKARANG benar-benar tampil, dan (2) fallback per-field di halaman publik
// lewat getMergedSiteContent(). Toggle disimpan sebagai string "true"/"false".
export const SIP_SITE_CONTENT_DEFAULTS: Record<SipSiteContentSectionKey, Record<string, string>> = {
  hero: {
    badge: "Yayasan Solidaritas Insan Peduli",
    backgroundImage: "",
    title: "Bahagia dengan Membahagiakan Orang Lain",
    subtitle:
      "Solidaritas Insan Peduli menyalurkan bantuan dana infaq, sedekah, dan zakat kepada mereka yang membutuhkan secara cepat dan tepat sasaran.",
    infaqLabel: "Infaq Sekarang",
    infaqUrl: "",
    bantuanLabel: "Pengajuan Bantuan",
    whatsappUrl: "",
    values: ["Amanah", "Transparan", "Tepat Sasaran", "Terverifikasi"].join("\n"),
    profilVisible: "true",
    profilEyebrow: "Profil",
    profilTitle: "Menyalurkan kepedulian secara amanah dan tepat sasaran.",
    profilBody: "Dari verifikasi lapangan sampai penyaluran, SIP menjaga setiap bantuan sampai ke tangan yang membutuhkan.",
  },
  berita: {
    visible: "true",
    eyebrow: "Berita",
    title: "Kabar *Terbaru* dari SIP",
    description: "Update kegiatan, kajian, dan informasi seputar Solidaritas Insan Peduli.",
    seeAllLabel: "Lihat Semua",
  },
  program: {
    visible: "true",
    eyebrow: "Program",
    title: "Program Bantuan yang *Tersedia*",
    description:
      "Pilihan program bantuan SIP berdasarkan verifikasi lapangan — kesehatan, pendidikan, kebutuhan pokok, dan santunan.",
    seeAllLabel: "Lihat Semua",
  },
  penyaluranBantuan: {
    visible: "true",
    eyebrow: "Penyaluran Bantuan",
    title: "Sudah Tersalurkan ke *Mana Saja*",
    description: "Dokumentasi realisasi penyaluran bantuan oleh tim verifikator SIP di lapangan.",
    seeAllLabel: "Lihat Semua",
  },
  tentang: {
    visible: "true",
    eyebrow: "Tentang Kami",
    title: "Tentang Solidaritas Insan Peduli",
    body: "Solidaritas Insan Peduli (SIP) adalah yayasan sosial, kemanusiaan, dan keagamaan yang berdiri di Cileungsi, Bogor. SIP menyalurkan bantuan darurat berupa infaq, sedekah, dan zakat kepada masyarakat yang membutuhkan berdasarkan verifikasi lapangan oleh tim relawan.",
    visi: "Mengentaskan permasalahan sosial kaum muslimin secara cepat dan tepat.",
    misi: [
      "Menghimpun dan menyalurkan dana infaq, sedekah, dan zakat secara amanah.",
      "Membangun individu yang tanggap dan peduli terhadap sesama.",
      "Mengelola bantuan secara transparan dan akuntabel berdasarkan verifikasi lapangan.",
    ].join("\n"),
    legalitas: "",
  },
  jangkauanBantuan: {
    visible: "true",
    eyebrow: "Profil",
    title: "Jangkauan Bantuan *SIP*",
    description: "Tim verifikator SIP tersebar di berbagai wilayah Indonesia untuk memastikan bantuan tepat sasaran.",
    verifikatorCount: "",
    kotaCount: "",
    provinsiCount: "",
    kotaList: "",
  },
  laporan: {
    visible: "true",
    eyebrow: "Transparansi",
    title: "Laporan *Keuangan*",
    description: "Laporan bulanan dan tahunan Yayasan Solidaritas Insan Peduli, terbuka untuk publik.",
    seeAllLabel: "Lihat Semua Laporan",
  },
  kontak: {
    address: "",
    mapsUrl: "",
    phone: "",
    email: "",
    jamLayanan: "",
    instagram: "",
    facebook: "",
    youtube: "",
    tiktok: "",
  },
  footer: {
    tagline: "Bahagia dengan membahagiakan orang lain",
    description: "Mari salurkan kepedulian bersama Solidaritas Insan Peduli.",
    ctaPrimaryLabel: "Pengajuan Bantuan",
    ctaSecondaryLabel: "Lihat Program Bantuan",
    ctaSecondaryUrl: "/sip#program",
    showPrograms: "true",
    programsTitle: "Program Bantuan",
    copyright: "Solidaritas Insan Peduli. Seluruh hak cipta dilindungi.",
    bottomNote: "Yayasan sosial, kemanusiaan, dan keagamaan",
  },
};
