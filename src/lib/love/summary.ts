/**
 * 결과 화면 상단용 요약 — 명리 용어 없이
 *  1) 핵심: 인연이 들어올 가능성이 높은 시기
 *  2) 부가: 나의 연애 스타일 · 이상형(배우자궁) · 조언
 * 세부 근거는 기존 분석(score/profile/preference)에 그대로 있다.
 */
import { ELEMENTS, STEM_ELEMENT, TEN_GOD_GROUP, controlledBy, controlsWhat, elementOfGroup, seasonOfBranch } from "../saju/constants";
import type { NatalChart } from "../saju/chart";
import { DAY_STEM_PROFILE, ELEMENT_IMAGE, FEMALE_APPEARANCE, MALE_APPEARANCE, MONTH_TENGOD_PREFERENCE, SEASON_SPOUSE, TEN_GOD_INFO } from "./knowledge";
import type { PeriodScore } from "./score";

interface MonthLike {
  wolun: { year: number; month: number; startUtc: Date; endUtc: Date };
  score: PeriodScore;
}
interface YearLike {
  year: number;
  score: PeriodScore;
  months: MonthLike[];
}

export interface TimingPick {
  year: number;
  month: number;
  score: number;
  type: string;
  headline: string;
  nature: { label: string; text: string };
}

export interface TimingSummary {
  /** 지금부터 가장 빠른 '인연 가능성이 높은 달' (10년 범위, 없으면 그 기간 최고점) */
  nearest: TimingPick | null;
  /** 앞으로 24개월 안에서 점수 상위 3개월 (시간순) */
  upcoming: TimingPick[];
  /** 10년 중 인연운이 강한 해 상위 3개 (점수순) */
  bestYears: Array<{ year: number; score: number; headline: string }>;
  /** 올해 */
  thisYear: { year: number; score: number; headline: string } | null;
  /** 한 문장 결론 */
  oneLine: string;
}

/** 타임라인의 '높음' 이상(60점) — 인연이 찾아올 가능성이 높은 달 */
const STRONG = 60;

/** 그 시기에 오는 인연의 성격 — 진중하게 봐도 될지, 스쳐 가는 인연인지 */
export const NATURE: Record<string, { label: string; text: string }> = {
  A: { label: "진중하게 만나 봐도 좋은 인연", text: "이때 오는 인연은 마음이 차분하게 이어지는 흐름이라, 진중하게 만나 봐도 좋아요. 오래 가는 관계로 발전하기 쉬워요!" },
  B: { label: "끌림은 크지만 지켜볼 인연", text: "이때 오는 인연은 끌림이 강하게 오는 흐름이에요. 설렘이 앞서기 쉬우니 서두르지 말고 몇 달 지켜보며 천천히 알아가면 진지한 관계로 이어질 수 있어요." },
  C: { label: "스쳐 지나가기 쉬운 인연", text: "이때 오는 인연은 가볍게 시작되고 스쳐 지나가기 쉬운 흐름이에요. 부담 없이 즐기되, 큰 결정은 다음 좋은 시기까지 아껴 두세요." },
};

export function buildTimingSummary(years: YearLike[], now: Date): TimingSummary {
  const t = now.getTime();
  const horizon = t + 730 * 86_400_000;
  const allAhead = years.flatMap((y) => y.months).filter((m) => m.wolun.endUtc.getTime() > t);
  const months = allAhead.filter((m) => m.wolun.startUtc.getTime() < horizon);
  const pick = (m: MonthLike): TimingPick => ({ year: m.wolun.year, month: m.wolun.month, score: m.score.score, type: m.score.type, headline: m.score.headline, nature: NATURE[m.score.type] ?? NATURE.B });
  const chrono = [...allAhead].sort((a, b) => a.wolun.startUtc.getTime() - b.wolun.startUtc.getTime());
  // 가장 빠른 '가능성 높은' 달 (10년 전체에서) — 없으면 그 기간 최고점
  const strongFirst = chrono.find((m) => m.score.score >= STRONG);
  const best = [...allAhead].sort((a, b) => b.score.score - a.score.score)[0];
  const nearest = strongFirst ? pick(strongFirst) : best ? pick(best) : null;
  const upcoming = [...months]
    .sort((a, b) => b.score.score - a.score.score)
    .slice(0, 3)
    .sort((a, b) => a.wolun.startUtc.getTime() - b.wolun.startUtc.getTime())
    .map(pick);
  const bestYears = [...years].sort((a, b) => b.score.score - a.score.score || a.year - b.year).slice(0, 3).map((y) => ({ year: y.year, score: y.score.score, headline: y.score.headline }));
  const cy = years.find((y) => y.year === new Date(t).getUTCFullYear()) ?? years[0] ?? null;
  const thisYear = cy ? { year: cy.year, score: cy.score.score, headline: cy.score.headline } : null;
  const oneLine = nearest
    ? `${strongFirst ? "인연이 찾아올 가능성이 높은 가장 빠른 시기는" : "흐름이 잔잔한 편이지만, 그중 인연이 찾아오기 가장 좋은 시기는"} ${nearest.year}년 ${nearest.month}월이에요. ${nearest.nature.text}`
    : "분석 기간 안에서 두드러진 시기를 찾지 못했습니다.";
  return { nearest, upcoming, bestYears, thisYear, oneLine };
}

export interface StyleSummary {
  points: Array<{ title: string; text: string }>;
  advice: string[];
}

export function buildStyleSummary(chart: NatalChart, gender: "male" | "female"): StyleSummary {
  const ds = chart.dayStem;
  const dmEl = STEM_ELEMENT[ds];
  const sg = gender === "male" ? "재성" : "관성";
  const sgEl = elementOfGroup(ds, sg);
  const w = chart.tenGodWeighted;
  const day = chart.pillars.day!;
  const month = chart.pillars.month!;
  const prof = DAY_STEM_PROFILE[ds];
  const look = (gender === "male" ? MALE_APPEARANCE : FEMALE_APPEARANCE)[`${dmEl}+${sgEl}`];
  const season = seasonOfBranch(chart.dayBranch);
  const pyeon = gender === "male" ? "편재" : "편관";
  const jeong = gender === "male" ? "정재" : "정관";
  let jW = 0;
  let pW = 0;
  for (const p of Object.values(chart.pillars)) {
    if (!p) continue;
    if (p.stemTenGod === jeong) jW += 1;
    if (p.stemTenGod === pyeon) pW += 1;
    for (const h of p.hidden) {
      const wt = h.role === "정기" ? 0.8 : 0.3;
      if (h.tenGod === jeong) jW += wt;
      if (h.tenGod === pyeon) pW += wt;
    }
  }
  const firstSight = pW > jW || w["식상"] >= 25 || chart.shinsal.some((s) => s.name === "도화살");
  const attractedEl = gender === "female" ? controlledBy(dmEl) : controlsWhat(dmEl);

  const points = [
    {
      title: "나의 연애 스타일",
      text: `${prof.love} ${firstSight ? "첫인상과 설렘에 먼저 끌리는 편이에요." : "첫눈에 반하기보다 시간이 지나며 신뢰가 쌓일 때 마음이 깊어지는 편이에요."}`,
    },
    {
      title: "끌리는 이상형",
      text: `외모는 '${look}', 성격은 '${MONTH_TENGOD_PREFERENCE[month.branchTenGod]}'에게 마음이 가기 쉬워요.`,
    },
    {
      title: "오래 함께하기 좋은 사람",
      text: `${TEN_GOD_INFO[day.branchTenGod].partnerType}, 그리고 ${SEASON_SPOUSE[season].image}의 사람과 생활이 잘 맞을 가능성이 커요.`,
    },
    {
      title: "나에게 끌리는 사람",
      text: `${ELEMENT_IMAGE[dmEl]}을(를) 가진 당신에게는 ${attractedEl === sgEl ? "당신이 좋아하는 유형의 사람도 끌리기 쉬워, 마음이 통하기 쉬운 구조예요." : `${ELEMENT_IMAGE[attractedEl].split(",")[0]}의 사람이 먼저 다가오기 쉬워요. 내가 좋아하는 사람과 나를 좋아하는 사람이 다를 수 있어요.`}`,
    },
  ];

  const advice: string[] = [];
  if (chart.strength.score >= 60) advice.push("주관이 뚜렷한 편이라, 관계에서는 이끌기보다 상대의 속도에 맞춰 주는 연습이 도움이 돼요.");
  else if (chart.strength.score < 40) advice.push("상대에게 맞추다 지치기 쉬워요. 나를 편하게 해 주는 사람인지 꼭 확인하세요.");
  if (w[sg] < 8) advice.push("연애가 우선순위에서 밀리기 쉬운 구조예요. 인연운이 좋은 시기에는 의식적으로 만남의 기회를 만들어 보세요.");
  else if (w[sg] >= 35) advice.push("이성과 인연이 자연스럽게 생기는 편이지만, 관계가 많아질수록 기준을 분명히 하는 것이 좋아요.");
  // 나의 기운이 여린 사람에게는 위에서 '맞추다 지치기 쉽다'고 했으므로 '자존심 대결' 조언을 함께 내지 않는다
  if (gender === "male" && w["비겁"] >= 30 && chart.strength.score >= 40) advice.push("자존심 대결로 번지지 않도록, 의견이 다를 때 한 박자 쉬어 가세요.");
  if (gender === "female" && w["식상"] >= 25 && w["관성"] > 0) advice.push("상대의 부족한 점을 말할 때는 표현을 부드럽게 다듬으면 관계가 오래가요.");
  if (chart.relations.some((r) => r.involvesDayBranch && (r.kind === "충" || r.kind === "형"))) advice.push("관계에 변화가 생기기 쉬운 구조라, 서로의 거리와 생활 방식을 존중하는 관계가 잘 맞아요.");
  if (jW > 0 && pW > 0) advice.push("안정감을 주는 사람과 설렘을 주는 사람 사이에서 고민하기 쉬워요. 내가 오래 원하는 것이 무엇인지 먼저 정리해 보세요.");
  // 일간별로 쓴 완결 문장 — "~할 수 있음 경향이 있으니"처럼 문장 조각을 이어 붙이지 않는다
  if (advice.length < 2) advice.push(prof.loveAdvice);
  return { points, advice: advice.slice(0, 3) };
}

export { ELEMENTS, TEN_GOD_GROUP };
