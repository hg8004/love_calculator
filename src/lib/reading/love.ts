/**
 * 배우자궁·배우자성 분석 — 「배우자궁과 배우자성 분석 지침」을 따른다.
 *
 *  A. 배우자궁(일지): 오행·음양·십신·지장간 → 세력(월령·통근·투간·생조·극) → 안정성(합충형파해)
 *  B. 배우자성(남 재성 / 여 관성): 천간 투출 + 네 지지의 지장간 전부 → 위치·세력·통근·월령·생조·극제·합거·충
 *  C. 배우자궁과 배우자성의 상호작용
 *  D. 배우자성이 약하거나 드러나지 않을 때의 보조 분석 (보조 자료는 배우자성 자체와 동일시하지 않음)
 *  E. 대운·세운의 시기적 작용 (원국 분석 이후 보조적으로)
 *  F. 종합 — 확인된 사실 / 명리학적 추론 / 판단의 한계를 구분
 *
 * 원칙: 배우자궁과 배우자성을 합쳐 판단하지 않는다. 다른 기둥을 배우자궁의 대체물로 쓰지 않는다.
 *       배우자성 부재 ≠ 결혼 불가·배우자 부재. 일지가 약함 ≠ 배우자복 없음. 합=길, 충=흉으로 단순화하지 않는다.
 *       배우자의 외모·직업·성격·결혼 시기·이혼 여부를 확정하지 않는다.
 * 모든 문장은 사주를 모르는 사람도 읽을 수 있게 쉬운 말로 쓴다.
 */
import {
  BRANCHES, BRANCH_ELEMENT, BRANCH_YINYANG, ELEMENT_KO, Element, STEM_ELEMENT, TEN_GOD_GROUP, TenGod, TenGodGroup,
  controls, elementOfGroup, generates, mainHiddenStem, tenGodOf,
} from "../saju/constants";
import type { NatalChart, PillarKey } from "../saju/chart";
import { TG_TAG } from "./reading";
import { NATURE } from "../love/summary";

export type Role = "본기" | "중기" | "여기";

export const PILLAR_NAME: Record<PillarKey, string> = { year: "연주", month: "월주", day: "일주", hour: "시주" };

/** 십신을 쉬운 말로 */
export const TEN_GOD_PLAIN: Record<TenGod, string> = {
  비견: "나와 닮은 기운", 겁재: "경쟁하는 기운", 식신: "여유와 재능", 상관: "재치와 표현", 편재: "활동적인 재물",
  정재: "성실한 재물", 편관: "강한 책임감", 정관: "반듯한 질서", 편인: "독특한 직관", 정인: "보살핌과 배움",
};

/** 만세력에 따라 넣지 않기도 하는 여기(餘氣) — 지침 예시(본기 중심 표)에는 없는 글자 */
const OPTIONAL_YEOGI = new Set(["0-8", "3-0", "6-2", "9-6", "11-4"]); // 子壬 卯甲 午丙 酉庚 亥戊

const roleOf = (len: number, i: number): Role => (i === len - 1 ? "본기" : len === 3 && i === 1 ? "중기" : "여기");
const ROLE_W: Record<Role, number> = { 본기: 0.8, 중기: 0.4, 여기: 0.2 };
const ADJ: Record<string, boolean> = { 월지: true, 시지: true };

export interface StarOccurrence {
  pillar: PillarKey;
  where: string;
  layer: "천간" | "지장간";
  role?: Role;
  char: string;
  tenGod: TenGod;
  weight: number;
  optional?: boolean;
}

export interface PalaceAnalysis {
  char: string;
  element: Element;
  yinYang: string;
  tenGod: TenGod;
  hidden: Array<{ char: string; role: Role; tenGod: TenGod; isStar: boolean; optional: boolean }>;
  force: { level: "강" | "중" | "약"; score: number; factors: string[] };
  stability: { level: "안정" | "변화 요소 있음" | "흔들림 큼"; items: string[] };
  summary: string;
}

export interface StarAnalysis {
  name: string;
  group: TenGodGroup;
  element: Element;
  occurrences: StarOccurrence[];
  revealed: boolean;
  /** 많음 = 여러 기둥에 퍼져 있고 월령·투출까지 얻은 상태(관살 과다·재다) */
  level: "많음" | "유력" | "보통" | "약함" | "근거 제한적";
  score: number;
  factors: string[];
  mixed: string | null;
  summary: string;
}

export interface LoveAnalysis {
  starName: string;
  starExplain: string;
  palace: PalaceAnalysis;
  star: StarAnalysis;
  interaction: { summary: string; detail: string[] };
  type: { code: "A" | "B" | "C" | "D"; title: string; summary: string };
  support: { summary: string; items: string[] } | null;
  overview: Array<{ t: string; b?: boolean }>;
  overviewText: string;
  partner: { intro: string; story: Array<{ t: string; b?: boolean }>; storyText: string; items: PartnerItem[] };
  /** 배우자 자리에 얹힌 전통 표지(공망·괴강·양인·백호·도화·홍염·고신/과숙) */
  marks: PalaceMark[];
  conclusion: { facts: string[]; inferences: string[]; limits: string[] };
}

function elName(e: Element) {
  return `${ELEMENT_KO[e]}(${e})`;
}

export function findStarOccurrences(chart: NatalChart, gender: "male" | "female"): StarOccurrence[] {
  const sg: TenGodGroup = gender === "male" ? "재성" : "관성";
  const out: StarOccurrence[] = [];
  for (const k of ["year", "month", "day", "hour"] as PillarKey[]) {
    const p = chart.pillars[k];
    if (!p) continue;
    if (k !== "day" && p.stemTenGod !== "일간" && TEN_GOD_GROUP[p.stemTenGod] === sg) {
      out.push({ pillar: k, where: `${PILLAR_NAME[k]} 천간`, layer: "천간", char: p.stemChar, tenGod: p.stemTenGod, weight: 1 });
    }
    p.hidden.forEach((h, i) => {
      if (TEN_GOD_GROUP[h.tenGod] !== sg) return;
      const role = roleOf(p.hidden.length, i);
      const optional = OPTIONAL_YEOGI.has(`${p.branch}-${h.stem}`);
      out.push({ pillar: k, where: `${PILLAR_NAME[k]} 지지 ${p.branchChar} 속`, layer: "지장간", role, char: h.char, tenGod: h.tenGod, weight: optional ? 0.1 : ROLE_W[role], optional });
    });
  }
  return out;
}

function stemsAndMains(chart: NatalChart): Array<{ where: string; el: Element }> {
  const out: Array<{ where: string; el: Element }> = [];
  for (const k of ["year", "month", "day", "hour"] as PillarKey[]) {
    const p = chart.pillars[k];
    if (!p) continue;
    out.push({ where: `${PILLAR_NAME[k]} 천간`, el: p.stemElement });
    out.push({ where: `${PILLAR_NAME[k]} 지지`, el: STEM_ELEMENT[mainHiddenStem(p.branch)] });
  }
  return out;
}

function analyzePalace(chart: NatalChart, gender: "male" | "female"): PalaceAnalysis {
  const sg: TenGodGroup = gender === "male" ? "재성" : "관성";
  const day = chart.pillars.day!;
  const el = BRANCH_ELEMENT[day.branch];
  const factors: string[] = [];
  let score = 0;

  // 월령
  const monthEl = BRANCH_ELEMENT[chart.monthBranch];
  if (monthEl === el) { score += 2; factors.push(`태어난 계절(월지 ${BRANCHES[chart.monthBranch]})이 같은 ${elName(el)} 기운이라 힘을 얻어요. (월령)`); }
  else if (generates(monthEl, el)) { score += 1.5; factors.push(`태어난 계절(월지 ${BRANCHES[chart.monthBranch]}, ${elName(monthEl)})이 배우자 자리를 키워 줘요. (월령의 생조)`); }
  else if (controls(monthEl, el)) { score -= 1.5; factors.push(`태어난 계절(월지 ${BRANCHES[chart.monthBranch]}, ${elName(monthEl)})이 배우자 자리를 눌러요. (월령의 극)`); }
  else factors.push(`태어난 계절(월지 ${BRANCHES[chart.monthBranch]})은 배우자 자리를 직접 돕지도 누르지도 않아요.`);

  // 통근: 다른 지지의 지장간에 같은 오행
  let root = 0;
  const roots: string[] = [];
  for (const k of ["year", "month", "hour"] as PillarKey[]) {
    const p = chart.pillars[k];
    if (!p) continue;
    // 지지마다 가장 강한 뿌리 하나만 센다
    let best: Role | null = null;
    for (let i = 0; i < p.hidden.length; i++) {
      if (STEM_ELEMENT[p.hidden[i].stem] !== el) continue;
      const cand = roleOf(p.hidden.length, i);
      if (best === null || ROLE_W[cand] > ROLE_W[best]) best = cand;
    }
    if (best === null) continue;
    const r: Role = best;
    root += r === "본기" ? 1 : r === "중기" ? 0.5 : 0.3;
    roots.push(`${PILLAR_NAME[k]} ${p.branchChar}(${r})`);
  }
  root = Math.min(2, root);
  score += root;
  factors.push(roots.length ? `다른 지지에도 같은 ${elName(el)} 기운의 뿌리가 있어요: ${roots.join(", ")}. (통근)` : `다른 지지에는 같은 ${elName(el)} 기운의 뿌리가 없어요.`);

  // 투간: 일지 지장간이 천간에 드러남
  const stemsAll = (["year", "month", "day", "hour"] as PillarKey[]).map((k) => chart.pillars[k]?.stem).filter((x): x is number => x !== undefined);
  const revealed = day.hidden.filter((h) => stemsAll.includes(h.stem));
  if (revealed.length) {
    score += revealed.some((h) => h.role === "정기") ? 1 : 0.5;
    factors.push(`배우자 자리 속 글자(${revealed.map((h) => h.char).join("·")})가 천간에도 드러나 있어요. (투간)`);
  }

  // 생조와 극
  const all = stemsAndMains(chart).filter((x) => x.where !== "일주 지지");
  const helpers = all.filter((x) => generates(x.el, el));
  const pressers = all.filter((x) => controls(x.el, el));
  if (helpers.length) { score += Math.min(1.5, helpers.length * 0.5); factors.push(`배우자 자리를 키워 주는 ${elName(helpers[0].el)} 기운이 ${helpers.length}곳 있어요. (생조)`); }
  if (pressers.length) { score -= Math.min(2, pressers.length * 0.5); factors.push(`배우자 자리를 누르는 ${elName(pressers[0].el)} 기운이 ${pressers.length}곳 있어요. (극)`); }

  // 전체 오행 세력
  const w = chart.elements.weighted[el];
  if (w >= 25) { score += 1; factors.push(`사주 전체에서 ${elName(el)} 기운이 ${w}%로 넉넉해요.`); }
  else if (w <= 8) { score -= 1; factors.push(`사주 전체에서 ${elName(el)} 기운이 ${w}%로 적어요.`); }

  const level: PalaceAnalysis["force"]["level"] = score >= 3 ? "강" : score >= 1 ? "중" : "약";

  // 안정성
  const items: string[] = [];
  let chung = false;
  let minor = false;
  for (const r of chart.relations.filter((x) => x.involvesDayBranch)) {
    const other = r.members.find((m) => m.pos !== "일지");
    if (!other) continue;
    const near = ADJ[other.pos] ? "바로 옆" : "떨어진";
    const pk: PillarKey = other.pos.startsWith("년") ? "year" : other.pos.startsWith("월") ? "month" : "hour";
    const w2 = `${PILLAR_NAME[pk]}의 ${other.char}`;
    if (r.kind === "충") { chung = true; items.push(`${near} ${w2}와(과) 정면으로 부딪혀요(충). 변화·이동이 생기기 쉬운 대신, 새로운 계기가 되기도 해요.`); }
    else if (r.kind === "형" || r.kind === "자형") { minor = true; items.push(`${w2}와(과) 서로 긴장하는 관계예요(형). 관계 안에서 조율할 일이 생기기 쉬워요.`); }
    else if (r.kind === "파" || r.kind === "해" || r.kind === "원진") { minor = true; items.push(`${w2}와(과) 미묘하게 어긋나는 관계예요(${r.kind}). 작은 서운함이 쌓이지 않게 살피면 좋아요.`); }
    else if (["육합", "반합", "삼합", "방합"].includes(r.kind)) {
      const strong = r.transform?.possibility === "높음" && r.element !== el;
      if (strong) minor = true;
      items.push(strong
        ? `${w2}와(과) 강하게 묶여(합) 다른 기운(${elName(r.element!)})으로 바뀌려는 힘이 있어요. 끈끈함과 함께, 배우자 자리 본래의 성질이 옅어질 수 있어요.`
        : `${w2}와(과) 잘 어울려요(합). 친밀함의 상징이지만, 합이라서 무조건 좋다고 보지는 않아요.`);
    } else if (r.kind === "암합") items.push(`${w2}와(과) 겉으로 드러나지 않게 이어져 있어요(암합).`);
  }
  if (!items.length) items.push("다른 글자와 부딪히거나 묶이는 관계가 없어 비교적 조용한 자리예요.");
  const stability: PalaceAnalysis["stability"]["level"] = chung ? "흔들림 큼" : minor ? "변화 요소 있음" : "안정";

  const hidden = day.hidden.map((h, i) => ({
    char: h.char, role: roleOf(day.hidden.length, i), tenGod: h.tenGod, isStar: TEN_GOD_GROUP[h.tenGod] === sg,
    optional: OPTIONAL_YEOGI.has(`${day.branch}-${h.stem}`),
  }));
  const forceWord = level === "강" ? "힘이 넉넉하고" : level === "중" ? "힘이 무난하고" : "힘이 약한 편이고";
  const stabWord = stability === "안정" ? "주변과 부딪힘이 적어요" : stability === "흔들림 큼" ? "부딪힘(충)이 있어 변화가 많은 자리예요" : "작은 긴장 관계가 있어요";
  return {
    char: day.branchChar, element: el, yinYang: BRANCH_YINYANG[day.branch], tenGod: day.branchTenGod, hidden,
    force: { level, score: Math.round(score * 10) / 10, factors },
    stability: { level: stability, items },
    summary: `배우자 자리는 ${day.branchChar}, ${ELEMENT_KO[el]}(${el}) 기운이에요. ${forceWord}, ${stabWord}.`,
  };
}

function analyzeStar(chart: NatalChart, gender: "male" | "female"): StarAnalysis {
  const ds = chart.dayStem;
  const sg: TenGodGroup = gender === "male" ? "재성" : "관성";
  const el = elementOfGroup(ds, sg);
  const name = gender === "male" ? "재성" : "관성";
  const jeong: TenGod = gender === "male" ? "정재" : "정관";
  const pyeon: TenGod = gender === "male" ? "편재" : "편관";
  const occ = findStarOccurrences(chart, gender);
  const factors: string[] = [];
  let score = occ.reduce((a, o) => a + o.weight, 0);
  const revealed = occ.some((o) => o.layer === "천간");

  if (!occ.length) {
    factors.push(`천간에도, 네 지지 속(지장간)에도 이성의 별(${name})이 없어요.`);
  } else {
    factors.push(revealed ? `천간에 이성의 별이 드러나 있어요: ${occ.filter((o) => o.layer === "천간").map((o) => `${o.where} ${o.char}(${o.tenGod})`).join(", ")}. (투출)` : "천간에는 드러나지 않고, 지지 속(지장간)에만 있어요.");
    const hiddenOcc = occ.filter((o) => o.layer === "지장간");
    if (hiddenOcc.length)
      factors.push(`지지 속에 있는 이성의 별: ${hiddenOcc.map((o) => `${o.where} ${o.char}(${o.tenGod}, ${o.role}${o.optional ? "·학파에 따라 빼기도 함" : ""})`).join(", ")}.`);
    if (occ.every((o) => o.layer === "지장간" && (o.role === "여기" || o.optional))) factors.push("모두 '여기'(앞 계절에서 넘어온 약한 기운)에만 있어 근거가 약해요.");
  }
  // 통근: 천간에 드러난 별이 지지에 뿌리를 두는가
  if (revealed) {
    // 지지 속에 같은 오행(이성의 별)이 있으면 뿌리를 둔 것으로 본다
    const rooted = occ.some((o) => o.layer === "지장간" && !o.optional && o.role !== "여기");
    if (rooted) { score += 0.5; factors.push("드러난 이성의 별이 지지에 뿌리를 두고 있어요. (통근)"); }
    else factors.push("드러난 이성의 별이 지지에 뚜렷한 뿌리가 없어 힘이 약해질 수 있어요.");
  }
  // 월령
  const monthEl = BRANCH_ELEMENT[chart.monthBranch];
  if (monthEl === el) { score += 1; factors.push(`태어난 계절이 이성의 별과 같은 ${elName(el)} 기운이에요. (월령)`); }
  else if (generates(monthEl, el)) { score += 0.5; factors.push(`태어난 계절이 이성의 별(${elName(el)})을 키워 줘요.`); }
  else if (controls(monthEl, el)) { score -= 0.5; factors.push(`태어난 계절이 이성의 별(${elName(el)})을 눌러요.`); }
  // 생조·극제
  const w = chart.tenGodWeighted;
  const helperGroup: TenGodGroup = gender === "male" ? "식상" : "재성";
  const pressGroup: TenGodGroup = gender === "male" ? "비겁" : "식상";
  if (occ.length) {
    if (w[helperGroup] >= 12) { score += 0.5; factors.push(`이성의 별을 키워 주는 ${helperGroup}(${w[helperGroup]}%)이 있어요. (생조)`); }
    if (w[pressGroup] >= 25) { score -= 1; factors.push(`이성의 별을 누르는 ${pressGroup}(${w[pressGroup]}%)이 강해요. (극제)`); }
    else if (w[pressGroup] >= 12) { score -= 0.3; factors.push(`이성의 별을 누르는 ${pressGroup}(${w[pressGroup]}%)이 조금 있어요.`); }
  }
  // 합거·충
  const keyOfPos = (pos: string): PillarKey => (pos.startsWith("년") ? "year" : pos.startsWith("월") ? "month" : pos.startsWith("일") ? "day" : "hour");
  for (const r of chart.relations) {
    if (r.kind === "천간합") {
      // 천간에 드러난 이성의 별이 합에 참여하는가
      const starMember = r.members.find((m) => m.pos !== "일간" && occ.some((o) => o.layer === "천간" && o.pillar === keyOfPos(m.pos)));
      if (!starMember) continue;
      if (r.involvesDayStem) factors.push(`천간의 이성의 별 ${starMember.char}이(가) 나(일간)와 합해요 — 나에게 마음이 가는 구조로 봐요.`);
      else { score -= 0.5; factors.push(`천간의 이성의 별 ${starMember.char}이(가) 다른 글자와 묶여(합거) 힘이 분산될 수 있어요.`); }
    }
    if (r.kind === "충") {
      for (const m of r.members) {
        const k = keyOfPos(m.pos);
        if (occ.some((o) => o.pillar === k && o.layer === "지장간" && o.role === "본기")) {
          score -= 0.5;
          factors.push(`이성의 별이 들어 있는 ${PILLAR_NAME[k]} 지지 ${m.char}이(가) 충을 받아 흔들려요.`);
        }
      }
    }
  }
  const strongOcc = (t: TenGod) => occ.some((o) => o.tenGod === t && (o.layer === "천간" || (o.role === "본기" && !o.optional)));
  const mixed = strongOcc(jeong) && strongOcc(pyeon)
    ? `${jeong}(${occ.filter((o) => o.tenGod === jeong).map((o) => o.where).join(", ")})과(와) ${pyeon}(${occ.filter((o) => o.tenGod === pyeon).map((o) => o.where).join(", ")})이(가) 함께 뚜렷해요. 서로 다른 성향의 이성에게 마음이 갈 수 있어, 각각의 위치와 힘을 따로 봐요.`
    : null;
  const s = Math.round(score * 10) / 10;
  const onlyWeak = occ.length > 0 && occ.every((o) => o.layer === "지장간" && (o.role === "여기" || o.optional));
  // 많음(과다): 이성의 별이 세 기둥 이상에 뚜렷하고(본기·천간), 투출했거나 월령을 얻었으면
  // 극제·충으로 점수가 깎여도 '보통'이 아니라 과다로 본다 — 전통적으로 관살 과다·재다는 별도 구조로 읽기 때문
  const strongPillars = new Set(occ.filter((o) => o.layer === "천간" || (o.role === "본기" && !o.optional)).map((o) => o.pillar));
  const excess = strongPillars.size >= 3 && (revealed || monthEl === el);
  const weakMe = chart.strength.score < 40;
  const level: StarAnalysis["level"] = !occ.length ? "근거 제한적" : excess ? "많음" : onlyWeak ? "약함" : s >= 2.2 ? "유력" : s >= 1 ? "보통" : "약함";
  if (excess) factors.unshift(`이성의 별이 ${[...strongPillars].map((k) => PILLAR_NAME[k]).join("·")} 여러 기둥에 뚜렷해요. (${gender === "female" ? "관살 과다" : "재다"})`);
  const excessName = gender === "female" ? "관살 과다" : "재다";
  const summary =
    level === "근거 제한적" ? `사주 안에서 이성의 별(${name})을 찾을 수 없어요. 그렇다고 인연이 없다는 뜻은 아니에요. 판단 근거가 제한적이라, 운에서 이성의 별이 들어오는 시기를 함께 봐요.`
      : level === "많음" ? `이성의 별(${name})이 사주 여러 자리에 많아요(${excessName}). 이성의 관심과 인연이 자주 들어오는 사주예요.${weakMe ? " 다만 나의 기운이 여린 편이라, 많은 인연 중에서 나를 지치게 하는 사람보다 나를 품어 주는 사람을 골라야 해요." : ""}`
      : level === "유력" ? `이성의 별(${name})이 뚜렷하고 힘도 있는 편이에요.`
        : level === "보통" ? `이성의 별(${name})이 있고, 힘은 보통이에요.`
          : `이성의 별(${name})이 있긴 하지만 힘이 약하거나 숨어 있는 편이에요.`;
  return { name, group: sg, element: el, occurrences: occ, revealed, level, score: s, factors, mixed, summary };
}

export interface PalaceMark {
  name: string;
  text: string;
  basis: string;
}

/** 순(旬)의 공망 두 지지 — 그 간지가 속한 순(甲으로 시작하는 10간지)에 들지 못한 두 지지 */
export function xunEmpty(stem: number, branch: number): [number, number] {
  const b0 = (((branch - stem) % 12) + 12) % 12; // 그 순의 甲이 앉은 지지
  return [(b0 + 10) % 12, (b0 + 11) % 12];
}

/**
 * 배우자 자리(일지)에 얹힌 전통 표지 — 명리에서 배우자 인연을 볼 때 빠지지 않는 항목들.
 *  - 공망: 일지는 년주 기준(일주 기준으로는 일지가 공망이 될 수 없음), 이성의 별은 일주 기준
 *  - 일주·일지 신살: 괴강·백호(일주), 양인·도화·홍염(일지), 고신(남)·과숙(여)
 * 원국에 고정된 표지라 월별 비교 점수에는 넣지 않고(모든 달에 같게 작용), 해석에만 쓴다.
 * 문장은 단정·공포 표현 없이 '그래서 이런 사람·관계가 잘 맞는다'로 끝맺는다.
 */
export function palaceMarks(chart: NatalChart, gender: "male" | "female"): PalaceMark[] {
  const out: PalaceMark[] = [];
  const day = chart.pillars.day!;
  const year = chart.pillars.year!;
  const has = (name: string, where: (p: string) => boolean) => chart.shinsal.some((s) => s.name === name && s.positions.some(where));
  const onDayBranch = (p: string) => p.startsWith("일지");
  const onDayPillar = (p: string) => p.startsWith("일주");

  const [ye1, ye2] = xunEmpty(year.stem, year.branch);
  if (day.branch === ye1 || day.branch === ye2) {
    out.push({
      name: "배우자 자리 공망",
      text: "배우자 자리가 공망(비어 있는 자리)에 걸려 있어, 마음에 드는 사람을 만나도 확신이 서기까지 시간이 걸리는 편이에요. 서두르기보다 충분히 알아 간 뒤에 맺는 인연이 오래가요.",
      basis: `년주 ${year.stemChar}${year.branchChar} 기준 공망 ${BRANCHES[ye1]}·${BRANCHES[ye2]} — 일지 ${day.branchChar}`,
    });
  }
  const sg: TenGodGroup = gender === "male" ? "재성" : "관성";
  const [de1, de2] = xunEmpty(day.stem, day.branch);
  const emptyStar = (["year", "month", "hour"] as PillarKey[]).filter((k) => {
    const p = chart.pillars[k];
    return p && (p.branch === de1 || p.branch === de2) && TEN_GOD_GROUP[tenGodOf(chart.dayStem, mainHiddenStem(p.branch))] === sg;
  });
  if (emptyStar.length) {
    out.push({
      name: "이성의 별 공망",
      text: `이성의 별이 들어 있는 ${emptyStar.map((k) => `${PILLAR_NAME[k]} ${chart.pillars[k]!.branchChar}`).join("·")} 자리가 공망이라, 그 인연은 생각보다 늦게 실감 나는 편이에요. 운에서 그 글자를 채우거나 깨우는 해에 비로소 힘을 받아요.`,
      basis: `일주 ${day.stemChar}${day.branchChar} 기준 공망 ${BRANCHES[de1]}·${BRANCHES[de2]}`,
    });
  }
  if (has("괴강살", onDayPillar))
    out.push({
      name: "괴강 일주",
      text: "배우자 자리에 아주 강한 기운(괴강)이 있어, 관계에서 자존심과 주도권이 부딪히기 쉬워요. 그래서 나만큼 단단하고 그릇이 큰 사람이어야 기 싸움 없이 오래가요.",
      basis: `일주 ${day.stemChar}${day.branchChar} 괴강${gender === "female" ? " (전통적으로 여성의 괴강 일주를 특히 중시)" : ""}`,
    });
  if (has("양인살", onDayBranch))
    out.push({
      name: "일지 양인",
      text: "배우자 자리에 양인(칼날처럼 강한 기운)이 있어, 상대도 개성이 강한 사람일 가능성이 크고 서로 기 싸움이 생기기 쉬워요. 각자의 영역을 정해 두면 든든한 동반자가 돼요.",
      basis: `일간 ${day.stemChar}의 양인 ${day.branchChar}이(가) 일지`,
    });
  if (has("백호살", onDayPillar))
    out.push({
      name: "백호 일주",
      text: "배우자 자리에 백호가 있어, 관계에서 일이 생기면 크고 빠르게 번지는 편이에요. 감정이 격해졌을 때 큰 결정만 미루면, 그 강한 기운이 오히려 서로를 지키는 힘이 돼요.",
      basis: `일주 ${day.stemChar}${day.branchChar} 백호`,
    });
  if (has("도화살", onDayBranch))
    out.push({
      name: "일지 도화",
      text: "배우자 자리에 도화가 있어, 매력이 뚜렷한 사람과 인연이 닿기 쉽고 연애에서도 설렘을 중요하게 여겨요.",
      basis: `년지 기준 도화 ${day.branchChar}이(가) 일지`,
    });
  if (has("홍염살", onDayBranch))
    out.push({
      name: "일지 홍염",
      text: "배우자 자리에 홍염이 있어, 분위기와 감성이 통하는 사람에게 깊이 끌려요.",
      basis: `일간 ${day.stemChar} 기준 홍염 ${day.branchChar}이(가) 일지`,
    });
  // 전통적으로 남성은 고신, 여성은 과숙을 배우자 인연에서 본다
  const lonely = gender === "male" ? "고신살" : "과숙살";
  if (has(lonely, () => true))
    out.push({
      name: gender === "male" ? "고신" : "과숙",
      text: `사주에 ${gender === "male" ? "고신" : "과숙"}(혼자만의 영역을 지키려는 기운)이 있어, 연애에 마음을 늦게 열거나 함께 있어도 혼자만의 시간이 꼭 필요한 편이에요. 이 시간을 이해해 주는 사람이 잘 맞아요.`,
      basis: `년지 ${year.branchChar} 기준 ${lonely} (전통적으로 ${gender === "male" ? "남성은 고신" : "여성은 과숙"}을 봄)`,
    });
  return out;
}

export function buildLoveAnalysis(
  chart: NatalChart,
  gender: "male" | "female",
  timing?: { starYears: number[]; palaceYears: Array<{ year: number; kind: string }>; hasHour: boolean; nearest?: string | null; nearestType?: string | null; bestYears?: number[] },
): LoveAnalysis {
  const palace = analyzePalace(chart, gender);
  const star = analyzeStar(chart, gender);
  const starName = gender === "male" ? "재성" : "관성";
  const starExplain =
    gender === "male"
      ? "전통 명리학에서는 남성에게 '내가 다스리는 기운'인 재성(정재·편재)을 이성을 뜻하는 별로 봐요."
      : "전통 명리학에서는 여성에게 '나를 다스리는 기운'인 관성(정관·편관)을 이성을 뜻하는 별로 봐요.";

  // C. 상호작용
  const P = palace.element;
  const S = star.element;
  const weakMe = chart.strength.score < 40;
  let rel: string;
  // 결론을 분명하게, 쉬운 말로
  if (P === S) rel = `배우자 자리와 이성의 별이 같은 ${COMMON[S]}의 기운이라, 좋아하는 마음이 그대로 연애와 결혼으로 이어지기 쉬워요!`;
  else if (generates(S, P)) rel = `이성의 별(${COMMON[S]})이 배우자 자리(${COMMON[P]})를 키워 주는 사이라, 만나는 사람이 관계를 든든하게 받쳐 주기 쉬워요!`;
  else if (generates(P, S)) rel = `배우자 자리(${COMMON[P]})가 이성의 별(${COMMON[S]})을 키워 주는 사이라, 내가 마음을 쏟을수록 관계가 깊어지기 쉬워요!`;
  else if (controls(S, P)) rel = `이성의 별(${COMMON[S]})이 배우자 자리(${COMMON[P]})를 누르는 사이라, 상대가 관계를 주도하고 내가 맞춰 주는 일이 많을 수 있어요. 서로 속도를 맞추면 오히려 단단한 관계가 돼요!`;
  else if (gender === "female" && palace.tenGod === "식신")
    // 식신제살: 일지 식신이 관살을 다스림 — 관살이 많을수록 길하게 보는 전통 구조
    rel = `배우자 자리의 여유와 재치의 기운(식신)이 이성의 별(${COMMON[S]})을 다스리는 구조(식신제살)라, 강한 사람을 만나도 내가 부드럽게 관계의 중심을 잡게 돼요!${star.level === "많음" ? " 이성의 기운이 많은 사주에서 이 구조는 센 인연을 내 편으로 만드는 힘이 돼요." : ""}`;
  else if (gender === "female" && palace.tenGod === "상관")
    rel = `배우자 자리의 재치와 표현의 기운(상관)이 이성의 별(${COMMON[S]})과 부딪히는 구조(상관견관)라, 상대의 부족한 점이 잘 보이고 말로 맞서기 쉬워요. 하고 싶은 말을 한 번 다듬어 전하면 관계가 오래가요!`;
  else if (gender === "male" && (palace.tenGod === "겁재" || palace.tenGod === "비견"))
    rel = `배우자 자리의 나와 닮은 기운(${palace.tenGod})이 이성의 별(${COMMON[S]})을 누르는 구조라, 내 주관대로 관계를 이끌기 쉽고 경쟁자가 끼어들기도 쉬워요. 상대의 뜻을 먼저 물어 주면 관계가 훨씬 편안해져요!`;
  // 나의 기운이 여리면 '나이 차'·'조언'에서 기댈 수 있는 사람을 찾는다고 말하므로, 여기서도 같은 방향으로 맞춘다
  else if (weakMe)
    rel = `배우자 자리(${COMMON[P]})가 이성의 별(${COMMON[S]})을 누르는 사이라, 겉으로는 내가 관계를 챙기고 이끄는 쪽이 되기 쉬워요. 하지만 속으로는 기댈 수 있는 사람을 원하니, 힘들 때는 솔직하게 기대 보세요!`;
  else rel = `배우자 자리(${COMMON[P]})가 이성의 별(${COMMON[S]})을 누르는 사이라, 내가 관계를 이끄는 쪽이 되기 쉬워요. 상대의 이야기를 충분히 들어 주면 관계가 훨씬 편안해져요!`;
  const detail: string[] = [];
  const inPalace = palace.hidden.filter((h) => h.isStar);
  if (inPalace.length) detail.push(`배우자 자리 속에 이성의 별(${inPalace.map((h) => `${h.char} ${h.tenGod}·${h.role}`).join(", ")})이 들어 있어요.`);
  else detail.push("배우자 자리 속에는 이성의 별이 없어요. 두 요소를 각각 따로 봐요.");
  if (star.level === "유력" && palace.force.level === "강") detail.push("두 요소가 모두 힘이 있어요. 다만 한쪽으로 지나치게 몰려 있지 않은지도 함께 봐요.");

  // 유형
  const palaceOk = palace.force.level !== "약" && palace.stability.level !== "흔들림 큼";
  const starOk = star.level === "많음" || star.level === "유력" || star.level === "보통";
  const code: LoveAnalysis["type"]["code"] = palaceOk && starOk ? "A" : palaceOk ? "B" : starOk ? "C" : "D";
  const TYPE: Record<typeof code, { title: string; summary: string }> = {
    A: { title: "배우자 자리도, 이성의 별도 비교적 뚜렷한 구조", summary: "두 요소가 서로 돕는지 부딪히는지, 한쪽으로 지나치게 몰리지 않았는지를 함께 봐요." },
    B: { title: "배우자 자리는 안정적이지만, 이성의 별은 약하거나 숨어 있는 구조", summary: "관계의 자리는 안정적인데 이성을 뜻하는 기운의 직접 근거가 적어요. 이것만으로 결혼운이 나쁘다고 보지 않으며, 운에서 이성의 별이 들어오는 시기를 함께 봐요." },
    C: { title: "이성의 별은 뚜렷하지만, 배우자 자리가 약하거나 흔들리는 구조", summary: "이성을 만날 기운과 관계를 꾸리는 자리의 상태가 다를 수 있어요. 이성의 별이 뚜렷하다고 관계가 저절로 안정된다고 보지는 않아요." },
    D: { title: "배우자 자리와 이성의 별 모두 근거가 약한 구조", summary: "사주만으로 판단할 근거가 제한적이에요. 결혼 여부나 배우자 복을 단정하지 않고, 운의 흐름과 보조 요소를 함께 봐요." },
  };

  // D. 보조 분석
  let support: LoveAnalysis["support"] = null;
  if (star.level === "약함" || star.level === "근거 제한적") {
    const items: string[] = [];
    const all = stemsAndMains(chart);
    const gen = all.filter((x) => generates(x.el, S));
    const press = all.filter((x) => controls(x.el, S));
    items.push(gen.length ? `이성의 별(${elName(S)})을 키워 주는 ${elName(gen[0].el)} 기운이 ${gen.length}곳 있어요.` : `이성의 별(${elName(S)})을 키워 주는 기운은 보이지 않아요.`);
    items.push(press.length ? `이성의 별을 누르는 ${elName(press[0].el)} 기운이 ${press.length}곳 있어요.` : "이성의 별을 누르는 기운은 거의 없어요.");
    const monthEl = BRANCH_ELEMENT[chart.monthBranch];
    items.push(monthEl === S || generates(monthEl, S) ? `태어난 계절은 ${elName(S)} 기운에 유리한 편이에요.` : `태어난 계절은 ${elName(S)} 기운에 특별히 유리하지 않아요.`);
    const w = chart.tenGodWeighted;
    if (gender === "male") items.push(w["식상"] >= 12 ? `표현과 재능의 기운(식상 ${w["식상"]}%)이 있어, 이성의 별로 이어지는 흐름을 보조적으로 볼 수 있어요.` : `표현과 재능의 기운(식상)도 적은 편이에요.`);
    else items.push(w["인성"] >= 12 ? `배움과 보살핌의 기운(인성 ${w["인성"]}%)이 있어, 이성의 별(관성)과 이어지는 흐름을 보조적으로 볼 수 있어요.` : `배움과 보살핌의 기운(인성)도 적은 편이에요.`);
    const others = (["year", "month", "hour"] as PillarKey[]).filter((k) => {
      const p = chart.pillars[k];
      return p && (p.stemElement === S || BRANCH_ELEMENT[p.branch] === S);
    });
    if (others.length) items.push(`${others.map((k) => PILLAR_NAME[k]).join("·")}에 ${elName(S)} 기운이 있어요. 다만 다른 기둥을 배우자 자리 대신으로 보지는 않고, 참고만 해요.`);
    support = { summary: "이런 보조 요소는 참고 자료일 뿐이고, 이 요소들이 있다고 해서 이성의 별이 있는 것처럼 보지는 않아요.", items };
  }

  // F. 종합
  const facts: string[] = [
    `배우자 자리(일지): ${palace.char} · ${elName(palace.element)} · ${palace.yinYang} · ${palace.tenGod}(${TEN_GOD_PLAIN[palace.tenGod]})`,
    `배우자 자리 속 글자(지장간): ${palace.hidden.map((h) => `${h.char}(${h.role}, ${h.tenGod})`).join(" · ")}`,
    `이성의 별(${starName}) 위치: ${star.occurrences.length ? star.occurrences.map((o) => `${o.where} ${o.char}(${o.tenGod}${o.role ? `, ${o.role}` : ""}${o.optional ? ", 학파에 따라 제외" : ""})`).join(" · ") : "원국에서 찾을 수 없음"}`,
    `천간에 드러난 이성의 별: ${star.revealed ? "있음" : "없음"}`,
  ];
  const marks = palaceMarks(chart, gender);
  if (marks.length) facts.push(`배우자 자리의 전통 표지: ${marks.map((m) => `${m.name}(${m.basis})`).join(" · ")}`);
  const inferences: string[] = [
    `배우자 자리의 힘: ${palace.force.level}, 안정성: ${palace.stability.level}`,
    `이성의 별의 힘: ${star.level}`,
    `구조 유형 ${code}: ${TYPE[code].title}`,
    rel,
  ];
  const limits: string[] = [
    "배우자 자리의 글자(십신)는 관계의 분위기를 보는 보조 자료이고, 실제 상대의 성격과 같다는 뜻이 아니에요.",
    "전통 명리학의 성별 기준(남성 재성·여성 관성)을 따른 해석이라, 모든 관계 형태를 담지는 못해요.",
    "지지 속 글자(지장간)의 구성은 만세력·학파마다 조금씩 달라요. 이 결과는 월률분야 표를 쓰고, 일부 '여기'는 약한 근거로만 반영했어요.",
  ];
  if (star.level === "근거 제한적" || star.level === "약함") limits.unshift("이성의 별에 대한 직접 근거가 적어 판단 근거가 제한적이에요. 이성의 별이 없거나 약하다고 결혼을 못 하거나 배우자가 없다는 뜻은 아니에요.");
  if (palace.force.level === "약") limits.unshift("배우자 자리의 힘이 약하다고 배우자 복이 없다는 뜻은 아니에요.");
  if (timing && !timing.hasHour) limits.push("태어난 시간을 몰라 시주 속 이성의 별 여부는 확인할 수 없어요.");
  if (timing) {
    if (timing.starYears.length) inferences.push(`운에서 이성의 별이 들어오는 해: ${timing.starYears.join(", ")}년 — 반드시 인연이 생긴다는 뜻은 아니에요.`);
    const major = timing.palaceYears.filter((p) => p.kind === "합" || p.kind === "충");
    const minorY = timing.palaceYears.filter((p) => p.kind !== "합" && p.kind !== "충");
    if (major.length) inferences.push(`운이 배우자 자리를 크게 움직이는 해(합·충): ${major.map((p) => `${p.year}년(${p.kind})`).join(", ")}`);
    if (minorY.length) inferences.push(`운이 배우자 자리에 작은 마찰을 주는 해(형·파·해): ${minorY.map((p) => `${p.year}년(${p.kind})`).join(", ")}`);
  }

  // ── A·B·C·(D)·E를 한 문단으로 ──
  // '닿게 될 인연은 이런 사람일 가능성이 있다'는 사람 중심 문장으로
  const overview: Array<{ t: string; b?: boolean }> = [];
  const PALACE_PERSON: Record<Element, string> = {
    木: "곧고 따뜻하며 함께 성장하려는", 火: "밝고 다정하며 마음 표현이 풍부한", 土: "듬직하고 한결같은",
    金: "깔끔하고 기준이 분명한", 水: "속이 깊고 지혜로운",
  };
  const forcePerson = palace.force.level === "강" ? "곁을 든든하게 지켜 줄" : palace.force.level === "중" ? "편안하게 곁에 머물러 줄" : "서로 아껴 주며 천천히 가까워질";
  const stabPerson =
    palace.stability.level === "안정" ? "만나면 큰 부딪힘 없이 편안하게 이어질 사람이에요."
      : palace.stability.level === "흔들림 큼" ? "이사·이직처럼 환경이 바뀌는 시기에 나타나 삶에 새 바람을 불어넣을 사람일 수 있어요."
        : "가끔은 서로 맞춰 가야 하지만, 그만큼 함께 자라는 사람이에요.";
  // 배우자 자리는 '가까이 지낼수록 드러나는 모습'으로 쓴다 — 첫인상(이성의 별)을 다루는 '만나게 될 이성' 이야기와 같은 틀
  overview.push({ t: `배우자 자리(일지)에 ${palace.char}, 곧 ${COMMON[P]}의 기운이 있어, 닿게 될 인연은 오래 함께할수록 ${PALACE_PERSON[P]} 모습이 드러나는, ${forcePerson} 사람일 가능성이 있어요. ${stabPerson} ` });
  const starPerson =
    star.level === "많음"
      ? `사주에 이성의 별(${starName})이 여러 자리에 많아, 이성의 인연이 자주 들어오는 편이에요.${chart.strength.score < 40 ? " 나의 기운이 여린 만큼, 많은 인연 중에서도 나를 편안하게 품어 주는 사람을 골라야 오래 가요." : ""}`
      : star.level === "유력" ? `사주에 이성의 별(${starName})이 뚜렷해, 이런 사람이 자연스럽게 다가올 가능성이 커요.`
      : star.level === "보통" ? `사주에 이성의 별(${starName})이 적당히 있어, 이런 사람과 무리 없이 인연이 닿을 가능성이 있어요.`
        : star.level === "약함" ? `사주에 이성의 별(${starName})이 땅속에 숨어 있어, 이런 사람이 조용히, 천천히 다가올 가능성이 있어요.`
          : `사주에 이성의 별(${starName})이 드러나지 않아, 이런 사람은 운에서 이성의 별이 들어오는 해에 만나게 될 가능성이 있어요.`;
  overview.push({ t: starPerson + (star.mixed ? " 성향이 다른 두 가지 매력의 사람이 함께 다가올 수도 있어요. " : " ") });
  const REL_PERSON =
    P === S ? "만나면 좋아하는 마음이 그대로 연애와 결혼으로 이어지기 쉬운 사람이에요!"
      : generates(S, P) ? "관계를 든든하게 받쳐 주는 사람일 가능성이 커요!"
        : generates(P, S) ? "내가 마음을 쏟을수록 더 깊어지는 사람이에요!"
          : controls(S, P) ? "관계를 이끌어 주는 리드형일 가능성이 있어요. 서로 속도를 맞추면 단단한 사이가 돼요!"
            : gender === "female" && palace.tenGod === "식신"
              ? "강한 사람이어도 내가 부드럽게 관계의 중심을 잡게 되는 사이예요(식신제살)!"
              : gender === "female" && palace.tenGod === "상관"
                ? "서로 할 말은 하는 사이가 되기 쉬워요. 말을 한 번 다듬어 전하면 오래가요(상관견관)!"
                : weakMe
                  ? "겉으로는 내가 관계를 챙기는 쪽이 되기 쉽지만, 속으로는 기댈 수 있는 사이가 되면 더 좋아요!"
                  : "내가 이끌고 상대가 따라와 주는 사이가 되기 쉬워요. 상대의 이야기를 충분히 들어 주면 더 좋아요!";
  overview.push({ t: REL_PERSON + " " });
  // 배우자 자리의 전통 표지는 가장 중요한 것 하나만 문단에 넣고, 나머지는 '자세히 보기'에 둔다
  if (marks[0]) overview.push({ t: marks[0].text + " " });
  // '만남의 계기'와 같은 판단을 쓴다 — 배우자 자리가 흔들리면(충) 이미 '환경이 바뀌는 시기'라고 말했으므로 '생활 반경'과 겹쳐 말하지 않는다
  if (palace.stability.level !== "흔들림 큼" && palace.hidden.some((h) => h.isStar && !h.optional)) overview.push({ t: "생활 반경 안에서 자연스럽게 만나게 될 사람이기도 해요. " });
  if (support) {
    const hasGen = support.items[0]?.includes("곳 있어요");
    overview.push({ t: hasGen ? "운이 맞는 때가 오면 이 인연이 빠르게 무르익을 수 있어요. " : "그래서 운이 들어오는 시기를 잘 잡는 것이 중요해요. " });
  }
  // 시기는 '만나게 될 이성' 이야기·'인연이 닿기 쉬운 때'와 같은 해(연도별 인연운 상위 3개)를 쓴다 — 문단마다 다른 해가 나오지 않게
  const yrs = [...(timing?.bestYears ?? [])].sort((a, b) => a - b);
  if (yrs.length) overview.push({ t: "이런 인연은 " }, { t: yrs.join("·") + "년", b: true }, { t: "에 닿기 쉬워요." });

  return {
    starName, starExplain, palace, star,
    interaction: { summary: rel, detail },
    type: { code, ...TYPE[code] },
    support,
    overview,
    overviewText: overview.map((x) => x.t).join("").trim(),
    partner: inferPartner(chart, gender, palace, star, timing),
    marks,
    conclusion: { facts, inferences, limits },
  };
}

/** 이성의 별 오행별 일의 결 */
const FIELD_BY_ELEMENT: Record<Element, string> = {
  木: "교육·출판·디자인·환경처럼 사람을 키우고 무언가를 길러 내는 분야",
  火: "방송·미디어·IT·뷰티·홍보처럼 드러내고 알리는 분야",
  土: "부동산·건설·공공기관·관리·중개처럼 기반을 다지고 사람 사이를 잇는 분야",
  金: "금융·법률·기술·의료·엔지니어링처럼 정확함과 기준이 중요한 분야",
  水: "무역·물류·연구·분석·여행·상담처럼 흐름을 읽고 넓게 움직이는 분야",
};
const FIELD_BY_STAR: Record<string, string> = {
  정재: "안정적인 직장에서 꾸준히 실력을 쌓는 사람",
  편재: "사업·영업·프리랜서처럼 활동 반경이 넓은 일을 하는 사람",
  정관: "조직·공공기관·대기업처럼 체계가 분명한 곳에서 신뢰받는 사람",
  편관: "전문직·현장 리더·위기에 강한 일처럼 책임과 결단이 필요한 일을 하는 사람",
};
/**
 * '만나게 될 이성'은 한 사람을 세 면으로 나눠 그린다 — 섞어서 나열하면 "차분한데 생동감 넘치는"처럼 모순되기 쉽다.
 *  ① 생김새: 이성의 별의 오행(ELEMENT_LOOK)   ② 풍기는 분위기: 이성의 별의 정·편(LOOK_BY_STAR)
 *  ③ 가까워졌을 때: 배우자 자리의 계절(SEASON_LOOK)
 * 결이 다른 조합(차분한 생김새 + 활달·강한 분위기)은 "생김새와 달리"로 이어 한 사람의 서로 다른 면으로 읽히게 한다.
 */
/** 바로 앞의 STAR_NATURE(성실한·활동적인·반듯한·강단 있는 성향)와 같은 낱말을 되풀이하지 않는다 */
const LOOK_BY_STAR: Record<string, string> = {
  정재: "편안하고 단정한 분위기",
  편재: "밝고 사교적인 분위기",
  정관: "깔끔하고 믿음직한 분위기",
  편관: "선이 굵고 당당한 분위기",
};
/** 이성의 별(정·편)을 쉬운 말로 — '재물' 같은 말이 사람 설명에 섞이지 않게 */
const STAR_NATURE: Record<string, string> = { 정재: "성실한 성향", 편재: "활동적인 성향", 정관: "반듯한 성향", 편관: "강단 있는 성향" };
const COMMON: Record<Element, string> = { 木: "나무", 火: "불", 土: "흙", 金: "쇠", 水: "물" };
const SEASON_OF: Record<Element, string> = { 木: "봄", 火: "여름", 土: "환절기", 金: "가을", 水: "겨울" };
/** 가까워졌을 때 보이는 모습 — 첫인상 표현(LOOK_SHORT)과 같은 낱말이 겹치지 않게 고른다 */
const SEASON_LOOK: Record<string, string> = {
  봄: "풋풋하고 생기 있는", 여름: "다정하고 활발한", 환절기: "푸근하고 안정감 있는", 가을: "깔끔하고 단정한", 겨울: "속이 깊고 지적인",
};
/** 생김새 */
const ELEMENT_LOOK: Record<Element, string> = {
  木: "길쭉하고 곧은 실루엣",
  火: "밝고 화사한 얼굴",
  土: "듬직하고 편안한 체격",
  金: "또렷한 이목구비와 반듯한 선",
  水: "부드럽고 깊은 눈빛",
};
/** 표현의 결: 차분함 / 활달함 / 또렷함 — 이어 쓸 때 '~에 ~까지'로 쌓을지 '~와 달리'로 대비할지 정한다 */
type Tone = "calm" | "lively" | "sharp";
const ELEMENT_TONE: Record<Element, Tone> = { 木: "lively", 火: "lively", 土: "calm", 金: "sharp", 水: "calm" };
const STAR_TONE: Record<string, Tone> = { 정재: "calm", 편재: "lively", 정관: "calm", 편관: "sharp" };
const SEASON_TONE: Record<string, Tone> = { 봄: "lively", 여름: "lively", 환절기: "calm", 가을: "calm", 겨울: "calm" };
/** 배우자 자리의 십신 — 사람의 성격이 아니라 '둘이 함께할 때의 관계 분위기'로 쓴다 (판단의 한계 문구와 같은 관점) */
const PALACE_MOOD: Record<TenGod, string> = {
  비견: "친구처럼 편하고 대등한", 겁재: "서로 자극을 주고받는 활기찬", 식신: "맛있는 걸 함께 먹으며 여유를 즐기는 편안한",
  상관: "대화가 끊이지 않는 재미있는", 편재: "함께 여기저기 다니며 즐기는 활동적인", 정재: "생활을 함께 꾸려 가는 알뜰하고 안정적인",
  편관: "상대가 든든하게 이끌어 주는", 정관: "약속과 예의를 지키는 반듯한", 편인: "취향과 생각을 깊이 나누는", 정인: "서로 챙겨 주고 이해해 주는 다정한",
};
const PERSONA_BY_STAR: Record<string, string> = {
  정재: "현실적이고 성실하며, 약속과 생활을 꼼꼼히 챙기는 사람",
  편재: "사교적이고 시원시원하며, 함께 있으면 활기가 도는 사람",
  정관: "예의 바르고 책임감이 강하며, 원칙을 지키는 사람",
  편관: "추진력과 카리스마가 있고, 위기에 든든한 사람",
};

export interface PartnerItem {
  title: string;
  text: string;
  basis: string;
}

/**
 * 원국에 보이는 근거로 '만나게 될 이성'의 모습을 추론한다 (확정이 아닌 경향).
 * 기준: 이성의 별(정·편 중 우세, 오행) + 배우자 자리(일지의 오행·계절·십신) + 운의 시기
 */
function inferPartner(
  chart: NatalChart,
  gender: "male" | "female",
  palace: PalaceAnalysis,
  star: StarAnalysis,
  timing?: { nearest?: string | null; nearestType?: string | null; bestYears?: number[] },
): { intro: string; story: Array<{ t: string; b?: boolean }>; storyText: string; items: PartnerItem[] } {
  const jeong: TenGod = gender === "male" ? "정재" : "정관";
  const pyeon: TenGod = gender === "male" ? "편재" : "편관";
  const jW = star.occurrences.filter((o) => o.tenGod === jeong).reduce((a, o) => a + o.weight, 0);
  const pW = star.occurrences.filter((o) => o.tenGod === pyeon).reduce((a, o) => a + o.weight, 0);
  const main: TenGod = pW > jW ? pyeon : jeong;
  const both = jW >= 0.8 && pW >= 0.8;
  const S = star.element;
  const P = palace.element;
  const season = SEASON_OF[P];
  const hasStar = star.occurrences.length > 0;
  const starBasis = hasStar
    ? `이성의 별 ${main}, ${ELEMENT_KO[S]}(${S}) 기운${both ? `, ${main === jeong ? pyeon : jeong}도 함께 있음` : ""}`
    : `원국에 이성의 별이 드러나지 않아 이성의 별 오행(${elName(S)})과 배우자 자리로 추론`;

  const other: TenGod = main === jeong ? pyeon : jeong;
  // 차분한 생김새(土·水)에 활달하거나 강한 분위기(편재·편관)가 겹치면 대비로 잇는다
  const lookClash = ELEMENT_TONE[S] === "calm" && STAR_TONE[main] !== "calm";
  // 가까워졌을 때의 모습이 첫인상(풍기는 분위기)과 같은 결이면 '더 잘 보여요', 다르면 '면도 보여요'
  const closeSame = SEASON_TONE[season] === STAR_TONE[main];
  const closeText = closeSame
    ? `배우자 자리가 ${season}의 기운이라, 가까워질수록 ${SEASON_LOOK[season]} 면이 더 잘 보여요.`
    : `배우자 자리가 ${season}의 기운이라, 가까워지면 ${SEASON_LOOK[season]} 면도 보여요.`;
  const items: PartnerItem[] = [
    {
      title: "외모·분위기",
      text:
        `사주에서 이성의 별이 ${ELEMENT_KO[S]}(${COMMON[S]})의 기운이라, 생김새는 ${ELEMENT_LOOK[S]}이(가) 돋보일 가능성이 커요! ` +
        (lookClash
          ? `다만 이성의 별이 ${STAR_NATURE[main]}(${main})이라, 생김새와 달리 막상 만나 보면 ${LOOK_BY_STAR[main]}를 풍기는 사람이에요. `
          : `여기에 이성의 별이 ${STAR_NATURE[main]}(${main})이라 ${LOOK_BY_STAR[main]}까지 갖춘 사람이에요. `) +
        closeText,
      basis: `${starBasis} · 배우자 자리 ${palace.char}, ${ELEMENT_KO[P]}(${P})·${season}의 기운`,
    },
    {
      title: "성격",
      text: `이성의 별이 ${STAR_NATURE[main]}(${main})이라, ${PERSONA_BY_STAR[main]}일 가능성이 커요!${both ? ` ${STAR_NATURE[other]}(${other})도 함께 있어 때로는 ${PERSONA_BY_STAR[other].replace(/사람$/, "면")}도 보일 수 있어요.` : ""} 그리고 배우자 자리(일지)에 ${TG_TAG[palace.tenGod]}이(가) 있어, 둘이 함께할 때는 ${PALACE_MOOD[palace.tenGod]} 관계가 되기 쉬워요.`,
      basis: `${starBasis} · 배우자 자리의 기운 ${palace.tenGod}(${TEN_GOD_PLAIN[palace.tenGod]})`,
    },
    {
      title: "하는 일의 결",
      // 분야는 이름만 든다 — 분야 설명("넓게 움직이는")이 일하는 방식("체계가 분명한 곳")과 부딪히지 않게
      text: `이성의 별이 ${STAR_NATURE[main]}(${main})이라 ${FIELD_BY_STAR[main]}일 가능성이 커요! 분야로는 ${FIELD_BY_ELEMENT[S].split("처럼")[0]} 같은 쪽에서 일하고 있을 수 있어요.`,
      basis: `${starBasis}`,
    },
  ];

  // 나이 차(연상·동갑·연하) — 이성의 별 위치, 배우자 자리의 기운, 정·편 성향, 기운의 세기를 종합
  const age = inferAge(chart, gender, palace, star, main);
  items.push({ title: "나이 차", text: age.text, basis: age.basis });

  // 만남의 계기: 배우자 자리의 상태와 이성의 별 위치
  const inPalace = palace.hidden.some((h) => h.isStar && !h.optional);
  const inMonth = star.occurrences.some((o) => o.pillar === "month" && !o.optional);
  const meet =
    palace.stability.level === "흔들림 큼"
      ? "이사·이직·여행처럼 환경이 크게 바뀌는 시기에 새로운 사람을 만나기 쉬워요."
      : inPalace
        ? "생활 반경 안에서 자연스럽게 가까워지는 만남, 처음엔 편한 사이로 시작하는 인연이 잘 맞아요."
        : inMonth
          ? "직장·학교·모임처럼 사회 활동을 함께하는 자리에서 인연이 닿기 쉬워요."
          : "소개나 새로운 모임처럼 평소와 다른 계기에서 시작되는 인연을 눈여겨보세요.";
  items.push({
    title: "만남의 계기",
    text: meet,
    basis: palace.stability.level === "흔들림 큼" ? "배우자 자리에 충(변화의 기운)" : inPalace ? "배우자 자리 속에 이성의 별" : inMonth ? "월주(사회 활동의 자리)에 이성의 별" : "배우자 자리·이성의 별 위치",
  });
  // 맨 위 '가장 빠른 시기'에 붙는 인연의 성격(진중/지켜볼/스쳐 갈)과 같은 말을 쓴다
  const nearestNature = timing?.nearestType ? NATURE[timing.nearestType] : undefined;
  if (timing?.nearest || timing?.bestYears?.length) {
    items.push({
      title: "인연이 닿기 쉬운 때",
      text: `가까이는 ${timing?.nearest ?? "-"}${nearestNature ? `(${nearestNature.label})` : ""}, 10년 중에서는 ${[...(timing?.bestYears ?? [])].sort((a, b) => a - b).map((y) => `${y}년`).join("·")}에 인연의 흐름이 가장 좋아요. 아래 '연도별·월별 인연운'에서 자세히 볼 수 있어요.`,
      basis: "운(세운·월운)에서 이성의 별이 들어오거나 배우자 자리가 움직이는 시기",
    });
  }
  // ── 한 문단 이야기 (항목들을 자연스럽게 이어 붙임) ──
  const LOOK_SHORT: Record<Element, string> = { 木: "길쭉하고 싱그러운", 火: "밝고 화사한", 土: "듬직하고 편안한", 金: "또렷하고 세련된", 水: "부드럽고 차분한" };
  const LOOK_STAR_SHORT: Record<string, string> = { 정재: "단정하고 성실해 보이는 인상", 편재: "사교적이고 눈에 띄는 인상", 정관: "반듯하고 믿음직한 인상", 편관: "강단 있고 선이 분명한 인상" };
  /** 생김새와 결이 다를 때, 말을 나눠 보면 드러나는 분위기 */
  // 바로 다음 문장(PERSONA_S)과 같은 낱말이 되풀이되지 않게 고른다
  const STAR_TALK: Record<string, string> = { 정재: "단정하고 성실한", 편재: "유쾌하고 거침없는", 정관: "반듯하고 믿음직한", 편관: "강단 있고 선이 분명한" };
  const PERSONA_S: Record<string, string> = {
    정재: "현실적이고 성실해서 생활을 꼼꼼히 챙기는", 편재: "시원시원하고 사교적이라 곁에 있으면 활기가 도는",
    정관: "예의 바르고 책임감이 강해 원칙을 지키는", 편관: "추진력과 카리스마가 있어 위기에 든든한",
  };
  const WORK_S: Record<string, string> = { 정재: "꾸준히 실력을 쌓아 온", 편재: "활동 반경이 넓은", 정관: "조직 안에서 신뢰받는", 편관: "책임과 결단이 필요한 자리를 맡는" };
  const FIELD_S: Record<Element, string> = { 木: "교육·출판·디자인", 火: "미디어·IT·뷰티", 土: "부동산·공공기관·관리", 金: "금융·법률·기술", 水: "무역·연구·상담" };
  const MEET_S =
    palace.stability.level === "흔들림 큼" ? "이사·이직처럼 환경이 바뀌는 시기에 새로 만나" : inPalace ? "처음엔 생활 반경 안에서 편한 사이로 시작해" : inMonth ? "직장·학교·모임처럼 함께 활동하는 자리에서 만나" : "소개나 새로운 모임에서 만나";
  const years = [...(timing?.bestYears ?? [])].sort((a, b) => a - b);
  // 첫인상(생김새 + 풍기는 분위기) → 가까워졌을 때의 모습(배우자 자리) 순으로, 한 사람의 서로 다른 면으로 읽히게 한다
  // 대비는 한 문장에 한 번만: 생김새와 분위기가 엇갈리면 그 대비를 쓰고, 가까워졌을 때는 '면도/더 잘' 로만 잇는다
  const closeTail = closeSame ? `가까워질수록 ${SEASON_LOOK[season]} 면이 더 잘 보이는 사람이에요. ` : `가까워지면 ${SEASON_LOOK[season]} 면도 보이는 사람이에요. `;
  const firstSentence = lookClash
    ? `첫인상은 ${LOOK_SHORT[S]} 생김새와 달리 ${STAR_TALK[main]} 느낌이 강하고, ${closeTail}`
    : closeSame
      ? `첫인상은 ${LOOK_STAR_SHORT[main]}에 ${LOOK_SHORT[S]} 느낌이고, ${closeTail}`
      : `첫인상은 ${LOOK_STAR_SHORT[main]}에 ${LOOK_SHORT[S]} 느낌이지만, ${closeTail}`;
  const story: Array<{ t: string; b?: boolean }> = [
    { t: firstSentence },
    { t: `${PERSONA_S[main]} 사람이고${both ? `, 때로는 ${PERSONA_S[other]} 면도 함께 보여요` : "요"}. `.replace("사람이고요", "사람이에요") },
    { t: age.short.startsWith("나이 차") ? "" : "나이는 " }, { t: age.short, b: true }, { t: "일 가능성이 커요. " },
    { t: `${FIELD_S[S]} 같은 분야에서 일하며 ${WORK_S[main]} 사람일 수 있어요. ` },
    { t: `${MEET_S}, ` },
  ];
  if (timing?.nearest || years.length) {
    const yearsPart = years.length ? [{ t: years.map((y) => `${y}`).join("·") + "년", b: true }] : [];
    if (timing?.nearest && timing.nearestType === "C") {
      // 맨 위에 '스쳐 지나가기 쉬운 인연'이라고 했으니, 그 달을 '깊어지는 때'로 묶지 않는다
      story.push({ t: `${timing.nearest}`, b: true }, { t: " 즈음에는 가벼운 인연이 스쳐 갈 수 있고, " });
      story.push(...(yearsPart.length ? [...yearsPart, { t: "에 진지한 인연이 깊어지기 쉬워요." }] : [{ t: "그다음에 오는 진지한 인연이 깊어지기 쉬워요." }]));
    } else if (timing?.nearest && timing.nearestType === "B") {
      story.push({ t: `${timing.nearest}`, b: true }, { t: " 즈음에 설레는 인연이 찾아오고, " });
      story.push(...(yearsPart.length ? [...yearsPart, { t: "에 인연이 깊어지기 쉬워요." }] : [{ t: "천천히 알아 가면 인연이 깊어지기 쉬워요." }]));
    } else {
      if (timing?.nearest) story.push({ t: `${timing.nearest}`, b: true }, { t: years.length ? " 즈음이나 " : " 즈음에 " });
      story.push(...yearsPart, { t: years.length ? "에 인연이 깊어지기 쉬워요." : "인연이 깊어지기 쉬워요." });
    }
  } else story.push({ t: "천천히 인연이 깊어지기 쉬워요." });

  return {
    intro: hasStar
      ? "사주 원국에 보이는 이성의 별과 배우자 자리를 바탕으로, 앞으로 만나게 될 이성의 모습을 추론했어요."
      : "원국에 이성의 별이 뚜렷하지 않아, 이성의 별에 해당하는 기운과 배우자 자리를 바탕으로 추론했어요.",
    story,
    storyText: story.map((s) => s.t).join(""),
    items,
  };
}

/**
 * 연상·동갑·연하 추론 (전통 해석의 경향)
 *  - 이성의 별 위치: 연주(윗세대 자리) → 연상, 월주 → 비슷하거나 약간 연상, 일주(배우자 자리) → 동갑·또래, 시주(아랫세대 자리) → 연하
 *  - 배우자 자리의 기운: 인성(보살핌) → 연상, 식상(표현) → 연하, 비겁(나와 닮음) → 동갑, 관성 → 연상 쪽, 재성 → 연하 쪽
 *  - 성별 관행: 여성 정관 → 연상 쪽, 남성 정재 → 연하 쪽 / 편(偏) 배우자성이 연주·시주에 있으면 나이 차가 클 수 있음
 *  - 기운의 세기: 약하면 기댈 수 있는 연상, 강하면 이끌어 줄 수 있는 연하 쪽
 */
export function inferAge(
  chart: NatalChart,
  gender: "male" | "female",
  palace: PalaceAnalysis,
  star: StarAnalysis,
  main: TenGod,
): { key: "older" | "same" | "younger"; short: string; text: string; basis: string } {
  const s = { older: 0, same: 0, younger: 0 };
  const why: Record<keyof typeof s, Array<[number, string]>> = { older: [], same: [], younger: [] };
  const add = (k: keyof typeof s, v: number, r: string) => {
    s[k] += v;
    why[k].push([v, r]);
  };
  // 같은 기둥의 천간·지지에 겹쳐 있어도 한 기둥은 최대 1로 센다(한 자리를 두 번 세지 않도록)
  const byPillar: Record<PillarKey, number> = { year: 0, month: 0, day: 0, hour: 0 };
  for (const o of star.occurrences) if (!o.optional) byPillar[o.pillar] = Math.min(1, byPillar[o.pillar] + o.weight);
  if (byPillar.year) add("older", 1.5 * byPillar.year, "이성의 별이 연주(윗세대 자리)에 있어");
  if (byPillar.month) { add("older", 0.7 * byPillar.month, "이성의 별이 월주(사회·또래보다 조금 위의 자리)에 있어"); s.same += 0.3 * byPillar.month; }
  if (byPillar.day) add("same", 1.2 * byPillar.day, "이성의 별이 배우자 자리에 함께 있어");
  // 시주의 이성의 별은 전통적으로 '늦게 맺어지는 인연(만혼)'으로 더 많이 읽으므로 연하 근거로는 약하게만 반영
  if (byPillar.hour) add("younger", 0.6 * byPillar.hour, "이성의 별이 시주(아랫세대 자리)에도 있어");
  const g = TEN_GOD_GROUP[palace.tenGod];
  if (g === "인성") add("older", 1, "배우자 자리에 보살핌의 기운이 있어");
  // 여성의 식상은 본래 자녀의 별이라 배우자 나이의 근거로는 약하게만 본다
  if (g === "식상") add("younger", gender === "female" ? 0.4 : 0.8, "배우자 자리에 표현·돌봄의 기운이 있어");
  if (g === "비겁") add("same", 1, "배우자 자리에 나와 닮은 기운이 있어");
  if (g === "관성") add("older", 0.5, "배우자 자리에 책임의 기운이 있어");
  if (g === "재성") add("younger", 0.5, "배우자 자리에 내가 이끄는 기운이 있어");
  if (gender === "female" && main === "정관") add("older", 0.5, "반듯한 질서의 별(정관)이 이성의 별이라");
  if (gender === "male" && main === "정재") add("younger", 0.5, "성실한 기운의 별(정재)이 이성의 별이라");
  // 이성의 별이 여러 자리에 강하게 퍼져 있고 나의 기운이 여리면 → 나를 이끌어 줄 연상·나이 차 있는 상대 (전통적으로 가장 흔한 해석)
  const starPillars = (Object.keys(byPillar) as PillarKey[]).filter((k) => byPillar[k] > 0).length;
  const heavy = starPillars >= 3 || chart.tenGodWeighted[star.group] >= 30;
  if (heavy && chart.strength.score < 40) add("older", 1.5, gender === "female" ? "사주에 남자의 기운(관성)이 강하고 나의 기운은 여린 편이라 나를 품어 줄 사람을 찾게 돼" : "사주에 여자의 기운(재성)이 강하고 나의 기운은 여린 편이라 나를 이끌어 줄 사람을 찾게 돼");
  else if (chart.strength.score < 40) add("older", 0.5, "나의 기운이 여린 편이라 기댈 수 있는 사람을 찾게 돼");
  else if (chart.strength.score >= 60) add("younger", 0.3, "나의 기운이 강한 편이라 내가 이끌 수 있는 사람과 맞아");
  const order = (Object.keys(s) as Array<keyof typeof s>).sort((a, b) => s[b] - s[a]);
  const top = order[0];
  const second = order[1];
  // 혼자 쓸 때는 자세히("동갑이나 한두 살 차이"), 둘을 이을 때는 짧게("연상이거나 또래") — "연상이거나 동갑이나 …" 같은 겹침 방지
  const LABEL = { older: "연상", same: "또래", younger: "연하" } as const;
  const LABEL_ALONE = { older: "연상", same: "동갑이나 한두 살 차이", younger: "연하" } as const;
  const close = s[top] - s[second] < 0.6 && s[second] > 0;
  const gapBig = (main === "편관" || main === "편재") && (byPillar.year > 0.5 || byPillar.hour > 0.5) && top !== "same";
  const opposite = close && ((top === "older" && second === "younger") || (top === "younger" && second === "older"));
  const short =
    s[top] === 0 ? "비슷한 또래"
      : opposite ? `나이 차가 있는 사람(${LABEL[top]} 쪽이 조금 더 유력)`
        : close ? `${LABEL[top]}이거나 ${LABEL[second]}`
          : LABEL_ALONE[top];
  const reasons = why[top].sort((a, b) => b[0] - a[0]).slice(0, 2).map((x) => x[1]);
  const text = s[top] === 0
    ? "사주에 나이를 가늠할 뚜렷한 단서가 적어, 비슷한 또래와 인연이 닿을 가능성이 커요!"
    : `${reasons[0]}, ${short}일 가능성이 커요!${reasons[1] ? ` ${reasons[1]}서 더 그렇게 봐요.` : ""}${gapBig && !opposite ? " 나이 차가 꽤 나는 인연일 수도 있어요." : ""}`;
  const basis = (Object.keys(s) as Array<keyof typeof s>).map((k) => `${LABEL[k]} ${s[k].toFixed(1)}`).join(" · ") + " (이성의 별 위치·배우자 자리·정편·기운의 세기 종합)";
  return { key: top, short, text, basis };
}

export { tenGodOf, BRANCHES };
