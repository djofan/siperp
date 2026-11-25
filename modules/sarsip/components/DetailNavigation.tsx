"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

function sectionFor(path: string) {
  return path.split("/")[2] || "campaign";
}
function safeSource(value: string | null) {
  return value && /^\/sarsip(?:[/?#]|$)/.test(value) ? value : null;
}
export function SarsipDetailLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} onClick={event => {
    props.onClick?.(event);
    if (event.defaultPrevented) return;
    const destination = new URL(String(props.href), window.location.origin);
    if (destination.origin !== window.location.origin) return;
    const source = window.location.pathname === "/sarsip"
      ? `/sarsip#${sectionFor(destination.pathname)}`
      : `${window.location.pathname}${window.location.search}${window.location.hash}`;
    try { sessionStorage.setItem(`sarsip:return:${destination.pathname}`, source); } catch { /* Navigation remains available without browser storage. */ }
  }}/>;
}
export function DetailBackLink({ kind }: { kind: string }) {
  const router = useRouter();
  const fallback = `/sarsip#${kind}`;
  const label = kind === "penerima-manfaat" ? "bantuan" : kind;
  return <Link href={fallback} onClick={event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    let source: string | null = null;
    try { source = safeSource(sessionStorage.getItem(`sarsip:return:${window.location.pathname}`)); } catch { /* Use the section fallback. */ }
    event.preventDefault();
    router.push(source || fallback);
  }}>← Kembali ke {label}</Link>;
}
