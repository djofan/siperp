// Preview-only fixtures. Never seed these into Laravel or use them for totals.
const topics = [
  ["Bantuan logistik untuk keluarga terdampak banjir", "Penyaluran paket pangan dan perlengkapan kebersihan untuk kebutuhan awal keluarga.", "Bekasi, Jawa Barat", "kebutuhan-pokok"],
  ["Air bersih untuk warga di wilayah kekeringan", "Dukungan distribusi air bersih dan wadah penyimpanan untuk kebutuhan rumah tangga.", "Gunungkidul, Yogyakarta", "air-bersih"],
  ["Dukung perlengkapan tim pencarian dan pertolongan", "Pengadaan peralatan keselamatan dan perlengkapan lapangan untuk mendukung kerja relawan.", "Bogor, Jawa Barat", "gempa-ntt"],
  ["Layanan kesehatan bagi warga di pengungsian", "Bantuan pemeriksaan kesehatan dasar dan perlengkapan perawatan bagi keluarga.", "Cianjur, Jawa Barat", "kesehatan"],
  ["Paket belajar untuk anak di wilayah terdampak", "Buku, alat tulis, dan perlengkapan sekolah agar kegiatan belajar dapat berlanjut.", "Sukabumi, Jawa Barat", "pendidikan"],
  ["Dapur bersama untuk kebutuhan pengungsi", "Dukungan bahan pangan dan perlengkapan memasak untuk penyediaan makanan harian.", "Demak, Jawa Tengah", "kebutuhan-pokok"],
  ["Pemulihan kebutuhan dasar pascabencana", "Bantuan kebutuhan rumah tangga dan perlengkapan awal bagi keluarga yang kembali ke rumah.", "Flores Timur, NTT", "gempa-ntt"],
  ["Pendampingan anak dan keluarga terdampak", "Kegiatan pendampingan dan dukungan perlengkapan untuk anak serta keluarganya.", "Garut, Jawa Barat", "anak-yatim"],
];
const activityTitles = ["Distribusi logistik dan pemetaan kebutuhan warga", "Penyaluran air bersih di wilayah kekeringan", "Latihan penggunaan peralatan pertolongan", "Pemeriksaan kesehatan di titik pengungsian", "Penyaluran perlengkapan belajar anak", "Persiapan bahan pangan untuk dapur bersama", "Asesmen kebutuhan pemulihan keluarga", "Kegiatan pendampingan anak bersama relawan"];
const newsTitles = ["Menyiapkan paket bantuan sesuai kebutuhan keluarga", "Mengapa akses air bersih penting saat tanggap darurat?", "Mengenal perlengkapan dasar tim SAR di lapangan", "Menjaga kesehatan keluarga selama di pengungsian", "Dukungan belajar membantu anak kembali beraktivitas", "Peran dapur bersama dalam respons kemanusiaan", "Dari asesmen menuju pemulihan pascabencana", "Kolaborasi relawan dalam pendampingan keluarga"];
export function previewEntries(kind: string) {
  return topics.map(([title, description, location, image], index) => ({
    id: `preview-${kind}-${index}`, kind,
    title: kind === "kegiatan" ? activityTitles[index] : kind === "berita" ? newsTitles[index] : title,
    description, location, image: `/aid/${image}.jpg`,
    targetAmount: [85000000, 60000000, 120000000, 45000000, 35000000, 75000000, 95000000, 30000000][index],
    currentAmount: [32750000, 21400000, 56200000, 18750000, 12400000, 44900000, 28300000, 15750000][index],
    status: "active", isPreview: true,
  }));
}
export const previewBeneficiaries = topics.map(([, , location, image], index) => ({
  id: `preview-beneficiary-${index}`, publicName: `Keluarga penerima bantuan · ${location.split(",")[0]}`,
  category: ["Kebutuhan Pokok", "Pemulihan", "Evakuasi", "Kesehatan", "Lainnya", "Kebutuhan Pokok", "Pemulihan", "Lainnya"][index],
  amount: [2500000, 3500000, 1500000, 2000000, 1000000, 2500000, 4000000, 1500000][index],
  image: `/aid/${image}.jpg`, isPreview: true,
}));

export function previewGallery(title: string) {
  return ["gempa-ntt", "air-bersih", "kebutuhan-pokok", "kesehatan"].map((image, index) => ({ id: `demo-photo-${index}`, image: `/aid/${image}.jpg`, caption: `Ilustrasi ${title.toLowerCase()} · Foto ${index + 1}`, isDemo: true }));
}
