/**
 * 사주 원국 구조 분석: 십성 · 지장간 · 십이운성 · 오행 분포 · 신강약 · 격국 참고 · 조후 · 합충형파해 · 신살
 * 이 모듈은 '구조'만 계산한다. 해석 문장은 love/ 모듈이 담당한다.
 */
import {
  BRANCHES, BRANCH_ELEMENT, ELEMENTS, Element, HIDDEN_STEMS, STEMS, STEM_ELEMENT, STEM_YINYANG, BRANCH_YINYANG,
  TEN_GOD_GROUP, TenGod, TenGodGroup, TwelveStage, mainHiddenStem, seasonOfBranch, tenGodOf, twelveStage, Season,
  elementOfGroup, generatedBy, controlledBy, generatesWhat, controlsWhat,
} from "./constants";
import { FourPillars, Pillar } from "./pillars";
import { Relation, RelItem, findRelations, PositionKey } from "./relations";
import { ShinsalHit, computeShinsal, PillarChars } from "./shinsal";

export type PillarKey = "year" | "month" | "day" | "hour";
export const PILLAR_LABEL: Record<PillarKey, "년주" | "월주" | "일주" | "시주"> = { year: "년주", month: "월주", day: "일주", hour: "시주" };

export interface HiddenStemInfo {
  stem: number;
  char: string;
  days: number;
  role: "여기" | "중기" | "정기";
  tenGod: TenGod;
  /** 천간에 투출했는가 */
  revealed: boolean;
}

export interface PillarDetail {
  key: PillarKey;
  label: string;
  stem: number;
  branch: number;
  stemChar: string;
  branchChar: string;
  stemElement: Element;
  branchElement: Element;
  stemYinYang: string;
  branchYinYang: string;
  stemTenGod: TenGod | "일간";
  branchTenGod: TenGod;
  hidden: HiddenStemInfo[];
  /** 일간 기준 십이운성(봉법) */
  stage: TwelveStage;
  /** 각 기둥 천간 자신의 십이운성(좌법) */
  selfStage: TwelveStage;
}

export interface ElementDistribution {
  /** 천간·지지 표면 글자 수 */
  count: Record<Element, number>;
  /** 지장간 사령일수까지 반영한 가중 비율(%) */
  weighted: Record<Element, number>;
}

export interface StrengthAnalysis {
  score: number;
  level: "극신강" | "신강" | "중화(신강 쪽)" | "중화(신약 쪽)" | "신약" | "극신약";
  deukryeong: boolean;
  deukji: boolean;
  deukse: boolean;
  roots: string[];
  details: string[];
  favorableGroups: TenGodGroup[];
  unfavorableGroups: TenGodGroup[];
  note: string;
}

export interface GyeokAnalysis {
  name: string;
  basis: string;
}

export interface JohuAnalysis {
  season: Season;
  need: Element | null;
  present: boolean;
  description: string;
}

export interface NatalChart {
  pillars: Partial<Record<PillarKey, PillarDetail>>;
  dayStem: number;
  dayBranch: number;
  monthBranch: number;
  hasHour: boolean;
  elements: ElementDistribution;
  tenGodCount: Record<TenGod, number>;
  tenGodWeighted: Record<TenGodGroup, number>;
  strength: StrengthAnalysis;
  gyeok: GyeokAnalysis;
  johu: JohuAnalysis;
  relations: Relation[];
  shinsal: ShinsalHit[];
  relItems: RelItem[];
}

const ROLE = (len: number, i: number): HiddenStemInfo["role"] => (i === len - 1 ? "정기" : len === 3 && i === 1 ? "중기" : "여기");

export function natalRelItems(p: FourPillars): RelItem[] {
  const items: RelItem[] = [];
  const add = (k: PillarKey, pl: Pillar) => {
    const lab = PILLAR_LABEL[k].replace("주", "");
    items.push({ pos: `${lab}간` as PositionKey, source: "원국", kind: "stem", value: pl.stem });
    items.push({ pos: `${lab}지` as PositionKey, source: "원국", kind: "branch", value: pl.branch });
  };
  add("year", p.year);
  add("month", p.month);
  add("day", p.day);
  if (p.hour) add("hour", p.hour);
  return items;
}

export function analyzeChart(p: FourPillars): NatalChart {
  const ds = p.day.stem;
  const keys: PillarKey[] = p.hour ? ["year", "month", "day", "hour"] : ["year", "month", "day"];
  const allStems = keys.map((k) => p[k]!.stem);
  const pillars: NatalChart["pillars"] = {};
  for (const k of keys) {
    const pl = p[k]!;
    const hs = HIDDEN_STEMS[pl.branch];
    pillars[k] = {
      key: k,
      label: PILLAR_LABEL[k],
      stem: pl.stem,
      branch: pl.branch,
      stemChar: STEMS[pl.stem],
      branchChar: BRANCHES[pl.branch],
      stemElement: STEM_ELEMENT[pl.stem],
      branchElement: BRANCH_ELEMENT[pl.branch],
      stemYinYang: STEM_YINYANG[pl.stem],
      branchYinYang: BRANCH_YINYANG[pl.branch],
      stemTenGod: k === "day" ? "일간" : tenGodOf(ds, pl.stem),
      branchTenGod: tenGodOf(ds, mainHiddenStem(pl.branch)),
      hidden: hs.map(([s, days], i) => ({
        stem: s, char: STEMS[s], days, role: ROLE(hs.length, i), tenGod: tenGodOf(ds, s),
        revealed: allStems.includes(s),
      })),
      stage: twelveStage(ds, pl.branch),
      selfStage: twelveStage(pl.stem, pl.branch),
    };
  }

  // 오행 분포
  const count = Object.fromEntries(ELEMENTS.map((e) => [e, 0])) as Record<Element, number>;
  const weightedRaw = Object.fromEntries(ELEMENTS.map((e) => [e, 0])) as Record<Element, number>;
  for (const k of keys) {
    const pl = p[k]!;
    count[STEM_ELEMENT[pl.stem]]++;
    count[BRANCH_ELEMENT[pl.branch]]++;
    weightedRaw[STEM_ELEMENT[pl.stem]] += 1;
    const mult = k === "month" ? 2 : 1; // 월령 가중
    for (const [s, days] of HIDDEN_STEMS[pl.branch]) weightedRaw[STEM_ELEMENT[s]] += (days / 30) * mult;
  }
  const totalW = Object.values(weightedRaw).reduce((a, b) => a + b, 0);
  const weighted = Object.fromEntries(ELEMENTS.map((e) => [e, Math.round((weightedRaw[e] / totalW) * 1000) / 10])) as Record<Element, number>;

  // 십성 집계
  const tenGodCount = {} as Record<TenGod, number>;
  (["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"] as TenGod[]).forEach((t) => (tenGodCount[t] = 0));
  const groupW: Record<TenGodGroup, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  for (const k of keys) {
    const d = pillars[k]!;
    if (d.stemTenGod !== "일간") {
      tenGodCount[d.stemTenGod]++;
      groupW[TEN_GOD_GROUP[d.stemTenGod]] += 1;
    }
    tenGodCount[d.branchTenGod]++;
    const mult = k === "month" ? 2 : 1;
    for (const h of d.hidden) groupW[TEN_GOD_GROUP[h.tenGod]] += (h.days / 30) * mult;
  }
  const gTotal = Object.values(groupW).reduce((a, b) => a + b, 0);
  const tenGodWeighted = Object.fromEntries(Object.entries(groupW).map(([g, v]) => [g, Math.round((v / gTotal) * 1000) / 10])) as Record<TenGodGroup, number>;

  const strength = analyzeStrength(p, pillars, keys);
  const gyeok = analyzeGyeok(pillars, keys);
  const johu = analyzeJohu(p, keys);
  const relItems = natalRelItems(p);
  const relations = findRelations(relItems, { monthBranch: p.month.branch, stems: allStems, branches: keys.map((k) => p[k]!.branch) });
  const pc: PillarChars[] = keys.map((k) => ({ label: PILLAR_LABEL[k], stem: p[k]!.stem, branch: p[k]!.branch }));
  const shinsal = computeShinsal(pc);

  return {
    pillars, dayStem: ds, dayBranch: p.day.branch, monthBranch: p.month.branch, hasHour: Boolean(p.hour),
    elements: { count, weighted }, tenGodCount, tenGodWeighted, strength, gyeok, johu, relations, shinsal, relItems,
  };
}

const POS_WEIGHT: Record<string, number> = { "year-stem": 8, "month-stem": 12, "hour-stem": 10, "year-branch": 10, "month-branch": 30, "day-branch": 15, "hour-branch": 15 };

function analyzeStrength(p: FourPillars, pillars: NatalChart["pillars"], keys: PillarKey[]): StrengthAnalysis {
  const ds = p.day.stem;
  const dmEl = STEM_ELEMENT[ds];
  const supportive = (s: number) => {
    const g = TEN_GOD_GROUP[tenGodOf(ds, s)];
    return g === "비겁" || g === "인성";
  };
  let total = 0;
  let support = 0;
  const details: string[] = [];
  for (const k of keys) {
    const pl = p[k]!;
    if (k !== "day") {
      const w = POS_WEIGHT[`${k}-stem`];
      total += w;
      if (supportive(pl.stem)) support += w;
    }
    const w = POS_WEIGHT[`${k}-branch`];
    total += w;
    const hs = HIDDEN_STEMS[pl.branch];
    const sum = hs.reduce((a, [, d]) => a + d, 0);
    const frac = hs.filter(([s]) => supportive(s)).reduce((a, [, d]) => a + d, 0) / sum;
    support += w * frac;
  }
  const score = Math.round((support / total) * 100);
  const monthMain = mainHiddenStem(p.month.branch);
  const deukryeong = supportive(monthMain);
  const deukji = supportive(mainHiddenStem(p.day.branch));
  const otherStems = keys.filter((k) => k !== "day").map((k) => p[k]!.stem);
  const deukse = otherStems.filter(supportive).length * 2 > otherStems.length;
  const roots: string[] = [];
  for (const k of keys) {
    const pl = pillars[k]!;
    for (const h of pl.hidden) if (STEM_ELEMENT[h.stem] === dmEl) roots.push(`${pl.label.replace("주", "")}지 ${pl.branchChar}의 ${h.char}(${h.role})`);
  }
  details.push(
    deukryeong
      ? `월지 ${BRANCHES[p.month.branch]}의 정기 ${STEMS[monthMain]}이(가) 일간을 돕는 ${tenGodOf(ds, monthMain)}이므로 득령(得令)했습니다.`
      : `월지 ${BRANCHES[p.month.branch]}의 정기 ${STEMS[monthMain]}이(가) ${tenGodOf(ds, monthMain)}이므로 득령하지 못했습니다(실령).`,
  );
  details.push(deukji ? `일지 ${BRANCHES[p.day.branch]}의 정기가 일간을 도와 득지(得地)했습니다.` : `일지 ${BRANCHES[p.day.branch]}의 정기가 일간을 돕지 않습니다.`);
  details.push(deukse ? "다른 천간 중 일간을 돕는 글자가 과반이라 득세(得勢)했습니다." : "다른 천간 중 일간을 돕는 글자가 과반이 아닙니다.");
  details.push(roots.length ? `일간의 뿌리(통근): ${roots.join(", ")}` : "지지에 일간과 같은 오행의 지장간이 없어 뿌리가 약합니다(무근).");
  const level: StrengthAnalysis["level"] =
    score >= 80 ? "극신강" : score >= 60 ? "신강" : score >= 50 ? "중화(신강 쪽)" : score >= 40 ? "중화(신약 쪽)" : score >= 20 ? "신약" : "극신약";
  const strong = score >= 50;
  return {
    score, level, deukryeong, deukji, deukse, roots, details,
    favorableGroups: strong ? ["식상", "재성", "관성"] : ["인성", "비겁"],
    unfavorableGroups: strong ? ["인성", "비겁"] : ["재성", "관성", "식상"],
    note:
      "신강·신약 점수는 위치별 가중치(월지 30, 일지·시지 15, 년지 10, 월간 12, 시간 10, 년간 8)와 지장간 사령일수로 계산한 참고 지표입니다. " +
      "억부 관점의 희용 방향만 제시하며, 조후·통관·종격 여부에 따라 실제 용신 판단은 달라질 수 있습니다." +
      (score >= 80 || score < 20 ? " 극단적인 구조이므로 종격(從格) 여부를 별도로 검토해야 합니다." : ""),
  };
}

function analyzeGyeok(pillars: NatalChart["pillars"], keys: PillarKey[]): GyeokAnalysis {
  const m = pillars.month!;
  const visibleStems = keys.filter((k) => k !== "day").map((k) => pillars[k]!.stem);
  const mainTg = m.branchTenGod;
  if (mainTg === "비견") return { name: "건록격(월지 비견)", basis: `월지 ${m.branchChar}의 정기가 일간과 같은 오행·음양(비견)입니다. 외격 판단은 투간된 다른 십성을 함께 봅니다.` };
  if (mainTg === "겁재") return { name: "양인격/월겁격(월지 겁재)", basis: `월지 ${m.branchChar}의 정기가 겁재입니다.` };
  const ordered = [...m.hidden].reverse(); // 정기 → 중기 → 여기
  const revealed = ordered.find((h) => visibleStems.includes(h.stem) && TEN_GOD_GROUP[h.tenGod] !== "비겁");
  if (revealed) return { name: `${revealed.tenGod}격`, basis: `월지 ${m.branchChar}의 지장간 ${revealed.char}(${revealed.role})이(가) 천간에 투출하여 ${revealed.tenGod}격으로 봅니다.` };
  return { name: `${mainTg}격`, basis: `월지 지장간 중 투출한 글자가 없어 월지 정기의 십성(${mainTg})으로 격을 잡았습니다.` };
}

function analyzeJohu(p: FourPillars, keys: PillarKey[]): JohuAnalysis {
  const season = seasonOfBranch(p.month.branch);
  const chars = keys.flatMap((k) => [STEM_ELEMENT[p[k]!.stem], BRANCH_ELEMENT[p[k]!.branch]]);
  if (season === "겨울") {
    const present = chars.includes("火");
    return { season, need: "火", present, description: present ? "겨울생으로 차가운 기운이 강하나 원국에 火가 있어 온기를 보완합니다." : "겨울생인데 원국에 火가 없어 조후상 따뜻한 기운(火)을 필요로 하는 구조입니다." };
  }
  if (season === "여름") {
    const present = chars.includes("水");
    return { season, need: "水", present, description: present ? "여름생으로 뜨거운 기운이 강하나 원국에 水가 있어 열기를 식혀 줍니다." : "여름생인데 원국에 水가 없어 조후상 시원한 기운(水)을 필요로 하는 구조입니다." };
  }
  return { season, need: null, present: true, description: `${season}생으로 한난(寒暖)이 극단적이지 않아 조후의 시급성은 상대적으로 낮습니다.` };
}

/** 성별에 따른 배우자성(전통 기준): 남성 재성(정재=처), 여성 관성(정관=남편) */
export function spouseStarGroup(gender: "male" | "female"): TenGodGroup {
  return gender === "male" ? "재성" : "관성";
}
export function spouseStarElement(dayStem: number, gender: "male" | "female"): Element {
  return elementOfGroup(dayStem, spouseStarGroup(gender));
}

export { generatedBy, controlledBy, generatesWhat, controlsWhat };
