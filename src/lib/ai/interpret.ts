/**
 * AI 해석 모듈 (서버 전용)
 * - 입력: 계산 엔진이 만든 구조화 데이터의 요약(텍스트). AI는 간지·원국을 계산하지 않는다.
 * - 출력: 서술형 해석 텍스트만. 화면의 원국 표·점수는 항상 계산 엔진 값을 사용하므로 AI가 바꿀 수 없다.
 * - 사후 검증: 응답에 원국과 다른 기둥이 언급되면 경고를 붙인다.
 * - API 키는 환경변수 ANTHROPIC_API_KEY 로만 관리한다.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AnalysisDTO } from "../serialize";
import { chartSummary, loveSummary, luckSummary } from "../prompt/crossPrompt";
import { checkIntegrity } from "./interpret-check";
import { fixJosa } from "../josa";

export const AI_MODEL = "claude-opus-5-5";

const SYSTEM_PROMPT = `당신은 명리학(사주) 해석을 돕는 분석가입니다. 사용자의 사주 원국과 운의 흐름은 이미 독립적인 만세력 계산 엔진이 산출했습니다.

반드시 지킬 원칙:
1. 제공된 원국(년주·월주·일주·시주), 대운·세운·월운 간지, 십성, 지장간 값을 절대 바꾸거나 다시 계산하지 마세요. 계산 결과와 해석을 구분하세요.
2. 시주가 '미상'이면 시주를 추정하지 말고, 시주 관련 해석이 제한된다고 밝히세요.
3. 합이 있다고 무조건 긍정, 충이 있다고 무조건 부정으로 평가하지 마세요. 원국 맥락(월령, 신강약, 배우자궁, 배우자성)에서 개별적으로 판단하세요.
4. 모든 주장에는 근거(어느 위치의 어떤 천간·지지·십성·운)가 있어야 합니다. 근거 없는 운세식 표현은 쓰지 마세요.
5. 미래를 확정하지 마세요. 점수는 실제 확률이 아니라 상대 지표임을 유지하세요.
6. 학파에 따라 해석이 갈리는 부분은 관점을 나눠 설명하세요.
7. 한국어로, 따뜻하지만 분석적인 어조로 작성하세요. 마크다운 제목(##)과 목록을 사용하세요.
8. 배우자궁(일지)과 배우자성(남 재성·여 관성)을 각각 평가하고, 배우자성은 지장간까지 확인하세요. 다른 기둥을 배우자궁의 대체물로 보지 마세요.
9. 배우자성이 없거나 약해도 결혼 불가·배우자 부재로, 일지가 약해도 배우자복 없음으로 단정하지 마세요. 배우자의 외모·직업·성격·결혼 시기·이혼 여부를 확정하지 마세요.
10. 사주를 모르는 사람도 이해할 수 있게 쉬운 말로 쓰고, 전문 용어는 처음 나올 때 괄호로 풀어 주세요.`;

const TASK = `위 데이터를 바탕으로 다음 순서로 종합 해석을 작성해 주세요.

## A. 배우자궁 분석
## B. 배우자성 분석
## C. 배우자궁과 배우자성의 상호작용
## D. 배우자성이 약하거나 드러나지 않는 경우의 보조 분석 (해당 없으면 생략)
## E. 대운·세운의 시기적 작용 (주목할 시기와 그 근거)
## F. 종합 해석 및 판단의 한계 (확인된 사실 / 추론 / 근거가 제한적인 부분 구분)
## 덧붙임: 사용자가 적은 배우자 조건과 사주상 배우자상의 비교 (조건이 없으면 생략)

각 항목은 근거를 함께 제시하고, 전체 분량은 2,500자 안팎으로 해 주세요.`;

export interface InterpretResult {
  ok: boolean;
  text?: string;
  error?: string;
  model?: string;
  integrityWarnings: string[];
  servedByFallback?: boolean;
}

export function aiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export async function interpretWithAI(r: AnalysisDTO, userConditions: string): Promise<InterpretResult> {
  if (!aiAvailable()) return { ok: false, error: "AI 해석 기능이 설정되지 않았습니다(서버 환경변수 ANTHROPIC_API_KEY 필요). 규칙 기반 분석과 교차 분석 프롬프트는 그대로 사용할 수 있습니다.", integrityWarnings: [] };
  const client = new Anthropic();
  const data = [chartSummary(r), loveSummary(r), luckSummary(r, 2)].join("\n\n");
  const conditions = userConditions.trim() ? `\n\n[사용자가 원하는 배우자 조건]\n${userConditions.trim().slice(0, 2000)}` : "";
  try {
    const stream = client.beta.messages.stream({
      model: AI_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `<saju_data>\n${data}${conditions}\n</saju_data>\n\n${TASK}` }],
    });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "refusal") {
      return { ok: false, error: "AI가 이 요청에 대한 응답을 생성하지 않았습니다. 규칙 기반 분석 결과를 참고해 주세요.", integrityWarnings: [] };
    }
    const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    const servedByFallback = (msg.usage.iterations ?? []).some((it) => it.type === "fallback_message");
    return {
      ok: true,
      text: text + (msg.stop_reason === "max_tokens" ? "\n\n(응답 길이 제한으로 일부가 잘렸습니다.)" : ""),
      model: msg.model,
      integrityWarnings: checkIntegrity(text, r).map(fixJosa),
      servedByFallback,
    };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { ok: false, error: "AI API 인증에 실패했습니다. 서버의 API 키를 확인하세요.", integrityWarnings: [] };
    if (e instanceof Anthropic.RateLimitError) return { ok: false, error: "AI 요청이 많아 잠시 후 다시 시도해 주세요.", integrityWarnings: [] };
    if (e instanceof Anthropic.APIError) return { ok: false, error: `AI API 오류(${e.status ?? "-"}). 잠시 후 다시 시도해 주세요.`, integrityWarnings: [] };
    return { ok: false, error: "AI 서버에 연결하지 못했습니다.", integrityWarnings: [] };
  }
}
