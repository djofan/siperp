import Link from "next/link";
import { Icon, type IconName } from "@/modules/tanwir/components/icons";
import { whatsappAdminHref } from "@/modules/tanwir/components/site/content";
import s from "./landing.module.css";

const features:{icon:IconName;title:string;body:string;href:string;tone:string}[]=[
 {icon:"mic",title:"Setoran suara & video",body:"Rekam atau unggah hafalan, lalu kirim kepada guru pembimbing.",href:"/tanwir/program",tone:"sage"},
 {icon:"quiz",title:"Kuis pembelajaran",body:"Kerjakan soal di web dan lihat hasil penilaian secara langsung.",href:"/tanwir/program",tone:"blue"},
 {icon:"review",title:"Bimbingan yang terarah",body:"Baca catatan koreksi dan perbaiki setoran bersama guru PIC.",href:"/tanwir/program",tone:"sand"},
 {icon:"students",title:"Perkembangan anak didik",body:"Catat santri yang Anda ajar dan perkembangan belajarnya di TPQ.",href:"/tanwir/program",tone:"rose"},
];
const steps=[
 ["Hubungi admin","Sampaikan keinginan bergabung. Admin membuat akun dan mengatur kelompok Anda.","user"],
 ["Masuk dengan kode","Gunakan kode akun dan password dari admin, lalu lengkapi profil.","lock"],
 ["Mulai belajar","Buka tugas kelompok, kirim rekaman hafalan, atau kerjakan kuis.","mic"],
 ["Perbaiki & bertumbuh","Lihat hasil koreksi, ulangi jika diperlukan, dan lanjutkan latihan.","review"],
] as const;
function LearningIllustration(){return <div className={s.illustration} aria-label="Ilustrasi Al-Qur'an dan pendampingan belajar">
  <div className={s.halo}/><svg className={s.book} viewBox="0 0 480 430" fill="none" aria-hidden="true">
  <defs><linearGradient id="tq-cover" x1="100" y1="120" x2="360" y2="300" gradientUnits="userSpaceOnUse"><stop stopColor="#377449"/><stop offset="1" stopColor="#103f31"/></linearGradient><linearGradient id="tq-paper" x1="110" y1="100" x2="240" y2="290" gradientUnits="userSpaceOnUse"><stop stopColor="#fffef6"/><stop offset="1" stopColor="#e9e8d9"/></linearGradient><linearGradient id="tq-stand" x1="150" y1="300" x2="330" y2="380" gradientUnits="userSpaceOnUse"><stop stopColor="#b69b65"/><stop offset="1" stopColor="#857149"/></linearGradient></defs>
  <ellipse cx="240" cy="365" rx="140" ry="21" fill="#234634" opacity=".08"/>
  <path d="m161 283 173 86-12 13-173-84z" fill="url(#tq-stand)"/><path d="m319 283-173 86 12 13 173-84z" fill="url(#tq-stand)"/>
  <path d="m87 142 151 42 155-42-15 147-138 44-139-44z" fill="url(#tq-cover)"/>
  <path d="m104 132 134 40 138-40-10 143-127 40-126-40z" fill="#cfceb9"/>
  <path d="m105 121 133 42 138-42-10 143-127 40-126-40z" fill="url(#tq-paper)"/>
  <path d="M238 163c-39-41-84-52-133-42l8 137c44-8 85 7 126 46 36-37 80-53 127-40l10-143c-49-11-94 1-138 42Z" fill="url(#tq-paper)"/>
  <path d="m238 164 1 139" stroke="#c9c9b2" strokeWidth="2"/>
  <path d="M130 149c31-1 59 9 86 30M131 169c31 0 59 11 85 30M133 190c30 0 56 11 82 30M134 211c29 1 55 12 80 30M135 233c29 1 52 11 78 30M260 179c26-21 55-30 88-30M260 200c25-20 54-30 87-30M261 221c24-19 52-29 84-29M261 242c24-18 50-28 82-28M262 263c23-17 48-27 79-27" stroke="#99ad8f" strokeWidth="3" strokeLinecap="round" opacity=".55"/>
  <path d="m245 308 8 15 9-21" fill="#b99852"/>
  </svg>
  <div className={`${s.floatCard} ${s.cardTop}`}><span className={s.floatIcon}><Icon name="mic"/></span><div><strong>Setoran dari mana saja</strong><small>Suara atau video, lewat web</small></div></div>
  <div className={`${s.floatCard} ${s.cardRight}`}><span className={s.floatIcon}><Icon name="review"/></span><div><strong>Dibimbing guru PIC</strong><small>Ada arahan di setiap langkah</small></div></div>
  <div className={`${s.floatCard} ${s.cardBottom}`}><span className={s.floatIcon}><Icon name="tasks"/></span><div><strong>Progres tercatat</strong><small>Riwayat koreksi & hasil belajar</small></div></div>
</div>;}

export default function TanwirHomePage(){return <div className={s.landing}>
  <section className={s.hero}><div className={s.heroCopy}><p className={s.kicker}>PEMBINAAN QUR’AN UNTUK GURU NGAJI</p><h1>Menjaga hafalan.<br/>Menguatkan ilmu.<br/><em>Menebar manfaat.</em></h1><p>Ruang belajar bagi guru ngaji TPQ untuk merawat hafalan bersama pembimbing, sekaligus mencatat perkembangan santri yang mereka ajar.</p><div className={s.actions}><Link className={s.primary} href="/tanwir/masuk">Masuk dengan kode akun <Icon name="arrowRight"/></Link><Link className={s.secondary} href="/tanwir/program">Kenali program <Icon name="arrowRight"/></Link></div><p className={s.heroNote}>Belum memiliki akun? <a href={whatsappAdminHref("Assalamu'alaikum, saya ingin mengetahui cara bergabung dalam program Tanwir Qurani.")}>Hubungi admin untuk bergabung.</a></p></div><LearningIllustration/></section>
  <div className={s.organization}>
    {/* eslint-disable-next-line @next/next/no-img-element -- local institutional logo */}
    <img src="/lazsip-logo.png" alt="LAZSIP · Solidaritas Insan Peduli" width={1720} height={602}/><p>Bagian dari program pemberdayaan<br/><strong>LAZ Solidaritas Insan Peduli</strong></p><span>Belajar bersama · Bertumbuh bersama</span>
  </div>
  <section className={s.section} id="fitur"><div className={s.sectionTitle}><p className={s.kicker}>RUANG BELAJAR ANDA</p><h2>Lebih mudah belajar.<br/>Lebih terarah membimbing.</h2><p>Dari setoran pribadi sampai catatan santri, semuanya dalam satu ruang pembinaan.</p></div><div className={s.featureGrid}>{features.map(f=><article className={s.feature} data-tone={f.tone} key={f.title}><div className={s.featureArt}><Icon name={f.icon}/><span aria-hidden="true"/></div><h3>{f.title}</h3><p>{f.body}</p><Link href={f.href}>Kenali fiturnya <Icon name="arrowRight"/></Link></article>)}</div></section>
  <section className={s.band}><div><p className={s.bandKicker}>KEBIASAAN BAIK, DIDUKUNG SISTEM YANG JELAS</p><h2>Langkah kecil.<br/><em>Manfaat yang berlanjut.</em></h2><p>Pembinaan yang menghubungkan peserta, guru PIC, dan pengelola program.</p></div><div className={s.bandFacts}>{[["mic","Suara & video","Pilihan setoran hafalan"],["quiz","Kuis di web","Nilai otomatis setelah dikirim"],["history","Riwayat koreksi","Catatan untuk perbaikan"]].map(([icon,title,body])=><div key={title}><Icon name={icon as IconName}/><strong>{title}</strong><span>{body}</span></div>)}</div></section>
  <section className={s.section} id="alur"><div className={s.sectionTitle}><p className={s.kicker}>CARA BERGABUNG & BELAJAR</p><h2>Satu langkah awal.<br/>Perjalanan belajar yang berkelanjutan.</h2><p>Akun dibuatkan admin. Setelah itu, lanjutkan pembinaan sesuai tugas kelompok Anda.</p></div><ol className={s.steps}>{steps.map(([title,body,icon],i)=><li key={title}><div className={s.stepTop}><span className={s.stepNumber}>0{i+1}</span><Icon name={icon}/></div><h3>{title}</h3><p>{body}</p></li>)}</ol></section>
  <section className={s.roles} aria-labelledby="peran-tanwir"><div className={s.roleIntro}><div><p className={s.kicker}>UNTUK SIAPA?</p><h2 id="peran-tanwir">Satu program, tiga peran.</h2></div><p>Guru ngaji belajar sebagai peserta, didampingi guru PIC dan pengelola program.</p></div><div className={s.roleList}>{[
    ["Peserta","Guru ngaji TPQ","Kirim setoran, kerjakan kuis, dan catat perkembangan anak didik.","user"],
    ["Guru PIC","Pembimbing kelompok","Berikan tugas, periksa setoran, dan arahkan perbaikan peserta.","students"],
    ["Admin","Pengelola program","Atur akun dan kelompok, lalu pantau jalannya pembinaan.","tasks"],
  ].map(([title,subtitle,body,icon])=><article key={title}><div className={s.roleHeading}><span className={s.roleIcon}><Icon name={icon as IconName}/></span><div><h3>{title}</h3><small>{subtitle}</small></div></div><p>{body}</p></article>)}</div><p className={s.roleNote}>Santri yang diajar peserta dicatat sebagai anak didik; mereka tidak memerlukan akun program.</p></section>
  <section className={s.section}><div className={s.sectionTitle}><p className={s.kicker}>SEBELUM MEMULAI</p><h2>Ada yang ingin ditanyakan?</h2></div><div className={s.faq}>{[["Bagaimana mendapatkan kode akun?","Hubungi admin. Akun guru dan peserta dibuatkan oleh pengelola program, lalu peserta ditempatkan ke kelompok pembinaan."],["Apa yang terjadi setelah setoran dikirim?","Guru PIC memeriksa rekaman dan menyetujui atau memberikan catatan perbaikan. Jika perlu diulang, peserta dapat mengirim kembali selama tenggat masih terbuka."],["Bisa digunakan dari HP?","Anda bisa membuka web untuk mengerjakan tugas, mengunggah rekaman, dan melihat hasil. Perekaman langsung memerlukan izin mikrofon atau kamera pada browser."]].map(([title,body])=><details key={title}><summary>{title}<span aria-hidden="true">+</span></summary><p>{body}</p></details>)}</div><Link className={s.faqLink} href="/tanwir/faq">Lihat semua pertanyaan <Icon name="arrowRight"/></Link></section>
  <section className={s.cta}><div><p>LANJUTKAN LANGKAH BAIK ANDA</p><h2>Ilmu dirawat.<br/>Manfaat terus mengalir.</h2></div><div><p>Sudah terdaftar? Masuk untuk melanjutkan setoran dan melihat hasil bimbingan Anda.</p><Link href="/tanwir/masuk" className={s.ctaButton}>Masuk ke Tanwir Qurani <Icon name="arrowRight"/></Link></div></section>
</div>;}
