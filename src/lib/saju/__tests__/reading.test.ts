/**
 * 쉬운 해석 · 배우자궁/배우자성 분석 검증
 * 기준: 「배우자궁과 배우자성 분석 지침」(사용자 제공 문서)
 */
import { describe, expect, it } from "vitest";
import { analyzeChart } from "../chart";
import { HIDDEN_STEMS, STEMS, BRANCHES, tenGodOf } from "../constants";
import { buildLoveAnalysis, findStarOccurrences, xunEmpty } from "../../reading/love";
import type { FourPillars } from "../pillars";
import { analyze } from "../../analyze";
import { buildCrossPrompt } from "../../prompt/crossPrompt";
import { toDTO } from "../../serialize";

const P = (s: number, b: number) => ({ stem: s, branch: b });
const NOW = new Date(Date.UTC(2026, 10, 8));
const SEOUL = { country: "대한민국", city: "서울", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" };

describe("지침 6장 — 갑목(甲木) 일간의 지장간 십신 예시와 대조", () => {
  // 지침 예시: 지지 → [지장간, 십신]
  const DOC: Record<string, Array<[string, string]>> = {
    子: [["癸", "정인"]],
    丑: [["己", "정재"], ["癸", "정인"], ["辛", "정관"]],
    寅: [["甲", "비견"], ["丙", "식신"], ["戊", "편재"]],
    卯: [["乙", "겁재"]],
    辰: [["戊", "편재"], ["乙", "겁재"], ["癸", "정인"]],
    巳: [["丙", "식신"], ["戊", "편재"], ["庚", "편관"]],
    午: [["丁", "상관"], ["己", "정재"]],
    未: [["己", "정재"], ["丁", "상관"], ["乙", "겁재"]],
    申: [["庚", "편관"], ["壬", "편인"], ["戊", "편재"]],
    酉: [["辛", "정관"]],
    戌: [["戊", "편재"], ["辛", "정관"], ["丁", "상관"]],
    亥: [["壬", "편인"], ["甲", "비견"]],
  };
  it("지침의 모든 지장간·십신이 엔진에 있고, 엔진에만 있는 글자는 '여기'뿐", () => {
    BRANCHES.forEach((b, bi) => {
      const ours = HIDDEN_STEMS[bi].map(([s], i, a) => ({ char: STEMS[s], tg: tenGodOf(0, s), role: i === a.length - 1 ? "본기" : a.length === 3 && i === 1 ? "중기" : "여기" }));
      for (const [ch, tg] of DOC[b]) {
        const hit = ours.find((o) => o.char === ch);
        expect(hit, `${b}의 ${ch}`).toBeDefined();
        expect(hit!.tg, `${b}의 ${ch} 십신`).toBe(tg);
      }
      for (const o of ours.filter((x) => !DOC[b].some(([c]) => c === x.char))) expect(o.role, `${b}의 ${o.char}`).toBe("여기");
    });
  });
  it("엔진에만 있는 여기(子壬·卯甲·午丙·酉庚·亥戊)는 배우자성 판단에서 '학파에 따라 빼기도 함'으로 약하게 반영", () => {
    // 여성 甲 일간: 亥의 여기 戊는 편재(관성 아님), 酉의 여기 庚은 편관(관성)
    const p: FourPillars = { year: P(4, 4), month: P(7, 9), day: P(0, 0), hour: P(2, 2) };
    const occ = findStarOccurrences(analyzeChart(p), "female");
    const geng = occ.find((o) => o.char === "庚" && o.pillar === "month");
    expect(geng?.optional).toBe(true);
    expect(geng!.weight).toBeLessThan(0.2);
  });
});

describe("배우자성 찾기 (지침 3장)", () => {
  it("천간에 없어도 지장간에 있으면 찾는다 (투출 없음 · 지장간 존재)", () => {
    // 여성 甲 일간, 천간에 金 없음, 월지 酉(辛 정관)
    const p: FourPillars = { year: P(4, 4), month: P(3, 9), day: P(0, 0), hour: P(2, 2) };
    const a = buildLoveAnalysis(analyzeChart(p), "female");
    expect(a.star.revealed).toBe(false);
    expect(a.star.occurrences.some((o) => o.layer === "지장간" && o.char === "辛")).toBe(true);
    expect(a.star.level).not.toBe("근거 제한적");
  });

  it("여기에만 있으면 근거가 약하다고 표시", () => {
    // 여성 癸 일간(관성=土): 寅의 여기 戊에만 있음
    const p: FourPillars = { year: P(0, 2), month: P(2, 2), day: P(9, 3), hour: P(0, 0) };
    const a = buildLoveAnalysis(analyzeChart(p), "female");
    expect(a.star.occurrences.length).toBeGreaterThan(0);
    expect(a.star.occurrences.every((o) => o.role === "여기")).toBe(true);
    expect(a.star.level).toBe("약함");
    expect(a.star.factors.some((f) => f.includes("여기"))).toBe(true);
  });

  it("정·편 혼재는 천간이나 본기로 뚜렷할 때만 판정 (약한 여기는 제외)", () => {
    // 여성 甲 일간: 월간 辛(정관), 월지 酉(庚 여기·辛 본기) → 편관은 학파에 따라 빼는 여기뿐
    const p: FourPillars = { year: P(4, 4), month: P(7, 9), day: P(0, 0), hour: P(2, 2) };
    expect(buildLoveAnalysis(analyzeChart(p), "female").star.mixed).toBeNull();
    // 월간 庚(편관) + 시지 酉 본기 辛(정관) → 혼재
    const q: FourPillars = { year: P(4, 4), month: P(6, 8), day: P(0, 0), hour: P(9, 9) };
    expect(buildLoveAnalysis(analyzeChart(q), "female").star.mixed).not.toBeNull();
  });
});

describe("핵심 원칙 (지침 9장)", () => {
  const noStar: FourPillars = { year: P(2, 2), month: P(2, 2), day: P(2, 2), hour: P(2, 2) }; // 남성 丙 일간, 金(재성) 전혀 없음

  it("배우자성이 없으면 '근거 제한적'이며, 결혼 불가·배우자 부재로 단정하지 않는다", () => {
    const a = buildLoveAnalysis(analyzeChart(noStar), "male");
    expect(a.star.level).toBe("근거 제한적");
    expect(a.star.summary).toContain("인연이 없다는 뜻은 아니에요");
    expect(a.conclusion.limits.join(" ")).toContain("판단 근거가 제한적");
    expect(["B", "D"]).toContain(a.type.code);
    expect(a.support).not.toBeNull();
    // 이성의 별이 없어도 '만나게 될 이성' 추론은 이성의 별 오행·배우자 자리로 제공
    expect(a.partner.intro).toContain("뚜렷하지 않아");
    expect(a.partner.items.length).toBeGreaterThanOrEqual(4);
    const all = JSON.stringify(a);
    for (const bad of ["결혼을 못 합니다", "배우자가 없습니다", "배우자 복이 없습니다", "이혼합니다"]) expect(all).not.toContain(bad);
  });

  it("다른 기둥을 배우자궁의 대체물로 쓰지 않는다 — 보조 정보로만 언급", () => {
    const a = buildLoveAnalysis(analyzeChart(noStar), "male");
    expect(a).not.toHaveProperty("reference");
    expect(a.palace.char).toBe("寅"); // 배우자궁은 항상 일지
  });

  it("배우자궁과 배우자성을 따로 평가하고, 유형은 두 평가의 조합으로 정한다", () => {
    const r = analyze({ gender: "female", calendar: "solar", year: 1994, month: 10, day: 3, hour: 14, minute: 20, location: SEOUL }, undefined, NOW);
    const { palace, star, type } = r.love;
    const palaceOk = palace.force.level !== "약" && palace.stability.level !== "흔들림 큼";
    const starOk = star.level === "유력" || star.level === "보통";
    expect(type.code).toBe(palaceOk && starOk ? "A" : palaceOk ? "B" : starOk ? "C" : "D");
    expect(palace.force.factors[0]).toContain("태어난 계절");
    expect(r.love.conclusion.facts.length).toBeGreaterThanOrEqual(4);
    // A·B·C·E 한 문단: 결론을 분명히 말하고 애매한 유보 표현을 쓰지 않는다
    const ov = r.love.overviewText;
    expect(ov).toContain("배우자 자리(일지)에");
    expect(ov).toContain("이성의 별");
    expect(ov).toMatch(/!/);
    expect(ov + r.love.interaction.summary).not.toMatch(/좋고 나쁨을 정하지 않아요|긴장이 있을 수 있지만/);
    // 단정 문장 대신 '만나게 될 이성' 추론 + 참고 문구
    expect(r.love.conclusion.limits.some((l) => l.includes("확정할 수 없어요"))).toBe(false);
    expect(r.love.conclusion.limits.some((l) => l.startsWith("배우자 자리의 글자(십신)는"))).toBe(true);
    expect(r.love.partner.items.map((i) => i.title)).toEqual(["외모·분위기", "성격", "하는 일의 결", "나이 차", "만남의 계기", "인연이 닿기 쉬운 때"]);
    expect(r.love.partner.items[3].text).toMatch(/연상|연하|동갑|또래/);
    expect(r.love.partner.storyText).toMatch(/나이는 (연상|연하|동갑|비슷한)|나이 차가 있는 사람/);
    expect(r.love.partner.storyText).not.toMatch(/나이는 나이|연상이거나 연하|연하이거나 연상/);
    // '배우자 자리와 이성의 별' 문단은 '닿게 될 인연은 ~한 사람일 가능성' 형식
    expect(r.love.overviewText).toContain("닿게 될 인연은");
    expect(r.love.overviewText).toMatch(/사람일 가능성이 있어요/);
    // 한 문단 이야기: 외모·성격·일·만남·시기가 모두 이어져 있고, 시기는 강조 표시
    const story = r.love.partner.storyText;
    // 첫인상 → 가까워졌을 때 순서. 결이 같으면 '더 잘 보이는', 다르면 '면도 보이는'으로 잇는다
    expect(story).toMatch(/^첫인상은 .+, 가까워(지면|질수록) .+ 면(도|이 더 잘) 보이는 사람이에요/);
    expect(story).toContain("가능성이 커요");
    expect(story).toContain("인연이 깊어지기 쉬워요");
    expect(r.love.partner.story.some((s) => s.b && /\d{4}/.test(s.t))).toBe(true);
    expect(story).not.toMatch(/고요|이혼/);
    for (const it of r.love.partner.items) {
      expect(it.basis.length).toBeGreaterThan(3);
      expect(it.text).not.toMatch(/이혼|반드시 (결혼|만납)/);
    }
  });

  it("운의 시기(E)는 '반드시 인연이 생긴다'고 하지 않는다", () => {
    const r = analyze({ gender: "female", calendar: "solar", year: 1994, month: 10, day: 3, hour: 14, minute: 20, location: SEOUL }, undefined, NOW);
    const line = r.love.conclusion.inferences.find((x) => x.includes("이성의 별이 들어오는 해"));
    if (line) expect(line).toContain("반드시 인연이 생긴다는 뜻은 아니에요");
  });

  it("교차 분석 프롬프트에 지침의 A~F 출력 형식과 원칙이 포함된다", () => {
    const r = toDTO(analyze({ gender: "male", calendar: "solar", year: 2000, month: 1, day: 1, hour: 10, minute: 30, location: SEOUL }, undefined, NOW));
    const prompt = buildCrossPrompt(r, "");
    // 홈페이지 목적(배우자상·인연 시기)에 집중하고, 동의/다른 의견을 명리학 근거로 요청
    for (const s of ["상담 목적: 배우자(이성) 분석과 인연 시기", "일반 운세는 다루지 마세요", "Q1.", "Q2.", "Q3.", "동의하는 부분", "다른 의견이 있는 부분", "사주명리학 근거", "지장간까지 확인", "인연 시기 Top 3", "이 사이트의 분석"]) expect(prompt).toContain(s);
    expect(prompt).not.toContain("[기존 분석 — 기본 성향]"); // 사주 전체 풀이용 데이터는 넣지 않음
    expect(prompt).not.toContain("Q4."); // 조건을 안 적으면 조건 비교 질문 없음
    expect(buildCrossPrompt(r, "책임감 있는 사람")).toContain("Q4.");
    // 역할·대화 맥락 지시가 맨 앞에 온다
    expect(prompt.startsWith("[역할과 대화 지시]")).toBe(true);
    expect(prompt).toContain("40년 경력의 역술가");
    expect(prompt).toContain("이전 질문 기록이나 이전 대화 내용을 참조하지 말고");
  });
});

describe("일간·오행에 따라 해석이 달라진다", () => {
  const a = analyze({ gender: "female", calendar: "solar", year: 1994, month: 10, day: 3, hour: 14, minute: 20, location: SEOUL }, undefined, NOW);
  const b = analyze({ gender: "male", calendar: "solar", year: 2000, month: 1, day: 1, hour: 10, minute: 30, location: SEOUL }, undefined, NOW); // 戊午일

  it("일간이 다르면 기질 문장이 다르다", () => {
    expect(a.reading.dayMaster.char).not.toBe(b.reading.dayMaster.char);
    expect(a.reading.personality[0].text).not.toBe(b.reading.personality[0].text);
  });
  it("오행 개수 판정이 원국 개수와 일치", () => {
    for (const r of [a, b]) {
      const c = r.chart.elements.count;
      expect(r.reading.elements.counts).toEqual(c);
      for (const e of r.reading.elements.many) expect(c[e]).toBeGreaterThanOrEqual(3);
      for (const e of r.reading.elements.none) expect(c[e]).toBe(0);
    }
  });
  it("연애 성향 문구는 '사주에 ○○가 있어 ~한 사람이 잘 맞아요/끌려요!' 형식", () => {
    for (const r of [a, b]) {
      expect(r.reading.loveStyle.map((x) => x.title)).toEqual(["나의 연애 스타일", "끌리는 외형", "잘 맞는 사람", "나에게 끌리는 사람"]);
      for (const x of r.reading.loveStyle) {
        expect(x.text).toMatch(/^(사주|배우자 자리|나를 뜻하는)/);
        expect(x.text).toContain("!");
        expect(x.text).not.toMatch(/이\(라\)|이\(가\)|다\([^)]+\)이라/); // 조사 미처리·받침 없는 말 뒤 '이라' 금지
        expect(x.text).not.toMatch(/기운\([목화토금수]\)의 사람/); // 오행 이름만 쓰고 풀이하지 않는 표기 금지
      }
      expect(r.reading.loveStyle[2].text).toMatch(/의 기운\((비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인)\)이? ?있어|의 기운\((비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인)\)가 있어/);
    }
  });

  it("직업·재물 해석은 더 이상 만들지 않는다 (연애 중심)", () => {
    expect(a.reading).not.toHaveProperty("career");
    expect(a.reading).not.toHaveProperty("wealth");
  });
  it("1994-10-03 14:20 서울(지방평균태양시) = 甲戌 癸酉 壬戌 丁未", () => {
    expect([a.pillarText.year, a.pillarText.month, a.pillarText.day, a.pillarText.hour]).toEqual(["甲戌", "癸酉", "壬戌", "丁未"]);
  });
});

/**
 * 결과 화면 문장끼리 서로 어긋나지 않는지 — 여러 표의 문장을 이어 붙이다 생기던 모순을 막는다
 * (예: '차분한 분위기에 생동감 넘치는', 문단마다 다른 인연의 해, '스쳐 갈 인연'인 달을 '깊어지는 때'로 묶기)
 */
describe("결과 문장의 일관성", () => {
  // 10개 일간 × 남녀가 고루 나오도록 날짜를 흩뿌린다
  const cases = Array.from({ length: 40 }, (_, i) => ({
    gender: (i % 2 ? "male" : "female") as "male" | "female",
    year: 1975 + ((i * 7) % 30), month: 1 + ((i * 5) % 12), day: 1 + ((i * 11) % 28), hour: (i * 13) % 24, minute: 30,
  }));
  const results = cases.map((c) => analyze({ calendar: "solar", location: SEOUL, ...c }, undefined, NOW));

  it("화면 문장에 조사 미처리·합쇼체 혼용·문장 조각이 없다", () => {
    for (const r of results) {
      const texts = [
        ...r.reading.personality.map((x) => x.text), ...r.reading.loveStyle.map((x) => x.text),
        ...r.love.partner.items.map((x) => x.text), r.love.partner.storyText, r.love.overviewText, ...r.summary.style.advice,
        ...r.years.flatMap((y) => y.months.flatMap((m) => m.score.advice)),
      ];
      for (const t of texts) {
        expect(t, t).not.toMatch(/이\(가\)|을\(를\)|은\(는\)|와\(과\)|이\(라\)/);
        expect(t, t).not.toMatch(/합니다|입니다|습니다|됩니다/);
        expect(t, t).not.toMatch(/음 경향|분위기[^.!]{0,12}분위기/);
      }
    }
  });

  it("'만나게 될 이성'과 '배우자 자리' 문단이 같은 해·같은 만남의 계기를 말한다", () => {
    for (const r of results) {
      const yrs = (s: string) => s.match(/(\d{4}(?:·\d{4})*)년에 (?:닿기|진지한|인연이)/g)?.pop()?.replace(/년.*/, "");
      const a = yrs(r.love.overviewText), b = yrs(r.love.partner.storyText);
      if (a && b) expect(a).toBe(b);
      expect(/생활 반경/.test(r.love.overviewText) && /이사·이직/.test(r.love.overviewText), r.love.overviewText).toBe(false);
    }
  });

  it("맨 위 '스쳐 지나가기 쉬운 인연'인 달을 이야기에서 '깊어지는 때'로 묶지 않는다", () => {
    for (const r of results) {
      if (r.summary.timing.nearest?.type === "C") expect(r.love.partner.storyText).not.toContain("즈음이나");
    }
  });

  it("월별 카드에 서로 반대인 흐름·만남을 나란히 쓰지 않는다", () => {
    for (const r of results) for (const y of r.years) for (const m of y.months) {
      const g = m.score.goodPlain.join("|");
      expect(/강하게 끌리는/.test(g) && /은근한|드러나지 않게/.test(g), g).toBe(false);
      const p = m.score.partnerTraits.join("|");
      expect(/이동|환경 변화/.test(p) && /생활 속에서|지인 소개/.test(p), p).toBe(false);
    }
  });
});

describe("배우자 자리의 전통 표지 (공망·일주 신살)", () => {
  it("순공(旬空): 甲子순 戌亥, 甲戌순 申酉, 壬戌·癸亥는 甲寅순 子丑", () => {
    expect(xunEmpty(0, 0)).toEqual([10, 11]); // 甲子
    expect(xunEmpty(0, 10)).toEqual([8, 9]); // 甲戌
    expect(xunEmpty(8, 10)).toEqual([0, 1]); // 壬戌 → 甲寅순
    expect(xunEmpty(9, 11)).toEqual([0, 1]); // 癸亥 → 甲寅순
  });
  it("壬戌 일주 여성: 괴강·백호 일주와 과숙을 배우자 자리 해석에 넣는다", () => {
    const r = analyze({ gender: "female", calendar: "solar", year: 1994, month: 10, day: 3, hour: 14, minute: 20, location: SEOUL }, undefined, NOW);
    const names = r.love.marks.map((m) => m.name);
    expect(names).toEqual(expect.arrayContaining(["괴강 일주", "백호 일주", "과숙"]));
    expect(r.love.overviewText).toContain(r.love.marks[0].text);
    expect(r.love.conclusion.facts.some((f) => f.startsWith("배우자 자리의 전통 표지"))).toBe(true);
    // 전통 표지라도 단정·공포 표현은 쓰지 않는다
    for (const m of r.love.marks) expect(m.text).not.toMatch(/이혼|과부|홀아비|팔자가 세|반드시/);
  });
});
