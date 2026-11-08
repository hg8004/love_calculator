/**
 * 주요 신살 산출. 각 신살은 산출 기준(basis)을 함께 반환한다.
 * 신살은 보조 지표이며, 단독으로 성향·운명을 단정하는 데 쓰지 않는다.
 */
import { BRANCHES, STEMS } from "./constants";

export type ShinsalName =
  | "도화살" | "홍염살" | "화개살" | "현침살" | "역마살" | "천을귀인" | "문창귀인" | "양인살" | "괴강살" | "백호살"
  | "원진살" | "귀문관살" | "고신살" | "과숙살" | "금여록";

export interface ShinsalHit {
  name: ShinsalName;
  /** 신살이 위치한 자리 */
  positions: string[];
  /** 산출 기준 */
  basis: string;
}

export interface PillarChars {
  label: "년주" | "월주" | "일주" | "시주";
  stem: number;
  branch: number;
}

// 삼합 그룹 기준 도화·역마·화개
const SAMHAP_GROUP = (b: number): number => [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3][b]; // 申子辰=0, 巳酉丑=1, 寅午戌=2, 亥卯未=3
const DOHWA = [9, 6, 3, 0]; // 申子辰→酉, 巳酉丑→午, 寅午戌→卯, 亥卯未→子
const YEOKMA = [2, 11, 8, 5]; // 申子辰→寅, 巳酉丑→亥, 寅午戌→申, 亥卯未→巳
const HWAGAE = [4, 1, 10, 7]; // 申子辰→辰, 巳酉丑→丑, 寅午戌→戌, 亥卯未→未
const GROUP_NAME = ["申子辰", "巳酉丑", "寅午戌", "亥卯未"];

// 일간 기준
const HONGYEOM = [6, 6, 2, 7, 4, 4, 10, 9, 0, 8]; // 甲午 乙午 丙寅 丁未 戊辰 己辰 庚戌 辛酉 壬子 癸申
const CHEONEUL: number[][] = [[1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [2, 6], [5, 3], [5, 3]];
const MUNCHANG = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3]; // 甲巳 乙午 丙申 丁酉 戊申 己酉 庚亥 辛子 壬寅 癸卯
const YANGIN: Array<number | null> = [3, null, 6, null, 6, null, 9, null, 0, null]; // 양간만: 甲卯 丙午 戊午 庚酉 壬子
const GEUMYEO = [4, 5, 7, 8, 7, 8, 10, 11, 1, 2]; // 甲辰 乙巳 丙未 丁申 戊未 己申 庚戌 辛亥 壬丑 癸寅

// 간지 조합 기준
const GOEGANG = new Set(["6-4", "6-10", "8-4", "8-10", "4-10"]); // 庚辰 庚戌 壬辰 壬戌 戊戌
const BAEKHO = new Set(["0-4", "1-7", "2-10", "3-1", "4-4", "8-10", "9-1"]); // 甲辰 乙未 丙戌 丁丑 戊辰 壬戌 癸丑
const HYEONCHIM_STEMS = new Set([0, 7]); // 甲 辛
const HYEONCHIM_BRANCHES = new Set([3, 6, 8]); // 卯 午 申 (未를 포함하는 견해도 있음)

// 지지 쌍
const pairKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const WONJIN = new Set(["0-7", "1-6", "2-9", "3-8", "4-11", "5-10"]);
const GWIMUN = new Set(["0-9", "1-6", "2-7", "3-8", "4-11", "5-10"]);

// 고신·과숙 (년지 방합 기준)
function gosinGwasuk(yearBranch: number): { gosin: number; gwasuk: number } {
  if ([11, 0, 1].includes(yearBranch)) return { gosin: 2, gwasuk: 10 };
  if ([2, 3, 4].includes(yearBranch)) return { gosin: 5, gwasuk: 1 };
  if ([5, 6, 7].includes(yearBranch)) return { gosin: 8, gwasuk: 4 };
  return { gosin: 11, gwasuk: 7 };
}

export function computeShinsal(pillars: PillarChars[]): ShinsalHit[] {
  const hits: ShinsalHit[] = [];
  const year = pillars.find((p) => p.label === "년주")!;
  const day = pillars.find((p) => p.label === "일주")!;
  const add = (name: ShinsalName, positions: string[], basis: string) => {
    if (!positions.length) return;
    const existing = hits.find((h) => h.name === name && h.basis === basis);
    if (existing) existing.positions = Array.from(new Set([...existing.positions, ...positions]));
    else hits.push({ name, positions: Array.from(new Set(positions)), basis });
  };
  const branchPos = (target: number, exclude?: string) =>
    pillars.filter((p) => p.branch === target && p.label !== exclude).map((p) => `${p.label.replace("주", "")}지(${BRANCHES[p.branch]})`);

  for (const ref of [{ p: year, name: "년지" }, { p: day, name: "일지" }]) {
    const g = SAMHAP_GROUP(ref.p.branch);
    const refLabel = `${ref.name} ${BRANCHES[ref.p.branch]}(${GROUP_NAME[g]}) 기준`;
    add("도화살", branchPos(DOHWA[g], ref.p.label), `${refLabel} → ${BRANCHES[DOHWA[g]]}`);
    add("역마살", branchPos(YEOKMA[g], ref.p.label), `${refLabel} → ${BRANCHES[YEOKMA[g]]}`);
    add("화개살", branchPos(HWAGAE[g], ref.p.label), `${refLabel} → ${BRANCHES[HWAGAE[g]]}`);
  }
  const ds = day.stem;
  add("홍염살", branchPos(HONGYEOM[ds]), `일간 ${STEMS[ds]} 기준 → ${BRANCHES[HONGYEOM[ds]]}`);
  add("천을귀인", CHEONEUL[ds].flatMap((b) => branchPos(b)), `일간 ${STEMS[ds]} 기준 → ${CHEONEUL[ds].map((b) => BRANCHES[b]).join("·")}`);
  add("문창귀인", branchPos(MUNCHANG[ds]), `일간 ${STEMS[ds]} 기준 → ${BRANCHES[MUNCHANG[ds]]}`);
  add("금여록", branchPos(GEUMYEO[ds]), `일간 ${STEMS[ds]} 기준 → ${BRANCHES[GEUMYEO[ds]]}`);
  const yi = YANGIN[ds];
  if (yi !== null) add("양인살", branchPos(yi), `양간 일간 ${STEMS[ds]} 기준 → ${BRANCHES[yi]} (음간 양인은 학파 이견이 커 미적용)`);

  for (const p of pillars) {
    const k = `${p.stem}-${p.branch}`;
    const gz = STEMS[p.stem] + BRANCHES[p.branch];
    if (GOEGANG.has(k)) add("괴강살", [`${p.label}(${gz})`], "간지 庚辰·庚戌·壬辰·壬戌·戊戌 (일주에 있을 때 가장 중시)");
    if (BAEKHO.has(k)) add("백호살", [`${p.label}(${gz})`], "간지 甲辰·乙未·丙戌·丁丑·戊辰·壬戌·癸丑");
    const hc: string[] = [];
    if (HYEONCHIM_STEMS.has(p.stem)) hc.push(`${p.label.replace("주", "")}간(${STEMS[p.stem]})`);
    if (HYEONCHIM_BRANCHES.has(p.branch)) hc.push(`${p.label.replace("주", "")}지(${BRANCHES[p.branch]})`);
    add("현침살", hc, "글자 기준: 천간 甲·辛, 지지 卯·午·申 (未 포함 견해 있음)");
  }

  for (let i = 0; i < pillars.length; i++)
    for (let j = i + 1; j < pillars.length; j++) {
      const a = pillars[i];
      const b = pillars[j];
      const k = pairKey(a.branch, b.branch);
      const pos = [`${a.label.replace("주", "")}지(${BRANCHES[a.branch]})`, `${b.label.replace("주", "")}지(${BRANCHES[b.branch]})`];
      if (WONJIN.has(k)) add("원진살", pos, "지지 쌍: 子未·丑午·寅酉·卯申·辰亥·巳戌");
      if (GWIMUN.has(k)) add("귀문관살", pos, "지지 쌍: 子酉·丑午·寅未·卯申·辰亥·巳戌");
    }

  const gg = gosinGwasuk(year.branch);
  add("고신살", branchPos(gg.gosin, "년주"), `년지 ${BRANCHES[year.branch]} 기준 → ${BRANCHES[gg.gosin]}`);
  add("과숙살", branchPos(gg.gwasuk, "년주"), `년지 ${BRANCHES[year.branch]} 기준 → ${BRANCHES[gg.gwasuk]}`);
  return hits;
}

/** 운(대운·세운·월운)의 지지가 원국 기준 신살 자리에 해당하는지 */
export function shinsalOfIncomingBranch(dayStem: number, yearBranch: number, dayBranch: number, incoming: number): ShinsalName[] {
  const out: ShinsalName[] = [];
  for (const ref of [yearBranch, dayBranch]) {
    const g = SAMHAP_GROUP(ref);
    if (DOHWA[g] === incoming) out.push("도화살");
    if (YEOKMA[g] === incoming) out.push("역마살");
    if (HWAGAE[g] === incoming) out.push("화개살");
  }
  if (HONGYEOM[dayStem] === incoming) out.push("홍염살");
  if (CHEONEUL[dayStem].includes(incoming)) out.push("천을귀인");
  if (GEUMYEO[dayStem] === incoming) out.push("금여록");
  return Array.from(new Set(out));
}

export const SHINSAL_INFO: Record<ShinsalName, { summary: string; basis: string }> = {
  도화살: { summary: "사람의 시선을 끄는 매력과 표현력의 상징입니다. 인기·대인관계가 활발해질 수 있으나, 단독으로 이성 관계의 복잡함을 뜻하지는 않습니다.", basis: "년지 또는 일지의 삼합 그룹 기준 子·午·卯·酉 (申子辰→酉, 巳酉丑→午, 寅午戌→卯, 亥卯未→子)" },
  홍염살: { summary: "은근한 색기와 분위기, 감성적 매력을 상징합니다. 외적 분위기에 대한 감수성이 높다고 보는 참고 지표입니다.", basis: "일간 기준: 甲乙→午, 丙→寅, 丁→未, 戊己→辰, 庚→戌, 辛→酉, 壬→子, 癸→申" },
  화개살: { summary: "예술·학문·종교적 몰입과 내면 지향의 상징입니다. 혼자만의 세계와 깊이를 중시하는 경향으로 해석합니다.", basis: "년지 또는 일지 삼합 그룹의 묘지: 申子辰→辰, 巳酉丑→丑, 寅午戌→戌, 亥卯未→未" },
  현침살: { summary: "뾰족한 바늘처럼 예리한 감각·분석력·말솜씨를 상징합니다. 섬세한 기술 분야의 재능 또는 날카로운 말투로 나타날 수 있습니다.", basis: "글자 모양 기준: 천간 甲·辛, 지지 卯·午·申 (未 포함 견해 있음)" },
  역마살: { summary: "이동·변화·활동 범위의 확장을 상징합니다. 새로운 환경이나 원거리 인연과 연결해 해석하기도 합니다.", basis: "년지 또는 일지 삼합 그룹의 생지 충: 申子辰→寅, 巳酉丑→亥, 寅午戌→申, 亥卯未→巳" },
  천을귀인: { summary: "어려울 때 도움을 받는 귀인의 별로, 가장 대표적인 길신입니다. 좋은 사람을 만나는 인복의 참고 지표입니다.", basis: "일간 기준: 甲戊庚→丑未, 乙己→子申, 丙丁→亥酉, 辛→寅午, 壬癸→巳卯" },
  문창귀인: { summary: "학문·문장·지적 재능의 별입니다. 대화와 지적 교감을 중시하는 경향과 연결해 볼 수 있습니다.", basis: "일간 기준: 甲→巳, 乙→午, 丙戊→申, 丁己→酉, 庚→亥, 辛→子, 壬→寅, 癸→卯" },
  양인살: { summary: "칼날처럼 강한 의지와 승부욕을 상징합니다. 추진력이 되지만 관계에서 고집·충돌로 나타날 수 있습니다.", basis: "양간 일간 기준 제왕지: 甲→卯, 丙戊→午, 庚→酉, 壬→子 (음간 양인은 이견이 커 미적용)" },
  괴강살: { summary: "강한 기세와 결단력, 리더십을 상징합니다. 관계에서는 주도권을 쥐려는 성향으로 나타날 수 있습니다.", basis: "간지 庚辰·庚戌·壬辰·壬戌·戊戌 (일주를 가장 중시)" },
  백호살: { summary: "강한 에너지와 극적인 사건성을 상징합니다. 현대에는 강한 추진력·전문성으로 해석하는 경우가 많습니다.", basis: "간지 甲辰·乙未·丙戌·丁丑·戊辰·壬戌·癸丑" },
  원진살: { summary: "서로 끌리면서도 미묘하게 불편함을 느끼는 정서적 긴장의 상징입니다.", basis: "지지 쌍: 子未·丑午·寅酉·卯申·辰亥·巳戌" },
  귀문관살: { summary: "예민한 직관과 감수성의 상징입니다. 섬세함이 장점이 되지만 신경이 날카로워질 수 있습니다.", basis: "지지 쌍: 子酉·丑午·寅未·卯申·辰亥·巳戌" },
  고신살: { summary: "독립심과 혼자 있는 시간을 중시하는 경향의 참고 지표입니다. 단독으로 외로움을 단정하지 않습니다.", basis: "년지 방합 기준: 亥子丑→寅, 寅卯辰→巳, 巳午未→申, 申酉戌→亥" },
  과숙살: { summary: "관계에서 거리감·자기만의 영역을 중시하는 경향의 참고 지표입니다. 단독으로 판단하지 않습니다.", basis: "년지 방합 기준: 亥子丑→戌, 寅卯辰→丑, 巳午未→辰, 申酉戌→未" },
  금여록: { summary: "금으로 만든 수레라는 뜻으로, 배우자 덕·품위 있는 생활의 상징으로 보는 길신입니다.", basis: "일간 기준: 甲→辰, 乙→巳, 丙戊→未, 丁己→申, 庚→戌, 辛→亥, 壬→丑, 癸→寅" },
};
