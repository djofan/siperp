import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import type { Meeting } from '@/contracts/modules/rapat';
import PrintDocument from '../components/print-document';
import PrintButton from '../components/print-button';
export default async function Print({ params }: { params: Promise<{id:string}> }) {
  if (!await getSession()) redirect('/admin/login');
  const {id} = await params;
  let meeting: Meeting;
  try { meeting = JSON.parse(JSON.stringify(await apiRequest<Meeting>(`rapat/meetings/${encodeURIComponent(id)}`))); }
  catch {return <section className="rp-card"><h1>Dokumen belum dapat dibuka</h1><p>Periksa akses Anda atau coba lagi.</p><Link href="/admin/rapat">Kembali ke arsip</Link></section>;}
  return <><div className="rp-print-tools"><Link href={`/admin/rapat/${encodeURIComponent(id)}`}>← Kembali ke rapat</Link><PrintButton/></div><PrintDocument meeting={meeting}/></>;
}
