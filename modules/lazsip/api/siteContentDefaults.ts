import { ORGANIZATION_CONTACT } from "@/lib/organization-contact";
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
    totalVerifikator: "4",
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
    address: ORGANIZATION_CONTACT.address,
    phone: ORGANIZATION_CONTACT.phone,
    email: ORGANIZATION_CONTACT.email,
    instagram: "",
    facebook: "",
    youtube: "",
  },
  zakatFitrah: {
    pricePerJiwa: "45000",
  },
  transparansi: {
    visible: "true", eyebrow: "Bersama LAZSIP",
    title: "Lebih mudah berbagi, lebih dekat manfaatnya.",
    description: "Pilih program yang ingin Anda dukung. Kami membantu Anda memulai.",
    card1Visible: "true", card1Title: "Pilih kebaikan Anda", card1Description: "Temukan program donasi atau tunaikan zakat sesuai kebutuhan.", card1Href: "/lazsip/donasi", card1Action: "Lihat program donasi", card1Icon: "heart",
    card2Visible: "true", card2Title: "Hitung zakat dengan mudah", card2Description: "Gunakan kalkulator untuk membantu menghitung zakat maal dan fitrah.", card2Href: "/lazsip/zakat", card2Action: "Hitung & bayar zakat", card2Icon: "calculator",
    card3Visible: "true", card3Title: "Kenali manfaatnya", card3Description: "Lihat dokumentasi bantuan dan kegiatan bersama penerima manfaat.", card3Href: "/lazsip/penyaluran-bantuan", card3Action: "Lihat penyaluran", card3Icon: "image",
  },
};
