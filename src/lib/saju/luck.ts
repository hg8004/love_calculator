/**
 * 대운 · 세운 · 월운 계산
 *
 * 대운 방향: 연간이 양(陽)인 남성·음(陰)인 여성은 순행, 연간이 음인 남성·양인 여성은 역행 (전통 규칙, 연간은 입춘 기준)
 * 대운수: 순행은 출생~다음 절입, 역행은 직전 절입~출생까지의 실제 시간 차를 구해 3일 = 1년(1일 = 4개월, 2시간 = 10일)로 환산
 * 월운: 매월 1일이 아니라 12절의 절입 시각에 바뀐다.
 */
import { BRANCHES, HIDDEN_STEMS, STEMS, STEM_YINYANG, TenGod, TwelveStage, ganzhiOf, index60Of, mainHiddenStem, tenGodOf, twelveStage } from "./constants";
import { FourPillars, Pillar, monthPillarOf, yearPillarOfSajuYear } from "./pillars";
import { jieOfYear, surroundingJie, monthOrderOfJieLongitude, sajuYearOf, SolarTermInstant } from "./solarTerms";
import { Relation, RelItem, findRelations } from "./relations";
import { shinsalOfIncomingBranch, ShinsalName } from "./shinsal";

export type DaewoonRounding = "round" | "floor";
const YEAR_DAYS = 365.2425;
const DAY_MS = 86_400_000;

export interface LuckPillarInfo {
  stem: number;
  branch: number;
  ganzhi: string;
  stemTenGod: TenGod;
  branchTenGod: TenGod;
  hidden: Array<{ char: string; tenGod: TenGod }>;
  stage: TwelveStage;
  incomingShinsal: ShinsalName[];
}

export interface DaewoonPeriod extends LuckPillarInfo {
  index: number;
  /** 대운수 기준 시작 나이(만) */
  startAge: number;
  startDate: Date;
  endDate: Date;
  startYear: number;
  relations: Relation[];
}

export interface DaewoonInfo {
  forward: boolean;
  rule: string;
  /** 절입까지 실제 일수 */
  diffDays: number;
  exactYears: number;
  exactText: string;
  daewoonNumber: number;
  rounding: DaewoonRounding;
  basisJie: string;
  basisJieUtc: Date;
  periods: DaewoonPeriod[];
  note: string;
}

export function luckPillarInfo(p: Pillar, dayStem: number, yearBranch: number, dayBranch: number): LuckPillarInfo {
  return {
    stem: p.stem,
    branch: p.branch,
    ganzhi: STEMS[p.stem] + BRANCHES[p.branch],
    stemTenGod: tenGodOf(dayStem, p.stem),
    branchTenGod: tenGodOf(dayStem, mainHiddenStem(p.branch)),
    hidden: HIDDEN_STEMS[p.branch].map(([s]) => ({ char: STEMS[s], tenGod: tenGodOf(dayStem, s) })),
    stage: twelveStage(dayStem, p.branch),
    incomingShinsal: shinsalOfIncomingBranch(dayStem, yearBranch, dayBranch, p.branch),
  };
}

function natalCtx(natal: FourPillars, extra: Pillar[] = []) {
  const ps = [natal.year, natal.month, natal.day, ...(natal.hour ? [natal.hour] : []), ...extra];
  return { monthBranch: natal.month.branch, stems: ps.map((x) => x.stem), branches: ps.map((x) => x.branch) };
}

export function computeDaewoon(
  natal: FourPillars,
  natalItems: RelItem[],
  birthUtc: Date,
  gender: "male" | "female",
  rounding: DaewoonRounding,
  timeKnown: boolean,
): DaewoonInfo {
  const yangYear = STEM_YINYANG[natal.year.stem] === "양";
  const forward = (yangYear && gender === "male") || (!yangYear && gender === "female");
  const { prev, next } = surroundingJie(birthUtc);
  const basis = forward ? next : prev;
  const diffDays = Math.abs(basis.utc.getTime() - birthUtc.getTime()) / DAY_MS;
  const exactYears = diffDays / 3;
  const y = Math.floor(exactYears);
  const months = Math.floor((exactYears - y) * 12);
  const days = Math.round(((exactYears - y) * 12 - months) * 30);
  const daewoonNumber = rounding === "round" ? Math.max(1, Math.round(exactYears)) : Math.max(1, Math.floor(exactYears));
  const start0 = new Date(birthUtc.getTime() + exactYears * YEAR_DAYS * DAY_MS);
  const monthIdx = index60Of(natal.month.stem, natal.month.branch);
  const periods: DaewoonPeriod[] = [];
  for (let i = 1; i <= 10; i++) {
    const g = ganzhiOf(monthIdx + (forward ? i : -i));
    const startDate = new Date(start0.getTime() + (i - 1) * 10 * YEAR_DAYS * DAY_MS);
    const endDate = new Date(start0.getTime() + i * 10 * YEAR_DAYS * DAY_MS);
    const info = luckPillarInfo(g, natal.day.stem, natal.year.branch, natal.day.branch);
    const items: RelItem[] = [
      ...natalItems,
      { pos: "대운천간", source: "대운", kind: "stem", value: g.stem },
      { pos: "대운지지", source: "대운", kind: "branch", value: g.branch },
    ];
    periods.push({
      ...info,
      index: i,
      startAge: daewoonNumber + (i - 1) * 10,
      startDate,
      endDate,
      startYear: startDate.getUTCFullYear(),
      relations: findRelations(items, natalCtx(natal, [g]), ["대운"]),
    });
  }
  return {
    forward,
    rule: `연간 ${STEMS[natal.year.stem]}(${STEM_YINYANG[natal.year.stem]}) · ${gender === "male" ? "남성" : "여성"} → ${forward ? "순행" : "역행"} (양남음녀 순행, 음남양녀 역행)`,
    diffDays,
    exactYears,
    exactText: `${y}년 ${months}개월 ${days}일`,
    daewoonNumber,
    rounding,
    basisJie: basis.name,
    basisJieUtc: basis.utc,
    periods,
    note:
      `${forward ? "다음" : "직전"} 절기인 ${basis.name}까지 ${diffDays.toFixed(2)}일 → 3일=1년 환산 ${exactYears.toFixed(2)}년. ` +
      `대운수는 ${rounding === "round" ? "반올림" : "버림"}하여 ${daewoonNumber}로 표기하며, 운의 교체 시점은 환산값 그대로의 날짜를 사용합니다.` +
      (timeKnown ? "" : " 출생 시간을 모르므로 대운 계산에 한해 출생일 정오를 가정했습니다(대운 시작 시점 오차 최대 약 ±2개월)."),
  };
}

export function daewoonAt(info: DaewoonInfo, t: Date): DaewoonPeriod | null {
  const ms = t.getTime();
  return info.periods.find((p) => p.startDate.getTime() <= ms && ms < p.endDate.getTime()) ?? null;
}

export interface SeyunInfo extends LuckPillarInfo {
  year: number;
  lichunUtc: Date;
  daewoon: DaewoonPeriod | null;
  daewoonChangesThisYear: boolean;
  relations: Relation[];
  /** 대운-세운 사이 관계 */
  luckRelations: Relation[];
}

export interface WolunInfo extends LuckPillarInfo {
  /** 이 월운이 시작되는 양력 연·월 (표시용) */
  year: number;
  month: number;
  jieName: string;
  startUtc: Date;
  endUtc: Date;
  sajuYear: number;
  seyunGanzhi: string;
  daewoonGanzhi: string | null;
  relations: Relation[];
  luckRelations: Relation[];
}

export function computeSeyun(natal: FourPillars, natalItems: RelItem[], daewoon: DaewoonInfo, year: number): SeyunInfo {
  const p = yearPillarOfSajuYear(year);
  const lichun = jieOfYear(year).find((t) => t.longitude === 315)!.utc;
  const mid = new Date(Date.UTC(year, 6, 1));
  const dw = daewoonAt(daewoon, mid);
  const changes = daewoon.periods.some((d) => d.startDate.getUTCFullYear() === year);
  const items: RelItem[] = [...natalItems, { pos: "세운천간", source: "세운", kind: "stem", value: p.stem }, { pos: "세운지지", source: "세운", kind: "branch", value: p.branch }];
  const extra = [p, ...(dw ? [{ stem: dw.stem, branch: dw.branch }] : [])];
  const luckItems: RelItem[] = dw
    ? [
        { pos: "대운천간", source: "대운", kind: "stem", value: dw.stem },
        { pos: "대운지지", source: "대운", kind: "branch", value: dw.branch },
        { pos: "세운천간", source: "세운", kind: "stem", value: p.stem },
        { pos: "세운지지", source: "세운", kind: "branch", value: p.branch },
      ]
    : [];
  return {
    ...luckPillarInfo(p, natal.day.stem, natal.year.branch, natal.day.branch),
    year,
    lichunUtc: lichun,
    daewoon: dw,
    daewoonChangesThisYear: changes,
    relations: findRelations(items, natalCtx(natal, extra), ["세운"]),
    luckRelations: dw ? findRelations(luckItems, natalCtx(natal, extra), ["세운"]).filter((r) => r.members.some((m) => m.source === "대운")) : [],
  };
}

/** 양력 연도 year 안에서 시작하는 12개 월운(소한~대설) */
export function computeWolunOfYear(natal: FourPillars, natalItems: RelItem[], daewoon: DaewoonInfo, year: number): WolunInfo[] {
  const jies = [...jieOfYear(year), jieOfYear(year + 1)[0]];
  const out: WolunInfo[] = [];
  for (let i = 0; i < 12; i++) {
    const jie: SolarTermInstant = jies[i];
    const end = jies[i + 1].utc;
    const sajuYear = sajuYearOf(new Date(jie.utc.getTime() + 60_000));
    const order = monthOrderOfJieLongitude(jie.longitude);
    const yp = yearPillarOfSajuYear(sajuYear);
    const mp = monthPillarOf(yp.stem, order);
    const midT = new Date((jie.utc.getTime() + end.getTime()) / 2);
    const dw = daewoonAt(daewoon, midT);
    const items: RelItem[] = [...natalItems, { pos: "월운천간", source: "월운", kind: "stem", value: mp.stem }, { pos: "월운지지", source: "월운", kind: "branch", value: mp.branch }];
    const luckItems: RelItem[] = [
      { pos: "세운천간", source: "세운", kind: "stem", value: yp.stem },
      { pos: "세운지지", source: "세운", kind: "branch", value: yp.branch },
      ...(dw ? ([{ pos: "대운천간", source: "대운", kind: "stem", value: dw.stem }, { pos: "대운지지", source: "대운", kind: "branch", value: dw.branch }] as RelItem[]) : []),
      { pos: "월운천간", source: "월운", kind: "stem", value: mp.stem },
      { pos: "월운지지", source: "월운", kind: "branch", value: mp.branch },
    ];
    const extra = [mp, yp, ...(dw ? [{ stem: dw.stem, branch: dw.branch }] : [])];
    out.push({
      ...luckPillarInfo(mp, natal.day.stem, natal.year.branch, natal.day.branch),
      year,
      month: i + 1,
      jieName: jie.name,
      startUtc: jie.utc,
      endUtc: end,
      sajuYear,
      seyunGanzhi: STEMS[yp.stem] + BRANCHES[yp.branch],
      daewoonGanzhi: dw ? dw.ganzhi : null,
      relations: findRelations(items, natalCtx(natal, extra), ["월운"]),
      luckRelations: findRelations(luckItems, natalCtx(natal, extra), ["월운"]).filter((r) => r.members.some((m) => m.source !== "월운")),
    });
  }
  return out;
}
