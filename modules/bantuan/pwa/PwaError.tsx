"use client";
import Link from "next/link";
import s from "./Pwa.module.css";
export function PwaError({reset}:{reset:()=>void}){return <main className={s.gate}><h1>Aplikasi belum dapat dimuat</h1><p>Periksa koneksi internet dan pastikan layanan Bantuan tersedia, lalu coba lagi.</p><button className={s.primary} onClick={reset}>Coba lagi</button><Link href="/bantuan-app/login">Kembali ke login</Link></main>;}
