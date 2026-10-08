"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/modules/tanwir/components/icons";

export function DirectoryTable({ columns, rows, label, placeholder = "Cari...", initialQuery = "", filters }: {
  columns: string[]; rows: { id: string; search: string; cells: ReactNode[] }[];
  label: string; placeholder?: string; initialQuery?: string; filters?: ReactNode;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);
  const size = 10;
  const filtered = rows.filter(row => row.search.toLocaleLowerCase("id").includes(query.trim().toLocaleLowerCase("id")));
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page,pages);
  const start = (current - 1) * size;
  return <section className="directory-panel" aria-label={`Daftar ${label}`}>
    <div className="directory-toolbar"><label className="directory-search"><Icon name="search" className="h-4 w-4" /><input value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} aria-label={`Cari ${label}`} placeholder={placeholder} /></label>{filters}<span className="ml-auto text-xs text-tanwir-muted">{filtered.length} {label}</span></div>
    <div className="overflow-x-auto"><table className="directory-table"><thead><tr>{columns.map((column,index) => <th key={column} className={index === columns.length - 1 ? "text-right" : undefined}>{column}</th>)}</tr></thead><tbody>{filtered.slice(start,start + size).map(row => <tr key={row.id}>{row.cells.map((cell,index) => <td key={columns[index]} data-label={columns[index]}>{cell}</td>)}</tr>)}</tbody></table>{!filtered.length && <p role="status" className="px-6 py-10 text-sm text-tanwir-muted">{query ? "Tidak ada yang cocok dengan pencarian." : `Belum ada ${label} untuk filter ini.`}</p>}</div>
    <footer className="directory-footer"><p>Menampilkan {filtered.length ? start + 1 : 0}–{Math.min(start + size,filtered.length)} dari {filtered.length} {label}</p><div className="flex items-center gap-2"><button type="button" className="directory-icon-button" disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="Halaman sebelumnya"><Icon name="arrowLeft" className="h-4 w-4" /></button><span className="directory-page" aria-label={`Halaman ${current} dari ${pages}`}>{current}</span><button type="button" className="directory-icon-button" disabled={current === pages} onClick={() => setPage(current + 1)} aria-label="Halaman berikutnya"><Icon name="chevronRight" className="h-4 w-4" /></button></div></footer>
  </section>;
}
