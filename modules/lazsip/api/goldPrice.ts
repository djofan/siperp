/**
 * Harga emas per gram untuk Kalkulator Zakat. Sumber API real-time belum diputuskan
 * (docs/prd-lazsip.md §8 pertanyaan terbuka) — untuk sekarang pakai nilai stub yang
 * di-cache in-memory, gampang diganti ke pemanggilan API asli begitu providernya dipilih
 * tanpa mengubah pemanggil (modules/lazsip/zakat.ts hanya import getGoldPricePerGram).
 */
const STUB_PRICE_PER_GRAM = 1_200_000; // IDR, placeholder
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 jam

let cachedPrice: { value: number; fetchedAt: number } | null = null;

export async function getGoldPricePerGram(): Promise<number> {
  if (cachedPrice && Date.now() - cachedPrice.fetchedAt < CACHE_DURATION_MS) {
    return cachedPrice.value;
  }

  // TODO: ganti dengan fetch ke API harga emas asli begitu provider diputuskan.
  const value = STUB_PRICE_PER_GRAM;
  cachedPrice = { value, fetchedAt: Date.now() };
  return value;
}
