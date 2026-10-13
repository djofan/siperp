"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import styles from "./ModuleTransition.module.css";

const MODULES = new Set(["lazsip", "sip", "sarsip", "academy", "tanwir", "ojol"]);

export function ModuleTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const section = pathname.split("/")[2] ?? "";
  const moduleKey = MODULES.has(section) ? section : "core";
  const container = useRef<HTMLDivElement>(null);
  const previousModule = useRef(moduleKey);

  useLayoutEffect(() => {
    if (previousModule.current === moduleKey) return;
    previousModule.current = moduleKey;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const element = container.current?.querySelector("main");
    if (!element?.animate) return;
    const animation = element.animate(
      [{ transform: "translateY(2px)" }, { transform: "translateY(0)" }],
      { duration: 420, easing: "cubic-bezier(0.25, 0.1, 0.25, 1)" },
    );
    return () => animation.cancel();
  }, [moduleKey]);

  // Keep children mounted: transitions must not reset forms or shell state.
  return <div ref={container} className={styles.container}>{children}</div>;
}
