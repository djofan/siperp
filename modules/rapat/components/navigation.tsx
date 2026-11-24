"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { NotebookPen, ArrowUpRight, LogOut, ChevronDown } from 'lucide-react';
import type { Viewer } from '@/contracts/modules/rapat';
export default function Navigation({ viewer }: { viewer: Viewer }) {
  const path = usePathname(); const router = useRouter(); const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  const links = [{href:'/admin/rapat',label:'Rapat',icon:NotebookPen}];
  async function logout() { if (!window.dispatchEvent(new Event('rapat:leave',{cancelable:true}))) return; setBusy(true); try {const response=await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'});if(!response.ok) throw new Error('Belum berhasil keluar. Coba lagi.');router.replace('/admin/login');router.refresh();}catch(e){setError(e instanceof Error?e.message:'Belum berhasil keluar.');setBusy(false);} }
  return <header className="rp-header"><Link href="/admin/rapat" className="rp-brand"><span><NotebookPen size={21}/></span><div>Rapat<small>Rekam. Transkrip. Simpan.</small></div></Link><nav aria-label="Navigasi Rapat">{links.map(({href,label,icon:Icon}) => <Link key={href} href={href} aria-current={path.startsWith(href) ? 'page' : undefined}><Icon size={16}/>{label}</Link>)}</nav><div className="rp-account"><Link href="/admin" className="rp-core">Core <ArrowUpRight size={14}/></Link><details><summary><span className="rp-avatar">{viewer.name.trim().slice(0,1).toUpperCase()}</span><span className="rp-account-name">{viewer.name}<small>{{admin:'Administrator',secretary:'Sekretaris',viewer:'Pembaca'}[viewer.role]}</small></span><ChevronDown size={13}/></summary><div className="rp-account-menu"><Link href="/admin">Buka Core <ArrowUpRight size={14}/></Link><button disabled={busy} onClick={logout}><LogOut size={15}/>{busy?'Keluar…':'Keluar dari akun'}</button>{error && <p role="alert">{error}</p>}</div></details></div></header>;
}
