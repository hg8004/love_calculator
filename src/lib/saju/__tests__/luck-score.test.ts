/**
 * 대운·세운·월운 및 연애운 점수 모듈 검증
 * 대운 비교 대상: lunar-javascript@1.7.7 EightChar.getYun(gender, 2) — 분 단위 정밀 계산(4320분=1년), 3일=1년과 동일 비율
 */
import { describe, expect, it } from "vitest";
import { Solar } from "lunar-javascript";
import { analyze, BirthInput } from "../../analyze";
import { computePillars } from "../pillars";
import { analyzeChart } from "../chart";
import { computeDaewoon, computeWolunOfYear } from "../luck";
import { jieOfYear } from "../solarTerms";
import { scoreMonth, SCORE_VERSION } from "../../love/score";
import { ganzhiText } from "../constants";

const SEOUL = { country: "대한민국", city: "서울", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" };

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

describe("대운", () => {
  it("순행·역행 규칙: 양년 남성·음년 여성 순행 / 음년 남성·양년 여성 역행", () => {
    // 1990 庚午년(양), 2001 辛巳년(음)
    const mk = (y: number, g: "male" | "female") => {
      const pc = computePillars({ date: { year: y, month: 6, day: 15 }, time: { hour: 12, minute: 0 }, timezone: "Asia/Seoul", longitude: 135, latitude: 37 }, { ziMode: "zi-change", solarTime: "standard" });
      const chart = analyzeChart(pc.pillars);
      return computeDaewoon(pc.pillars, chart.relItems, pc.resolved!.utc, g, "round", true);
    };
    expect(mk(1990, "male").forward).toBe(true);
    expect(mk(1990, "female").forward).toBe(false);
    expect(mk(2001, "male").forward).toBe(false);
    expect(mk(2001, "female").forward).toBe(true);
    const f = mk(1990, "male");
    const b = mk(1990, "female");
    // 1990-06-15 월주 壬午 → 순행 첫 대운 癸未, 역행 첫 대운 辛巳
    expect(f.periods[0].ganzhi).toBe("癸未");
    expect(b.periods[0].ganzhi).toBe("辛巳");
  });

  it("대운 시작 시점과 대운 간지를 독립 구현과 비교 (무작위 300건, 오차 0.2개월 이내)", () => {
    const r = rng(2024);
    let maxDiffMonths = 0;
    for (let i = 0; i < 300; i++) {
      const utcMs = Date.UTC(1940, 0, 1) + Math.floor(r() * 80 * 365.25 * 1440) * 60_000;
      const gender: "male" | "female" = r() < 0.5 ? "male" : "female";
      const cn = new Date(utcMs + 8 * 3600_000);
      const ec = Solar.fromYmdHms(cn.getUTCFullYear(), cn.getUTCMonth() + 1, cn.getUTCDate(), cn.getUTCHours(), cn.getUTCMinutes(), 0).getLunar().getEightChar();
      const yun = ec.getYun(gender === "male" ? 1 : 0, 2);
      const kst = new Date(utcMs + 9 * 3600_000);
      const pc = computePillars(
        { date: { year: kst.getUTCFullYear(), month: kst.getUTCMonth() + 1, day: kst.getUTCDate() }, time: { hour: kst.getUTCHours(), minute: kst.getUTCMinutes() }, timezone: "Etc/GMT-9", longitude: 135, latitude: 35 },
        { ziMode: "zi-change", solarTime: "standard" },
      );
      if (ganzhiText(pc.pillars.month.stem, pc.pillars.month.branch) !== ec.getMonth()) continue; // 절입 경계 차이는 별도 테스트에서 검증
      const chart = analyzeChart(pc.pillars);
      const dw = computeDaewoon(pc.pillars, chart.relItems, pc.resolved!.utc, gender, "round", true);
      expect(dw.forward).toBe(yun.isForward());
      const theirs = yun.getStartYear() * 12 + yun.getStartMonth() + yun.getStartDay() / 30;
      const ours = dw.exactYears * 12;
      maxDiffMonths = Math.max(maxDiffMonths, Math.abs(theirs - ours));
      const daYun = yun.getDaYun();
      expect(dw.periods[0].ganzhi).toBe(daYun[1].getGanZhi());
      expect(dw.periods[3].ganzhi).toBe(daYun[4].getGanZhi());
    }
    console.log(`[대운 교차검증] 시작 시점 최대 차이 ${maxDiffMonths.toFixed(3)}개월`);
    expect(maxDiffMonths).toBeLessThan(0.2);
  });
});

describe("월운은 절입 시각 기준으로 바뀐다", () => {
  it("2027년 월운: 각 월운 시작 = 해당 절입 시각, 2월 월운은 입춘에 시작하며 壬寅", () => {
    const pc = computePillars({ date: { year: 1995, month: 3, day: 10 }, time: { hour: 9, minute: 30 }, timezone: "Asia/Seoul", longitude: 126.978, latitude: 37.5665 }, { ziMode: "zi-change", solarTime: "lmt" });
    const chart = analyzeChart(pc.pillars);
    const dw = computeDaewoon(pc.pillars, chart.relItems, pc.resolved!.utc, "female", "round", true);
    const months = computeWolunOfYear(pc.pillars, chart.relItems, dw, 2027);
    const jies = jieOfYear(2027);
    months.forEach((m, i) => expect(m.startUtc.getTime()).toBe(jies[i].utc.getTime()));
    expect(months[1].jieName).toBe("입춘");
    expect(months[1].ganzhi).toBe("壬寅"); // 2027 丁未년 → 丁壬 → 壬寅
    expect(months[0].ganzhi).toBe("辛丑"); // 2027-01 소한 ~ : 2026 丙午년의 丑월 → 丙辛 → 庚寅 시작 → 丑월은 辛丑
    expect(months[0].seyunGanzhi).toBe("丙午");
  });
});

describe("연애운 점수 모듈 — 해석 원칙", () => {
  const base: BirthInput = { gender: "female", calendar: "solar", year: 1994, month: 10, day: 3, hour: 14, minute: 20, location: SEOUL };
  const now = new Date(Date.UTC(2026, 10, 8));
  const res = analyze(base, { ziMode: "zi-change", solarTime: "lmt", daewoonRounding: "round" }, now);

  it("10년 × 12개월 결과와 점수 범위(5~95), 버전 기록", () => {
    expect(res.years).toHaveLength(10);
    expect(res.years[0].year).toBe(2026);
    for (const y of res.years) {
      expect(y.months).toHaveLength(12);
      expect(y.score.version).toBe(SCORE_VERSION);
      for (const m of [y.score, ...y.months.map((x) => x.score)]) {
        expect(m.score).toBeGreaterThanOrEqual(5);
        expect(m.score).toBeLessThanOrEqual(95);
        expect(["A", "B", "C"]).toContain(m.type);
        expect(m.typeReasons.length).toBeGreaterThan(0);
        expect(m.evidence.reasoning.length).toBeGreaterThan(10);
      }
    }
  });

  it("배우자궁 충은 '변화의 계기(+)'와 '안정성 저하(−)'를 함께 기록한다 (자동 감점 아님)", () => {
    const all = res.years.flatMap((y) => y.months.map((m) => m.score));
    const withChung = all.filter((s) => s.contributions.some((c) => c.label.includes("충") && c.label.includes("변화의 계기")));
    expect(withChung.length).toBeGreaterThan(0);
    for (const s of withChung) {
      expect(s.contributions.some((c) => c.label.includes("안정성 저하") && c.delta < 0)).toBe(true);
      expect(s.contributions.some((c) => c.label.includes("변화의 계기") && c.delta > 0)).toBe(true);
    }
  });

  it("같은 범주의 요소가 여러 개일 때 체감 가중치가 적용된다", () => {
    const DECAY = [1, 0.6, 0.35, 0.2, 0.1];
    const all = res.years.flatMap((y) => [y.score, ...y.months.map((m) => m.score)]);
    let checked = 0;
    for (const s of all) {
      for (const c of s.contributions) {
        if (c.rank === undefined || c.weighted === undefined) continue;
        // 최종 반영값 = 체감 전 값 × 순위별 체감 계수
        expect(c.delta).toBeCloseTo(c.weighted * (DECAY[c.rank] ?? 0.05), 0);
        if (c.rank > 0) {
          expect(Math.abs(c.delta)).toBeLessThan(Math.abs(c.weighted) + 1e-9);
          checked++;
        }
      }
      // 같은 범주·부호 안에서 순위 0의 |체감 전 값|이 가장 크다
      const groups = new Map<string, typeof s.contributions>();
      for (const c of s.contributions.filter((c) => c.rank !== undefined)) {
        const k = `${c.category}:${(c.weighted ?? 0) >= 0}`;
        groups.set(k, [...(groups.get(k) ?? []), c]);
      }
      for (const g of groups.values()) {
        const top = g.find((c) => c.rank === 0)!;
        for (const c of g) expect(Math.abs(top.weighted!)).toBeGreaterThanOrEqual(Math.abs(c.weighted!) - 1e-9);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("동일한 월운이라도 원국 맥락이 다르면 같은 관계의 반영값이 달라진다", () => {
    // 같은 월(2027-02 壬寅월)에 대해 신강약·배우자궁 구조가 다른 두 사람
    const a = analyze({ ...base, year: 1990, month: 8, day: 8, hour: 10, minute: 0, gender: "male" }, { ziMode: "zi-change", solarTime: "lmt", daewoonRounding: "round" }, now);
    const b = analyze({ ...base, year: 1985, month: 1, day: 20, hour: 4, minute: 0, gender: "male" }, { ziMode: "zi-change", solarTime: "lmt", daewoonRounding: "round" }, now);
    const ma = a.years[1].months[1].score;
    const mb = b.years[1].months[1].score;
    expect(a.years[1].months[1].wolun.ganzhi).toBe(b.years[1].months[1].wolun.ganzhi);
    expect(JSON.stringify(ma.contributions.map((c) => [c.label, c.delta]))).not.toBe(JSON.stringify(mb.contributions.map((c) => [c.label, c.delta])));
  });

  it("직접 점수 함수 호출: 월운 점수는 세운·대운 맥락을 받는다", () => {
    const y = res.years[1];
    const m = y.months[3];
    const sy = y.seyun;
    const dw = res.daewoon.periods.find((d) => d.ganzhi === m.wolun.daewoonGanzhi) ?? null;
    const s = scoreMonth({ chart: res.chart, gender: "female" }, m.wolun, sy, dw);
    expect(s.score).toBe(m.score.score);
    expect(s.evidence.luck.some((l) => l.startsWith("월운"))).toBe(true);
    expect(s.evidence.luck.some((l) => l.startsWith("세운"))).toBe(true);
  });
});

describe("전체 파이프라인", () => {
  it("음력 윤달 입력 → 양력 변환 → 분석", () => {
    const r = analyze({ gender: "male", calendar: "lunar", year: 2020, month: 4, day: 10, isLeapMonth: true, hour: 8, minute: 15, location: SEOUL }, undefined, new Date(Date.UTC(2026, 10, 8)));
    expect(r.conversion.solar).toEqual({ year: 2020, month: 6, day: 1 });
    expect(r.pillarText.year).toBe("庚子");
  });
  it("존재하지 않는 윤달 입력은 오류", () => {
    expect(() => analyze({ gender: "male", calendar: "lunar", year: 2024, month: 3, day: 1, isLeapMonth: true, hour: 8, minute: 0, location: SEOUL })).toThrow(/윤3월/);
  });
  it("시간 미상: 시주 없이 분석 진행", () => {
    const r = analyze({ gender: "female", calendar: "solar", year: 1992, month: 4, day: 21, hour: null, minute: null, location: SEOUL }, undefined, new Date(Date.UTC(2026, 10, 8)));
    expect(r.pillars.hour).toBeNull();
    expect(r.pillarText.hour).toBeNull();
    expect(r.chart.hasHour).toBe(false);
    expect(r.comparisons).toHaveLength(0);
    expect(r.daewoon.note).toContain("정오");
  });
  it("분석 속도 (10년 × 12개월)", () => {
    const t = performance.now();
    analyze({ gender: "female", calendar: "solar", year: 1999, month: 12, day: 31, hour: 23, minute: 30, location: SEOUL });
    const ms = performance.now() - t;
    console.log(`[성능] 1회 분석 ${ms.toFixed(0)}ms`);
    expect(ms).toBeLessThan(3000);
  });
});
