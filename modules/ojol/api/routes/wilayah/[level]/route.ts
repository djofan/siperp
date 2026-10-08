import { NextResponse } from "next/server";
import { getOjolViewer } from "@/modules/ojol/api/access";
import { fetchWilayah, type WilayahLevel } from "@/modules/ojol/api/wilayah";

const LEVELS: readonly WilayahLevel[] = ["provinsi", "kota", "kecamatan", "kelurahan"];

// Proxy + cache data wilayah untuk form alamat (hanya pengguna Ojol yang login).
export async function GET(request: Request, { params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!LEVELS.includes(level as WilayahLevel)) return NextResponse.json([], { status: 404 });
  const viewer = await getOjolViewer();
  if (!viewer?.member && !viewer?.isAdmin) return NextResponse.json([], { status: 401 });
  const parent = new URL(request.url).searchParams.get("parent") ?? "";
  return NextResponse.json(await fetchWilayah(level as WilayahLevel, parent));
}
