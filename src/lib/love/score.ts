/**
 * PART 14·15 — 연애운(인연 가능성) 상대 지표 산출 및 인연 유형 분류
 *
 * ⚠ 이 점수는 실제 연애 성사 확률이 아니다. 명리 구조에서 관계 형성에 유리한 요소가 얼마나 나타나는지를
 *   같은 사람의 다른 시기끼리 비교하기 위한 상대 지표이며, 실제 데이터로 검증된 통계 모델이 아니다.
 *
 * 설계 원칙
 *  - 합 = 자동 가점, 충 = 자동 감점으로 처리하지 않는다. 충은 '새 만남의 계기(+)'와 '안정성 저하(−)'를 함께 기록한다.
 *  - 같은 관계라도 원국 맥락(신강약, 배우자성 유무, 배우자궁이 이미 합으로 묶여 있는지, 희기 방향)에 따라 가중치가 달라진다.
 *  - 같은 범주의 요소가 여러 개면 체감(1, 0.6, 0.35, 0.2…) 가중치를 적용해 '합이 많을수록 무조건 고득점'이 되지 않게 한다.
 *  - 신살 하나로 점수가 결정되지 않도록 신살 기여는 최대 +4 로 제한한다.
 *  - 모든 기여 항목은 사유(reason)를 남긴다. 버전은 SCORE_VERSION 으로 기록한다.
 */
import { BRANCHES, Element, STEMS, TEN_GOD_GROUP, TenGod, TenGodGroup, elementOfGroup, mainHiddenStem, tenGodOf } from "../saju/constants";
import type { NatalChart } from "../saju/chart";
import type { Relation, Source } from "../saju/relations";
import type { LuckPillarInfo } from "../saju/luck";
import { TEN_GOD_INFO } from "./knowledge";
import { Evidence, ev } from "./types";

export const SCORE_VERSION = "love-score/1.0.0";
export const SCORE_VERSION_NOTE = "2026-11 초기 버전. 가중치는 전통 해석을 바탕으로 설계자가 정한 값이며, 실제 연애 데이터로 보정되지 않았습니다.";

export type FactorCategory = "spouseStar" | "palace" | "formation" | "sustain" | "instability";
export const CATEGORY_LABEL: Record<FactorCategory, string> = {
  spouseStar: "① 배우자성의 활성화",
  palace: "② 배우자궁의 작용",
  formation: "⑥ 관계 형성에 유리한 요소",
  sustain: "⑦ 관계 지속성에 영향을 주는 요소",
  instability: "⑧ 부정적이거나 불안정한 작용",
};
export const LAYER_LABEL: Record<"대운" | "세운" | "월운" | "운간", string> = {
  대운: "③ 대운과 원국의 관계",
  세운: "④ 세운과 원국의 관계",
  월운: "⑤ 월운과 원국의 관계",
  운간: "운과 운 사이의 관계(대운·세운·월운)",
};

export type Layer = "대운" | "세운" | "월운" | "운간";

export interface Indices {
  attraction: number;
  formation: number;
  sustain: number;
  instability: number;
}

export interface Contribution {
  category: FactorCategory;
  layer: Layer;
  /** 체감·레이어 가중 전 원점수 */
  raw: number;
  /** 레이어 가중 후·체감 전 점수 */
  weighted?: number;
  /** 체감 순위(같은 범주·부호 내 0부터) */
  rank?: number;
  /** 최종 반영 점수 */
  delta: number;
  label: string;
  reason: string;
  idx: Partial<Indices>;
  keyword?: string;
}

export type RelationshipType = "A" | "B" | "C";
export const TYPE_LABEL: Record<RelationshipType, string> = {
  A: "진중하게 만나볼 만한 인연",
  B: "지켜볼 필요가 있는 인연",
  C: "가벼운 만남일 가능성을 고려해야 하는 인연",
};

export interface PeriodScore {
  version: string;
  score: number;
  base: number;
  contributions: Contribution[];
  byCategory: Record<FactorCategory, number>;
  byLayer: Record<Layer, number>;
  indices: Indices;
  type: RelationshipType;
  typeReasons: string[];
  typeScores: Record<RelationshipType, number>;
  signal: "강함" | "보통" | "약함";
  keywords: string[];
  positives: string[];
  cautions: string[];
  partnerTraits: string[];
  advice: string[];
  evidence: Evidence;
  /** 일반 사용자용 한 줄 요약 */
  headline: string;
  /** 쉬운 말로 쓴 좋은 점 / 주의할 점 */
  goodPlain: string[];
  cautionPlain: string[];
}

export interface ScoreContext {
  chart: NatalChart;
  gender: "male" | "female";
}

interface LayerInput {
  layer: "대운" | "세운" | "월운";
  weight: number;
  info: LuckPillarInfo;
  relations: Relation[];
}

const HAP_KINDS = new Set(["육합", "삼합", "반합", "방합"]);

function sgOf(gender: "male" | "female"): TenGodGroup {
  return gender === "male" ? "재성" : "관성";
}

function natalHasTenGod(chart: NatalChart, tg: TenGod): boolean {
  return Object.values(chart.pillars).some((p) => p && (p.stemTenGod === tg || p.hidden.some((h) => h.tenGod === tg && h.role === "정기")));
}

function natalDayBranchBound(chart: NatalChart): Relation | undefined {
  return chart.relations.find((r) => r.involvesDayBranch && HAP_KINDS.has(r.kind));
}

function transformFactor(r: Relation): number {
  if (!r.transform) return 0.8;
  return r.transform.possibility === "높음" ? 1 : r.transform.possibility === "조건부" ? 0.8 : 0.6;
}

function evaluateLayer(ctx: ScoreContext, L: LayerInput): Contribution[] {
  const { chart, gender } = ctx;
  const out: Contribution[] = [];
  const sg = sgOf(gender);
  const sgEl: Element = elementOfGroup(chart.dayStem, sg);
  const jeong: TenGod = gender === "male" ? "정재" : "정관";
  const pyeon: TenGod = gender === "male" ? "편재" : "편관";
  const st = chart.strength;
  const natalSgW = chart.tenGodWeighted[sg];
  const lay = L.layer;
  const gz = L.info.ganzhi;
  const push = (c: Omit<Contribution, "delta" | "layer">) => out.push({ ...c, layer: lay, delta: 0 });

  // ① 배우자성 활성화
  const stemTg = L.info.stemTenGod;
  const branchTg = L.info.branchTenGod;
  const sgMods = (base: number, where: string, tg: TenGod): void => {
    let v = base;
    const why: string[] = [`${lay} ${where}이(가) ${tg}(배우자성)`];
    if (natalSgW < 6) {
      v *= 1.2;
      why.push("원국에 부족한 배우자성이 보충되어 체감이 큼");
    }
    if (natalSgW >= 35 && st.score < 45) {
      v *= 0.6;
      why.push(`원국에 이미 ${sg}이(가) 많고(${natalSgW}%) 일간이 약해(${st.score}점) 추가 유입은 부담으로도 작용`);
      push({ category: "instability", raw: -3, label: `${sg} 과다 부담`, reason: `${gender === "male" ? "재다신약" : "관살과다"} 경향: 관계가 부담이나 압박으로 느껴질 수 있음`, idx: { instability: 3 } });
    }
    if (st.favorableGroups.includes(sg)) {
      v += 1;
      why.push(`억부상 ${sg}이(가) 희용 방향(${st.level})`);
    }
    push({
      category: "spouseStar", raw: v, label: `${lay} ${where} ${tg}`, reason: why.join(" · "),
      idx: tg === jeong ? { formation: v * 0.6, sustain: v * 0.5 } : { formation: v * 0.6, attraction: v * 0.5 },
      keyword: tg === jeong ? "안정적인 인연 기운" : "강한 끌림의 인연 기운",
    });
  };
  if (TEN_GOD_GROUP[stemTg] === sg) sgMods(stemTg === jeong ? 10 : 8, `천간 ${STEMS[L.info.stem]}`, stemTg);
  if (TEN_GOD_GROUP[branchTg] === sg) sgMods(branchTg === jeong ? 7 : 6, `지지 ${BRANCHES[L.info.branch]}`, branchTg);
  else if (L.info.hidden.some((h) => TEN_GOD_GROUP[h.tenGod] === sg)) {
    const h = L.info.hidden.find((x) => TEN_GOD_GROUP[x.tenGod] === sg)!;
    push({ category: "spouseStar", raw: 2, label: `${lay} 지장간 ${h.char} ${h.tenGod}`, reason: `${lay} 지지 ${BRANCHES[L.info.branch]}의 지장간에 배우자성이 숨어 있어 은근하게 작용`, idx: { formation: 1 } });
  }
  // 관살혼잡 / 정편 혼재
  const incomingSg = [stemTg, branchTg].filter((t) => TEN_GOD_GROUP[t] === sg);
  if (gender === "female" && incomingSg.length) {
    const other = incomingSg.includes("편관") ? "정관" : incomingSg.includes("정관") ? "편관" : null;
    if (other && natalHasTenGod(chart, other as TenGod)) {
      push({ category: "instability", raw: -2, label: "관살혼잡", reason: `원국의 ${other}과(와) ${lay}의 ${incomingSg.join("·")}이(가) 섞여 서로 다른 유형 사이에서 선택이 흔들릴 수 있음`, idx: { instability: 2, attraction: 1 } });
    }
  }

  // ② 배우자궁(일지)의 작용 + 기타 관계
  const dayBound = natalDayBranchBound(chart);
  for (const r of L.relations) {
    const fromLayer = r.members.some((m) => m.source === lay);
    if (!fromLayer) continue;
    const other = r.members.find((m) => m.source === "원국");
    if (r.involvesDayBranch) {
      if (r.kind === "육합") {
        let v = 8;
        const why = [`${lay} ${BRANCHES[L.info.branch]}이(가) 배우자궁 ${chart.pillars.day!.branchChar}과(와) ${r.label}`];
        if (r.element === sgEl) {
          v += 2;
          why.push(`합의 결과 오행 ${r.element}이(가) 배우자성 오행`);
        }
        const g = groupOfElement(chart.dayStem, r.element!);
        if (st.unfavorableGroups.includes(g)) {
          v *= 0.6;
          why.push(`다만 합의 결과 오행이 억부상 부담 방향(${g})이라 묶임이 부담으로도 작용`);
        }
        v *= transformFactor(r);
        if (r.transform) why.push(`합화 가능성 ${r.transform.possibility}`);
        push({ category: "palace", raw: v, label: r.label, reason: why.join(" · "), idx: { formation: v * 0.6, sustain: v * 0.6 }, keyword: "배우자궁 합 — 결속" });
      } else if (r.kind === "삼합" || r.kind === "반합" || r.kind === "방합") {
        const base = r.kind === "삼합" ? 6 : r.kind === "반합" ? 4 : 3;
        const v = base * transformFactor(r);
        push({ category: "palace", raw: v, label: r.label, reason: `배우자궁이 ${lay}과(와) ${r.kind}을 이뤄 관계 맺음의 흐름이 생김${r.transform ? ` (합화 가능성 ${r.transform.possibility})` : ""}`, idx: { formation: v * 0.7, sustain: v * 0.3 }, keyword: "사회적 연결 속 인연" });
      } else if (r.kind === "충") {
        let opp = 4;
        let ins = -6;
        const why = [`${lay} ${BRANCHES[L.info.branch]}이(가) 배우자궁을 충`];
        if (dayBound) {
          opp += 2;
          why.push(`원국에서 배우자궁이 ${dayBound.label}으로 묶여 있어, 충이 묶임을 풀어 새로운 관계의 계기가 되기 쉬움`);
        }
        if (TEN_GOD_GROUP[tenGodOf(chart.dayStem, mainHiddenStem(L.info.branch))] === sg) {
          opp += 2;
          why.push("충하는 글자 자체가 배우자성");
        }
        if (st.score >= 55) {
          ins *= 0.8;
          why.push("일간이 강해 변동을 감당하는 힘이 있음");
        } else if (st.score < 40) {
          ins *= 1.2;
          why.push("일간이 약해 변동의 부담이 크게 느껴질 수 있음");
        }
        push({ category: "formation", raw: opp, label: `${r.label} (변화의 계기)`, reason: why.join(" · ") + " → 이동·환경 변화 속 새 만남 가능성", idx: { formation: opp * 0.7, attraction: opp * 0.5 }, keyword: "관계 변화·새 국면" });
        push({ category: "instability", raw: ins, label: `${r.label} (안정성 저하)`, reason: "기존 관계의 재정립·갈등·불안정이 함께 나타날 수 있음", idx: { instability: -ins } });
      } else if (r.kind === "형" || r.kind === "자형") {
        const v = r.kind === "형" ? -4 : -2;
        push({ category: "instability", raw: v, label: r.label, reason: `배우자궁에 ${r.kind} — 관계 안에서 조율·책임 문제가 생기기 쉬움(문제를 바로잡는 계기가 될 수도 있음)`, idx: { instability: -v } });
      } else if (r.kind === "파") {
        push({ category: "instability", raw: -2, label: r.label, reason: "배우자궁에 파 — 계획이 어긋나거나 사소한 균열", idx: { instability: 2 } });
      } else if (r.kind === "해") {
        push({ category: "instability", raw: -3, label: r.label, reason: "배우자궁에 해 — 서운함·오해가 쌓이기 쉬움", idx: { instability: 3 } });
      } else if (r.kind === "원진") {
        push({ category: "formation", raw: 1, label: `${r.label} (끌림)`, reason: "원진은 이유 없는 끌림을 동반", idx: { attraction: 2 } });
        push({ category: "instability", raw: -3, label: `${r.label} (긴장)`, reason: "끌리면서도 미묘하게 불편한 정서적 긴장", idx: { instability: 3 } });
      } else if (r.kind === "귀문") {
        push({ category: "instability", raw: -1, label: r.label, reason: "감정적으로 예민해지기 쉬움", idx: { instability: 1, attraction: 1 } });
      } else if (r.kind === "암합") {
        push({ category: "formation", raw: 2, label: r.label, reason: "배우자궁과 드러나지 않는 연결 — 은근한 끌림, 비밀스러운 관계로 시작될 가능성", idx: { attraction: 2, formation: 1 } });
      }
      continue;
    }
    // 일간과의 천간 관계
    if (r.involvesDayStem && r.kind === "천간합") {
      push({ category: "formation", raw: 5, label: `일간합 ${r.label}`, reason: `${lay} 천간이 일간과 합 — '정이 드는 합'으로 마음이 끌리는 상대를 만나기 쉬움`, idx: { formation: 4, sustain: 2 }, keyword: "마음이 묶이는 만남" });
      continue;
    }
    if (r.involvesDayStem && r.kind === "천간충") {
      push({ category: "instability", raw: -3, label: `일간충 ${r.label}`, reason: "일간이 충을 받아 마음이 흔들리고 판단이 급해질 수 있음", idx: { instability: 3, formation: 1 } });
      continue;
    }
    // 원국 배우자성 글자를 움직이는 관계
    if (other) {
      const pos = other.pos;
      const natalP = Object.values(chart.pillars).find((p) => p && (`${p.label.replace("주", "")}간` === pos || `${p.label.replace("주", "")}지` === pos));
      if (!natalP) continue;
      const isStem = pos.endsWith("간");
      const tg = isStem ? natalP.stemTenGod : natalP.branchTenGod;
      if (tg !== "일간" && TEN_GOD_GROUP[tg as TenGod] === sg) {
        if (r.kind === "천간합" || HAP_KINDS.has(r.kind)) {
          push({ category: "spouseStar", raw: 2, label: `원국 배우자성(${pos}) ${r.label}`, reason: `원국의 배우자성이 ${lay}과(와) 합하여 움직임 — 인연의 동기가 생기지만, 합거(묶임)로 정체될 수도 있음`, idx: { formation: 1.5, attraction: 1 } });
        } else if (r.kind === "충" || r.kind === "천간충") {
          push({ category: "formation", raw: 2, label: `원국 배우자성(${pos}) ${r.label}`, reason: `원국 배우자성이 충을 받아 움직임(충동) — 계기가 생기지만 흔들림도 동반`, idx: { formation: 1.5, instability: 1.5 } });
          push({ category: "instability", raw: -2, label: `배우자성 충`, reason: "배우자성이 충을 받아 관계가 흔들릴 수 있음", idx: { instability: 2 } });
        }
      }
    }
  }
  // 복음: 운의 지지가 일지와 같음
  if (L.info.branch === chart.dayBranch) {
    push({ category: "palace", raw: 2, label: `배우자궁 복음(${BRANCHES[L.info.branch]})`, reason: "운의 지지가 일지와 같아 배우자궁의 주제가 강조됨(긍정·부정 모두 증폭)", idx: { formation: 1, instability: 0.5 } });
  }

  // ⑥ 관계 형성: 신살 (합계 최대 +4)
  let shinsalSum = 0;
  const shinsalWhy: string[] = [];
  const idxS: Partial<Indices> = {};
  for (const s of L.info.incomingShinsal) {
    const map: Record<string, [number, keyof Indices, string]> = {
      도화살: [3, "attraction", "도화 — 이성의 시선을 끄는 매력이 드러나기 쉬움"],
      홍염살: [2, "attraction", "홍염 — 분위기·감성적 매력"],
      천을귀인: [2, "formation", "천을귀인 — 소개·도움을 통한 좋은 인연"],
      금여록: [2, "sustain", "금여록 — 배우자 덕의 상징"],
      역마살: [1, "formation", "역마 — 이동·여행·새 환경에서의 만남"],
      화개살: [-1, "formation", "화개 — 내면·자기 세계에 몰입해 인연에 소극적일 수 있음"],
    };
    const m = map[s];
    if (!m) continue;
    shinsalSum += m[0];
    shinsalWhy.push(m[2]);
    idxS[m[1]] = (idxS[m[1]] ?? 0) + Math.abs(m[0]);
  }
  if (shinsalWhy.length) {
    const v = Math.max(-2, Math.min(4, shinsalSum));
    push({ category: "formation", raw: v, label: `${lay} 신살 (${L.info.incomingShinsal.join("·")})`, reason: shinsalWhy.join(" / ") + " (신살 기여는 최대 +4로 제한)", idx: idxS, keyword: L.info.incomingShinsal.includes("도화살") ? "매력 발산" : L.info.incomingShinsal.includes("천을귀인") ? "소개·귀인" : L.info.incomingShinsal.includes("역마살") ? "이동 중 만남" : undefined });
  }

  // ⑥·⑦·⑧ 십성 흐름
  const g = TEN_GOD_GROUP[stemTg];
  if (g === "식상") {
    if (gender === "male") push({ category: "formation", raw: 2, label: `${lay} ${stemTg}`, reason: "식상생재 — 표현과 적극성이 살아나 이성에게 다가가기 쉬움", idx: { formation: 1.5, attraction: 1 }, keyword: "적극적인 표현" });
    else {
      push({ category: "formation", raw: 2, label: `${lay} ${stemTg}`, reason: "식상 — 자기표현과 매력이 드러나는 시기", idx: { attraction: 2 }, keyword: "매력 발산" });
      if (stemTg === "상관" && natalHasTenGod(chart, "정관")) push({ category: "instability", raw: -4, label: "상관견관", reason: "운의 상관이 원국의 정관을 극함 — 상대에 대한 불만·말다툼, 기존 관계의 긴장", idx: { instability: 4 } });
    }
  } else if (g === "인성") {
    if (gender === "female" && chart.tenGodWeighted["관성"] > 0) push({ category: "sustain", raw: 1, label: `${lay} ${stemTg}`, reason: "관인상생 — 관계를 신중하고 안정적으로 다지는 흐름", idx: { sustain: 1.5 } });
    else push({ category: "formation", raw: -1, label: `${lay} ${stemTg}`, reason: "인성 — 생각이 많아지고 신중해져 적극성이 줄 수 있음", idx: { sustain: 0.5 } });
  } else if (g === "비겁") {
    if (gender === "male" && chart.tenGodWeighted["재성"] > 0) push({ category: "instability", raw: stemTg === "겁재" ? -3 : -2, label: `${lay} ${stemTg}`, reason: "비겁이 재성을 극함(쟁재) — 경쟁자 등장, 자기 주장으로 인한 마찰", idx: { instability: 2.5 } });
    else push({ category: "formation", raw: 1, label: `${lay} ${stemTg}`, reason: "비겁 — 친구·동료 관계에서 시작되는 인연, 대등한 관계", idx: { formation: 1 } });
  }
  // ⑦ 지속성: 정(正) 배우자성
  if (stemTg === jeong || branchTg === jeong) push({ category: "sustain", raw: 3, label: `${lay} ${jeong}`, reason: `${jeong}은(는) 안정·책임의 배우자성으로 관계 지속에 유리한 상징`, idx: { sustain: 3 } });
  if ((stemTg === pyeon || branchTg === pyeon) && !(stemTg === jeong || branchTg === jeong)) push({ category: "formation", raw: 1, label: `${lay} ${pyeon}`, reason: `${pyeon}은(는) 강렬한 끌림의 배우자성 — 시작은 빠르지만 지속성은 따로 확인 필요`, idx: { attraction: 2 } });

  return out.map((c) => ({ ...c, raw: Math.round(c.raw * 100) / 100, idx: scaleIdx(c.idx, L.weight), delta: c.raw * L.weight }));
}

function scaleIdx(idx: Partial<Indices>, w: number): Partial<Indices> {
  const out: Partial<Indices> = {};
  for (const [k, v] of Object.entries(idx)) out[k as keyof Indices] = (v as number) * w;
  return out;
}

function groupOfElement(dayStem: number, el: Element): TenGodGroup {
  for (const g of ["비겁", "식상", "재성", "관성", "인성"] as TenGodGroup[]) if (elementOfGroup(dayStem, g) === el) return g;
  return "비겁";
}

function luckToLuck(relations: Relation[], targetLayer: "세운" | "월운"): Contribution[] {
  const out: Contribution[] = [];
  for (const r of relations) {
    const sources = new Set(r.members.map((m) => m.source));
    if (!sources.has(targetLayer) || sources.size < 2 || sources.has("원국")) continue;
    if (r.kind === "충") out.push({ category: "instability", layer: "운간", raw: -1.5, delta: -1.5, label: r.label, reason: `${[...sources].join("·")} 사이의 충 — 시기적 변동성`, idx: { instability: 1.5, formation: 0.5 } });
    else if (r.kind === "육합" || r.kind === "천간합") out.push({ category: "formation", layer: "운간", raw: 1, delta: 1, label: r.label, reason: `${[...sources].join("·")} 사이의 합 — 운의 흐름이 서로 호응`, idx: { formation: 0.5 } });
  }
  return out;
}

const DECAY = [1, 0.6, 0.35, 0.2, 0.1];

function aggregate(contribs: Contribution[]): { total: number; finals: Contribution[] } {
  // 범주·부호별로 큰 것부터 체감 적용
  const groups = new Map<string, Contribution[]>();
  for (const c of contribs) {
    const k = `${c.category}:${c.delta >= 0 ? "+" : "-"}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(c);
  }
  const finals: Contribution[] = [];
  let total = 0;
  for (const list of groups.values()) {
    list.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    list.forEach((c, i) => {
      const d = c.delta * (DECAY[i] ?? 0.05);
      total += d;
      finals.push({ ...c, weighted: Math.round(c.delta * 100) / 100, rank: i, delta: Math.round(d * 10) / 10 });
    });
  }
  return { total, finals };
}

function buildResult(ctx: ScoreContext, contribs: Contribution[], extraBonus: { value: number; reason: string } | null, layersText: string[]): PeriodScore {
  const base = 50;
  const { total, finals } = aggregate(contribs);
  let s = base + total;
  if (extraBonus) {
    s += extraBonus.value;
    finals.push({ category: "formation", layer: "월운", raw: extraBonus.value, delta: Math.round(extraBonus.value * 10) / 10, label: "월운 집중도", reason: extraBonus.reason, idx: {} });
  }
  const score = Math.max(5, Math.min(95, Math.round(s)));
  const byCategory = { spouseStar: 0, palace: 0, formation: 0, sustain: 0, instability: 0 } as Record<FactorCategory, number>;
  const byLayer = { 대운: 0, 세운: 0, 월운: 0, 운간: 0 } as Record<Layer, number>;
  const indices: Indices = { attraction: 0, formation: 0, sustain: 0, instability: 0 };
  for (const c of finals) {
    byCategory[c.category] = Math.round((byCategory[c.category] + c.delta) * 10) / 10;
    byLayer[c.layer] = Math.round((byLayer[c.layer] + c.delta) * 10) / 10;
    for (const [k, v] of Object.entries(c.idx)) indices[k as keyof Indices] += v as number;
  }
  for (const k of Object.keys(indices) as Array<keyof Indices>) indices[k] = Math.round(indices[k] * 10) / 10;

  // PART 15 유형 분류 — 단순히 합/충 여부가 아니라 지표 조합으로 판단
  const palaceEngaged = finals.some((c) => c.category === "palace" || c.label.includes("배우자궁"));
  const typeScores: Record<RelationshipType, number> = {
    A: indices.sustain * 1.2 + indices.formation * 0.5 - indices.instability * 0.6 + (palaceEngaged ? 1 : 0),
    B: indices.attraction * 0.7 + indices.instability * 0.9 + (palaceEngaged ? 0.5 : 0),
    C: indices.attraction * 0.6 + indices.formation * 0.4 - indices.sustain * 0.9 - (palaceEngaged ? 1.5 : 0),
  };
  const type = (Object.keys(typeScores) as RelationshipType[]).sort((a, b) => typeScores[b] - typeScores[a])[0];
  const typeReasons = typeReasonsOf(type, indices, finals, palaceEngaged);
  const signal = score >= 70 ? "강함" : score >= 56 ? "보통" : "약함";

  const kw = finals.filter((c) => c.keyword).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).map((c) => c.keyword!);
  if (indices.instability >= 5) kw.push("감정 기복 주의");
  if (indices.sustain >= 4) kw.push("관계 안정");
  const keywords = Array.from(new Set(kw)).slice(0, 4);
  const positives = finals.filter((c) => c.delta > 0 && c.label !== "월운 집중도").sort((a, b) => b.delta - a.delta).map((c) => `${c.label}: ${c.reason}`);
  const cautions = finals.filter((c) => c.delta < 0).sort((a, b) => a.delta - b.delta).map((c) => `${c.label}: ${c.reason}`);
  const partnerTraits = partnerTraitsOf(ctx, finals);
  const advice = adviceOf(type, indices);
  // 일반 사용자용 쉬운 설명 (명리 용어 없이)
  const uniq = (xs: string[]) => Array.from(new Set(xs.filter(Boolean)));
  const goodPlain = dropClashing(uniq(finals.filter((c) => c.delta >= 0.5 && c.label !== "월운 집중도").sort((a, b) => b.delta - a.delta).map((c) => plainOf(c, ctx.gender)))).slice(0, 3);
  const cautionPlain = uniq(finals.filter((c) => c.delta <= -0.5).sort((a, b) => a.delta - b.delta).map((c) => plainOf(c, ctx.gender))).slice(0, 2);
  const headline = headlineOf(score, goodPlain, cautionPlain);

  const evidence = ev({
    positions: ["일지(배우자궁)", "일간", "배우자성 위치"],
    chars: Array.from(new Set(finals.map((c) => c.label.split(" ")[0]))).slice(0, 8),
    tenGods: [sgOf(ctx.gender)],
    luck: layersText,
    relations: finals.filter((c) => /합|충|형|파|해|원진|귀문/.test(c.label)).map((c) => `${c.label}: ${c.reason}`),
    balance:
      positives.length && cautions.length
        ? `긍정 요소 ${positives.length}개와 주의 요소 ${cautions.length}개가 공존합니다. 점수는 둘을 함께 반영한 결과입니다.`
        : positives.length
          ? "주의 요소가 두드러지지 않는 시기입니다."
          : "관계 형성 요소가 두드러지지 않는 시기입니다.",
    reasoning: `기준점 ${base}점에서 범주별 기여(체감 가중 적용)를 더해 ${score}점. 범주 합계: ${Object.entries(byCategory).map(([k, v]) => `${CATEGORY_LABEL[k as FactorCategory]} ${v >= 0 ? "+" : ""}${v}`).join(", ")}. 유형 판정: ${TYPE_LABEL[type]}.`,
  });

  return { version: SCORE_VERSION, score, base, contributions: finals, byCategory, byLayer, indices, type, typeReasons, typeScores, signal, keywords, positives, cautions, partnerTraits, advice, evidence, headline, goodPlain, cautionPlain };
}

/** 점수 기여 항목을 명리 용어 없는 한 줄 설명으로 */
export function plainOf(c: Contribution, gender: "male" | "female"): string {
  const L = c.label;
  if (c.layer === "운간") return L.includes("충") ? "운의 흐름이 출렁이는 시기" : "운의 흐름이 서로 잘 맞물림";
  if (L === "월운 집중도") return "";
  if (L.includes("과다 부담")) return "관계가 부담처럼 느껴질 수 있음";
  if (L === "관살혼잡") return "여러 사람 사이에서 마음이 흔들릴 수 있음";
  if (L === "상관견관") return "상대의 단점이 크게 보여 말다툼 주의";
  if (L.includes("(변화의 계기)")) return "환경 변화 속에서 새로운 만남의 계기";
  if (L.includes("(안정성 저하)")) return "기존 관계가 흔들리기 쉬움";
  if (L.includes("원진 (끌림)")) return "이유 없이 끌리는 만남";
  if (L.includes("원진 (긴장)")) return "끌리면서도 미묘하게 불편함";
  if (L.startsWith("일간합")) return "마음이 끌리는 상대를 만나기 쉬움";
  if (L.startsWith("일간충")) return "마음이 흔들리고 판단이 급해지기 쉬움";
  if (L.startsWith("원국 배우자성")) return c.category === "formation" ? "잠잠하던 인연의 기운이 흔들리며 깨어남" : "잠재된 인연의 기운이 움직임";
  if (L === "배우자성 충") return "만나던 관계가 흔들릴 수 있음";
  if (L.startsWith("배우자궁 복음")) return "연애·결혼 문제가 삶의 화두가 됨";
  if (L.includes("신살")) {
    if (L.includes("도화")) return "매력이 돋보여 이성의 관심을 받기 쉬움";
    if (L.includes("천을귀인")) return "지인 소개나 주변의 도움으로 만남";
    if (L.includes("역마")) return "여행·이동·새 환경에서의 만남";
    if (L.includes("홍염")) return "분위기 있는 매력이 드러남";
    if (L.includes("금여")) return "좋은 배우자 인연의 상징";
    if (L.includes("화개")) return "혼자만의 시간에 몰입하기 쉬움";
  }
  if (c.category === "palace") return /반합|삼합|방합/.test(L) ? "주변 관계 속에서 자연스럽게 이어지는 인연" : /합/.test(L) ? "마음이 깊이 묶이는 만남" : "배우자 자리가 강조됨";
  if (c.category === "instability") {
    if (/자형$|형$/.test(L)) return "관계 속에서 갈등과 조율이 필요";
    if (/파$/.test(L)) return "약속·계획이 어긋나기 쉬움";
    if (/해$/.test(L)) return "말하지 않은 서운함이 쌓이기 쉬움";
    if (/귀문$/.test(L)) return "감정이 예민해지기 쉬움";
    if (/비견|겁재/.test(L)) return gender === "male" ? "경쟁자 등장·자기주장 충돌 주의" : "자기주장이 강해져 부딪히기 쉬움";
  }
  if (/암합/.test(L)) return "은근한 끌림, 조용히 시작되는 관계";
  if (c.category === "sustain") return /인/.test(L) ? "관계를 차분하고 안정적으로 다지는 흐름" : "오래 가는 관계에 유리";
  if (c.category === "spouseStar") {
    if (L.includes("지장간")) return "드러나지 않게 다가오는 인연의 기운";
    return /정재|정관/.test(L) ? "안정적인 인연의 기운이 들어옴" : "강하게 끌리는 인연의 기운이 들어옴";
  }
  if (/식신|상관/.test(L)) return gender === "male" ? "적극적으로 다가가기 좋은 시기" : "매력과 표현력이 살아나는 시기";
  if (/편인|정인/.test(L)) return "생각이 많아져 적극성이 줄어듦";
  if (/비견|겁재/.test(L)) return "친구·동료 관계에서 시작되는 인연";
  if (/편재|편관/.test(L)) return "시작은 빠르지만 지속성은 확인이 필요";
  return c.reason.split(/[—·(]/)[0].trim();
}

/**
 * 같은 칸(좋은 흐름)에 나란히 놓이면 서로 부정하는 표현 — 강한 끌림과 '은근한·드러나지 않는' 시작은 함께 쓰지 않는다.
 * 앞(점수 기여가 큰 것)을 남기고 뒤의 반대 표현을 뺀다.
 */
const CLASH_GROUPS: string[][] = [
  ["강하게 끌리는 인연의 기운이 들어옴", "매력이 돋보여 이성의 관심을 받기 쉬움", "이유 없이 끌리는 만남"],
  ["은근한 끌림, 조용히 시작되는 관계", "드러나지 않게 다가오는 인연의 기운"],
];
function dropClashing(xs: string[]): string[] {
  const groupOf = (x: string) => CLASH_GROUPS.findIndex((g) => g.includes(x));
  const kept: string[] = [];
  for (const x of xs) {
    const g = groupOf(x);
    if (g >= 0 && kept.some((k) => groupOf(k) >= 0 && groupOf(k) !== g)) continue;
    kept.push(x);
  }
  return kept;
}

function headlineOf(score: number, good: string[], bad: string[]): string {
  const g = good.slice(0, 2).join(", ");
  const b = bad[0];
  if (score >= 68) return `인연 신호가 뚜렷한 시기 — ${g || "관계 형성에 유리한 흐름"}${b ? ` (다만 ${b})` : ""}`;
  if (score >= 58) return `인연의 흐름이 있는 시기 — ${g || "새로운 만남이 가능한 흐름"}${b ? ` (다만 ${b})` : ""}`;
  if (score >= 48) return `평범한 시기 — ${good[0] ? `작은 계기: ${good[0]}` : "큰 변화 없이 잔잔한 흐름"}`;
  return `조용한 시기 — ${b ? `${b}. ` : ""}자기 시간에 집중하기 좋음`;
}

function typeReasonsOf(type: RelationshipType, i: Indices, finals: Contribution[], palace: boolean): string[] {
  const r: string[] = [];
  const top = (pred: (c: Contribution) => boolean) => finals.filter(pred).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 2).map((c) => c.label);
  if (type === "A") {
    r.push(`지속성 지표 ${i.sustain}이(가) 불안정 지표 ${i.instability}보다 상대적으로 큽니다.`);
    const s = top((c) => (c.idx.sustain ?? 0) > 0);
    if (s.length) r.push(`지속성에 기여한 요소: ${s.join(", ")}`);
    r.push(palace ? "배우자궁(일지)이 이 시기의 운과 직접 관계를 맺습니다." : "배우자궁의 직접 작용은 약하므로, 상대의 가치관과 책임감을 시간을 두고 확인하는 것이 좋습니다.");
    r.push("관계 형성 요소가 있더라도 실제 상대의 가치관·책임감은 직접 확인해야 합니다.");
  } else if (type === "B") {
    r.push(`끌림 지표 ${i.attraction}과(와) 불안정 지표 ${i.instability}가 함께 높습니다.`);
    const a = top((c) => (c.idx.attraction ?? 0) > 0);
    const b = top((c) => c.delta < 0);
    if (a.length) r.push(`강한 끌림 요소: ${a.join(", ")}`);
    if (b.length) r.push(`변화·갈등 요소: ${b.join(", ")}`);
    r.push("끌림이 강한 만큼 성급하게 관계를 결정하기보다, 갈등이 생겼을 때 서로 어떻게 대응하는지 지켜보는 것이 좋습니다.");
  } else {
    r.push(`끌림·형성 지표(${i.attraction}/${i.formation})에 비해 지속성 지표(${i.sustain})가 낮습니다.`);
    if (!palace) r.push("배우자궁(일지)과 운의 직접적인 결합이 약해, 관계가 일상 깊숙이 자리 잡기까지 시간이 필요할 수 있습니다.");
    const a = top((c) => c.delta > 0);
    if (a.length) r.push(`단기적 관심을 만드는 요소: ${a.join(", ")}`);
    r.push("가벼운 만남을 부정적으로 보는 것이 아니라, 관계의 지속성을 신중하게 판단하라는 의미입니다.");
  }
  return r;
}

function partnerTraitsOf(ctx: ScoreContext, finals: Contribution[]): string[] {
  const traits: string[] = [];
  const tgs = finals.map((c) => c.label.match(/(정재|편재|정관|편관|식신|상관|비견|겁재|편인|정인)/)?.[1]).filter(Boolean) as TenGod[];
  // 사람의 모습은 그 달에 가장 크게 작용한 기운 하나로만 그린다 — 두 유형을 나란히 쓰면 "반듯한 사람 / 카리스마 있는 사람"처럼 한 사람으로 읽히지 않는다
  for (const tg of Array.from(new Set(tgs)).slice(0, 1)) traits.push(TEN_GOD_INFO[tg].partnerType);
  // 만남의 계기는 '이동·변화'와 '생활 속·주변'이 서로 반대라, 점수 기여가 더 큰 쪽만 쓴다
  const sum = (pred: (c: Contribution) => boolean) => finals.filter(pred).reduce((a, c) => a + Math.abs(c.delta), 0);
  const isMove = (c: Contribution) => (c.label.includes("충") && c.category === "formation") || c.label.includes("역마");
  const isNear = (c: Contribution) => (c.label.includes("합") && c.category === "palace") || c.label.includes("천을귀인");
  const moveWins = sum(isMove) >= sum(isNear);
  if (moveWins || !finals.some(isNear)) {
    if (finals.some((c) => c.label.includes("충") && c.category === "formation")) traits.push("기존에 만나던 유형과 다른 사람, 또는 이동·환경 변화 중에 만나는 사람");
    else if (finals.some((c) => c.label.includes("역마"))) traits.push("여행·출장·이사 등 이동 중에 만나는 사람");
  }
  if (!moveWins || !finals.some(isMove)) {
    if (finals.some((c) => c.label.includes("합") && c.category === "palace")) traits.push("정이 깊고 생활 속에서 자연스럽게 가까워지는 사람");
    if (finals.some((c) => c.label.includes("천을귀인"))) traits.push("지인 소개나 도움을 주고받는 관계에서 만나는 사람");
  }
  if (finals.some((c) => c.label.includes("도화"))) traits.push("외적 매력이 뚜렷하고 첫인상이 강한 사람");
  if (!traits.length) traits.push(ctx.gender === "male" ? "일상 속에서 편안하게 대화가 통하는 사람" : "일상 속에서 신뢰를 쌓아 가는 사람");
  return Array.from(new Set(traits)).slice(0, 4);
}

function adviceOf(type: RelationshipType, i: Indices): string[] {
  const a: string[] = [];
  // 결과 화면의 다른 문장과 같은 해요체로
  if (type === "A") a.push("상대의 가치관·생활 습관·책임감을 대화로 차분히 확인해 보세요.", "관계의 속도를 서로 맞추면 안정적으로 발전하기 쉬운 시기예요.");
  if (type === "B") a.push("강한 끌림이 있어도 결정을 서두르지 마세요.", "갈등이 생겼을 때 서로 어떻게 대화하고 회복하는지 지켜보세요.");
  if (type === "C") a.push("즐거운 만남을 누리되 기대는 조금 내려놓으세요.", "관계를 이어 가고 싶다면 서로 얼마나 진지한지 분명히 확인해 보세요.");
  if (i.instability >= 6) a.push("감정이 크게 흔들릴 수 있는 시기라, 중요한 결정은 한 박자 늦추는 게 좋아요.");
  return a;
}

function layerText(layer: string, info: LuckPillarInfo): string {
  return `${layer} ${info.ganzhi} (천간 ${info.stemTenGod} / 지지 ${info.branchTenGod}, 십이운성 ${info.stage}${info.incomingShinsal.length ? `, 신살 ${info.incomingShinsal.join("·")}` : ""})`;
}

export function scoreYear(
  ctx: ScoreContext,
  seyun: LuckPillarInfo & { relations: Relation[]; luckRelations: Relation[] },
  daewoon: (LuckPillarInfo & { relations: Relation[] }) | null,
  monthScores: number[],
): PeriodScore {
  const contribs: Contribution[] = [
    ...evaluateLayer(ctx, { layer: "세운", weight: 1, info: seyun, relations: seyun.relations }),
    ...(daewoon ? evaluateLayer(ctx, { layer: "대운", weight: 0.45, info: daewoon, relations: daewoon.relations }) : []),
    ...luckToLuck(seyun.luckRelations, "세운"),
  ];
  let bonus: { value: number; reason: string } | null = null;
  if (monthScores.length) {
    const top3 = [...monthScores].sort((a, b) => b - a).slice(0, 3);
    const avg = top3.reduce((a, b) => a + b, 0) / top3.length;
    const v = Math.max(-3, Math.min(5, (avg - 55) * 0.25));
    bonus = { value: v, reason: `해당 연도 월운 상위 3개월 평균 ${avg.toFixed(1)}점을 반영(±최대 5점)` };
  }
  return buildResult(ctx, contribs, bonus, [layerText("세운", seyun), ...(daewoon ? [layerText("대운", daewoon)] : [])]);
}

export function scoreMonth(
  ctx: ScoreContext,
  wolun: LuckPillarInfo & { relations: Relation[]; luckRelations: Relation[] },
  seyun: LuckPillarInfo & { relations: Relation[] },
  daewoon: (LuckPillarInfo & { relations: Relation[] }) | null,
): PeriodScore {
  const contribs: Contribution[] = [
    ...evaluateLayer(ctx, { layer: "월운", weight: 1, info: wolun, relations: wolun.relations }),
    ...evaluateLayer(ctx, { layer: "세운", weight: 0.45, info: seyun, relations: seyun.relations }),
    ...(daewoon ? evaluateLayer(ctx, { layer: "대운", weight: 0.25, info: daewoon, relations: daewoon.relations }) : []),
    ...luckToLuck(wolun.luckRelations, "월운"),
  ];
  return buildResult(ctx, contribs, null, [layerText("월운", wolun), layerText("세운", seyun), ...(daewoon ? [layerText("대운", daewoon)] : [])]);
}

export type { Source };
