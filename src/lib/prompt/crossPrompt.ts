/**
 * PART 17 — 외부 LLM 교차 분석용 프롬프트 생성
 * 계산 엔진의 구조화 결과만 사용하며, 원국을 임의로 바꾸지 말 것을 명시한다.
 */
import type { AnalysisDTO } from "../serialize";
import { CATEGORY_LABEL, TYPE_LABEL } from "../love/score";
import type { Section } from "../love/types";

const PILLAR_KEYS = ["hour", "day", "month", "year"] as const;
const PILLAR_KO: Record<string, string> = { year: "년주", month: "월주", day: "일주", hour: "시주" };

function sectionText(sections: Section[], withEvidence: boolean): string {
  return sections
    .map((s) => `■ ${s.title}\n` + s.statements.map((st) => `- ${st.text}` + (withEvidence ? `\n  (근거: ${st.evidence.reasoning})` : "")).join("\n"))
    .join("\n");
}

export function chartTable(r: AnalysisDTO): string {
  const rows: string[] = ["| 구분 | 천간(십성) | 지지(십성) | 지장간(십성) | 십이운성 |", "|---|---|---|---|---|"];
  for (const k of PILLAR_KEYS) {
    const p = r.chart.pillars[k];
    if (!p) {
      rows.push(`| ${PILLAR_KO[k]} | 미상 | 미상 | - | - |`);
      continue;
    }
    rows.push(
      `| ${PILLAR_KO[k]} | ${p.stemChar}(${p.stemElement}, ${p.stemTenGod}) | ${p.branchChar}(${p.branchElement}, ${p.branchTenGod}) | ${p.hidden.map((h) => `${h.char}${h.role}:${h.tenGod}`).join(" ")} | ${p.stage} |`,
    );
  }
  return rows.join("\n");
}

export function chartSummary(r: AnalysisDTO): string {
  const c = r.chart;
  const lines: string[] = [];
  lines.push(`[출생 정보]`);
  lines.push(`- 성별: ${r.input.gender === "male" ? "남성" : "여성"}`);
  lines.push(`- 입력: ${r.input.calendar === "solar" ? "양력" : "음력"} ${r.input.year}-${r.input.month}-${r.input.day}${r.input.calendar === "lunar" ? (r.input.isLeapMonth ? " (윤달)" : " (평달)") : ""}`);
  lines.push(`- 변환: ${r.conversion.note}`);
  lines.push(`- 출생 시간: ${r.time.known ? `${r.time.wallClock} (현지 벽시계, ${r.time.zoneOffset}${r.time.isDST ? ", 서머타임" : ""})` : "모름 — 시주 미상, 시주 관련 해석 제외"}`);
  lines.push(`- 출생 지역: ${r.input.location.country} ${r.input.location.city} (위도 ${r.input.location.latitude}, 경도 ${r.input.location.longitude}, ${r.input.location.timezone})`);
  for (const s of r.settings) lines.push(`- ${s.label}: ${s.value}`);
  if (r.time.reckoning) lines.push(`- 일주·시주 판정 시각(보정 후): ${r.time.reckoning} (보정량 ${r.time.correctionMinutes}분, 경도 보정 ${r.time.longitudeCorrectionMinutes}분, 균시차 ${r.time.equationOfTimeMinutes}분)`);
  if (r.time.ziKind) lines.push(`- 자시 구분: ${r.time.ziKind} — ${r.time.dayHourExplanation}`);
  if (r.time.prevJie && r.time.nextJie) lines.push(`- 직전 절입: ${r.time.prevJie.name} ${r.time.prevJie.local} / 다음 절입: ${r.time.nextJie.name} ${r.time.nextJie.local}`);
  if (r.warnings.length) lines.push(`- 계산 경고: ${r.warnings.join(" / ")}`);
  if (r.alternatives.length) lines.push(`- 대안 원국: ${r.alternatives.map((a) => `${a.description} → 년주 ${a.year}, 월주 ${a.month}`).join(" / ")}`);

  lines.push(`\n[사주 원국]  ${r.pillarText.year}년 ${r.pillarText.month}월 ${r.pillarText.day}일 ${r.pillarText.hour ?? "(시주 미상)"}`);
  lines.push(chartTable(r));
  lines.push(`\n[오행 분포] 글자 수 ${Object.entries(c.elements.count).map(([e, n]) => `${e}${n}`).join(" ")} / 가중 비율(지장간·월령 반영) ${Object.entries(c.elements.weighted).map(([e, v]) => `${e} ${v}%`).join(", ")}`);
  lines.push(`[십성 분포] ${Object.entries(c.tenGodWeighted).map(([g, v]) => `${g} ${v}%`).join(", ")}`);
  lines.push(`[신강약] ${c.strength.score}점 (${c.strength.level}) — ${c.strength.details.join(" ")}`);
  lines.push(`[격국 참고] ${c.gyeok.name}: ${c.gyeok.basis}`);
  lines.push(`[조후] ${c.johu.description}`);
  lines.push(`[원국 합충형파해] ${c.relations.length ? c.relations.map((x) => `${x.label}(${x.members.map((m) => m.pos).join("-")}${x.transform ? `, 합화 ${x.transform.possibility}` : ""})`).join(", ") : "없음"}`);
  lines.push(`[신살] ${c.shinsal.length ? c.shinsal.map((s) => `${s.name}: ${s.positions.join(",")} [기준: ${s.basis}]`).join(" / ") : "없음"}`);
  const d = c.pillars.day!;
  lines.push(`[배우자궁] 일지 ${d.branchChar}(${d.branchTenGod}), 지장간 ${d.hidden.map((h) => `${h.char}:${h.tenGod}`).join(" ")}, 십이운성 ${d.stage}`);

  const dw = r.daewoon;
  lines.push(`\n[대운] ${dw.rule}. 대운수 ${dw.daewoonNumber} (정밀 ${dw.exactText}). ${dw.note}`);
  lines.push(dw.periods.map((p) => `${p.startAge}세(${p.startYear}~) ${p.ganzhi} [${p.stemTenGod}/${p.branchTenGod}, ${p.stage}]${p.relations.length ? " 원국관계:" + p.relations.map((x) => x.label).join(",") : ""}`).join("\n"));
  return lines.join("\n");
}

export function luckSummary(r: AnalysisDTO, maxReasons = 3): string {
  const lines: string[] = [`[세운·월운 및 연애운 지표] 점수 버전 ${r.meta.scoreVersion} — 실제 연애 성사 확률이 아닌 시기 간 비교용 상대 지표(기준 50, 범위 5~95)`];
  for (const y of r.years) {
    const s = y.score;
    lines.push(
      `\n● ${y.year}년 세운 ${y.seyun.ganzhi} [${y.seyun.stemTenGod}/${y.seyun.branchTenGod}] 대운 ${y.seyun.daewoon?.ganzhi ?? "-"} | 연간 지표 ${s.score} | 유형 ${s.type}(${TYPE_LABEL[s.type as "A" | "B" | "C"]}) | 키워드 ${s.keywords.join(", ") || "-"}`,
    );
    lines.push(`  원국 관계: ${y.seyun.relations.map((x) => x.label).join(", ") || "없음"}`);
    lines.push(`  범주 합계: ${Object.entries(s.byCategory).map(([k, v]) => `${CATEGORY_LABEL[k as keyof typeof CATEGORY_LABEL]} ${v}`).join(" / ")}`);
    lines.push(`  주요 근거: ${s.contributions.slice().sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, maxReasons).map((c) => `${c.label}(${c.delta > 0 ? "+" : ""}${c.delta}: ${c.reason})`).join(" ; ")}`);
    for (const m of y.months) {
      const ms = m.score;
      const top = ms.contributions.slice().sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 2).map((c) => `${c.label}${c.delta > 0 ? "+" : ""}${c.delta}`).join(", ");
      lines.push(`  - ${m.wolun.year}.${String(m.wolun.month).padStart(2, "0")} ${m.wolun.jieName}(${m.startLocal}~) ${m.wolun.ganzhi} [${m.wolun.stemTenGod}/${m.wolun.branchTenGod}] ${ms.score}점 ${ms.type} | ${top || "특이 요소 없음"}`);
    }
  }
  return lines.join("\n");
}



export function loveSummary(r: AnalysisDTO): string {
  const L = r.love;
  const lines: string[] = ["[배우자궁·배우자성 분석 (이 사이트의 규칙 기반 결과)]"];
  lines.push(`- 배우자성 기준: ${r.input.gender === "male" ? "남성 → 재성(정재·편재)" : "여성 → 관성(정관·편관)"} (전통 기준)`);
  lines.push(`- A 배우자궁(일지) ${L.palace.char}(${L.palace.element}, ${L.palace.yinYang}, ${L.palace.tenGod}) · 지장간 ${L.palace.hidden.map((h) => `${h.char}${h.role}:${h.tenGod}`).join(" ")} · 세력 ${L.palace.force.level}(${L.palace.force.score}) · 안정성 ${L.palace.stability.level}`);
  lines.push(`  근거: ${L.palace.force.factors.join(" / ")} / ${L.palace.stability.items.join(" / ")}`);
  lines.push(`- B 배우자성 ${L.star.level}(${L.star.score}) · 투출 ${L.star.revealed ? "있음" : "없음"} · 위치: ${L.star.occurrences.map((o) => `${o.where} ${o.char}(${o.tenGod}${o.role ? "·" + o.role : ""}${o.optional ? "·학파에 따라 제외" : ""})`).join(", ") || "없음"}`);
  lines.push(`  근거: ${L.star.factors.join(" / ")}${L.star.mixed ? ` / ${L.star.mixed}` : ""}`);
  lines.push(`- C 상호작용: ${L.interaction.summary} ${L.interaction.detail.join(" ")}`);
  lines.push(`- 구조 유형 ${L.type.code}: ${L.type.title}`);
  lines.push(`- 한 문단 요약: ${L.overviewText}`);
  if (L.support) lines.push(`- D 보조 분석: ${L.support.items.join(" / ")}`);
  lines.push(`- 만나게 될 이성 요약: ${L.partner.storyText}`);
  lines.push(`- 만나게 될 이성 추론(경향): ${L.partner.items.map((i) => `${i.title}: ${i.text} [근거: ${i.basis}]`).join(" / ")}`);
  lines.push(`- F 한계: ${L.conclusion.limits.join(" / ")}`);
  return lines.join("\n");
}

/** 외부 LLM에 붙여 넣을 때 맨 앞에 오는 역할·대화 맥락 지시 */
export const PROMPT_PREAMBLE = `[역할과 대화 지시]
- 당신은 40년 경력의 역술가입니다. 명리학(사주)에 정통하며, 근거를 들어 차분하고 정직하게 풀이합니다.
- 사용자의 이전 질문 기록이나 이전 대화 내용을 참조하지 말고, 아래에 제공된 정보만으로 새로 대답해 주세요.
- 사주를 잘 모르는 사람도 이해할 수 있게 쉬운 말로 설명하고, 전문 용어는 처음 나올 때 괄호로 풀어 주세요.
`;

/** 인연 시기 데이터 — 연도별 핵심과 주목할 달만 (전체 120개월을 나열하지 않는다) */
export function loveTimingBrief(r: AnalysisDTO): string {
  const sg = r.input.gender === "male" ? "재성" : "관성";
  const birthYear = r.conversion.solar.year;
  const isStar = (tg: string) => (sg === "재성" ? /재$/ : /관$/).test(tg);
  const lines: string[] = [`[앞으로 10년 이성 인연 흐름] (이 사이트 지표: 기준 50, 확률이 아닌 시기 간 비교값)`];
  for (const y of r.years) {
    const star = isStar(y.seyun.stemTenGod) || isStar(y.seyun.branchTenGod);
    const palaceRel = y.seyun.relations.filter((x) => x.involvesDayBranch).map((x) => x.label);
    const notable = y.months
      .filter((m) => m.score.score >= 60)
      .sort((a, b) => b.score.score - a.score.score)
      .slice(0, 3)
      .sort((a, b) => a.wolun.month - b.wolun.month)
      .map((m) => `${m.wolun.month}월 ${m.wolun.ganzhi}(${m.score.score}점: ${m.score.goodPlain.slice(0, 2).join(", ") || "특이 요소 적음"})`);
    lines.push(
      `- ${y.year}년(만 ${y.year - birthYear}세) 세운 ${y.seyun.ganzhi}[${y.seyun.stemTenGod}/${y.seyun.branchTenGod}] · 대운 ${y.seyun.daewoon?.ganzhi ?? "-"} · 지표 ${y.score.score}` +
        ` · 배우자성 유입 ${star ? "있음" : "없음"} · 일지와의 관계 ${palaceRel.join(", ") || "없음"}` +
        (notable.length ? ` · 주목할 달: ${notable.join(" / ")}` : ""),
    );
  }
  const t = r.summary.timing;
  if (t.nearest) lines.push(`- 이 사이트가 본 가장 가까운 인연 시기: ${t.nearest.year}년 ${t.nearest.month}월 / 10년 중 강한 해: ${t.bestYears.map((b) => b.year).join("·")}`);
  return lines.join("\n");
}

/** 원국 근거 데이터 — 배우자 분석에 필요한 것만 */
function chartBrief(r: AnalysisDTO): string {
  const c = r.chart;
  const lines: string[] = ["[근거 데이터: 사주 원국]"];
  lines.push(`- 성별 ${r.input.gender === "male" ? "남성" : "여성"} · ${r.input.calendar === "solar" ? "양력" : "음력"} ${r.input.year}-${r.input.month}-${r.input.day} ${r.time.known ? r.time.wallClock?.slice(11) : "(시간 모름: 시주 미상)"} · ${r.input.location.city}`);
  for (const s of r.settings.filter((x) => ["자시(子時) 처리", "태양시 보정", "절입 기준"].includes(x.label))) lines.push(`- ${s.label}: ${s.value}`);
  lines.push(`- 원국(시·일·월·연): ${r.pillarText.hour ?? "□□"} ${r.pillarText.day} ${r.pillarText.month} ${r.pillarText.year}`);
  lines.push(chartTable(r));
  lines.push(`- 오행 개수 ${Object.entries(c.elements.count).map(([e, n]) => `${e}${n}`).join(" ")} · 신강약 ${c.strength.score}점(${c.strength.level}) · 격국 참고 ${c.gyeok.name}`);
  lines.push(`- 원국 합충형파해: ${c.relations.map((x) => `${x.label}(${x.members.map((m) => m.pos).join("-")})`).join(", ") || "없음"}`);
  const loveShinsal = c.shinsal.filter((s) => ["도화살", "홍염살", "역마살", "천을귀인", "금여록", "원진살", "고신살", "과숙살", "화개살"].includes(s.name));
  lines.push(`- 연애 관련 신살: ${loveShinsal.map((s) => `${s.name}(${s.positions.join(",")})`).join(", ") || "없음"}`);
  lines.push(`- 대운: ${r.daewoon.rule} · 대운수 ${r.daewoon.daewoonNumber} · ${r.daewoon.periods.map((p) => `${p.startAge}세 ${p.ganzhi}[${p.stemTenGod}/${p.branchTenGod}]`).join(", ")}`);
  return lines.join("\n");
}

export function buildCrossPrompt(r: AnalysisDTO, userConditions: string): string {
  const L = r.love;
  const sgName = r.input.gender === "male" ? "재성: 정재·편재" : "관성: 정관·편관";
  const parts: string[] = [];
  parts.push(PROMPT_PREAMBLE);
  parts.push("# 상담 목적: 배우자(이성) 분석과 인연 시기");
  parts.push(`이 상담은 사주 전체 풀이가 아니라 다음 두 가지만 봅니다. 직업·재물·건강 같은 일반 운세는 다루지 마세요.
1) 이 사람이 만나게 될 배우자·이성은 어떤 사람인가 (외모 분위기, 성격, 하는 일의 결, 만나는 계기)
2) 앞으로 10년 중 이성 인연이 들어올 가능성이 높은 해와 달은 언제인가`);
  parts.push(`
# 질문
Q1. 배우자궁(일지)과 배우자성(${sgName})을 근거로, 이 사람이 만나게 될 배우자·이성의 모습을 구체적으로 그려 주세요.
Q2. 대운·세운·월운이 배우자성과 일지에 어떻게 작용하는지 보고, 인연 가능성이 높은 시기를 우선순위대로 3곳(연도와 달) 골라 이유와 함께 알려 주세요.
Q3. 아래 '이 사이트의 분석'과 비교해, **동의하는 부분**과 **다른 의견이 있는 부분**을 나눠서 답해 주세요. 각 의견은 사주명리학 근거(천간·지지·십성·지장간·합충형파해·대운·세운·월운)를 들어 설명해 주세요.${userConditions.trim() ? "\nQ4. 아래 '내가 원하는 배우자 조건'과 사주상 배우자상을 비교해, 맞는 부분과 다른 부분, 그 이유를 알려 주세요." : ""}`);

  parts.push("\n# 이 사이트의 분석 (검토 대상)");
  parts.push(`[한눈에 보기] ${L.overviewText}`);
  parts.push(`[만나게 될 이성] ${L.partner.storyText}`);
  parts.push(`[근거 요약]
- 배우자궁(일지) ${L.palace.char}: ${L.palace.tenGod} · 지장간 ${L.palace.hidden.map((h) => `${h.char}${h.role}:${h.tenGod}`).join(" ")} · 힘 ${L.palace.force.level} · 안정성 ${L.palace.stability.level}
  (${[...L.palace.force.factors, ...L.palace.stability.items].join(" / ")})
- 배우자성 ${L.star.level} · 투출 ${L.star.revealed ? "있음" : "없음"} · 위치 ${L.star.occurrences.map((o) => `${o.where} ${o.char}(${o.tenGod}${o.role ? "·" + o.role : ""}${o.optional ? "·학파에 따라 제외" : ""})`).join(", ") || "없음"}
  (${L.star.factors.join(" / ")}${L.star.mixed ? ` / ${L.star.mixed}` : ""})
- 둘의 관계: ${L.interaction.summary}
- 구조 유형 ${L.type.code}: ${L.type.title}${L.support ? `\n- 보조 분석: ${L.support.items.join(" / ")}` : ""}`);
  parts.push(`[연애 성향] ${r.reading.loveStyle.map((x) => `${x.title}: ${x.text}`).join(" / ")}`);
  parts.push("\n" + loveTimingBrief(r));
  parts.push("\n" + chartBrief(r));
  if (userConditions.trim()) {
    parts.push("\n# 내가 원하는 배우자 조건");
    parts.push(userConditions.trim());
  }
  parts.push(`
# 답변 원칙
- 위 원국 간지는 만세력 계산 결과이니 바꾸지 말고, 해석만 독립적으로 해 주세요. 시주가 '미상'이면 추정하지 마세요.
- 배우자궁(일지)과 배우자성을 각각 평가한 뒤 둘의 관계를 보세요. 배우자성은 천간뿐 아니라 지장간까지 확인해 주세요.
- 합이라서 무조건 좋다, 충이라서 무조건 나쁘다고 하지 말고 원국 맥락에서 판단해 주세요.
- 다른 기둥을 배우자궁 대신으로 보지 마세요. 배우자성이 약하거나 없어도 '인연이 없다'고 단정하지 마세요.
- 근거를 들어 경향과 가능성으로 말해 주되, 결론은 분명하게 내려 주세요.

# 답변 형식
1. 한 줄 결론 — 가장 유력한 인연 시기와 배우자상을 한 문장으로
2. 만나게 될 배우자·이성 (외모 분위기 / 성격 / 하는 일의 결 / 만나는 계기) — 배우자궁·배우자성 근거 포함
3. 인연 시기 Top 3 (연도·달 + 대운·세운·월운 근거)
4. 이 사이트 분석과 비교 — ✅ 동의하는 부분 / 💬 다른 의견 (각각 명리학 근거)${userConditions.trim() ? "\n5. 내가 원하는 조건과의 비교" : ""}
${userConditions.trim() ? "6" : "5"}. 연애 조언 2~3가지`);
  return parts.join("\n");
}

export function buildFullResultText(r: AnalysisDTO): string {
  const t = r.summary.timing;
  const s = r.summary.style;
  return [
    "두근두근 인연 해 계산기 — 분석 결과",
    "\n[나의 인연 시기]",
    t.oneLine,
    t.nearest ? `가장 가까운 인연 시기: ${t.nearest.year}년 ${t.nearest.month}월 (${t.nearest.score}점) — ${t.nearest.headline}` : "",
    `앞으로 2년 안에 주목할 달: ${t.upcoming.map((u) => `${u.year}년 ${u.month}월(${u.score}점)`).join(", ")}`,
    `10년 중 인연운이 강한 해: ${t.bestYears.map((b) => `${b.year}년(${b.score}점)`).join(", ")}`,
    "\n[나의 연애 스타일과 이상형]",
    ...s.points.map((p) => `- ${p.title}: ${p.text}`),
    "연애 조언: " + s.advice.join(" "),
    "\n──────── 상세 분석 ────────",
    chartSummary(r),
    "\n[기본 성향]\n" + sectionText(r.profile as Section[], false),
    "\n[이성 취향 · 배우자상]\n" + sectionText(r.preferences as Section[], false),
    "\n" + luckSummary(r, 2),
    `\n${r.meta.disclaimer}`,
  ].join("\n");
}
