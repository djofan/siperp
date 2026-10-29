import { Workspace } from "@/modules/bantuan/components/Workspace";
import { apiRequest } from "@/lib/api";
import { redirect, notFound } from "next/navigation";
import { canViewRoute, homeByRole, href } from "@/modules/bantuan/policy";
import type { AidDetail, BantuanViewer } from "@/contracts/modules/bantuan";

export default async function Page({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const viewer = await apiRequest<BantuanViewer>("bantuan/viewer");
  if(!canViewRoute(viewer,path))redirect(href(homeByRole[viewer.role]));
  if(path[0]==="pengajuan"&&path[1]&&!["baru","langsung"].includes(path[1])){
    const row=await apiRequest<AidDetail>(`bantuan/applications/${encodeURIComponent(path[1])}`);
    if(path[2]==="edit"&&(!["draft","needs_data","screening"].includes(row.status)||(viewer.role==="verifier"&&row.createdBy!==viewer.id)))notFound();
  }
  return <Workspace key={`${path.join("/")}:${viewer.role}`} route={path} initialViewer={viewer} />;
}
