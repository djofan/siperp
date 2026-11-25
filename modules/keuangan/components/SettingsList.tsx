"use client";

import { useRef, useState, type ReactNode } from "react";
import { Layers, Search, Tags, Wallet, X } from "lucide-react";

type Item = { id: string; name: string; archived?: boolean };
const sections = {
  programs: { title: "Jenis program", unit: "program", icon: Layers },
  categories: { title: "Kategori pengajuan", unit: "kategori", icon: Tags },
  sources: { title: "Sumber dana", unit: "sumber dana", icon: Wallet },
};

export function SettingsList({ kind, items, children }: {
  kind: keyof typeof sections; items: Item[]; children?: ReactNode;
}) {
  const [search, setSearch] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const { title, unit, icon: Icon } = sections[kind];
  const query = search.trim().toLocaleLowerCase("id-ID");
  const filtered = items.filter(item => item.name.toLocaleLowerCase("id-ID").includes(query));
  const headingId = `finance-settings-${kind}`;

  return <section className={`finance-panel finance-settings-panel finance-settings-${kind}`} aria-labelledby={headingId}>
    <div className="finance-settings-heading">
      <div><span className="finance-settings-icon" aria-hidden="true"><Icon size={19}/></span><h2 id={headingId}>{title}</h2></div>
      <span className="finance-settings-count" role="status">{filtered.length.toLocaleString("id-ID")}{query ? ` dari ${items.length.toLocaleString("id-ID")}` : ""} {unit}</span>
    </div>
    {kind === "programs" && <div className="finance-settings-search">
      <label htmlFor="finance-program-search">Cari program</label>
      <div><Search size={17} aria-hidden="true"/><input ref={searchInput} id="finance-program-search" type="search" maxLength={255} placeholder="Ketik nama program…" value={search} onChange={event => setSearch(event.target.value)}/>{search && <button type="button" aria-label="Hapus pencarian program" onClick={() => { setSearch(""); searchInput.current?.focus(); }}><X size={17}/></button>}</div>
    </div>}
    {filtered.length ? <ul className="finance-settings-list" role="list" aria-label={`Daftar ${title.toLocaleLowerCase("id-ID")}`} tabIndex={kind === "programs" ? 0 : undefined}>
      {filtered.map(item => <li key={item.id}><span className="finance-settings-dot" aria-hidden="true"/><span className="finance-settings-name">{item.name}</span>{item.archived && <span className="finance-settings-archived">Arsip</span>}</li>)}
    </ul> : <p className="finance-settings-empty">{query ? "Program tidak ditemukan. Coba kata lain." : `Belum ada ${unit} yang tercatat.`}</p>}
    {kind === "programs" && filtered.length > 6 && <p className="finance-settings-scroll-hint">Gulir daftar untuk melihat program lainnya.</p>}
    {children && <div className="finance-settings-add">{children}</div>}
  </section>;
}
