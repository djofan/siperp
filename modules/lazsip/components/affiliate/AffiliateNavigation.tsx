"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, UserRound, LogOut, ArrowUpRight } from "lucide-react";
import { describeApiProblem } from "@/lib/api-problem";
import styles from "./affiliate.module.css";

export function AffiliateNavigation() {
  const path = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return <><nav className={styles.navigation} aria-label="Menu affiliator">
    {[["/lazsip/affiliator", "Ringkasan", LayoutDashboard], ["/lazsip/affiliator/profil", "Profil saya", UserRound]].map(([href, label, Icon]) => {
      const Symbol = Icon as typeof LayoutDashboard;
      return <Link key={String(href)} href={String(href)} aria-current={path === href ? "page" : undefined}><Symbol size={18}/>{String(label)}</Link>;
    })}
    <Link href="/lazsip"><ArrowUpRight size={18}/>Website LAZSIP</Link>
    <button disabled={pending} onClick={async () => {
      setPending(true); setError("");
      try {
        const response = await fetch("/api/auth/logout", { method: "POST", headers: { Accept: "application/json" } });
        if (!response.ok && response.status !== 401) throw new Error(describeApiProblem(await response.json().catch(() => null), response.status));
        router.replace("/lazsip/affiliator/masuk"); router.refresh();
      } catch (failure) { setError(failure instanceof Error ? failure.message : "Gagal keluar. Coba lagi."); setPending(false); }
    }}><LogOut size={18}/>{pending ? "Keluar…" : "Keluar"}</button>
  </nav>{error && <p role="alert" className={styles.error}>{error}</p>}</>;
}
