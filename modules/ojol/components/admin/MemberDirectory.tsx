"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Icon } from "@/modules/ojol/components/icons";
import { Avatar } from "@/modules/ojol/components/ui";
import { DirectorySummary } from "./DirectorySummary";

export interface DirectoryMember {
  id: string; name: string; code: string | null; phone: string | null;
  teachingPlace: string | null; groups: string[]; active: boolean; count: number;
  activeControl: ReactNode; deleteControl: ReactNode;
}

export function MemberDirectory({ members, role, initialQuery = "" }: { members: DirectoryMember[]; role: "guru" | "peserta"; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState("all");
  const [group, setGroup] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const active = members.filter(member => member.active).length;
  const groups = [...new Set(members.flatMap(member => member.groups))].sort((a,b) => a.localeCompare(b,"id"));
  const filtered = members.filter(member => {
    const search = `${member.name} ${member.code ?? ""} ${member.phone ?? ""}`.toLocaleLowerCase("id");
    return search.includes(query.trim().toLocaleLowerCase("id")) && (status === "all" || member.active === (status === "active")) && (!group || member.groups.includes(group));
  });
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * pageSize;
  const visible = filtered.slice(start,start + pageSize);
  const label = role === "guru" ? "guru" : "peserta";
  const countLabel = role === "guru" ? "tugas" : "setoran";
  const base = `/admin/ojol/${role}`;
  return <div className="space-y-5">
    <DirectorySummary items={[
      { label: `Total ${label}`, value: members.length, detail: role === "guru" ? "Guru pembimbing terdaftar" : "Driver terdaftar", icon: "user" },
      { label: "Aktif", value: active, detail: `${members.length ? Math.round(active / members.length * 100) : 0}% dari total ${label}`, icon: "check" },
      { label: role === "guru" ? "Nonaktif" : "Kelompok", value: role === "guru" ? members.length - active : groups.length, detail: role === "guru" ? "Akun guru nonaktif" : groups.length === 1 ? groups[0] : "Kelompok pembinaan", icon: "map" },
      { label: `Total ${countLabel}`, value: members.reduce((sum,member) => sum + member.count,0), detail: `Dari ${members.length} ${label}`, icon: "tasks" },
    ]} />
    <section className="directory-panel" aria-label={`Daftar ${label}`}>
      <div className="directory-toolbar">
        <label className="directory-search"><Icon name="search" className="h-4 w-4" /><input value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Cari nama, kode, atau nomor HP" aria-label={`Cari ${label}`} /></label>
        <div className="directory-filters" aria-label="Status akun">{[
          { value: "all", label: "Semua", count: members.length }, { value: "active", label: "Aktif", count: active }, { value: "inactive", label: "Nonaktif", count: members.length - active },
        ].map(item => <button key={item.value} type="button" aria-pressed={status === item.value} onClick={() => { setStatus(item.value); setPage(1); }}>{item.label} · {item.count}</button>)}</div>
        {role === "peserta" && <select value={group} onChange={event => { setGroup(event.target.value); setPage(1); }} aria-label="Filter kelompok" className="directory-group-filter"><option value="">Semua kelompok</option>{groups.map(name => <option key={name}>{name}</option>)}</select>}
        <span className="ml-auto text-xs text-ojol-muted">{filtered.length} {label}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="directory-table"><thead><tr><th>{role === "guru" ? "Guru" : "Peserta"}</th><th>Kode</th>{role === "peserta" && <th>Kelompok</th>}<th>No. HP</th><th>{countLabel}</th><th>Status</th><th className="text-right">Aksi</th></tr></thead>
          <tbody>{visible.map(member => <tr key={member.id}>
            <td><div className="flex items-center gap-3"><Avatar name={member.name} size={36} /><div><Link href={`${base}/${member.id}`} className="font-medium hover:text-ojol-primary">{member.name}</Link>{member.teachingPlace && <p className="text-xs text-ojol-muted">{member.teachingPlace}</p>}</div></div></td>
            <td data-label="Kode"><span className="directory-code">{member.code ?? "—"}</span></td>
            {role === "peserta" && <td data-label="Kelompok">{member.groups.length ? member.groups.map(name => <span key={name} className="directory-group">{name}</span>) : "—"}</td>}
            <td data-label="No. HP" className="whitespace-nowrap tabular-nums">{member.phone ?? "—"}</td><td data-label={countLabel} className="whitespace-nowrap text-ojol-muted">{member.count} {countLabel}</td>
            <td data-label="Status"><div className="flex items-center gap-2">{member.activeControl}</div></td>
            <td data-label="Aksi"><div className="flex items-center justify-end gap-2"><Link href={`${base}/${member.id}`} className="directory-icon-button" aria-label={`Ubah ${member.name}`} title="Ubah"><Icon name="edit" className="h-4 w-4" /></Link>{member.deleteControl}</div></td>
          </tr>)}</tbody>
        </table>
        {!visible.length && <p role="status" className="px-6 py-10 text-sm text-ojol-muted">{members.length ? "Tidak ada yang cocok dengan filter." : `Belum ada ${label}.`}</p>}
      </div>
      <footer className="directory-footer"><p>Menampilkan {filtered.length ? start + 1 : 0}–{Math.min(start + pageSize, filtered.length)} dari {filtered.length} {label}</p><div className="flex items-center gap-2"><button type="button" className="directory-icon-button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Halaman sebelumnya"><Icon name="arrowLeft" className="h-4 w-4" /></button><span className="directory-page" aria-label={`Halaman ${currentPage} dari ${pages}`}>{currentPage}</span><button type="button" className="directory-icon-button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} aria-label="Halaman berikutnya"><Icon name="chevronRight" className="h-4 w-4" /></button></div></footer>
    </section>
  </div>;
}
