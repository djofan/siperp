/**
 * Harga emas per gram (24k) untuk Kalkulator Zakat Maal, dari goldapi.io — di-cache
 * in-memory 1 jam supaya tidak boros quota API (harga emas tidak perlu real-time
 * sampai ke detik, kalkulator zakat cukup akurat dengan update per jam).
 *
 * Kalau GOLDAPI_KEY belum di-set, atau goldapi.io lagi down/quota habis: fallback ke
 * harga terakhir yang berhasil diambil (meski cache-nya sudah kedaluwarsa), atau kalau
 * belum pernah berhasil sama sekali, pakai nilai stub — supaya kalkulator zakat TIDAK
 * PERNAH error ke pengguna publik hanya karena API pihak ketiga bermasalah.
 */
const STUB_PRICE_PER_GRAM = 1_200_000; // IDR, dipakai kalau goldapi.io belum pernah berhasil sama sekali
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 jam
const GOLDAPI_URL = "https://www.goldapi.io/api/XAU/IDR";

let lastKnownGoodPrice: { value: number; fetchedAt: number } | null = null;

async function fetchGoldPriceFromApi(apiKey: string): Promise<number | null> {
  try {
    const response = await fetch(GOLDAPI_URL, {
      headers: { "x-access-token": apiKey, "Content-Type": "application/json" },
      // goldapi.io update harganya per menit — timeout pendek supaya tidak menahan
      // request kalkulator zakat kalau providernya lambat merespons.
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;

    const data = await response.json();
    const pricePerGram24k = Number(data?.price_gram_24k);
    return Number.isFinite(pricePerGram24k) && pricePerGram24k > 0 ? Math.round(pricePerGram24k) : null;
  } catch {
    return null;
  }
}

export async function getGoldPricePerGram(): Promise<number> {
  if (lastKnownGoodPrice && Date.now() - lastKnownGoodPrice.fetchedAt < CACHE_DURATION_MS) {
    return lastKnownGoodPrice.value;
  }

  const apiKey = process.env.GOLDAPI_KEY;
  if (apiKey) {
    const fresh = await fetchGoldPriceFromApi(apiKey);
    if (fresh !== null) {
      lastKnownGoodPrice = { value: fresh, fetchedAt: Date.now() };
      return fresh;
    }
  }

  // API gagal/tidak ada key — pakai harga terakhir yang pernah berhasil (biar sedikit basi
  // daripada langsung lompat ke stub), atau stub kalau belum pernah berhasil sama sekali.
  return lastKnownGoodPrice?.value ?? STUB_PRICE_PER_GRAM;
}
