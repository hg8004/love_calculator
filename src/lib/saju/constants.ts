/**
 * 명리학 기초 상수.
 * 이 파일의 표는 전통 명리 문헌(연해자평·삼명통회·자평진전 계열)에서 한국 만세력이
 * 일반적으로 채택하는 기준을 따른다. 학파별 차이가 있는 항목은 주석으로 표시한다.
 */

export type Element = "木" | "火" | "土" | "金" | "水";
export type YinYang = "양" | "음";

export const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const STEMS_KO = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
export const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
export const BRANCHES_KO = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;
export const BRANCH_ANIMALS = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"] as const;

export type Stem = (typeof STEMS)[number];
export type Branch = (typeof BRANCHES)[number];

export const ELEMENTS: Element[] = ["木", "火", "土", "金", "水"];
export const ELEMENT_KO: Record<Element, string> = { 木: "목", 火: "화", 土: "토", 金: "금", 水: "수" };

export const STEM_ELEMENT: Element[] = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"];
export const STEM_YINYANG: YinYang[] = ["양", "음", "양", "음", "양", "음", "양", "음", "양", "음"];

/** 지지 본래 오행 */
export const BRANCH_ELEMENT: Element[] = ["水", "土", "木", "木", "土", "火", "火", "土", "金", "金", "土", "水"];
/** 지지 음양 (체(體) 기준: 子寅辰午申戌 양) */
export const BRANCH_YINYANG: YinYang[] = ["양", "음", "양", "음", "양", "음", "양", "음", "양", "음", "양", "음"];

/**
 * 지장간(地藏干) — 월률분야(月律分野) 기준. [천간 index, 사령 일수]
 * 순서: 여기(餘氣) → 중기(中氣) → 정기(正氣). 마지막 원소가 정기.
 * 학파 차이: 申의 여기를 己로 보는 견해(己7·戊3·壬3·庚17), 寅의 여기 戊 대신 己를 쓰는 견해 등이 있다.
 */
export const HIDDEN_STEMS: Array<Array<[number, number]>> = [
  [[8, 10], [9, 20]], // 子: 壬 癸
  [[9, 9], [7, 3], [5, 18]], // 丑: 癸 辛 己
  [[4, 7], [2, 7], [0, 16]], // 寅: 戊 丙 甲
  [[0, 10], [1, 20]], // 卯: 甲 乙
  [[1, 9], [9, 3], [4, 18]], // 辰: 乙 癸 戊
  [[4, 7], [6, 7], [2, 16]], // 巳: 戊 庚 丙
  [[2, 10], [5, 9], [3, 11]], // 午: 丙 己 丁
  [[3, 9], [1, 3], [5, 18]], // 未: 丁 乙 己
  [[4, 7], [8, 7], [6, 16]], // 申: 戊 壬 庚
  [[6, 10], [7, 20]], // 酉: 庚 辛
  [[7, 9], [3, 3], [4, 18]], // 戌: 辛 丁 戊
  [[4, 7], [0, 7], [8, 16]], // 亥: 戊 甲 壬
];

/** 지지의 정기(본기) 천간 index — 십성 산출 시 지지를 대표하는 천간 */
export function mainHiddenStem(branch: number): number {
  const hs = HIDDEN_STEMS[branch];
  return hs[hs.length - 1][0];
}

/** 오행 상생: a가 b를 생하는가 */
export function generates(a: Element, b: Element): boolean {
  const order: Element[] = ["木", "火", "土", "金", "水"];
  return order[(order.indexOf(a) + 1) % 5] === b;
}
/** 오행 상극: a가 b를 극하는가 */
export function controls(a: Element, b: Element): boolean {
  const order: Element[] = ["木", "火", "土", "金", "水"];
  return order[(order.indexOf(a) + 2) % 5] === b;
}
export function generatedBy(e: Element): Element {
  const order: Element[] = ["木", "火", "土", "金", "水"];
  return order[(order.indexOf(e) + 4) % 5];
}
export function generatesWhat(e: Element): Element {
  const order: Element[] = ["木", "火", "土", "金", "水"];
  return order[(order.indexOf(e) + 1) % 5];
}
export function controlsWhat(e: Element): Element {
  const order: Element[] = ["木", "火", "土", "金", "水"];
  return order[(order.indexOf(e) + 2) % 5];
}
export function controlledBy(e: Element): Element {
  const order: Element[] = ["木", "火", "土", "金", "水"];
  return order[(order.indexOf(e) + 3) % 5];
}

/** 60갑자 index → [천간, 지지] */
export function ganzhiOf(index60: number): { stem: number; branch: number } {
  const i = ((index60 % 60) + 60) % 60;
  return { stem: i % 10, branch: i % 12 };
}
/** [천간, 지지] → 60갑자 index (음양이 맞지 않으면 -1) */
export function index60Of(stem: number, branch: number): number {
  for (let i = 0; i < 60; i++) if (i % 10 === stem && i % 12 === branch) return i;
  return -1;
}
export function ganzhiText(stem: number, branch: number): string {
  return STEMS[stem] + BRANCHES[branch];
}
export function ganzhiKo(stem: number, branch: number): string {
  return STEMS_KO[stem] + BRANCHES_KO[branch];
}

/** 계절: 寅卯辰 봄, 巳午未 여름, 申酉戌 가을, 亥子丑 겨울 */
export type Season = "봄" | "여름" | "가을" | "겨울";
export function seasonOfBranch(branch: number): Season {
  if ([2, 3, 4].includes(branch)) return "봄";
  if ([5, 6, 7].includes(branch)) return "여름";
  if ([8, 9, 10].includes(branch)) return "가을";
  return "겨울";
}

/** 월지 순서: 寅月=0 ... 丑月=11 → 지지 index */
export function monthOrderToBranch(order: number): number {
  return (order + 2) % 12;
}
export function branchToMonthOrder(branch: number): number {
  return (branch + 10) % 12;
}

/**
 * 12절(節) — 월주를 바꾸는 절기. 태양 황경(apparent ecliptic longitude of date) 기준.
 * index는 월 순서(寅月=0).
 */
export const JIE_TERMS = [
  { name: "입춘", hanja: "立春", longitude: 315 },
  { name: "경칩", hanja: "驚蟄", longitude: 345 },
  { name: "청명", hanja: "淸明", longitude: 15 },
  { name: "입하", hanja: "立夏", longitude: 45 },
  { name: "망종", hanja: "芒種", longitude: 75 },
  { name: "소서", hanja: "小暑", longitude: 105 },
  { name: "입추", hanja: "立秋", longitude: 135 },
  { name: "백로", hanja: "白露", longitude: 165 },
  { name: "한로", hanja: "寒露", longitude: 195 },
  { name: "입동", hanja: "立冬", longitude: 225 },
  { name: "대설", hanja: "大雪", longitude: 255 },
  { name: "소한", hanja: "小寒", longitude: 285 },
] as const;

/** 24절기 이름 — 황경 0°(춘분)부터 15° 간격 */
export const SOLAR_TERMS_24: Array<{ name: string; longitude: number; jie: boolean }> = [
      { name: "춘분", longitude: 0, jie: false },
      { name: "청명", longitude: 15, jie: true },
      { name: "곡우", longitude: 30, jie: false },
      { name: "입하", longitude: 45, jie: true },
      { name: "소만", longitude: 60, jie: false },
      { name: "망종", longitude: 75, jie: true },
      { name: "하지", longitude: 90, jie: false },
      { name: "소서", longitude: 105, jie: true },
      { name: "대서", longitude: 120, jie: false },
      { name: "입추", longitude: 135, jie: true },
      { name: "처서", longitude: 150, jie: false },
      { name: "백로", longitude: 165, jie: true },
      { name: "추분", longitude: 180, jie: false },
      { name: "한로", longitude: 195, jie: true },
      { name: "상강", longitude: 210, jie: false },
      { name: "입동", longitude: 225, jie: true },
      { name: "소설", longitude: 240, jie: false },
      { name: "대설", longitude: 255, jie: true },
      { name: "동지", longitude: 270, jie: false },
      { name: "소한", longitude: 285, jie: true },
      { name: "대한", longitude: 300, jie: false },
      { name: "입춘", longitude: 315, jie: true },
      { name: "우수", longitude: 330, jie: false },
      { name: "경칩", longitude: 345, jie: true },
];

export const TWELVE_STAGES = ["장생", "목욕", "관대", "건록", "제왕", "쇠", "병", "사", "묘", "절", "태", "양"] as const;
export type TwelveStage = (typeof TWELVE_STAGES)[number];

/** 십이운성 장생 위치(지지 index). 양간 순행, 음간 역행(陽生陰死) — 한국 만세력 통용 기준 */
export const CHANGSHENG_BRANCH: number[] = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3];
// 甲亥 乙午 丙寅 丁酉 戊寅 己酉 庚巳 辛子 壬申 癸卯 (戊己는 화토동법(火土同法))

export function twelveStage(stem: number, branch: number): TwelveStage {
  const start = CHANGSHENG_BRANCH[stem];
  const forward = STEM_YINYANG[stem] === "양";
  const offset = forward ? (branch - start + 12) % 12 : (start - branch + 12) % 12;
  return TWELVE_STAGES[offset];
}

export type TenGod = "비견" | "겁재" | "식신" | "상관" | "편재" | "정재" | "편관" | "정관" | "편인" | "정인";
export const TEN_GODS: TenGod[] = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"];
export type TenGodGroup = "비겁" | "식상" | "재성" | "관성" | "인성";
export const TEN_GOD_GROUP: Record<TenGod, TenGodGroup> = {
  비견: "비겁", 겁재: "비겁", 식신: "식상", 상관: "식상", 편재: "재성", 정재: "재성", 편관: "관성", 정관: "관성", 편인: "인성", 정인: "인성",
};

/** 일간(dayStem) 기준 다른 천간(other)의 십성 */
export function tenGodOf(dayStem: number, other: number): TenGod {
  const de = STEM_ELEMENT[dayStem];
  const oe = STEM_ELEMENT[other];
  const same = STEM_YINYANG[dayStem] === STEM_YINYANG[other];
  if (de === oe) return same ? "비견" : "겁재";
  if (generates(de, oe)) return same ? "식신" : "상관";
  if (controls(de, oe)) return same ? "편재" : "정재";
  if (controls(oe, de)) return same ? "편관" : "정관";
  return same ? "편인" : "정인"; // oe generates de
}

/** 일간 기준, 특정 십성 그룹에 해당하는 오행 */
export function elementOfGroup(dayStem: number, group: TenGodGroup): Element {
  const de = STEM_ELEMENT[dayStem];
  switch (group) {
    case "비겁": return de;
    case "식상": return generatesWhat(de);
    case "재성": return controlsWhat(de);
    case "관성": return controlledBy(de);
    case "인성": return generatedBy(de);
  }
}
