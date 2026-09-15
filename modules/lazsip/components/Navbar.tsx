"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { lazsipSiteConfig } from "@/modules/lazsip/components/siteConfig";
import { Button } from "@/modules/lazsip/components/ui/Button";
import { LazsipMark } from "@/modules/lazsip/components/LazsipMark";
import { smoothScrollToId } from "@/modules/lazsip/components/smoothScroll";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    const id = href.replace("#", "");
    if (pathname === "/lazsip" && smoothScrollToId(id)) {
      e.preventDefault();
    } else if (pathname !== "/lazsip") {
      e.preventDefault();
      router.push(`/lazsip/${href}`);
    }
    setOpen(false);
  }

  function handleLogoClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Di beranda, klik logo/nama harus selalu balik ke paling atas (hero) —
    // bukan diam di posisi scroll section terakhir yang dikunjungi.
    if (pathname === "/lazsip") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setOpen(false);
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-full bg-white/95 px-4 py-2.5 shadow-md shadow-lazsip-primary-900/5 backdrop-blur-md sm:px-6">
        <Link href="/lazsip" onClick={handleLogoClick} className="flex items-center gap-2.5">
          <LazsipMark />
          <span className="text-lg font-extrabold tracking-tight text-lazsip-primary-900">
            {lazsipSiteConfig.name}
          </span>
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {lazsipSiteConfig.nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className="text-sm font-medium text-lazsip-primary-800/75 transition-colors hover:text-lazsip-primary-900"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="hidden lg:block">
          <Button href="/lazsip/zakat" variant="primary" className="px-5 py-2.5" onClick={() => setOpen(false)}>
            Bayar Zakat
          </Button>
        </div>

        <button
          type="button"
          aria-label="Buka menu"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-lazsip-primary-900 transition-colors lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </nav>

      {open && (
        <div className="mx-auto mt-2 max-w-6xl rounded-3xl border border-lazsip-primary-100 bg-white px-5 py-5 shadow-lg lg:hidden">
          <div className="flex flex-col gap-4">
            {lazsipSiteConfig.nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="text-sm font-medium text-lazsip-primary-800/80"
              >
                {item.label}
              </a>
            ))}
            <Button href="/lazsip/zakat" variant="primary" onClick={() => setOpen(false)}>
              Bayar Zakat
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
