/**
 * 사주 기둥 계산 검증.
 *
 * 독립 비교 대상
 *  (1) lunar-javascript@1.7.7 (6tail, 寿星天文历 기반 독립 구현, 중국 표준시 UTC+8 기준) — 테스트 전용 devDependency
 *  (2) 한국천문연구원(KASI) 발표 절입 시각 (천문력/보도자료): 2024 입춘 02-04 17:27, 2025 입춘 02-03 23:10, 2026 입춘 02-04 05:02
 *  (3) 일진 기준점: 2000-01-01 = 戊午일 (만세력 공통 기준)
 *
 * 국가별 표준시가 다르므로 비교는 모두 절대 시각(UTC)으로 변환하여 수행한다.
 */
import { describe, expect, it } from "vitest";
import { Solar } from "lunar-javascript";
import { STEMS, BRANCHES, ganzhiText } from "../constants";
import { solarTermsOfYear, lichunOf, sajuYearOf } from "../solarTerms";
import { computePillars, dayPillarOfDate, dayAndHourPillars, hourBranchOf, comparePillarSettings } from "../pillars";

const SEOUL = { timezone: "Asia/Seoul", longitude: 126.978, latitude: 37.5665 };
const gz = (p: { stem: number; branch: number }) => ganzhiText(p.stem, p.branch);

// 결정적 의사난수
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const CN_NAME: Record<number, string> = {
  285: "小寒", 300: "大寒", 315: "立春", 330: "雨水", 345: "惊蛰", 0: "春分", 15: "清明", 30: "谷雨", 45: "立夏", 60: "小满",
  75: "芒种", 90: "夏至", 105: "小暑", 120: "大暑", 135: "立秋", 150: "处暑", 165: "白露", 180: "秋分", 195: "寒露", 210: "霜降",
  225: "立冬", 240: "小雪", 255: "大雪", 270: "冬至",
};

describe("일진(日辰) 계산", () => {
  it("기준점: 2000-01-01 戊午, 1900-01-01 甲戌, 2024-01-01 甲子", () => {
    expect(gz(dayPillarOfDate(2000, 1, 1))).toBe("戊午");
    expect(gz(dayPillarOfDate(1900, 1, 1))).toBe("甲戌");
    expect(gz(dayPillarOfDate(2024, 1, 1))).toBe("甲子");
  });
  it("1900~2100년 무작위 2,000일을 독립 구현과 비교", () => {
    const r = rng(7);
    for (let i = 0; i < 2000; i++) {
      const t = Date.UTC(1900, 0, 1) + Math.floor(r() * 200 * 365.25) * 86_400_000;
      const d = new Date(t);
      const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
      const ref = Solar.fromYmdHms(y, m, day, 12, 0, 0).getLunar().getDayInGanZhi();
      expect(gz(dayPillarOfDate(y, m, day)), `${y}-${m}-${day}`).toBe(ref);
    }
  });
});

describe("24절기 절입 시각", () => {
  it("KASI 발표 입춘 시각(KST)과 1분 이내로 일치", () => {
    const kst = (y: number) => new Date(lichunOf(y).getTime() + 9 * 3600_000);
    const cases: Array<[number, string]> = [[2024, "2024-02-04T17:27"], [2025, "2025-02-03T23:10"], [2026, "2026-02-04T05:02"]];
    for (const [y, expected] of cases) {
      const diff = Math.abs(kst(y).getTime() - new Date(expected + ":00Z").getTime()) / 60_000;
      expect(diff, `${y} 입춘 차이 ${diff.toFixed(2)}분`).toBeLessThan(1.01);
    }
  });
  it("1900~2100년 전체 24절기를 독립 구현과 비교 (최대 오차 2분 이내)", () => {
    let maxDiff = 0;
    let worst = "";
    for (let y = 1900; y <= 2100; y += 1) {
      const ours = solarTermsOfYear(y);
      const table = Solar.fromYmdHms(y, 7, 1, 0, 0, 0).getLunar().getJieQiTable();
      for (const term of ours) {
        const ref = table[CN_NAME[term.longitude]];
        // lunar-javascript 결과는 UTC+8 벽시계 시각
        const refUtc = Date.UTC(ref.getYear(), ref.getMonth() - 1, ref.getDay(), ref.getHour(), ref.getMinute(), ref.getSecond()) - 8 * 3600_000;
        if (Math.abs(refUtc - term.utc.getTime()) > 20 * 86_400_000) continue; // 다른 해의 같은 이름(테이블 경계) 제외
        const diff = Math.abs(refUtc - term.utc.getTime()) / 60_000;
        if (diff > maxDiff) {
          maxDiff = diff;
          worst = `${y} ${term.name}`;
        }
      }
    }
    console.log(`[절기 교차검증] 1900~2100 최대 오차 ${maxDiff.toFixed(2)}분 (${worst})`);
    expect(maxDiff).toBeLessThan(2);
  });
});

describe("연주·월주 (입춘·절입 기준)", () => {
  it("입춘 직전/직후 출생의 연주 구분 — 2024 입춘 17:27 KST", () => {
    const before = computePillars({ date: { year: 2024, month: 2, day: 4 }, time: { hour: 17, minute: 26 }, ...SEOUL }, { ziMode: "zi-change", solarTime: "standard" });
    const after = computePillars({ date: { year: 2024, month: 2, day: 4 }, time: { hour: 17, minute: 28 }, ...SEOUL }, { ziMode: "zi-change", solarTime: "standard" });
    expect(gz(before.pillars.year)).toBe("癸卯");
    expect(gz(before.pillars.month)).toBe("乙丑");
    expect(gz(after.pillars.year)).toBe("甲辰");
    expect(gz(after.pillars.month)).toBe("丙寅");
  });
  it("양력 1월 1일이 아니라 입춘으로 연이 바뀜 — 2024-01-15 출생은 癸卯년", () => {
    const p = computePillars({ date: { year: 2024, month: 1, day: 15 }, time: { hour: 12, minute: 0 }, ...SEOUL }, { ziMode: "zi-change", solarTime: "standard" });
    expect(gz(p.pillars.year)).toBe("癸卯");
    expect(gz(p.pillars.month)).toBe("乙丑");
  });
  it("절입 직전/직후 — 2024 경칩(03-05 11:23 KST 전후)", () => {
    const terms = solarTermsOfYear(2024);
    const gyeongchip = terms.find((t) => t.longitude === 345)!.utc;
    const kst = new Date(gyeongchip.getTime() + 9 * 3600_000);
    const h = kst.getUTCHours(), m = kst.getUTCMinutes();
    const before = computePillars({ date: { year: 2024, month: 3, day: 5 }, time: { hour: h, minute: m - 1 < 0 ? 0 : m - 1 }, ...SEOUL }, { ziMode: "zi-change", solarTime: "standard" });
    const after = computePillars({ date: { year: 2024, month: 3, day: 5 }, time: { hour: h, minute: m + 1 }, ...SEOUL }, { ziMode: "zi-change", solarTime: "standard" });
    expect(gz(before.pillars.month)).toBe("丙寅");
    expect(gz(after.pillars.month)).toBe("丁卯");
  });
  it("무작위 3,000개 출생 시각의 연주·월주를 독립 구현과 비교 (절입 ±3분 제외)", () => {
    const r = rng(42);
    let compared = 0;
    for (let i = 0; i < 3000; i++) {
      const utcMs = Date.UTC(1901, 0, 1) + Math.floor(r() * 198 * 365.25 * 1440) * 60_000;
      const utc = new Date(utcMs);
      // 절입 근처 제외
      const near = [utc.getUTCFullYear() - 1, utc.getUTCFullYear(), utc.getUTCFullYear() + 1]
        .flatMap((y) => solarTermsOfYear(y))
        .some((t) => Math.abs(t.utc.getTime() - utcMs) < 3 * 60_000);
      if (near) continue;
      const cn = new Date(utcMs + 8 * 3600_000);
      const ec = Solar.fromYmdHms(cn.getUTCFullYear(), cn.getUTCMonth() + 1, cn.getUTCDate(), cn.getUTCHours(), cn.getUTCMinutes(), 0).getLunar().getEightChar();
      const kst = new Date(utcMs + 9 * 3600_000);
      const ours = computePillars(
        { date: { year: kst.getUTCFullYear(), month: kst.getUTCMonth() + 1, day: kst.getUTCDate() }, time: { hour: kst.getUTCHours(), minute: kst.getUTCMinutes() }, timezone: "Etc/GMT-9", longitude: 135, latitude: 35 },
        { ziMode: "zi-change", solarTime: "standard" },
      );
      expect(gz(ours.pillars.year), utc.toISOString()).toBe(ec.getYear());
      expect(gz(ours.pillars.month), utc.toISOString()).toBe(ec.getMonth());
      compared++;
    }
    expect(compared).toBeGreaterThan(2900);
  });
  it("sajuYearOf: 입춘 시각 경계", () => {
    const li = lichunOf(1990).getTime();
    expect(sajuYearOf(new Date(li - 1000))).toBe(1989);
    expect(sajuYearOf(new Date(li))).toBe(1990);
  });
});

describe("시지 경계와 야자시·조자시", () => {
  it("시지 경계: 22:59 亥, 23:00 子, 23:59 子, 00:00 子, 00:59 子, 01:00 丑", () => {
    expect(BRANCHES[hourBranchOf(22, 59)]).toBe("亥");
    expect(BRANCHES[hourBranchOf(23, 0)]).toBe("子");
    expect(BRANCHES[hourBranchOf(23, 59)]).toBe("子");
    expect(BRANCHES[hourBranchOf(0, 0)]).toBe("子");
    expect(BRANCHES[hourBranchOf(0, 59)]).toBe("子");
    expect(BRANCHES[hourBranchOf(1, 0)]).toBe("丑");
  });

  // 2024-03-10 = 甲申? (계산 후 독립 구현과 비교)
  const base = { year: 2024, month: 3, day: 10 };
  const at = (hour: number, minute: number, zi: "zi-change" | "midnight-yajasi" | "midnight-simple") =>
    dayAndHourPillars({ ...base, hour, minute, second: 0 }, zi);

  it("22:59 — 모든 방식에서 당일 일주, 亥시", () => {
    for (const z of ["zi-change", "midnight-yajasi", "midnight-simple"] as const) {
      const r = at(22, 59, z);
      expect(gz(r.day)).toBe(gz(dayPillarOfDate(2024, 3, 10)));
      expect(BRANCHES[r.hour.branch]).toBe("亥");
      expect(r.ziKind).toBeNull();
    }
  });
  it("23:00 / 23:59 — A방식은 다음 날 일주, B방식은 당일 일주", () => {
    const today = dayPillarOfDate(2024, 3, 10);
    const tomorrow = dayPillarOfDate(2024, 3, 11);
    for (const [h, m] of [[23, 0], [23, 59]] as const) {
      const a = at(h, m, "zi-change");
      const b = at(h, m, "midnight-yajasi");
      const c = at(h, m, "midnight-simple");
      expect(gz(a.day)).toBe(gz(tomorrow));
      expect(gz(b.day)).toBe(gz(today));
      expect(gz(c.day)).toBe(gz(today));
      // 시간: A·B는 다음 날 일간 기준 子時, B'는 당일 일간 기준
      expect(STEMS[a.hour.stem]).toBe(STEMS[(tomorrow.stem * 2) % 10]);
      expect(STEMS[b.hour.stem]).toBe(STEMS[(tomorrow.stem * 2) % 10]);
      expect(STEMS[c.hour.stem]).toBe(STEMS[(today.stem * 2) % 10]);
      expect(a.ziKind).toBe("야자시");
    }
  });
  it("00:00 / 00:59 — 조자시: 모든 방식에서 해당 날짜 일주", () => {
    const today = dayPillarOfDate(2024, 3, 10);
    for (const [h, m] of [[0, 0], [0, 59]] as const)
      for (const z of ["zi-change", "midnight-yajasi", "midnight-simple"] as const) {
        const r = at(h, m, z);
        expect(gz(r.day)).toBe(gz(today));
        expect(STEMS[r.hour.stem]).toBe(STEMS[(today.stem * 2) % 10]);
        expect(r.ziKind).toBe("조자시");
      }
  });
  it("01:00 — 丑시", () => {
    expect(BRANCHES[at(1, 0, "zi-change").hour.branch]).toBe("丑");
  });
  it("독립 구현 비교: A방식 = lunar-javascript sect 1, B방식 = sect 2 (무작위 23시대·0시대 500건)", () => {
    const r = rng(99);
    for (let i = 0; i < 500; i++) {
      const t = new Date(Date.UTC(1950, 0, 1) + Math.floor(r() * 100 * 365) * 86_400_000);
      const hour = r() < 0.5 ? 23 : 0;
      const minute = Math.floor(r() * 60);
      const y = t.getUTCFullYear(), m = t.getUTCMonth() + 1, d = t.getUTCDate();
      const ec = Solar.fromYmdHms(y, m, d, hour, minute, 0).getLunar().getEightChar();
      ec.setSect(1);
      const a = dayAndHourPillars({ year: y, month: m, day: d, hour, minute, second: 0 }, "zi-change");
      expect(gz(a.day)).toBe(ec.getDay());
      expect(gz(a.hour)).toBe(ec.getTime());
      ec.setSect(2);
      const b = dayAndHourPillars({ year: y, month: m, day: d, hour, minute, second: 0 }, "midnight-yajasi");
      expect(gz(b.day)).toBe(ec.getDay());
      expect(gz(b.hour)).toBe(ec.getTime());
    }
  });
  it("오서둔 시간: 甲·己일 子시는 甲子, 乙·庚일은 丙子, 丙·辛일 戊子, 丁·壬일 庚子, 戊·癸일 壬子", () => {
    const expected = ["甲", "丙", "戊", "庚", "壬", "甲", "丙", "戊", "庚", "壬"];
    for (let s = 0; s < 10; s++) expect(STEMS[(s * 2) % 10]).toBe(expected[s]);
  });
});

describe("태양시 보정", () => {
  it("서울(126.978°E) 지방평균태양시는 표준시(135°E)보다 약 32분 늦다", () => {
    const p = computePillars({ date: { year: 2000, month: 6, day: 1 }, time: { hour: 12, minute: 0 }, ...SEOUL }, { ziMode: "zi-change", solarTime: "lmt" });
    expect(p.solar!.longitudeCorrectionMinutes).toBeCloseTo(-32.09, 1);
    expect(p.solar!.reckoning.hour).toBe(11);
    expect(p.solar!.reckoning.minute).toBe(27);
  });
  it("균시차: 11월 초 약 +16분, 2월 중순 약 -14분", () => {
    const nov = computePillars({ date: { year: 2020, month: 11, day: 3 }, time: { hour: 12, minute: 0 }, ...SEOUL }, { ziMode: "zi-change", solarTime: "apparent" });
    const feb = computePillars({ date: { year: 2020, month: 2, day: 11 }, time: { hour: 12, minute: 0 }, ...SEOUL }, { ziMode: "zi-change", solarTime: "apparent" });
    expect(nov.solar!.equationOfTimeMinutes).toBeGreaterThan(16);
    expect(nov.solar!.equationOfTimeMinutes).toBeLessThan(16.6);
    expect(feb.solar!.equationOfTimeMinutes).toBeGreaterThan(-14.4);
    expect(feb.solar!.equationOfTimeMinutes).toBeLessThan(-14);
  });
  it("보정 전후 시주 비교: 서울 23:20 출생은 표준시로 子시, 지방평균태양시로 亥시", () => {
    const rows = comparePillarSettings({ date: { year: 1995, month: 8, day: 20 }, time: { hour: 23, minute: 20 }, ...SEOUL });
    const std = rows.find((r) => r.solarTime === "standard" && r.ziMode === "zi-change")!;
    const lmt = rows.find((r) => r.solarTime === "lmt" && r.ziMode === "zi-change")!;
    expect(BRANCHES[std.hour.branch]).toBe("子");
    expect(BRANCHES[lmt.hour.branch]).toBe("亥");
    expect(gz(std.day)).toBe(gz(dayPillarOfDate(1995, 8, 21)));
    expect(gz(lmt.day)).toBe(gz(dayPillarOfDate(1995, 8, 20)));
    expect(rows).toHaveLength(9);
  });
});

describe("출생 시간 미상", () => {
  it("시주는 null, 12시로 임의 대체하지 않는다", () => {
    const p = computePillars({ date: { year: 1990, month: 5, day: 15 }, time: null, ...SEOUL }, { ziMode: "zi-change", solarTime: "lmt" });
    expect(p.pillars.hour).toBeNull();
    expect(p.solar).toBeNull();
    expect(gz(p.pillars.day)).toBe(gz(dayPillarOfDate(1990, 5, 15)));
  });
  it("절입일 출생 + 시간 미상이면 대안 원국을 제시", () => {
    // 2024-02-04는 17:27 입춘
    const p = computePillars({ date: { year: 2024, month: 2, day: 4 }, time: null, ...SEOUL }, { ziMode: "zi-change", solarTime: "lmt" });
    expect(p.alternatives).toHaveLength(1);
    const years = [gz(p.pillars.year), gz(p.alternatives[0].pillars.year)].sort();
    expect(years).toEqual(["甲辰", "癸卯"].sort());
    expect(p.warnings.some((w) => w.includes("입춘"))).toBe(true);
  });
});
