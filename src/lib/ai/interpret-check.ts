import { STEMS, BRANCHES } from "../saju/constants";

/** AI 응답에서 '년주/월주/일주/시주 + 간지' 언급을 찾아 계산 엔진 결과와 대조 */
export function checkIntegrity(text: string, r: { pillarText: { year: string; month: string; day: string; hour: string | null } }): string[] {
  const warnings: string[] = [];
  const stem = `[${STEMS.join("")}]`;
  const branch = `[${BRANCHES.join("")}]`;
  const expected: Record<string, string | null> = { 년: r.pillarText.year, 연: r.pillarText.year, 월: r.pillarText.month, 일: r.pillarText.day, 시: r.pillarText.hour };
  const re = new RegExp(`([년연월일시])주\\s*(?:는|은|:|가|이|=)?\\s*(${stem}${branch})`, "g");
  for (const m of text.matchAll(re)) {
    const exp = expected[m[1]];
    if (exp && m[2] !== exp) warnings.push(`AI 응답이 ${m[1]}주를 ${m[2]}(으)로 언급했지만 계산 엔진 결과는 ${exp}입니다. 원국은 엔진 결과를 따르세요.`);
    if (!exp && m[1] === "시") warnings.push(`출생 시간이 미상인데 AI 응답이 시주(${m[2]})를 언급했습니다. 이 부분은 무시하세요.`);
  }
  return Array.from(new Set(warnings));
}
