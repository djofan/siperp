import type { SiteContentSectionKey } from "@/modules/lazsip/api/siteContent";

// Salinan persis dari teks fallback yang tampil di halaman publik (Hero, TentangSection,
// Footer, dst) saat admin belum pernah mengisi Konten Umum. Dipakai untuk mengisi form
// admin dengan konten yang SEKARANG benar-benar tampil di landing page, bukan field kosong.
export const LAZSIP_SITE_CONTENT_DEFAULTS: Record<SiteContentSectionKey, Record<string, string>> = {
  hero: {
    title: "Menyalurkan Kepedulian, Menguatkan Solidaritas Umat",
    subtitle:
      "LAZSIP membantu Anda menunaikan zakat, infak, dan donasi dengan mudah, aman, dan tersalurkan tepat sasaran.",
  },
  tentang: {
    body: "",
    visi: "Menjadi lembaga amil zakat yang amanah, transparan, dan profesional dalam menghimpun serta menyalurkan zakat, infak, dan sedekah untuk kesejahteraan umat.",
    misi: [
      "Menghimpun dana zakat, infak, dan sedekah dari masyarakat secara amanah.",
      "Menyalurkan bantuan tepat sasaran kepada mustahik yang berhak menerima.",
      "Mengelola dana dengan transparan dan dapat dipertanggungjawabkan.",
    ].join("\n"),
  },
  legalitas: {
    body: "LAZSIP adalah Lembaga Amil Zakat Solidaritas Insan Peduli, bernaung di bawah Yayasan Solidaritas Insan Peduli.",
  },
  kontak: {
    address: "",
    phone: "",
    email: "",
    instagram: "",
    facebook: "",
    youtube: "",
  },
  zakatFitrah: {
    pricePerJiwa: "45000",
  },
};
