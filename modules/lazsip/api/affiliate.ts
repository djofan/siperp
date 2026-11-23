import "server-only";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { apiRequest, ApiError } from "@/lib/api";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { LazsipAffiliate } from "@/contracts/modules/lazsip";

export async function getAffiliate(): Promise<LazsipAffiliate | null> {
  if (!(await cookies()).has(SESSION_COOKIE_NAME)) return null;
  try { return await apiRequest<LazsipAffiliate>("lazsip/affiliate/me"); }
  catch (error) {
    if (error instanceof ApiError && [401, 403].includes(error.status)) return null;
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}
export async function requireAffiliate() {
  const affiliate = await getAffiliate();
  if (!affiliate) redirect("/lazsip/affiliator/masuk");
  return affiliate;
}
