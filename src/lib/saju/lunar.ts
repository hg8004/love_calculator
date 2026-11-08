/**
 * 한국 음양력 변환 (1단계 — 사주 계산과 완전히 분리된 단계).
 *
 * 데이터 출처: korean-lunar-calendar@0.3.6 (한국천문연구원(KASI) 음양력 기준 테이블 내장, 네트워크 불필요)
 * 지원 범위: 음력 1000-01-01 ~ 2050-11-18 / 양력 1000-02-13 ~ 2050-12-31
 *
 * 주의: 해당 라이브러리는 존재하지 않는 윤달(예: 2024년 윤5월)을 입력해도 오류 없이
 * 평달로 변환한다. 따라서 이 모듈은 '음력→양력→음력' 왕복 변환으로 윤달 여부까지
 * 일치하는지 확인하여 유효성을 직접 검증한다.
 */
import KoreanLunarCalendar from "korean-lunar-calendar";

export interface SimpleDate {
  year: number;
  month: number;
  day: number;
}
export interface LunarDate extends SimpleDate {
  isLeapMonth: boolean;
}

export type LunarConversionResult =
  | { ok: true; solar: SimpleDate; lunar: LunarDate }
  | { ok: false; error: string };

export const LUNAR_SUPPORTED_RANGE = { min: 1900, max: 2050 };

export function lunarToSolar(lunar: LunarDate): LunarConversionResult {
  const { year, month, day, isLeapMonth } = lunar;
  if (year < LUNAR_SUPPORTED_RANGE.min || year > LUNAR_SUPPORTED_RANGE.max) {
    return { ok: false, error: `음력 변환은 ${LUNAR_SUPPORTED_RANGE.min}~${LUNAR_SUPPORTED_RANGE.max}년만 지원합니다.` };
  }
  if (month < 1 || month > 12 || day < 1 || day > 30) {
    return { ok: false, error: "음력 월은 1~12, 일은 1~30 범위여야 합니다." };
  }
  const cal = new KoreanLunarCalendar();
  const ok = cal.setLunarDate(year, month, day, isLeapMonth);
  if (!ok) {
    return { ok: false, error: `음력 ${year}년 ${isLeapMonth ? "윤" : ""}${month}월 ${day}일은 존재하지 않는 날짜입니다. (해당 월은 29일까지일 수 있습니다)` };
  }
  const solar = cal.getSolarCalendar();
  // 왕복 검증: 윤달 여부가 일치해야 한다.
  const back = new KoreanLunarCalendar();
  back.setSolarDate(solar.year, solar.month, solar.day);
  const l = back.getLunarCalendar();
  if (l.year !== year || l.month !== month || l.day !== day || Boolean(l.intercalation) !== isLeapMonth) {
    if (isLeapMonth) {
      const leap = leapMonthOfYear(year);
      return {
        ok: false,
        error: `음력 ${year}년에는 윤${month}월이 없습니다.` + (leap ? ` (${year}년의 윤달은 윤${leap}월입니다)` : ` (${year}년에는 윤달이 없습니다)`),
      };
    }
    return { ok: false, error: "음력 날짜 검증에 실패했습니다." };
  }
  return { ok: true, solar: { year: solar.year, month: solar.month, day: solar.day }, lunar };
}

export function solarToLunar(solar: SimpleDate): LunarDate | null {
  if (solar.year < LUNAR_SUPPORTED_RANGE.min || solar.year > LUNAR_SUPPORTED_RANGE.max) return null;
  const cal = new KoreanLunarCalendar();
  if (!cal.setSolarDate(solar.year, solar.month, solar.day)) return null;
  const l = cal.getLunarCalendar();
  return { year: l.year, month: l.month, day: l.day, isLeapMonth: Boolean(l.intercalation) };
}

/** 해당 음력 연도의 윤달(없으면 null). 윤달 1일의 존재 여부를 왕복 검증으로 확인한다. */
export function leapMonthOfYear(year: number): number | null {
  for (let m = 1; m <= 12; m++) {
    const cal = new KoreanLunarCalendar();
    if (!cal.setLunarDate(year, m, 1, true)) continue;
    const s = cal.getSolarCalendar();
    const back = new KoreanLunarCalendar();
    back.setSolarDate(s.year, s.month, s.day);
    const l = back.getLunarCalendar();
    if (l.intercalation && l.month === m && l.year === year) return m;
  }
  return null;
}

/** 음력 월의 일수(29 또는 30). 존재하지 않는 월이면 0 */
export function lunarMonthLength(year: number, month: number, isLeapMonth: boolean): number {
  if (lunarToSolar({ year, month, day: 30, isLeapMonth }).ok) return 30;
  if (lunarToSolar({ year, month, day: 29, isLeapMonth }).ok) return 29;
  return 0;
}
