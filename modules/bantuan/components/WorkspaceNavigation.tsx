"use client";
import NextLink from "next/link";
import { useRouter as useNextRouter } from "next/navigation";
import { createContext, useContext, useMemo, type ComponentProps, type ReactNode } from "react";
import { workspaceHref } from "../workspace-routing";

const MobileWorkspace = createContext(false);
export function WorkspaceNavigation({children}:{children:ReactNode}) {
  return <MobileWorkspace.Provider value>{children}</MobileWorkspace.Provider>;
}
export default function WorkspaceLink(props:ComponentProps<typeof NextLink>) {
  const mobile=useContext(MobileWorkspace);
  const href=typeof props.href==="string"?workspaceHref(props.href,mobile):props.href;
  return <NextLink {...props} href={href}/>;
}
export function useWorkspaceRouter() {
  const router=useNextRouter(),mobile=useContext(MobileWorkspace);
  return useMemo(()=>({...router,
    push:(href:string,options?:Parameters<typeof router.push>[1])=>router.push(workspaceHref(href,mobile),options),
    replace:(href:string,options?:Parameters<typeof router.replace>[1])=>router.replace(workspaceHref(href,mobile),options),
    prefetch:(href:string,options?:Parameters<typeof router.prefetch>[1])=>router.prefetch(workspaceHref(href,mobile),options),
  }),[router,mobile]);
}
