"use client";
import { DashboardChrome } from "../DashboardChrome";
import type { AcademyNavGroup } from "./AcademySidebar";
export function AcademyAdminShellChrome({ groups, userName, children }: { groups: AcademyNavGroup[]; userName: string; children: React.ReactNode }) {
  return <DashboardChrome groups={groups} userName={userName} role="Admin">{children}</DashboardChrome>;
}
