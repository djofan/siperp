"use client";
import { linkButton } from "./ui";
export function PrintButton() { return <button onClick={() => window.print()} className={`${linkButton} print:hidden`}>Cetak / simpan PDF</button>; }
