"use client";

import { useState, type FormEvent } from "react";
import { LayoutGrid, Table2, Search, SlidersHorizontal, X, RotateCcw, CalendarDays, UsersRound, Wallet } from "lucide-react";
import type { BantuanStaff, BantuanViewer } from "@/contracts/modules/bantuan";
import { bantuanStatuses } from "@/contracts/modules/bantuan";
import { activeFilterChips, advancedKeys, dateLabels, defaultFilters, sortLabels, sourceLabels, validateFilters, type FilterKey, type ListFilters } from "../list-filters";
import s from "./ListTools.module.css";

export function ApplicationFilters({filters,onChange,viewer,staff,programs,regions,states,view,onViewChange}:{filters:ListFilters;onChange:(value:ListFilters)=>void;viewer:BantuanViewer;staff:BantuanStaff[];programs:string[];regions:string[];states:string[];view:"cards"|"table";onViewChange:(value:"cards"|"table")=>void}){
  const [expanded,setExpanded]=useState(false),[draft,setDraft]=useState(filters),[error,setError]=useState("");
  const names=Object.fromEntries(staff.map(person=>[person.id,person.name]));
  const chips=activeFilterChips(filters,names),advancedCount=chips.filter(chip=>advancedKeys.includes(chip.key)).length;
  const update=(key:FilterKey,value:string)=>onChange({...filters,[key]:value});
  const field=(key:FilterKey,value:string)=>setDraft(current=>({...current,[key]:value,...(key==="amountState"&&value==="unset"?{amountMin:"",amountMax:""}:{})}));
  function apply(event:FormEvent){event.preventDefault();const next={...filters,...Object.fromEntries(advancedKeys.map(key=>[key,draft[key]]))};const issue=validateFilters(next);if(issue){setError(issue);return;}onChange(next);setExpanded(false);setError("");}
  function period(days:number){const to=new Date(),from=new Date(to);from.setDate(from.getDate()-days+1);const local=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;setDraft(current=>({...current,from:local(from),to:local(to)}));}
  const personOptions=(role?:string)=>staff.filter(person=>!role||(person.roles??[person.role]).includes(role));
  return <div className={s.tools}>
    <div className={s.quickFilters}>
      <label className={s.search}><Search size={17}/><input type="search" maxLength={191} aria-label="Cari pengajuan" placeholder="Cari nama atau nomor pengajuan…" value={filters.search} onChange={e=>update("search",e.target.value)}/></label>
      <label className={s.quickSelect}><span>Status pengajuan</span><select aria-label="Filter status" value={filters.status} onChange={e=>update("status",e.target.value)}><option value="">{states.length?"Semua pada tahap ini":"Semua status"}</option>{Object.entries(bantuanStatuses).filter(([key])=>!states.length||states.includes(key)).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label className={s.quickSelect}><span>Program bantuan</span><select aria-label="Filter program" value={filters.program} onChange={e=>update("program",e.target.value)}><option value="">Semua program</option>{programs.map(program=><option key={program}>{program}</option>)}</select></label>
      <button type="button" className={`${s.filterButton} ${expanded?s.filterOpen:""}`} aria-expanded={expanded} aria-controls="application-advanced-filters" onClick={()=>{if(!expanded){setDraft(filters);setError("");}setExpanded(current=>!current);}}><SlidersHorizontal size={16}/>Filter lainnya{advancedCount>0&&<b>{advancedCount}</b>}</button>
    </div>
    {expanded&&<form id="application-advanced-filters" className={s.advanced} onSubmit={apply}>
      <div className={s.advancedHeading}><div><h3>Persempit pencarian pengajuan</h3><p>Kombinasikan filter sesuai kebutuhan. Hasil tetap mengikuti menu dan akses akun Anda.</p></div><button type="button" className={s.iconButton} aria-label="Tutup filter lanjutan" onClick={()=>setExpanded(false)}><X size={17}/></button></div>
      <div className={s.filterColumns}>
        <fieldset><legend><CalendarDays size={16}/>Periode & sumber</legend>
          <label>Dasar tanggal<select value={draft.dateField} onChange={e=>field("dateField",e.target.value)}>{Object.entries(dateLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
          <div className={s.pair}><label>Dari tanggal<input type="date" value={draft.from} onChange={e=>field("from",e.target.value)}/></label><label>Sampai tanggal<input type="date" value={draft.to} min={draft.from||undefined} onChange={e=>field("to",e.target.value)}/></label></div>
          <div className={s.presets}>{[1,7,30].map(days=><button key={days} type="button" onClick={()=>period(days)}>{days===1?"Hari ini":`${days} hari terakhir`}</button>)}<button type="button" onClick={()=>setDraft(current=>({...current,from:"",to:""}))}>Semua waktu</button></div>
          <label>Sumber pengajuan<select value={draft.source} onChange={e=>field("source",e.target.value)}><option value="">Semua sumber</option>{Object.entries(sourceLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
          {regions.length>0&&<label>Wilayah pengajuan<select value={draft.region} onChange={e=>field("region",e.target.value)}><option value="">Semua wilayah</option>{regions.map(region=><option key={region}>{region}</option>)}</select></label>}
        </fieldset>
        <fieldset><legend><UsersRound size={16}/>Petugas & penyaluran</legend>
          {([{key:"verifierId",label:"Verifikator survei",role:"verifier"},{key:"distributorId",label:"Penyalur bantuan",role:"verifier"},{key:"createdBy",label:"Pembuat pengajuan",role:undefined}] as const).map(item=><label key={item.key}>{item.label}<select value={draft[item.key]} onChange={e=>field(item.key,e.target.value)}><option value="">Semua petugas</option><option value="me">Saya sendiri</option>{item.key!=="createdBy"&&<option value="unassigned">Belum ditugaskan</option>}{personOptions(item.role).map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label>)}
          <label>Jalur penyaluran<select value={draft.distributionType} onChange={e=>field("distributionType",e.target.value)}><option value="">Semua jalur</option><option value="verifier">Melalui verifikator</option><option value="direct">Bendahara langsung</option></select></label>
        </fieldset>
        <fieldset><legend><Wallet size={16}/>Nominal & tindak lanjut</legend>
          <label>Penetapan nominal<select value={draft.amountState} onChange={e=>field("amountState",e.target.value)}><option value="">Semua nominal</option><option value="set">Sudah ditetapkan</option><option value="unset">Belum ditetapkan</option></select></label>
          <div className={s.pair}><label>Minimal (Rp)<input type="number" disabled={draft.amountState==="unset"} min={0} step={1} max={999999999999} placeholder="Tanpa batas" value={draft.amountMin} onChange={e=>field("amountMin",e.target.value)}/></label><label>Maksimal (Rp)<input type="number" disabled={draft.amountState==="unset"} min={0} step={1} max={999999999999} placeholder="Tanpa batas" value={draft.amountMax} onChange={e=>field("amountMax",e.target.value)}/></label></div>
          <label className={s.checkLabel}><input type="checkbox" checked={draft.overdue==="1"} onChange={e=>field("overdue",e.target.checked?"1":"")}/><span>Penyerahan melewati batas waktu<small>Dana sudah dicairkan lebih dari {viewer.settings.distributionDays} hari dan bantuan belum diserahkan.</small></span></label>
        </fieldset>
      </div>
      {error&&<p className={s.error} role="alert">{error}</p>}
      <div className={s.advancedActions}><button type="button" className={s.reset} onClick={()=>{setDraft({...defaultFilters,search:filters.search,status:filters.status,program:filters.program});setError("");}}><RotateCcw size={14}/>Reset filter lanjutan</button><div><button type="button" className={s.cancel} onClick={()=>setExpanded(false)}>Batal</button><button type="submit" className={s.apply}>Terapkan filter</button></div></div>
    </form>}
    {chips.length>0&&<div className={s.chips} aria-label="Filter aktif"><span>{chips.length} filter aktif</span>{chips.map(chip=><button type="button" key={chip.key} title={chip.label} onClick={()=>update(chip.key,defaultFilters[chip.key])} aria-label={`Hapus filter ${chip.label}`}>{chip.label}<X size={12}/></button>)}<button type="button" className={s.clearAll} onClick={()=>onChange({...defaultFilters})}>Reset semua</button></div>}
    <div className={s.displayBar}><span className={s.scopeHint}>{states.length?"Menampilkan pengajuan pada tahap ini":"Menampilkan seluruh tahap sesuai akses Anda"}</span><div className={s.displayActions}><label className={s.sort}>Urutkan<select aria-label="Urutan pengajuan" value={filters.sort} onChange={e=>update("sort",e.target.value)}>{Object.entries(sortLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><div className={s.viewSwitch} role="group" aria-label="Tampilan daftar"><button type="button" aria-pressed={view==="cards"} onClick={()=>onViewChange("cards")}><LayoutGrid size={16}/>Kartu</button><button type="button" aria-pressed={view==="table"} onClick={()=>onViewChange("table")}><Table2 size={16}/>Tabel</button></div></div></div>
  </div>;
}
