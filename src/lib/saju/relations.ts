/**
 * 합·충·형·파·해 판정.
 * 이 모듈은 '관계가 성립하는가'와 '합화 조건이 갖춰졌는가'까지만 판정한다.
 * 좋고 나쁨(점수)은 판정하지 않으며, 해석은 love/score.ts 에서 원국 맥락과 함께 개별적으로 이뤄진다.
 */
import {
  BRANCHES, BRANCH_ELEMENT, Element, HIDDEN_STEMS, STEMS, STEM_ELEMENT, controls, generates, mainHiddenStem,
} from "./constants";

export type Source = "원국" | "대운" | "세운" | "월운";
export type PositionKey =
  | "년간" | "월간" | "일간" | "시간" | "년지" | "월지" | "일지" | "시지"
  | "대운천간" | "대운지지" | "세운천간" | "세운지지" | "월운천간" | "월운지지";

export interface RelItem {
  pos: PositionKey;
  source: Source;
  kind: "stem" | "branch";
  value: number;
}

export type RelationKind =
  | "천간합" | "천간충" | "육합" | "삼합" | "반합" | "방합" | "충" | "형" | "자형" | "파" | "해" | "원진" | "귀문" | "암합";

export interface TransformAssessment {
  possibility: "높음" | "조건부" | "낮음";
  reasons: string[];
}

export interface Relation {
  kind: RelationKind;
  members: Array<{ pos: PositionKey; source: Source; char: string }>;
  /** 합의 결과 오행(합화 시) */
  element?: Element;
  label: string;
  description: string;
  involvesDayBranch: boolean;
  involvesDayStem: boolean;
  involvesMonthBranch: boolean;
  /** 원국 내부 관계일 때 인접 여부 */
  adjacent?: boolean;
  transform?: TransformAssessment;
  detail?: string;
}

const STEM_HAP: Record<string, Element> = { "0-5": "土", "1-6": "金", "2-7": "水", "3-8": "木", "4-9": "火" };
const STEM_CHUNG = new Set(["0-6", "1-7", "2-8", "3-9"]);
const LIUHE: Record<string, Element> = { "0-1": "土", "2-11": "木", "3-10": "火", "4-9": "金", "5-8": "水", "6-7": "火" };
const PA = new Set(["0-9", "1-4", "2-11", "3-6", "5-8", "7-10"]);
const HAE = new Set(["0-7", "1-6", "2-5", "3-4", "8-11", "9-10"]);
const WONJIN = new Set(["0-7", "1-6", "2-9", "3-8", "4-11", "5-10"]);
const GWIMUN = new Set(["0-9", "1-6", "2-7", "3-8", "4-11", "5-10"]);
export const SAMHAP: Array<{ members: number[]; element: Element; king: number }> = [
  { members: [8, 0, 4], element: "水", king: 0 },
  { members: [11, 3, 7], element: "木", king: 3 },
  { members: [2, 6, 10], element: "火", king: 6 },
  { members: [5, 9, 1], element: "金", king: 9 },
];
export const BANGHAP: Array<{ members: number[]; element: Element }> = [
  { members: [2, 3, 4], element: "木" },
  { members: [5, 6, 7], element: "火" },
  { members: [8, 9, 10], element: "金" },
  { members: [11, 0, 1], element: "水" },
];
const HYUNG_GROUPS: Array<{ members: number[]; name: string }> = [
  { members: [2, 5, 8], name: "인사신 삼형(무은지형 無恩之刑)" },
  { members: [1, 10, 7], name: "축술미 삼형(지세지형 持勢之刑)" },
];
const SELF_HYUNG = new Set([4, 6, 9, 11]);

const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const pairText = (table: readonly string[], a: number, b: number) => (a <= b ? table[a] + table[b] : table[b] + table[a]);
const charOf = (it: RelItem) => (it.kind === "stem" ? STEMS[it.value] : BRANCHES[it.value]);
const NATAL_ORDER: PositionKey[] = ["년지", "월지", "일지", "시지"];
const NATAL_STEM_ORDER: PositionKey[] = ["년간", "월간", "일간", "시간"];

function isAdjacent(a: RelItem, b: RelItem): boolean | undefined {
  if (a.source !== "원국" || b.source !== "원국") return undefined;
  const order = a.kind === "stem" ? NATAL_STEM_ORDER : NATAL_ORDER;
  const ia = order.indexOf(a.pos);
  const ib = order.indexOf(b.pos);
  if (ia < 0 || ib < 0) return undefined;
  return Math.abs(ia - ib) === 1;
}

function mk(kind: RelationKind, items: RelItem[], extra: Partial<Relation> & { label: string; description: string }): Relation {
  return {
    kind,
    members: items.map((i) => ({ pos: i.pos, source: i.source, char: charOf(i) })),
    involvesDayBranch: items.some((i) => i.pos === "일지"),
    involvesDayStem: items.some((i) => i.pos === "일간"),
    involvesMonthBranch: items.some((i) => i.pos === "월지"),
    ...extra,
  };
}

export interface TransformContext {
  monthBranch: number;
  /** 원국(및 해당 시기) 천간 목록 */
  stems: number[];
  /** 원국(및 해당 시기) 지지 목록 */
  branches: number[];
}

function assessStemTransform(a: RelItem, b: RelItem, el: Element, ctx: TransformContext, allStems: RelItem[]): TransformAssessment {
  const reasons: string[] = [];
  let plus = 0;
  let minus = 0;
  const monthEl = BRANCH_ELEMENT[ctx.monthBranch];
  const monthMain = STEM_ELEMENT[mainHiddenStem(ctx.monthBranch)];
  if (monthEl === el || monthMain === el) {
    plus += 2;
    reasons.push(`월령(${BRANCHES[ctx.monthBranch]})이 합화 오행 ${el}과 같아 화(化)할 기반이 있습니다.`);
  } else if (generates(monthEl, el)) {
    plus += 1;
    reasons.push(`월령(${BRANCHES[ctx.monthBranch]}, ${monthEl})이 합화 오행 ${el}을 생하여 일부 기반이 있습니다.`);
  } else {
    minus += 1;
    reasons.push(`월령(${BRANCHES[ctx.monthBranch]}, ${monthEl})이 합화 오행 ${el}을 돕지 않아 합이불화(合而不化)일 가능성이 큽니다.`);
  }
  const rooted = ctx.branches.some((br) => HIDDEN_STEMS[br].some(([s]) => STEM_ELEMENT[s] === el));
  if (rooted) {
    plus += 1;
    reasons.push(`지지 지장간에 ${el} 기운이 있어 합화 오행이 뿌리를 둡니다.`);
  }
  const breaker = ctx.stems.some((s) => controls(STEM_ELEMENT[s], el) && s !== a.value && s !== b.value);
  if (breaker) {
    minus += 1;
    reasons.push(`천간에 ${el}을 극하는 글자가 있어 합화를 방해할 수 있습니다.`);
  }
  if (a.pos === "일간" || b.pos === "일간") {
    minus += 1;
    reasons.push("일간이 참여한 합은 일간 자신이 쉽게 변하지 않는다고 보는 견해가 많아, 합화보다 '묶임(정이 끌림)'으로 해석하는 경우가 많습니다.");
  }
  const adj = isAdjacent(a, b);
  if (adj === false) {
    minus += 1;
    reasons.push("원국에서 서로 떨어져 있어 합의 힘이 약합니다(원격 합).");
  }
  const rivals = allStems.filter((s) => s !== a && s !== b && (s.value === a.value || s.value === b.value));
  if (rivals.length > 0) {
    minus += 1;
    reasons.push(`같은 글자가 더 있어 쟁합/투합(爭合·妬合) 구조가 됩니다(${rivals.map((r) => r.pos).join(", ")}).`);
  }
  const possibility = plus >= 3 && minus === 0 ? "높음" : plus >= 2 && minus <= 1 ? "조건부" : "낮음";
  return { possibility, reasons };
}

function assessBranchTransform(items: RelItem[], el: Element, ctx: TransformContext, chungTargets: Set<number>): TransformAssessment {
  const reasons: string[] = [];
  let plus = 0;
  let minus = 0;
  const monthEl = BRANCH_ELEMENT[ctx.monthBranch];
  if (monthEl === el) {
    plus += 2;
    reasons.push(`월령(${BRANCHES[ctx.monthBranch]})이 ${el} 기운이라 합의 결과 오행이 힘을 얻습니다.`);
  } else if (generates(monthEl, el)) {
    plus += 1;
    reasons.push(`월령(${monthEl})이 ${el}을 생합니다.`);
  } else {
    reasons.push(`월령(${monthEl})이 ${el}을 직접 돕지는 않습니다.`);
  }
  if (ctx.stems.some((s) => STEM_ELEMENT[s] === el)) {
    plus += 1;
    reasons.push(`천간에 ${el} 오행이 투출해 있어 합의 결과가 드러나기 쉽습니다.`);
  } else {
    minus += 1;
    reasons.push(`천간에 ${el} 오행이 투출하지 않아 합의 결과가 겉으로 드러나기 어렵습니다.`);
  }
  const broken = items.filter((i) => chungTargets.has(i.value));
  if (broken.length) {
    minus += 1;
    reasons.push(`${broken.map((b) => BRANCHES[b.value]).join("·")}이(가) 충을 함께 받고 있어 합이 깨지거나(합충) 불안정할 수 있습니다.`);
  }
  const possibility = plus >= 3 && minus === 0 ? "높음" : plus >= 2 ? "조건부" : "낮음";
  return { possibility, reasons };
}

/**
 * items 사이의 모든 관계를 찾는다.
 * mustInclude 가 주어지면 해당 source 가 하나 이상 포함된 관계만 반환(운과 원국의 관계 분석용).
 */
export function findRelations(items: RelItem[], ctx: TransformContext, mustInclude?: Source[]): Relation[] {
  const out: Relation[] = [];
  const stems = items.filter((i) => i.kind === "stem");
  const branches = items.filter((i) => i.kind === "branch");
  const ok = (group: RelItem[]) => !mustInclude || group.some((g) => mustInclude.includes(g.source));

  // 충 대상(합의 안정성 판단용)
  const chungTargets = new Set<number>();
  for (let i = 0; i < branches.length; i++)
    for (let j = i + 1; j < branches.length; j++)
      if ((branches[i].value + 6) % 12 === branches[j].value) {
        chungTargets.add(branches[i].value);
        chungTargets.add(branches[j].value);
      }

  // 천간
  for (let i = 0; i < stems.length; i++) {
    for (let j = i + 1; j < stems.length; j++) {
      const a = stems[i];
      const b = stems[j];
      if (!ok([a, b])) continue;
      const k = key(a.value, b.value);
      if (STEM_HAP[k]) {
        const el = STEM_HAP[k];
        out.push(
          mk("천간합", [a, b], {
            element: el,
            label: `${pairText(STEMS, a.value, b.value)}합(${el})`,
            description: `${a.pos} ${STEMS[a.value]}와(과) ${b.pos} ${STEMS[b.value]}가 합하여 ${el} 기운으로 묶이려는 작용`,
            adjacent: isAdjacent(a, b),
            transform: assessStemTransform(a, b, el, ctx, stems),
          }),
        );
      }
      if (STEM_CHUNG.has(k)) {
        out.push(
          mk("천간충", [a, b], {
            label: `${pairText(STEMS, a.value, b.value)}충`,
            description: `${a.pos} ${STEMS[a.value]}와(과) ${b.pos} ${STEMS[b.value]}가 서로 부딪히는 작용(천간의 대립·긴장)`,
            adjacent: isAdjacent(a, b),
          }),
        );
      }
    }
  }

  // 지지 2자 관계
  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const a = branches[i];
      const b = branches[j];
      if (!ok([a, b])) continue;
      const k = key(a.value, b.value);
      const A = BRANCHES[Math.min(a.value, b.value)];
      const B = BRANCHES[Math.max(a.value, b.value)];
      const PA_ = BRANCHES[a.value];
      const PB_ = BRANCHES[b.value];
      const adj = isAdjacent(a, b);
      if (LIUHE[k]) {
        const el = LIUHE[k];
        out.push(
          mk("육합", [a, b], {
            element: el,
            label: `${A}${B}합(${el})`,
            description: `${a.pos} ${PA_}와(과) ${b.pos} ${PB_}의 육합 — 서로 끌어당겨 묶이는 작용` + (k === "6-7" ? " (午未합은 火 또는 土로 보는 견해가 나뉨)" : ""),
            adjacent: adj,
            transform: assessBranchTransform([a, b], el, ctx, chungTargets),
          }),
        );
      }
      if ((a.value + 6) % 12 === b.value) {
        out.push(
          mk("충", [a, b], {
            label: `${A}${B}충`,
            description: `${a.pos} ${PA_}와(과) ${b.pos} ${PB_}의 충 — 대립하는 기운이 부딪혀 변화·이동·재편을 일으키는 작용`,
            adjacent: adj,
          }),
        );
      }
      if (a.value === b.value && SELF_HYUNG.has(a.value)) {
        out.push(mk("자형", [a, b], { label: `${A}${B}자형`, description: `같은 글자 ${A}가 겹쳐 스스로를 압박하는 자형(自刑)`, adjacent: adj }));
      }
      if (k === "0-3") {
        out.push(mk("형", [a, b], { label: "子卯형", description: `${a.pos} ${PA_}와(과) ${b.pos} ${PB_}의 무례지형(無禮之刑) — 예의·거리감 문제로 마찰이 생기기 쉬운 작용`, adjacent: adj }));
      }
      for (const g of HYUNG_GROUPS) {
        if (g.members.includes(a.value) && g.members.includes(b.value) && a.value !== b.value) {
          out.push(mk("형", [a, b], { label: `${A}${B}형`, description: `${a.pos} ${PA_}와(과) ${b.pos} ${PB_} — ${g.name}의 일부. 긴장·조정·책임 문제로 나타날 수 있는 작용`, adjacent: adj }));
        }
      }
      if (PA.has(k)) out.push(mk("파", [a, b], { label: `${A}${B}파`, description: `${a.pos} ${PA_}와(과) ${b.pos} ${PB_}의 파(破) — 기존 구조에 균열을 내거나 계획을 어긋나게 하는 작용`, adjacent: adj }));
      if (HAE.has(k)) out.push(mk("해", [a, b], { label: `${A}${B}해`, description: `${a.pos} ${PA_}와(과) ${b.pos} ${PB_}의 해(害) — 합을 방해하거나 서운함·오해를 낳는 작용`, adjacent: adj }));
      if (WONJIN.has(k)) out.push(mk("원진", [a, b], { label: `${A}${B}원진`, description: `${a.pos} ${PA_}와(과) ${b.pos} ${PB_}의 원진 — 이유 없이 끌리면서도 미묘하게 불편함을 느끼는 정서적 긴장`, adjacent: adj }));
      if (GWIMUN.has(k)) out.push(mk("귀문", [a, b], { label: `${A}${B}귀문`, description: `${a.pos} ${PA_}와(과) ${b.pos} ${PB_}의 귀문관 — 예민한 직관·감수성, 신경이 날카로워지는 경향`, adjacent: adj }));

      // 암합: 두 지지의 지장간끼리 천간합 (정기가 하나 이상 포함될 때만)
      const ha = HIDDEN_STEMS[a.value];
      const hb = HIDDEN_STEMS[b.value];
      const pairs: string[] = [];
      ha.forEach(([sa], ia) =>
        hb.forEach(([sb], ib) => {
          const isMainA = ia === ha.length - 1;
          const isMainB = ib === hb.length - 1;
          if ((isMainA || isMainB) && STEM_HAP[key(sa, sb)]) pairs.push(`${STEMS[sa]}${STEMS[sb]}`);
        }),
      );
      if (pairs.length && !LIUHE[k]) {
        out.push(
          mk("암합", [a, b], {
            label: `${A}${B}암합`,
            description: `${A}와(과) ${B}의 지장간 ${pairs.join("·")}이(가) 안에서 합하는 암합 — 드러나지 않는 끌림·비밀스러운 연결로 해석하는 참고 관계`,
            adjacent: adj,
          }),
        );
      }
    }
  }

  // 삼합 / 반합 / 방합 (3자)
  for (const g of SAMHAP) {
    const present = g.members.map((m) => branches.filter((b) => b.value === m));
    const has = present.map((p) => p.length > 0);
    if (has.every(Boolean)) {
      // 같은 글자가 여러 위치에 있으면 위치 조합마다 판정(예: 년지·일지에 모두 戌)
      for (const group of cartesian(present)) {
        if (!ok(group)) continue;
        out.push(
          mk("삼합", group, {
            element: g.element,
            label: `${g.members.map((m) => BRANCHES[m]).join("")} 삼합(${g.element}국)`,
            description: `${group.map((x) => `${x.pos} ${BRANCHES[x.value]}`).join(", ")}이(가) 모여 ${g.element} 기운의 국(局)을 이루는 작용`,
            transform: assessBranchTransform(group, g.element, ctx, chungTargets),
          }),
        );
      }
    } else {
      const kingIdx = g.members.indexOf(g.king);
      if (has[kingIdx]) {
        g.members.forEach((m, idx) => {
          if (idx === kingIdx || !has[idx]) return;
          for (const group of cartesian([present[kingIdx], present[idx]])) {
          if (!ok(group)) continue;
          out.push(
            mk("반합", group, {
              element: g.element,
              label: `${[...group].sort((x, y) => g.members.indexOf(x.value) - g.members.indexOf(y.value)).map((x) => BRANCHES[x.value]).join("")} 반합(${g.element})`,
              description: `${group[0].pos} ${BRANCHES[group[0].value]}와(과) ${group[1].pos} ${BRANCHES[group[1].value]} — 삼합의 왕지(${BRANCHES[g.king]})를 포함한 두 글자가 ${g.element} 기운으로 기우는 반합`,
              adjacent: isAdjacent(group[0], group[1]),
              transform: assessBranchTransform(group, g.element, ctx, chungTargets),
            }),
          );
          }
        });
      }
    }
  }
  for (const g of BANGHAP) {
    const present = g.members.map((m) => branches.filter((b) => b.value === m));
    if (present.every((p) => p.length > 0)) {
      for (const group of cartesian(present)) {
        if (!ok(group)) continue;
        out.push(
          mk("방합", group, {
            element: g.element,
            label: `${g.members.map((m) => BRANCHES[m]).join("")} 방합(${g.element})`,
            description: `${group.map((x) => `${x.pos} ${BRANCHES[x.value]}`).join(", ")} — 같은 계절의 세 지지가 모여 ${g.element} 기운이 강해지는 작용`,
            transform: assessBranchTransform(group, g.element, ctx, chungTargets),
          }),
        );
      }
    }
  }
  // 인사신 / 축술미 삼형 완성
  for (const g of HYUNG_GROUPS) {
    const present = g.members.map((m) => branches.filter((b) => b.value === m));
    if (!present.every((p) => p.length > 0)) continue;
    for (const group of cartesian(present)) {
      if (!ok(group)) continue;
      out.push(mk("형", group, { label: g.members.map((m) => BRANCHES[m]).join("") + " 삼형", description: `${group.map((x) => `${x.pos} ${BRANCHES[x.value]}`).join(", ")} — ${g.name}이 완전히 갖춰진 구조` }));
    }
  }
  return out;
}

/** 위치 후보 배열들의 모든 조합 */
function cartesian<T>(lists: T[][]): T[][] {
  return lists.reduce<T[][]>((acc, list) => acc.flatMap((a) => list.map((x) => [...a, x])), [[]]);
}

export const RELATION_GUIDE: Record<RelationKind, string> = {
  천간합: "두 천간이 끌어당겨 묶이는 관계. 합화 조건(월령·통근·방해 글자)이 갖춰져야 실제로 오행이 바뀐다고 보며, 그렇지 않으면 묶여서 본래 작용이 약해지는 것으로 봅니다.",
  천간충: "서로 극하는 같은 음양의 천간이 마주한 관계. 생각·태도의 충돌이나 방향 전환으로 나타날 수 있습니다.",
  육합: "두 지지가 짝을 이뤄 묶이는 관계. 친밀감과 결속의 상징이지만, 묶임으로 인해 본래 역할이 묶이는(합거) 부작용도 있습니다.",
  삼합: "생지·왕지·묘지가 모여 한 오행의 국을 이루는 강한 결합. 사회적 연결·목적 공유의 상징입니다.",
  반합: "삼합 중 두 글자가 모인 결합. 삼합보다 약하지만 해당 오행으로 기울게 합니다.",
  방합: "같은 계절의 세 지지가 모인 결합. 한 오행의 세력이 크게 강해집니다.",
  충: "정반대 지지가 부딪히는 관계. 변화·이동·재편의 계기이며, 새로운 만남이나 기존 관계의 변화로 모두 나타날 수 있습니다.",
  형: "지지 사이의 긴장·조정 관계. 책임·규율·마찰의 문제로 나타나며, 상황에 따라 문제를 바로잡는 계기가 되기도 합니다.",
  자형: "같은 글자가 겹쳐 스스로를 압박하는 관계. 자기 기준이 엄격해지는 경향으로 봅니다.",
  파: "기존 구조에 금이 가는 관계. 계획 변경이나 사소한 어긋남으로 해석합니다.",
  해: "합을 방해하는 관계. 서운함·오해·거리감의 상징으로 봅니다.",
  원진: "서로 끌리면서도 미묘한 불편함이 공존하는 관계로 해석합니다.",
  귀문: "예민한 감수성과 직관이 강해지는 관계. 신경이 날카로워질 수 있습니다.",
  암합: "지장간끼리 은밀하게 합하는 관계. 드러나지 않는 끌림의 참고 지표이며 학파마다 범위가 다릅니다.",
};
