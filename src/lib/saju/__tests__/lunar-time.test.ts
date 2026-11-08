/**
 * 음양력 변환 · 시간대 검증
 *
 * 출처
 *  - 설날/추석 양력 날짜: 대한민국 관공서의 공휴일에 관한 규정에 따른 연도별 공휴일(관보/우주항공청 월력요항)
 *  - 윤달: 한국천문연구원 월력요항 (2017 윤5월, 2020 윤4월, 2023 윤2월, 2025 윤6월, 2024 윤달 없음)
 *    ※ 2017년 중국 음력은 윤6월 — 한국·중국 음력 차이를 확인하는 사례
 *  - 천문 검증: astronomy-engine 으로 계산한 삭(新月) 시각과 중기(中氣) 시각을 이용한 독립 검증
 *  - 시간대: IANA tzdata(Asia/Seoul) — 1954-03-21~1961-08-09 UTC+8:30, 서머타임 1948~1951·1955~1960·1987~1988
 */
import { describe, expect, it } from "vitest";
import * as Astronomy from "astronomy-engine";
import { lunarToSolar, solarToLunar, leapMonthOfYear, lunarMonthLength } from "../lunar";
import { resolveLocalBirthTime } from "../time";
import { solarTermsOfYear } from "../solarTerms";

describe("음력 → 양력 변환 (공휴일 데이터)", () => {
  const seollal: Array<[number, string]> = [
    [2020, "2020-01-25"], [2021, "2021-02-12"], [2022, "2022-02-01"], [2023, "2023-01-22"], [2024, "2024-02-10"], [2025, "2025-01-29"], [2026, "2026-02-17"],
  ];
  it.each(seollal)("%i 설날(음 1/1)", (y, expected) => {
    const r = lunarToSolar({ year: y, month: 1, day: 1, isLeapMonth: false });
    expect(r.ok).toBe(true);
    if (r.ok) expect(`${r.solar.year}-${String(r.solar.month).padStart(2, "0")}-${String(r.solar.day).padStart(2, "0")}`).toBe(expected);
  });
  const chuseok: Array<[number, string]> = [[2023, "2023-09-29"], [2024, "2024-09-17"], [2025, "2025-10-06"]];
  it.each(chuseok)("%i 추석(음 8/15)", (y, expected) => {
    const r = lunarToSolar({ year: y, month: 8, day: 15, isLeapMonth: false });
    expect(r.ok && `${r.solar.year}-${String(r.solar.month).padStart(2, "0")}-${String(r.solar.day).padStart(2, "0")}`).toBe(expected);
  });
});

describe("윤달 처리", () => {
  it("연도별 윤달", () => {
    expect(leapMonthOfYear(2017)).toBe(5);
    expect(leapMonthOfYear(2020)).toBe(4);
    expect(leapMonthOfYear(2023)).toBe(2);
    expect(leapMonthOfYear(2025)).toBe(6);
    expect(leapMonthOfYear(2024)).toBeNull();
  });
  it("음력 윤달 입력: 2017 윤5월 1일 → 2017-06-24, 평달 5월 1일 → 2017-05-26", () => {
    const leap = lunarToSolar({ year: 2017, month: 5, day: 1, isLeapMonth: true });
    const normal = lunarToSolar({ year: 2017, month: 5, day: 1, isLeapMonth: false });
    expect(leap.ok && leap.solar).toEqual({ year: 2017, month: 6, day: 24 });
    expect(normal.ok && normal.solar).toEqual({ year: 2017, month: 5, day: 26 });
  });
  it("존재하지 않는 윤달은 거부 (라이브러리는 조용히 평달로 처리하므로 왕복 검증으로 차단)", () => {
    const r1 = lunarToSolar({ year: 2024, month: 5, day: 1, isLeapMonth: true });
    const r2 = lunarToSolar({ year: 2017, month: 6, day: 1, isLeapMonth: true });
    expect(r1.ok).toBe(false);
    expect(r2.ok).toBe(false);
    if (!r1.ok) expect(r1.error).toContain("윤달이 없습니다");
    if (!r2.ok) expect(r2.error).toContain("윤5월");
  });
  it("윤달의 일수 검증: 2023 윤2월은 29일까지", () => {
    expect(lunarMonthLength(2023, 2, true)).toBe(29);
    expect(lunarToSolar({ year: 2023, month: 2, day: 30, isLeapMonth: true }).ok).toBe(false);
  });
  it("양력 → 음력 역변환", () => {
    expect(solarToLunar({ year: 2017, month: 6, day: 24 })).toEqual({ year: 2017, month: 5, day: 1, isLeapMonth: true });
  });
});

describe("음력 데이터의 천문학적 독립 검증 (1950~2050)", () => {
  it("음력 초하루는 한국시(UTC+9) 기준 삭(新月)이 드는 날이고, 윤달에는 중기가 없다", () => {
    const DAY = 86_400_000;
    const mismatches: string[] = [];
    const leapIssues: string[] = [];
    const zhongqi: number[] = [];
    for (let y = 1949; y <= 2051; y++) for (const t of solarTermsOfYear(y)) if (!t.jie) zhongqi.push(t.utc.getTime());
    let monthStarts: Array<{ ms: number; leap: boolean; label: string }> = [];
    for (let t = Date.UTC(1950, 0, 1); t <= Date.UTC(2050, 11, 31); t += DAY) {
      const d = new Date(t);
      const l = solarToLunar({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
      if (!l || l.day !== 1) continue;
      const startUtc = t - 9 * 3600_000; // 해당 날짜 00:00 KST
      const nm = Astronomy.SearchMoonPhase(0, new Date(startUtc), 1);
      const ok = nm && nm.date.getTime() >= startUtc && nm.date.getTime() < startUtc + DAY;
      const label = `${d.toISOString().slice(0, 10)} (음 ${l.year}.${l.isLeapMonth ? "윤" : ""}${l.month}.1)`;
      if (!ok) mismatches.push(label + (nm ? ` 삭=${new Date(nm.date.getTime() + 9 * 3600_000).toISOString().slice(0, 16)} KST` : ""));
      monthStarts.push({ ms: startUtc, leap: l.isLeapMonth, label });
    }
    for (let i = 0; i + 1 < monthStarts.length; i++) {
      const a = monthStarts[i].ms;
      const b = monthStarts[i + 1].ms;
      const hasZ = zhongqi.some((z) => z >= a && z < b);
      if (monthStarts[i].leap && hasZ) leapIssues.push(`${monthStarts[i].label} 윤달인데 중기 포함`);
    }
    console.log(`[음력 천문검증] 초하루 ${monthStarts.length}개 중 삭 불일치 ${mismatches.length}건`, mismatches.slice(0, 10));
    console.log(`[음력 천문검증] 윤달 중기 규칙 위반 ${leapIssues.length}건`, leapIssues.slice(0, 10));
    // 1954~1961 한국 표준시 UTC+8:30 시기 및 삭이 자정 근처인 경우 천문연 기준과 단순 UTC+9 계산이 다를 수 있다.
    expect(mismatches.length).toBeLessThanOrEqual(5);
    expect(leapIssues.length).toBe(0);
    monthStarts = [];
  });
});

describe("과거 시간대와 서머타임 (IANA tzdata)", () => {
  const z = "Asia/Seoul";
  it("1988-07-01 12:00 서울은 서머타임(UTC+10)", () => {
    const r = resolveLocalBirthTime({ year: 1988, month: 7, day: 1, hour: 12, minute: 0, second: 0 }, z);
    expect(r.offsetMinutes).toBe(600);
    expect(r.isDST).toBe(true);
    expect(r.standardOffsetMinutes).toBe(540);
  });
  it("1960-01-15 12:00 서울은 UTC+8:30 표준시", () => {
    const r = resolveLocalBirthTime({ year: 1960, month: 1, day: 15, hour: 12, minute: 0, second: 0 }, z);
    expect(r.offsetMinutes).toBe(510);
    expect(r.isDST).toBe(false);
  });
  it("1958-07-01 12:00 서울은 서머타임(UTC+9:30), 표준시는 +8:30", () => {
    const r = resolveLocalBirthTime({ year: 1958, month: 7, day: 1, hour: 12, minute: 0, second: 0 }, z);
    expect(r.offsetMinutes).toBe(570);
    expect(r.isDST).toBe(true);
    expect(r.standardOffsetMinutes).toBe(510);
  });
  it("1961-09-01 12:00 서울은 UTC+9 표준시 (8:30 → 9:00 변경 직후를 서머타임으로 오판하지 않음)", () => {
    const r = resolveLocalBirthTime({ year: 1961, month: 9, day: 1, hour: 12, minute: 0, second: 0 }, z);
    expect(r.offsetMinutes).toBe(540);
    expect(r.isDST).toBe(false);
  });
  it("1990-07-01 12:00 서울은 UTC+9 (서머타임 없음)", () => {
    const r = resolveLocalBirthTime({ year: 1990, month: 7, day: 1, hour: 12, minute: 0, second: 0 }, z);
    expect(r.offsetMinutes).toBe(540);
    expect(r.isDST).toBe(false);
  });
  it("서머타임 시작으로 존재하지 않는 시각 경고 (1987-05-10 02:30 서울)", () => {
    const r = resolveLocalBirthTime({ year: 1987, month: 5, day: 10, hour: 2, minute: 30, second: 0 }, z);
    expect(r.warnings.some((w) => w.includes("존재하지 않는"))).toBe(true);
  });
  it("서머타임 종료로 반복되는 시각 경고 (1987-10-11 02:30 서울)", () => {
    const r = resolveLocalBirthTime({ year: 1987, month: 10, day: 11, hour: 2, minute: 30, second: 0 }, z);
    expect(r.warnings.some((w) => w.includes("두 번"))).toBe(true);
  });
  it("미국 뉴욕 2000-07-01 서머타임(UTC-4)", () => {
    const r = resolveLocalBirthTime({ year: 2000, month: 7, day: 1, hour: 12, minute: 0, second: 0 }, "America/New_York");
    expect(r.offsetMinutes).toBe(-240);
    expect(r.isDST).toBe(true);
    expect(r.standardOffsetMinutes).toBe(-300);
  });
});
