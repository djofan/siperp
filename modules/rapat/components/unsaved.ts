'use client';
import { useEffect } from 'react';
export function useUnsavedGuard(pending: boolean) {
  useEffect(() => {
    if (!pending) return;
    const ask = () => window.confirm('Ada tulisan atau rekaman yang belum tersimpan. Tetap tinggalkan halaman?');
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const link = (event: MouseEvent) => { const anchor = event.target instanceof Element ? event.target.closest('a') : null; if (anchor && !anchor.hasAttribute('download') && anchor.target !== '_blank' && !ask()) { event.preventDefault(); event.stopPropagation(); } };
    const leave = (event: Event) => { if (!ask()) event.preventDefault(); };
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    const traverse = (event: Event) => { if ((event as Event & { navigationType?: string }).navigationType === 'traverse' && !ask()) event.preventDefault(); };
    window.addEventListener('beforeunload', unload); document.addEventListener('click', link, true); window.addEventListener('rapat:leave', leave); navigation?.addEventListener('navigate', traverse);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', link, true); window.removeEventListener('rapat:leave', leave); navigation?.removeEventListener('navigate', traverse); };
  }, [pending]);
}
