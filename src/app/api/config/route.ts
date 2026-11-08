import { NextResponse } from "next/server";
import { aiAvailable, AI_MODEL } from "@/lib/ai/interpret";
import { ENGINE_VERSION } from "@/lib/analyze";
import { SCORE_VERSION } from "@/lib/love/score";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ aiAvailable: aiAvailable(), aiModel: AI_MODEL, engineVersion: ENGINE_VERSION, scoreVersion: SCORE_VERSION });
}
