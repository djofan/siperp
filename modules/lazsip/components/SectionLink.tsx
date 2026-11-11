"use client";

import type { ComponentProps } from "react";
import { smoothScrollToId } from "./smoothScroll";

export function SectionLink({ href, children, ...props }: Omit<ComponentProps<"a">, "href" | "onClick"> & { href: `#${string}` }) {
  return <a {...props} href={href} onClick={event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (smoothScrollToId(href.slice(1))) event.preventDefault();
  }}>{children}</a>;
}
