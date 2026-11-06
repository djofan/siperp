import "server-only";
import { apiRequest, ApiError } from "@/lib/api";
import { notFound } from "next/navigation";

export async function academyPage<T>(path: string): Promise<T> {
  try { return await apiRequest<T>(path); }
  catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); throw error; }
}
