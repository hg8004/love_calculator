/**
 * POST /api/interpret — 선택 기능: LLM 종합 해석.
 * 클라이언트가 보낸 결과를 신뢰하지 않고, 출생 정보로 서버에서 원국을 다시 계산한 뒤 그 구조화 데이터만 AI에 전달한다.
 */
import { NextResponse } from "next/server";
import { analyze, InputError } from "@/lib/analyze";
import { parseRequest } from "@/lib/validate";
import { toDTO } from "@/lib/serialize";
import { interpretWithAI } from "@/lib/ai/interpret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { input, options } = parseRequest(body);
    const conditions = typeof body?.conditions === "string" ? body.conditions : "";
    const result = toDTO(analyze(input, options));
    const ai = await interpretWithAI(result, conditions);
    return NextResponse.json(ai, { status: ai.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof InputError) return NextResponse.json({ ok: false, error: e.message, integrityWarnings: [] }, { status: 400 });
    return NextResponse.json({ ok: false, error: "AI 해석 중 오류가 발생했습니다.", integrityWarnings: [] }, { status: 500 });
  }
}
