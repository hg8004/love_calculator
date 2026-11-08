/**
 * 24절기 절입 시각 계산.
 *
 * astronomy-engine(VSOP87 축약 + IAU 2000B 장동, ΔT 모델 포함)의 SearchSunLongitude 로
 * 태양의 겉보기 황경(apparent ecliptic longitude of date)이 15° 배수에 도달하는 순간을 UTC로 구한다.
 * 결과는 절대 시각이므로 출생 시각(UTC)과 직접 비교하며, 표시할 때만 현지 시간대로 변환한다.
 * 정확도: 1900~2100년 대략 1분 이내 (테스트에서 독립 구현 lunar-javascript 결과와 비교).
 */
import * as Astronomy from "astronomy-engine";
import { JIE_TERMS, SOLAR_TERMS_24 } from "./constants";

export interface SolarTermInstant {
  name: string;
  longitude: number;
  /** 월을 바꾸는 절(節)이면 true, 중기(中氣)면 false */
  jie: boolean;
  utc: Date;
}

const DAY_MS = 86_400_000;
const cache = new Map<number, SolarTermInstant[]>();

/** 양력 year 해에 들어 있는 24절기(소한 ~ 동지) */
export function solarTermsOfYear(year: number): SolarTermInstant[] {
  const hit = cache.get(year);
  if (hit) return hit;
  const result: SolarTermInstant[] = [];
  // 소한(285°)은 매년 1월 5~6일 전후. 이후 약 15.22일 간격.
  const base = Date.UTC(year, 0, 5, 0, 0, 0);
  for (let k = 0; k < 24; k++) {
    const lon = (285 + 15 * k) % 360;
    const approx = base + k * 15.2184 * DAY_MS;
    const start = new Date(approx - 6 * DAY_MS);
    const t = Astronomy.SearchSunLongitude(lon, start, 12);
    if (!t) throw new Error(`절기 계산 실패: ${year}년 황경 ${lon}°`);
    const def = SOLAR_TERMS_24.find((s) => s.longitude === lon)!;
    result.push({ name: def.name, longitude: lon, jie: def.jie, utc: t.date });
  }
  cache.set(year, result);
  return result;
}

/** 절(節) 12개만 */
export function jieOfYear(year: number): SolarTermInstant[] {
  return solarTermsOfYear(year).filter((t) => t.jie);
}

/** 해당 양력 연도의 입춘 시각 */
export function lichunOf(year: number): Date {
  return solarTermsOfYear(year).find((t) => t.longitude === 315)!.utc;
}

/** 황경 → 월 순서(寅月=0 ... 丑月=11) */
export function monthOrderOfJieLongitude(lon: number): number {
  return Math.round(((lon - 315 + 360) % 360) / 30);
}

export function jieName(monthOrder: number): string {
  return JIE_TERMS[monthOrder].name;
}

/** 시각 utc 직전(포함)의 절과 직후의 절 */
export function surroundingJie(utc: Date): { prev: SolarTermInstant; next: SolarTermInstant } {
  const y = utc.getUTCFullYear();
  const list = [...jieOfYear(y - 1), ...jieOfYear(y), ...jieOfYear(y + 1)];
  const t = utc.getTime();
  let prev = list[0];
  let next = list[list.length - 1];
  for (let i = 0; i < list.length; i++) {
    if (list[i].utc.getTime() <= t) prev = list[i];
    else {
      next = list[i];
      break;
    }
  }
  return { prev, next };
}

/** 사주 연도(입춘 기준) */
export function sajuYearOf(utc: Date): number {
  const y = utc.getUTCFullYear();
  if (utc.getTime() >= lichunOf(y).getTime()) return y;
  return y - 1;
}
