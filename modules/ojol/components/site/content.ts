// Konten situs publik Ojol Mengaji — diadaptasi dari situs lama (resources/views/welcome & pages/*),
// tanpa angka klaim yang tidak bisa diverifikasi.

export const SITE_NAV = [
  { href: "/ojol/tentang", label: "Tentang" },
  { href: "/ojol/cara-bergabung", label: "Cara Bergabung" },
  { href: "/ojol/faq", label: "FAQ" },
  { href: "/ojol/kontak", label: "Kontak" },
];

export function whatsappAdminHref(message = "Assalamu'alaikum, saya ingin bertanya tentang program Ojol Mengaji.") {
  const number = (process.env.NEXT_PUBLIC_OJOL_WHATSAPP ?? process.env.NEXT_PUBLIC_SIP_WHATSAPP ?? "").replace(/\D/g, "");
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "/ojol/kontak";
}

export const ROUTE_STOPS = [
  {
    title: "Kirim setoran atau kuis",
    body: "Rekam hafalan suara atau video langsung dari HP saat jeda order, atau kerjakan kuis pilihan ganda di web.",
  },
  {
    title: "Ditinjau guru",
    body: "Setoran masuk antrean guru/musyrif pembimbing. Guru mendengarkan, lalu menyetujui atau memberi catatan perbaikan.",
  },
  {
    title: "Progres tercatat",
    body: "Hasil tinjauan langsung tercatat di dashboard Anda — tanpa rekap manual, tanpa bolak-balik bertanya.",
  },
];

export const PRINCIPLES = [
  { title: "Terbimbing", body: "Setiap kelompok punya guru/musyrif yang meninjau, memberi catatan, dan menyetujui tiap setoran — bukan rekam lalu dibiarkan." },
  { title: "Fleksibel", body: "Tidak ada jam wajib. Setoran suara, video, atau kuis bisa dikirim kapan pun ada jeda, dari HP mana saja." },
  { title: "Konsisten", body: "Setoran rutin lebih penting dari jumlah. Dashboard membantu memantau progres hari demi hari." },
];

export const JOIN_STEPS = [
  {
    title: "Hubungi admin lewat WhatsApp",
    body: "Kirim pesan singkat berisi nama lengkap dan niat bergabung sebagai peserta (driver) atau guru pembimbing.",
  },
  {
    title: "Admin mendaftarkan akun & kelompok",
    body: "Admin membuatkan akun dan menempatkan Anda di kelompok. Anda menerima kode akun unik, mis. POM001.",
  },
  {
    title: "Masuk & lengkapi profil",
    body: "Masuk di halaman Masuk memakai kode akun (bukan email), lalu lengkapi nomor HP dan alamat di Profil.",
  },
  {
    title: "Mulai kirim setoran",
    body: "Rekam hafalan kapan pun ada waktu luang, kirim, lalu tunggu tinjauan guru pembimbing.",
  },
];

export const FAQ = [
  { q: "Bagaimana cara masuk ke Ojol Mengaji?", a: "Masuk memakai kode akun (bukan email) yang didaftarkan admin, di halaman Masuk." },
  { q: "Saya belum punya kode akun, bagaimana?", a: "Hubungi admin lewat WhatsApp untuk didaftarkan. Langkah lengkapnya ada di halaman Cara Bergabung." },
  { q: "Apa saja yang bisa dikirim sebagai setoran?", a: "Rekaman suara atau video hafalan — direkam langsung di HP atau diunggah dari file (maksimal 50 MB) — serta kuis pilihan ganda yang dikerjakan di web." },
  { q: "Bagaimana kalau setoran ditolak?", a: "Setoran yang ditolak bisa dikirim ulang. Catatan guru tersimpan di riwayat, jadi Anda tahu bagian yang perlu diperbaiki." },
  { q: "Apa beda “tepat waktu” dan “terlambat”?", a: "Setiap tugas punya tenggat. Bila guru memperpanjang tenggat, setoran di masa perpanjangan tetap diterima tetapi ditandai terlambat." },
  { q: "Lupa password, bagaimana?", a: "Password direset admin. Hubungi admin lewat WhatsApp dengan menyebutkan kode akun Anda. Setelah masuk, password bisa diganti sendiri di Profil." },
  { q: "Siapa saja yang bisa ikut program ini?", a: "Driver ojek online dan guru/musyrif yang terdaftar di LAZ Solidaritas Insan Peduli untuk program Ojol Mengaji." },
];
