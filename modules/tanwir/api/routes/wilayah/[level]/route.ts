import { NextResponse } from "next/server";
import { getTanwirViewer } from "@/modules/tanwir/api/access";
import { fetchWilayah, type WilayahLevel } from "@/modules/tanwir/api/wilayah";

const LEVELS: readonly WilayahLevel[] = ["provinsi", "kota", "kecamatan", "kelurahan"];

// Proxy + cache data wilayah untuk form alamat (hanya pengguna Tanwir yang login).
export async function GET(request: Request, { params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  if (!LEVELS.includes(level as WilayahLevel)) return NextResponse.json([], { status: 404 });
  const viewer = await getTanwirViewer();
  if (!viewer?.member && !viewer?.isAdmin) return NextResponse.json([], { status: 401 });
  const parent = new URL(request.url).searchParams.get("parent") ?? "";
  return NextResponse.json(await fetchWilayah(level as WilayahLevel, parent));
}
