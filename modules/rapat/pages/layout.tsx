import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { apiRequest, ApiError } from '@/lib/api';
import type { Viewer } from '@/contracts/modules/rapat';
import { ViewerContext } from '../components/context';
import '../workspace.css';
import Navigation from '../components/navigation';
export default async function Layout({ children }: { children: ReactNode }) {
  if (!await getSession()) redirect('/admin/login');
  let viewer: Viewer;
  try { viewer = await apiRequest<Viewer>('rapat/viewer'); }
  catch (error) { if (error instanceof ApiError && error.status === 401) redirect('/admin/login'); return <div className="rapat"><section className="rp-card"><h1>Rapat belum dapat dibuka</h1><p>{error instanceof ApiError && error.status === 403 ? 'Akun Anda belum memiliki akses ke workspace Rapat. Hubungi admin.' : 'Layanan Rapat belum tersedia. Coba kembali beberapa saat lagi.'}</p><Link href="/admin">Kembali ke Core</Link></section></div>; }
  return <ViewerContext value={viewer}><div className="rapat"><Navigation viewer={viewer}/><main className="rp-main">{children}</main></div></ViewerContext>;
}
