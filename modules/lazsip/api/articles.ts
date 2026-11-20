import { apiRequest, apiCollection, ApiError } from "@/lib/api";

import type { LazsipArticle } from "@/contracts/modules/lazsipArticles";

export async function listArticles(admin = false) {
  return apiCollection<LazsipArticle>(`lazsip/${admin ? "admin/" : ""}articles`);
}
export async function getArticle(id: string, admin = false) {
  try { return await apiRequest<LazsipArticle>(`lazsip/${admin ? "admin/" : ""}articles/${encodeURIComponent(id)}`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
