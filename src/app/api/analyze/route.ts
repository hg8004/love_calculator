/**
 * POST /api/analyze — 사주 계산 + 규칙 기반 분석.
 * 출생 정보는 계산에만 사용하며 서버에 저장하지 않는다(로그에도 남기지 않음).
 */
import { NextResponse } from "next/server";
import { analyze, InputError } from "@/lib/analyze";
import { parseRequest } from "@/lib/validate";
import { toDTO } from "@/lib/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { input, options } = parseRequest(await req.json());
    const result = analyze(input, options);
    const json = JSON.stringify(toDTO(result));
    // 결과(약 1.6MB)는 서버(next start)·호스팅(Vercel)이 자동 압축한다.
    // 직접 gzip + Content-Encoding 을 붙이면 Vercel에서 응답이 깨질 수 있어 하지 않는다.
    return new NextResponse(json, { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof InputError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof SyntaxError) return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
    console.error("[analyze] 계산 오류", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "계산 중 오류가 발생했습니다." }, { status: 500 });
  }
}
