"use client";
import { useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import styles from "./OutletStrip.module.css";
export function OutletStrip({children,count}:{children:ReactNode;count:number}) {
  const [paused,setPaused]=useState(false);
  return <div className={styles.root}>
    {count>1&&<button type="button" className={styles.control} aria-pressed={paused} onClick={()=>setPaused(value=>!value)}>{paused?<Play size={13}/>:<Pause size={13}/>} {paused?"Jalankan":"Jeda"}</button>}
    <div className={styles.viewport} tabIndex={0} role="region" aria-label="Daftar outlet layanan, geser untuk melihat outlet lainnya">
      <div className={styles.track} data-paused={paused} data-running={count>1} style={{animationDuration:`${Math.max(55,count*12)}s`}}>
        <div className={styles.group}>{children}</div>
        {count>1&&<div className={styles.group} aria-hidden="true" inert>{children}</div>}
      </div>
    </div>
  </div>;
}
