/**
 * 사주 네 기둥(四柱) 계산.
 *
 * 연주: 입춘 절입 시각(절대 시각) 기준
 * 월주: 12절 절입 시각 기준 월지 + 오호둔(五虎遁) 월간
 * 일주: 율리우스 적일(JDN) 기반 60갑자 순환 — (JDN + 49) mod 60, 0 = 甲子
 * 시주: 판정 시각의 시지 + 오서둔(五鼠遁) 시간
 *
 * 자시(23:00~00:59) 처리 방식
 *   "zi-change"        : 23:00부터 다음 날 일진 적용(자시 일진 변경). 23시대 시간은 다음 날 일간 기준.
 *   "midnight-yajasi"  : 자정 기준 일진 변경 + 야자시설. 23시대는 당일 일주, 시간은 다음 날 일간 기준(다음 날 子時).
 *   "midnight-simple"  : 자정 기준 일진 변경. 23시대는 당일 일주, 시간도 당일 일간 기준.
 * 00:00~00:59(조자시)는 세 방식 모두 해당 날짜 일주, 해당 일간 기준 시간.
 */
import { ganzhiOf, index60Of } from "./constants";
import { surroundingJie, monthOrderOfJieLongitude, sajuYearOf, SolarTermInstant } from "./solarTerms";
import {
  NaiveDateTime, ResolvedBirthTime, SolarTimeMode, SolarTimeResult, naiveFromMs, naiveToMs, reckoningTime, resolveLocalBirthTime,
} from "./time";
import { DateTime } from "luxon";

export type ZiHourMode = "zi-change" | "midnight-yajasi" | "midnight-simple";

export const ZI_MODE_LABEL: Record<ZiHourMode, string> = {
  "zi-change": "A. 자시 일진 변경 (23:00부터 다음 날 일주)",
  "midnight-yajasi": "B. 자정 기준 + 야자시 (23시대 당일 일주, 시간은 다음 날 기준)",
  "midnight-simple": "B'. 자정 기준 단순 적용 (23시대 당일 일주, 시간도 당일 기준)",
};

export interface Pillar {
  stem: number;
  branch: number;
}

export interface FourPillars {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar | null;
}

export function julianDayNumber(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

export function dayPillarOfDate(y: number, m: number, d: number): Pillar {
  const idx = (((julianDayNumber(y, m, d) + 49) % 60) + 60) % 60;
  return ganzhiOf(idx);
}

export function yearPillarOfSajuYear(sajuYear: number): Pillar {
  return ganzhiOf((((sajuYear - 4) % 60) + 60) % 60);
}

/** 오호둔: 연간에 따른 寅月 천간 = (연간×2 + 2) mod 10 */
export function monthPillarOf(yearStem: number, monthOrder: number): Pillar {
  const stem = (yearStem * 2 + 2 + monthOrder) % 10;
  const branch = (monthOrder + 2) % 12;
  return { stem, branch };
}

/** 오서둔: 일간에 따른 子時 천간 = (일간×2) mod 10 */
export function hourPillarOf(dayStem: number, hourBranch: number): Pillar {
  return { stem: (dayStem * 2 + hourBranch) % 10, branch: hourBranch };
}

/** 판정 시각 → 시지. 子 23:00~00:59, 丑 01:00~02:59 ... */
export function hourBranchOf(hour: number, minute: number, second = 0): number {
  const minutes = hour * 60 + minute + second / 60;
  return Math.floor((minutes + 60) / 120) % 12;
}

function addDays(y: number, m: number, d: number, n: number): { year: number; month: number; day: number } {
  const t = new Date(Date.UTC(y, m - 1, d) + n * 86_400_000);
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

export type ZiKind = "야자시" | "조자시" | null;

export interface DayHourResult {
  day: Pillar;
  hour: Pillar;
  ziKind: ZiKind;
  /** 일주 판정에 사용한 날짜 */
  dayDate: { year: number; month: number; day: number };
  dayShifted: boolean;
  explanation: string;
}

/** 판정 시각(태양시 보정 후)과 자시 방식으로 일주·시주를 계산 */
export function dayAndHourPillars(r: NaiveDateTime, zi: ZiHourMode): DayHourResult {
  const hb = hourBranchOf(r.hour, r.minute, r.second);
  const today = { year: r.year, month: r.month, day: r.day };
  const todayPillar = dayPillarOfDate(r.year, r.month, r.day);
  if (r.hour === 23) {
    const tomorrow = addDays(r.year, r.month, r.day, 1);
    const tomorrowPillar = dayPillarOfDate(tomorrow.year, tomorrow.month, tomorrow.day);
    if (zi === "zi-change") {
      return {
        day: tomorrowPillar, hour: hourPillarOf(tomorrowPillar.stem, 0), ziKind: "야자시", dayDate: tomorrow, dayShifted: true,
        explanation: "23시대 출생: 자시 일진 변경 방식에 따라 다음 날의 일주를 적용하고, 시간은 다음 날 일간 기준 子時로 산출했습니다.",
      };
    }
    if (zi === "midnight-yajasi") {
      return {
        day: todayPillar, hour: hourPillarOf(tomorrowPillar.stem, 0), ziKind: "야자시", dayDate: today, dayShifted: false,
        explanation: "23시대 출생(야자시): 자정 기준으로 당일 일주를 유지하고, 시간은 다음 날 일간 기준 子時(오서둔)로 산출했습니다.",
      };
    }
    return {
      day: todayPillar, hour: hourPillarOf(todayPillar.stem, 0), ziKind: "야자시", dayDate: today, dayShifted: false,
      explanation: "23시대 출생: 자정 기준 단순 적용 방식에 따라 당일 일주와 당일 일간 기준 子時 천간을 사용했습니다.",
    };
  }
  const isJo = r.hour === 0;
  return {
    day: todayPillar, hour: hourPillarOf(todayPillar.stem, hb), ziKind: isJo ? "조자시" : null, dayDate: today, dayShifted: false,
    explanation: isJo
      ? "00시대 출생(조자시): 모든 방식에서 해당 날짜의 일주와 해당 일간 기준 子時를 적용합니다."
      : "자시 경계와 무관한 시간대이므로 해당 날짜의 일주를 적용했습니다.",
  };
}

export interface BirthMoment {
  /** 출생 양력 날짜(현지) */
  date: { year: number; month: number; day: number };
  /** null 이면 시간 미상 */
  time: { hour: number; minute: number } | null;
  timezone: string;
  longitude: number;
  latitude: number;
}

export interface PillarComputation {
  pillars: FourPillars;
  sajuYear: number;
  monthOrder: number;
  resolved: ResolvedBirthTime | null;
  solar: SolarTimeResult | null;
  dayHour: DayHourResult | null;
  /** 출생 직전·직후의 절 */
  prevJie: SolarTermInstant | null;
  nextJie: SolarTermInstant | null;
  /** 절입 시각과의 차이(분) */
  minutesFromPrevJie: number | null;
  minutesToNextJie: number | null;
  warnings: string[];
  /** 시간 미상일 때 출생일 중 절입이 있어 연·월주가 확정되지 않는 경우의 대안 */
  alternatives: Array<{ description: string; pillars: Pick<FourPillars, "year" | "month"> }>;
}

export interface PillarOptions {
  ziMode: ZiHourMode;
  solarTime: SolarTimeMode;
}

function yearMonthAt(utc: Date): { year: Pillar; month: Pillar; sajuYear: number; monthOrder: number; prev: SolarTermInstant; next: SolarTermInstant } {
  const sajuYear = sajuYearOf(utc);
  const { prev, next } = surroundingJie(utc);
  const monthOrder = monthOrderOfJieLongitude(prev.longitude);
  const year = yearPillarOfSajuYear(sajuYear);
  const month = monthPillarOf(year.stem, monthOrder);
  return { year, month, sajuYear, monthOrder, prev, next };
}

export function computePillars(b: BirthMoment, opt: PillarOptions): PillarComputation {
  const warnings: string[] = [];
  if (b.time) {
    const resolved = resolveLocalBirthTime({ ...b.date, hour: b.time.hour, minute: b.time.minute, second: 0 }, b.timezone);
    warnings.push(...resolved.warnings);
    const utc = resolved.utc;
    const ym = yearMonthAt(utc);
    const solar = reckoningTime(utc, resolved, b.longitude, b.latitude, opt.solarTime);
    const dh = dayAndHourPillars(solar.reckoning, opt.ziMode);
    const fromPrev = (utc.getTime() - ym.prev.utc.getTime()) / 60_000;
    const toNext = (ym.next.utc.getTime() - utc.getTime()) / 60_000;
    if (fromPrev < 120 || toNext < 120) {
      warnings.push(
        `절입 시각과 출생 시각의 차이가 ${Math.round(Math.min(fromPrev, toNext))}분입니다. 출생 시각이 조금만 달라도 월주${ym.prev.longitude === 315 || ym.next.longitude === 315 ? "·연주" : ""}가 바뀔 수 있으므로 출생 시각을 정확히 확인하세요.`,
      );
    }
    if (resolved.isDST) {
      warnings.push(
        `출생 당시 해당 지역은 서머타임(일광절약시간) 시행 중이었습니다(UTC${fmtOffset(resolved.offsetMinutes)}). 표준시 기준 판정 시 ${(resolved.offsetMinutes - resolved.standardOffsetMinutes)}분을 차감합니다.`,
      );
    }
    return {
      pillars: { year: ym.year, month: ym.month, day: dh.day, hour: dh.hour },
      sajuYear: ym.sajuYear, monthOrder: ym.monthOrder, resolved, solar, dayHour: dh,
      prevJie: ym.prev, nextJie: ym.next, minutesFromPrevJie: fromPrev, minutesToNextJie: toNext,
      warnings, alternatives: [],
    };
  }

  // 시간 미상: 시주를 추정하지 않는다. 일주는 양력 날짜 그대로.
  const startUtc = DateTime.fromObject({ ...b.date, hour: 0, minute: 0 }, { zone: b.timezone }).toUTC().toJSDate();
  const endUtc = new Date(DateTime.fromObject({ ...b.date, hour: 0, minute: 0 }, { zone: b.timezone }).plus({ days: 1 }).toMillis() - 1);
  const atStart = yearMonthAt(startUtc);
  const atEnd = yearMonthAt(endUtc);
  const day = dayPillarOfDate(b.date.year, b.date.month, b.date.day);
  const alternatives: PillarComputation["alternatives"] = [];
  let chosen = atStart;
  if (atStart.monthOrder !== atEnd.monthOrder || atStart.sajuYear !== atEnd.sajuYear) {
    const jie = atEnd.prev;
    const jieLocal = DateTime.fromJSDate(jie.utc, { zone: b.timezone }).toFormat("HH:mm");
    const portionAfter = (endUtc.getTime() - jie.utc.getTime()) / 86_400_000;
    chosen = portionAfter >= 0.5 ? atEnd : atStart;
    const other = chosen === atEnd ? atStart : atEnd;
    alternatives.push({
      description: `${jie.name} 절입(${jieLocal}) ${chosen === atEnd ? "이전" : "이후"} 출생인 경우`,
      pillars: { year: other.year, month: other.month },
    });
    warnings.push(
      `출생일 당일 ${jieLocal}에 ${jie.name} 절입이 있어, 출생 시간을 모르면 월주${atStart.sajuYear !== atEnd.sajuYear ? "와 연주" : ""}를 확정할 수 없습니다. 하루 중 더 긴 구간에 해당하는 기둥을 우선 표시하며, 대안 원국을 함께 제시합니다.`,
    );
  }
  warnings.push("출생 시간을 모르는 경우 23시대 출생 여부를 알 수 없어, 일주는 입력한 양력 날짜 기준으로 산출했습니다.");
  return {
    pillars: { year: chosen.year, month: chosen.month, day, hour: null },
    sajuYear: chosen.sajuYear, monthOrder: chosen.monthOrder, resolved: null, solar: null, dayHour: null,
    prevJie: chosen.prev, nextJie: chosen.next, minutesFromPrevJie: null, minutesToNextJie: null,
    warnings, alternatives,
  };
}

export function fmtOffset(min: number): string {
  const sign = min >= 0 ? "+" : "-";
  const a = Math.abs(min);
  return `${sign}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(Math.round(a % 60)).padStart(2, "0")}`;
}

/** 모든 자시 방식 × 태양시 모드 조합의 일주·시주 비교표 */
export function comparePillarSettings(b: BirthMoment): Array<{
  ziMode: ZiHourMode; solarTime: SolarTimeMode; reckoning: string; day: Pillar; hour: Pillar; ziKind: ZiKind;
}> {
  if (!b.time) return [];
  const resolved = resolveLocalBirthTime({ ...b.date, hour: b.time.hour, minute: b.time.minute, second: 0 }, b.timezone);
  const rows: ReturnType<typeof comparePillarSettings> = [];
  for (const solarTime of ["standard", "lmt", "apparent"] as SolarTimeMode[]) {
    const s = reckoningTime(resolved.utc, resolved, b.longitude, b.latitude, solarTime);
    for (const ziMode of ["zi-change", "midnight-yajasi", "midnight-simple"] as ZiHourMode[]) {
      const dh = dayAndHourPillars(s.reckoning, ziMode);
      const r = s.reckoning;
      rows.push({
        ziMode, solarTime, day: dh.day, hour: dh.hour, ziKind: dh.ziKind,
        reckoning: `${r.year}-${String(r.month).padStart(2, "0")}-${String(r.day).padStart(2, "0")} ${String(r.hour).padStart(2, "0")}:${String(r.minute).padStart(2, "0")}`,
      });
    }
  }
  return rows;
}

export { naiveFromMs, naiveToMs, index60Of };
