'use client';
import { useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react';
import { RequestError } from '../api/client';
import { fieldLabel } from '../api/workflow';
export function ErrorNotice({ error }: { error: Error | string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) ref.current?.focus(); }, [error]);
  if (!error) return null;
  const fields = error instanceof RequestError ? Object.entries(error.fields) : [];
  return <div ref={ref} tabIndex={-1} className="rp-error" role="alert"><AlertCircle size={18}/><div><strong>{typeof error === 'string' ? error : error.message}</strong>{fields.length > 0 && <ul>{fields.map(([field,messages]) => <li key={field}><strong>{fieldLabel(field)}:</strong> {messages.join(' ')}</li>)}</ul>}</div></div>;
}
export function Success({ children }: { children: React.ReactNode }) { return <div className="rp-success" role="status"><CheckCircle2 size={17}/>{children}</div>; }
export function Loading({ text = 'Memuat…' }: { text?: string }) { return <div className="rp-loading" role="status"><LoaderCircle className="rp-spin" size={18}/>{text}</div>; }
export const asError = (error: unknown) => error instanceof Error ? error : new Error('Permintaan belum berhasil. Silakan coba lagi.');
