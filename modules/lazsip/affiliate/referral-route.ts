import { NextResponse } from "next/server";
import { apiRequest, ApiError } from "@/lib/api";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const failure = (status: number) => new Response(status === 404 ? "Link referral tidak tersedia atau sudah dinonaktifkan." : "Link belum dapat diperiksa. Silakan coba lagi.", {
    status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
  if (!/^[a-f0-9]{20}$/.test(code)) return failure(404);
  try {
    const referral = await apiRequest<{ referralCode: string }>(`lazsip/affiliate/referrals/${encodeURIComponent(code)}`);
    const destination = new URL("/lazsip/zakat", request.url);
    destination.searchParams.set("ref", referral.referralCode);
    const response = NextResponse.redirect(destination, 307);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "same-origin");
    return response;
  } catch (error) { return failure(error instanceof ApiError && error.status === 404 ? 404 : 503); }
}
