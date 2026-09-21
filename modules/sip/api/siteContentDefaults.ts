import type { SipSiteContentSectionKey } from "@/modules/sip/api/siteContent";

// Salinan persis dari teks fallback yang tampil di halaman publik (Hero, section, tentang,
// dst) saat admin belum pernah mengisi Konten Umum. Dipakai untuk mengisi form admin dengan
// konten yang SEKARANG benar-benar tampil di landing page, bukan field kosong.
export const SIP_SITE_CONTENT_DEFAULTS: Record<SipSiteContentSectionKey, Record<string, string>> = {
  hero: {
    title: "Bahagia dengan Membahagiakan Orang Lain",
    subtitle:
      "Solidaritas Insan Peduli menyalurkan bantuan dana infaq, sedekah, dan zakat kepada mereka yang membutuhkan secara cepat dan tepat sasaran.",
    whatsappUrl: "",
    infaqUrl: "",
  },
  berita: {
    eyebrow: "Berita",
    title: "Kabar Terbaru dari SIP",
    description: "Update kegiatan, kajian, dan informasi seputar Solidaritas Insan Peduli.",
  },
  program: {
    eyebrow: "Program",
    title: "Program Bantuan yang Tersedia",
    description:
      "Pilihan program bantuan SIP berdasarkan verifikasi lapangan — kesehatan, pendidikan, kebutuhan pokok, dan santunan.",
  },
  penyaluranBantuan: {
    eyebrow: "Penyaluran Bantuan",
    title: "Sudah Tersalurkan ke Mana Saja",
    description: "Dokumentasi realisasi penyaluran bantuan oleh tim verifikator SIP di lapangan.",
  },
  tentang: {
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
    verifikatorCount: "",
    kotaCount: "",
    provinsiCount: "",
    kotaList: "",
  },
  kontak: {
    address: "",
    phone: "",
    email: "",
    instagram: "",
    facebook: "",
    youtube: "",
  },
};
