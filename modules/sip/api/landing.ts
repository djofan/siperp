import { getMergedSiteContent, isSectionVisible, splitLines } from "@/modules/sip/api/siteContent";

/** Jangkauan disembunyikan otomatis kalau admin belum mengisi angka/daftar kota sama sekali. */
export function jangkauanHasData(content: Record<string, string>) {
  return (
    Number(content.verifikatorCount) > 0 ||
    Number(content.kotaCount) > 0 ||
    Number(content.provinsiCount) > 0 ||
    splitLines(content.kotaList).length > 0
  );
}

/**
 * Anchor section landing page yang sedang disembunyikan admin (toggle "Tampilkan di landing
 * page" mati). Dipakai Navbar & Footer supaya tidak ada menu yang mengarah ke section kosong.
 */
export async function getHiddenLandingAnchors(): Promise<string[]> {
  const [tentang, program, berita, jangkauan, laporan, penyaluran] = await Promise.all([
    getMergedSiteContent("tentang"),
    getMergedSiteContent("program"),
    getMergedSiteContent("berita"),
    getMergedSiteContent("jangkauanBantuan"),
    getMergedSiteContent("laporan"),
    getMergedSiteContent("penyaluranBantuan"),
  ]);

  const hidden: string[] = [];
  if (!isSectionVisible(tentang)) hidden.push("tentang");
  if (!isSectionVisible(program)) hidden.push("program");
  if (!isSectionVisible(berita)) hidden.push("berita");
  if (!isSectionVisible(jangkauan) || !jangkauanHasData(jangkauan)) hidden.push("jangkauan-bantuan");
  if (!isSectionVisible(laporan)) hidden.push("laporan");
  if (!isSectionVisible(penyaluran)) hidden.push("penyaluran-bantuan");
  return hidden;
}

