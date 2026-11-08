/** 결과 화면 상단 요약(인연 시기 · 연애 스타일)의 일관성 검증 */
import { describe, expect, it } from "vitest";
import { analyze, analyzeYears } from "../../analyze";

const SEOUL = { country: "대한민국", city: "서울", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" };
const NOW = new Date(Date.UTC(2026, 10, 8));
const HANJA = /[一-鿿]/;
const JARGON = /(정재|편재|정관|편관|식신|상관|비견|겁재|편인|정인|육합|반합|삼합|원진|귀문|배우자성|배우자궁|일간|세운|월운|대운)/;

const cases = [
  { gender: "female" as const, year: 1994, month: 10, day: 3, hour: 14, minute: 20 },
  { gender: "male" as const, year: 1990, month: 5, day: 17, hour: 10, minute: 30 },
  { gender: "male" as const, year: 1985, month: 1, day: 20, hour: 4, minute: 0 },
  { gender: "female" as const, year: 2000, month: 2, day: 4, hour: null, minute: null },
  { gender: "female" as const, year: 1979, month: 12, day: 31, hour: 23, minute: 40 },
];

describe("지난 인연 비교 — 10년 단위 조회", () => {
  const input = { gender: "female" as const, calendar: "solar" as const, year: 1994, month: 10, day: 3, hour: 14, minute: 20, location: SEOUL };
  const opt = { ziMode: "zi-change" as const, solarTime: "lmt" as const, daewoonRounding: "round" as const };
  it("만 10세(출생+10년)부터 10년 구간을 계산한다 — 10대 = 2004~2013", () => {
    const r = analyzeYears(input, opt, 2004, NOW);
    expect(r.years.map((y) => y.year)).toEqual([2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013]);
    for (const y of r.years) {
      expect(y.months).toHaveLength(12);
      expect(y.score.score).toBeGreaterThanOrEqual(5);
      expect(y.score.headline.length).toBeGreaterThan(5);
    }
    // 같은 해는 어떤 구간으로 조회해도 같은 점수
    const a = analyzeYears(input, opt, 2024, NOW).years.find((y) => y.year === 2026)!;
    const b = analyze({ ...input }, opt, NOW).years.find((y) => y.year === 2026)!;
    expect(a.score.score).toBe(b.score.score);
  });
  it("만 10세 이전 구간은 거부", () => {
    expect(() => analyzeYears(input, opt, 2003, NOW)).toThrow(/만 10세/);
  });
});

describe("인연 시기 요약", () => {
  it.each(cases)("$year-$month-$day $gender", (c) => {
    const r = analyze({ calendar: "solar", location: SEOUL, ...c }, undefined, NOW);
    const t = r.summary.timing;
    expect(t.nearest).not.toBeNull();
    // 가장 가까운 시기는 지금부터 24개월 안
    const nearestMs = Date.UTC(t.nearest!.year, t.nearest!.month - 1, 1);
    expect(nearestMs).toBeGreaterThanOrEqual(Date.UTC(2026, 9, 1));
    expect(nearestMs).toBeLessThan(Date.UTC(2028, 11, 1));
    // 주목할 달 3개는 시간순, 모두 24개월 안
    expect(t.upcoming).toHaveLength(3);
    for (let i = 1; i < t.upcoming.length; i++) {
      const a = t.upcoming[i - 1], b = t.upcoming[i];
      expect(a.year * 12 + a.month).toBeLessThanOrEqual(b.year * 12 + b.month);
    }
    // 강한 해 3개는 점수순
    expect(t.bestYears[0].score).toBeGreaterThanOrEqual(t.bestYears[2].score);
    expect(t.oneLine.length).toBeGreaterThan(10);
  });

  it.each(cases)("쉬운 설명에 한자·명리 용어가 섞이지 않음: $year-$month-$day", (c) => {
    const r = analyze({ calendar: "solar", location: SEOUL, ...c }, undefined, NOW);
    for (const y of r.years) {
      for (const s of [y.score, ...y.months.map((m) => m.score)]) {
        for (const text of [s.headline, ...s.goodPlain, ...s.cautionPlain]) {
          expect(text, text).not.toMatch(HANJA);
          expect(text, text).not.toMatch(JARGON);
        }
      }
    }
    for (const p of r.summary.style.points) expect(p.text).not.toMatch(HANJA);
    for (const a of r.summary.style.advice) expect(a).not.toMatch(HANJA);
    expect(r.summary.style.advice.length).toBeGreaterThanOrEqual(2);
  });
});
