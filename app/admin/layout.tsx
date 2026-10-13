import type { ReactNode } from "react";
import { ModuleTransition } from "@/components/admin-shell/ModuleTransition";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <ModuleTransition>{children}</ModuleTransition>;
}
