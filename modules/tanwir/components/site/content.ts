// Konten situs publik Tanwir — diadaptasi dari situs lama (resources/views/*.blade.php),
// tanpa angka klaim yang tidak bisa diverifikasi (prd-tanwir §5.1).

export const SITE_NAV = [
  { href: "/tanwir/tentang", label: "Tentang" },
  { href: "/tanwir/program", label: "Program" },
  { href: "/tanwir/faq", label: "FAQ" },
  { href: "/tanwir/kontak", label: "Kontak" },
];

export function whatsappAdminHref(message = "Assalamu'alaikum, saya ingin bertanya tentang program Tanwir Qurani.") {
  const number = (process.env.NEXT_PUBLIC_TANWIR_WHATSAPP ?? process.env.NEXT_PUBLIC_SIP_WHATSAPP ?? "").replace(/\D/g, "");
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "/tanwir/kontak";
}

export const STEPS = [
  {
    title: "Kirim setoran atau kuis",
    body: "Peserta merekam hafalan langsung dari browser atau mengunggah file, dan mengerjakan kuis pilihan ganda di web.",
  },
  {
    title: "Guru meninjau",
    body: "Setiap setoran masuk ke antrean koreksi. Guru mendengarkan atau menonton, lalu menyetujui atau memberi catatan. Kuis dinilai otomatis.",
  },
  {
    title: "Progres tercatat",
    body: "Hasil koreksi langsung memperbarui dashboard, jadi perkembangan terlihat tanpa rekap manual.",
  },
];

export const ROLES = [
  {
    eyebrow: "Peserta",
    title: "Guru ngaji di TPQ",
    body: "Menyetor hafalan pribadi kepada guru pembimbing dan mencatat perkembangan santri yang mereka ajar.",
    points: ["Setoran suara & video dari browser", "Kuis pilihan ganda, nilai langsung keluar", "Catatan data & progres anak didik"],
  },
  {
    eyebrow: "Guru",
    title: "PIC kelompok",
    body: "Pembimbing yang menaungi satu atau lebih kelompok peserta dan meninjau setiap setoran.",
    points: ["Antrean koreksi dalam satu daftar", "Riwayat setiap percobaan & catatan", "Rekap tepat waktu atau terlambat"],
  },
  {
    eyebrow: "Admin",
    title: "Pengelola program",
    body: "Mengatur pondasi program: akun guru dan peserta, kelompok, serta PIC yang menaunginya.",
    points: ["Kode akun dibuat otomatis", "Pantau semua tugas lintas kelompok", "Peta sebaran guru & peserta"],
  },
];

export const VALUES = [
  { title: "Amanah", body: "Setiap setoran dan catatan progres dijaga akurat, karena menyangkut perjalanan belajar seseorang." },
  { title: "Konsisten", body: "Kebiasaan menyetor dan mengoreksi dirancang agar bisa berjalan terus, bukan hanya di awal semangat." },
  { title: "Terhubung", body: "Guru sebagai PIC tetap memantau semua kelompok binaannya tanpa harus berpindah tempat." },
  { title: "Sederhana", body: "Satu kode akun, satu login — tanpa proses rumit yang membuat peserta enggan memakai." },
];

export const FAQ: { group: string; items: { q: string; a: string }[] }[] = [
  {
    group: "Akun & login",
    items: [
      { q: "Bagaimana cara mendapatkan kode akun?", a: "Kode akun dibuat dan diberikan oleh admin LAZ SIP. Peserta dan guru baru perlu didaftarkan admin terlebih dahulu — hubungi admin lewat halaman Kontak." },
      { q: "Kenapa login memakai kode, bukan email?", a: "Supaya mudah diingat dan tidak semua peserta wajib punya email aktif. Kode dibuat otomatis sesuai peran, misalnya GTQ001 untuk guru dan PTQ001 untuk peserta." },
      { q: "Lupa password, bagaimana?", a: "Password direset oleh admin. Hubungi admin lewat WhatsApp dengan menyebutkan kode akun Anda. Setelah masuk, password bisa diganti sendiri di halaman Profil." },
    ],
  },
  {
    group: "Setoran & tugas",
    items: [
      { q: "Format setoran apa saja yang bisa dikirim?", a: "Tergantung jenis tugas dari guru: rekaman suara, video, atau kuis pilihan ganda. Rekaman bisa dibuat langsung di browser atau diunggah dari file (maksimal 50 MB)." },
      { q: "Bagaimana kalau setoran ditolak?", a: "Setoran yang ditolak bisa dikirim ulang. Setiap percobaan tercatat lengkap dengan catatan guru, jadi Anda tahu bagian mana yang perlu diperbaiki." },
      { q: "Apa beda “tepat waktu” dan “terlambat”?", a: "Penanda apakah setoran dikirim sebelum atau sesudah tenggat awal. Bila tenggat diperpanjang guru, setoran di masa perpanjangan tetap diterima namun ditandai terlambat." },
    ],
  },
  {
    group: "Kelompok & peran",
    items: [
      { q: "Apa itu PIC kelompok?", a: "Guru yang bertanggung jawab menaungi satu kelompok peserta. Satu guru bisa menjadi PIC beberapa kelompok, dan hanya melihat data peserta di kelompok yang ia naungi." },
      { q: "Peserta di sini maksudnya siapa?", a: "Guru ngaji yang aktif membina anak-anak di TPQ masing-masing. Mereka menyetor hafalan pribadi kepada guru PIC sekaligus mencatat data santri yang mereka ajar." },
    ],
  },
];
