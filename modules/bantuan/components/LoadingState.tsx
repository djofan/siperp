import s from "./LoadingState.module.css";

export function LoadingState({label="Memuat data…",variant="list"}:{label?:string;variant?:"list"|"detail"|"cards"}){
  return <div className={s.loading} role="status" aria-live="polite" aria-label={label}>
    <span className={s.srOnly}>{label}</span>
    <div className={s.caption} aria-hidden="true"><span className={s.dot}/>{label}</div>
    {variant==="list"?<div className={s.table} aria-hidden="true"><div className={s.tableHead}>{[0,1,2,3].map(i=><span key={i}/>)}</div>{[0,1,2,3].map(i=><div className={s.row} key={i}><div><span/><span/></div><span/><span/><span/></div>)}</div>:variant==="cards"?<div className={s.cards} aria-hidden="true">{[0,1,2].map(i=><div key={i}><span/><span/><span/></div>)}</div>:<div className={s.detail} aria-hidden="true"><span/><span/><div>{[0,1,2,3,4,5].map(i=><span key={i}/>)}</div></div>}
  </div>;
}
