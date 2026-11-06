import { apiRequest, ApiError } from "@/lib/api";
export interface GoldQuote { value: number; updatedAt: string; exchangeUpdatedAt: string; stale: boolean }
export async function getGoldQuote(): Promise<GoldQuote | null> {
  try {
    const result = await apiRequest<{ quote: GoldQuote & { updatedAt: string | Date; exchangeUpdatedAt: string | Date } }>("lazsip/gold-price");
    const quote = result.quote;
    return quote ? { ...quote, updatedAt: new Date(quote.updatedAt).toISOString(), exchangeUpdatedAt: new Date(quote.exchangeUpdatedAt).toISOString() } : null;
  } catch (error) { if (error instanceof ApiError && error.status === 503) return null; throw error; }
}
export async function getGoldPricePerGram() { return (await getGoldQuote())?.value ?? 0; }
