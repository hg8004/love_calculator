/**
 * POST /api/years — 지정한 10년 구간의 연도·월별 인연운 (지난 인연 비교용)
 * 본문: { input, options, startYear }. 출생 정보는 계산에만 쓰고 저장하지 않는다.
 */
import { NextResponse } from "next/server";
import { analyzeYears, InputError } from "@/lib/analyze";
import { parseRequest } from "@/lib/validate";
import { gzipSync } from "node:zlib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { input, options } = parseRequest(body);
    const startYear = Number(body?.startYear);
    const result = analyzeYears(input, options, startYear);
    const json = JSON.stringify(JSON.parse(JSON.stringify(result)));
    if ((req.headers.get("accept-encoding") ?? "").includes("gzip")) {
      return new NextResponse(new Uint8Array(gzipSync(json)), {
        headers: { "Content-Type": "application/json; charset=utf-8", "Content-Encoding": "gzip", "Cache-Control": "no-store", Vary: "Accept-Encoding" },
      });
    }
    return new NextResponse(json, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof InputError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof SyntaxError) return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
    return NextResponse.json({ error: "계산 중 오류가 발생했습니다." }, { status: 500 });
  }
}
