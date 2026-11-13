import { academyServerHref } from "@/modules/academy/pwa/server-navigation";
import { redirect } from "next/navigation";
export default async function Page() { redirect(await academyServerHref("/academy/materi")); }
