export interface GoldQuote {
  value: number;
  updatedAt: string;
  exchangeUpdatedAt: string;
  stale: boolean;
}
const GRAMS_PER_TROY_OUNCE = 31.1034768;
let quote: GoldQuote | null = null;
let retryAt = 0;
let pending: Promise<GoldQuote | null> | null = null;
let fx: { rate: number; updatedAt: string; fetchedAt: number } | null = null;

export function convertGoldPrice(usdPerOunce: number, idrPerUsd: number) {
  if (!Number.isFinite(usdPerOunce) || !Number.isFinite(idrPerUsd) || usdPerOunce <= 0 || idrPerUsd <= 0) throw new Error("Invalid gold price");
  return Math.round(usdPerOunce * idrPerUsd / GRAMS_PER_TROY_OUNCE);
}

async function readJson(url: string) {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error("Price source unavailable");
  return response.json();
}

export async function getGoldQuote(): Promise<GoldQuote | null> {
  if (Date.now() < retryAt) return quote;
  if (pending) return pending;
  pending = (async () => {
    try {
      const gold = await readJson("https://api.gold-api.com/price/XAU");
      if (!fx || Date.now() - fx.fetchedAt > 3600000) {
        const rates = await readJson("https://open.er-api.com/v6/latest/USD");
        if (rates.result !== "success" || rates.base_code !== "USD" || !Number.isFinite(rates.rates?.IDR)) throw new Error("Invalid exchange rate");
        fx = { rate: rates.rates.IDR, updatedAt: new Date(rates.time_last_update_unix * 1000).toISOString(), fetchedAt: Date.now() };
      }
      const updatedAt = new Date(gold.updatedAt).toISOString();
      if (gold.symbol !== "XAU" || gold.currency !== "USD" || Date.now() - Date.parse(updatedAt) > 4 * 86400000 || Date.now() - Date.parse(fx.updatedAt) > 4 * 86400000) throw new Error("Outdated source");
      quote = { value: convertGoldPrice(gold.price, fx.rate), updatedAt, exchangeUpdatedAt: fx.updatedAt, stale: false };
      retryAt = Date.now() + 60000;
    } catch {
      quote = quote && Date.now() - Date.parse(quote.updatedAt) < 4 * 86400000 ? { ...quote, stale: true } : null;
      retryAt = Date.now() + 60000;
    }
    return quote;
  })();
  try { return await pending; } finally { pending = null; }
}

// Zero signals unavailable to the hero, which disables the maal calculation.
export async function getGoldPricePerGram(): Promise<number> {
  return (await getGoldQuote())?.value ?? 0;
}
