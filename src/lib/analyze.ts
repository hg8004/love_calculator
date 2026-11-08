/**
 * 분석 파이프라인 진입점
 *   1) 입력 검증 → 2) 음양력 변환(독립 단계) → 3) 시간대·태양시 → 4) 사주 원국 → 5) 구조 분석
 *   → 6) 대운·세운·월운 → 7) 연애운 점수(버전 관리) → 8) 규칙 기반 해석(근거 포함)
 * AI 해석은 이 결과(구조화 데이터)를 입력으로만 사용하며, 이 파이프라인에 개입하지 않는다.
 */
import { DateTime } from "luxon";
import { BRANCHES, STEMS, TEN_GOD_GROUP, ganzhiText, ganzhiKo } from "./saju/constants";
import { lunarToSolar, solarToLunar, LunarDate } from "./saju/lunar";
import { computePillars, comparePillarSettings, ZiHourMode, ZI_MODE_LABEL, FourPillars, fmtOffset } from "./saju/pillars";
import { SolarTimeMode, SOLAR_TIME_MODE_LABEL } from "./saju/time";
import { analyzeChart, NatalChart } from "./saju/chart";
import { computeDaewoon, computeSeyun, computeWolunOfYear, DaewoonInfo, DaewoonRounding, SeyunInfo, WolunInfo } from "./saju/luck";
import { analyzeProfile } from "./love/profile";
import { analyzePreferences } from "./love/preference";
import { PeriodScore, scoreMonth, scoreYear, SCORE_VERSION, SCORE_VERSION_NOTE } from "./love/score";
import type { Section } from "./love/types";
import { deepFixJosa } from "./josa";
import { buildStyleSummary, buildTimingSummary, StyleSummary, TimingSummary } from "./love/summary";
import { buildReading, Reading } from "./reading/reading";
import { buildLoveAnalysis, LoveAnalysis } from "./reading/love";

export const ENGINE_VERSION = "saju-engine/1.0.0";

export interface BirthInput {
  gender: "male" | "female";
  calendar: "solar" | "lunar";
  year: number;
  month: number;
  day: number;
  isLeapMonth?: boolean;
  /** null 이면 출생 시간 미상 */
  hour: number | null;
  minute: number | null;
  location: { country: string; city: string; latitude: number; longitude: number; timezone: string };
}

export interface AnalysisOptions {
  ziMode: ZiHourMode;
  solarTime: SolarTimeMode;
  daewoonRounding: DaewoonRounding;
  /** 연애운 분석 시작 연도(기본: 현재 연도) */
  startYear?: number;
  years?: number;
}

export const DEFAULT_OPTIONS: AnalysisOptions = { ziMode: "zi-change", solarTime: "lmt", daewoonRounding: "round", years: 10 };

export interface MonthResult {
  wolun: WolunInfo;
  score: PeriodScore;
  startLocal: string;
  endLocal: string;
}
export interface YearResult {
  year: number;
  seyun: SeyunInfo;
  score: PeriodScore;
  months: MonthResult[];
  notableMonths: number[];
}

export interface AnalysisResult {
  meta: { engineVersion: string; scoreVersion: string; scoreVersionNote: string; generatedAt: string; disclaimer: string };
  input: BirthInput;
  options: AnalysisOptions;
  settings: Array<{ label: string; value: string }>;
  conversion: { solar: { year: number; month: number; day: number }; lunar: LunarDate | null; note: string };
  time: {
    known: boolean;
    wallClock: string | null;
    utc: string | null;
    zoneOffset: string | null;
    isDST: boolean;
    reckoning: string | null;
    correctionMinutes: number | null;
    equationOfTimeMinutes: number | null;
    longitudeCorrectionMinutes: number | null;
    ziKind: string | null;
    dayHourExplanation: string | null;
    prevJie: { name: string; local: string } | null;
    nextJie: { name: string; local: string } | null;
  };
  pillars: FourPillars;
  pillarText: { year: string; month: string; day: string; hour: string | null };
  alternatives: Array<{ description: string; year: string; month: string }>;
  comparisons: Array<{ ziMode: ZiHourMode; ziLabel: string; solarTime: SolarTimeMode; solarLabel: string; reckoning: string; day: string; hour: string; ziKind: string | null; selected: boolean }>;
  warnings: string[];
  chart: NatalChart;
  profile: Section[];
  preferences: Section[];
  appearanceFocus: { score: number; level: string; factors: string[] };
  daewoon: DaewoonInfo;
  currentDaewoonIndex: number | null;
  years: YearResult[];
  topMonths: Array<{ year: number; month: number; score: number; ganzhi: string; type: string }>;
  summary: { timing: TimingSummary; style: StyleSummary };
  reading: Reading;
  love: LoveAnalysis;
}

export class InputError extends Error {}

/**
 * 원하는 10년 구간의 연도·월별 인연운만 계산 (지난 인연 비교용).
 * 시작 연도는 출생 후 10년(만 10세) 이후, 2150년 이전으로 제한한다.
 */
export function analyzeYears(input: BirthInput, opt: AnalysisOptions, startYear: number, now: Date = new Date()): { startYear: number; birthYear: number; years: YearResult[] } {
  if (!Number.isInteger(startYear)) throw new InputError("조회할 연도가 올바르지 않습니다.");
  const r = analyze(input, { ...opt, startYear, years: 10 }, now);
  const birthYear = r.conversion.solar.year;
  if (startYear < birthYear + 10 || startYear > 2150) throw new InputError(`조회할 수 있는 연도는 ${birthYear + 10}년(만 10세)부터 2150년까지예요.`);
  return { startYear, birthYear, years: r.years };
}

function validDate(y: number, m: number, d: number): boolean {
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

export function analyze(input: BirthInput, opt: AnalysisOptions = DEFAULT_OPTIONS, now: Date = new Date()): AnalysisResult {
  const options = { ...DEFAULT_OPTIONS, ...opt };
  // 1) 입력 검증
  if (!["male", "female"].includes(input.gender)) throw new InputError("성별을 선택해 주세요.");
  if (!Number.isInteger(input.year) || input.year < 1900 || input.year > 2050) throw new InputError("생년은 1900~2050년 사이여야 합니다.");
  const { latitude, longitude, timezone } = input.location;
  if (!(latitude >= -90 && latitude <= 90) || !(longitude >= -180 && longitude <= 180)) throw new InputError("위도·경도 값이 올바르지 않습니다.");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    throw new InputError(`알 수 없는 시간대입니다: ${timezone}`);
  }
  const timeKnown = input.hour !== null && input.minute !== null;
  if (timeKnown && (input.hour! < 0 || input.hour! > 23 || input.minute! < 0 || input.minute! > 59)) throw new InputError("출생 시각이 올바르지 않습니다.");

  // 2) 음양력 변환 — 사주 계산과 분리된 단계
  let solar: { year: number; month: number; day: number };
  let lunar: LunarDate | null;
  let convNote: string;
  if (input.calendar === "lunar") {
    const r = lunarToSolar({ year: input.year, month: input.month, day: input.day, isLeapMonth: Boolean(input.isLeapMonth) });
    if (!r.ok) throw new InputError(r.error);
    solar = r.solar;
    lunar = r.lunar;
    convNote = `음력 ${input.year}년 ${input.isLeapMonth ? "윤" : ""}${input.month}월 ${input.day}일 → 양력 ${solar.year}년 ${solar.month}월 ${solar.day}일 (한국천문연구원 기준 음양력 데이터, 왕복 검증 완료)`;
  } else {
    if (!validDate(input.year, input.month, input.day)) throw new InputError("존재하지 않는 양력 날짜입니다.");
    solar = { year: input.year, month: input.month, day: input.day };
    lunar = solarToLunar(solar);
    convNote = lunar ? `양력 입력. 참고용 음력: ${lunar.year}년 ${lunar.isLeapMonth ? "윤" : ""}${lunar.month}월 ${lunar.day}일` : "양력 입력 (음력 환산 범위 밖)";
  }

  // 3)·4) 원국
  const birth = { date: solar, time: timeKnown ? { hour: input.hour!, minute: input.minute! } : null, timezone, longitude, latitude };
  const pc = computePillars(birth, { ziMode: options.ziMode, solarTime: options.solarTime });
  const p = pc.pillars;
  const fmtLocal = (d: Date) => DateTime.fromJSDate(d, { zone: timezone }).toFormat("yyyy-MM-dd HH:mm");

  // 5) 구조 분석
  const chart = analyzeChart(p);

  // 6) 대운
  const birthUtcForLuck = pc.resolved?.utc ?? DateTime.fromObject({ ...solar, hour: 12 }, { zone: timezone }).toUTC().toJSDate();
  const daewoon = computeDaewoon(p, chart.relItems, birthUtcForLuck, input.gender, options.daewoonRounding, timeKnown);
  const nowYear = DateTime.fromJSDate(now, { zone: timezone }).year;
  const startYear = options.startYear ?? nowYear;
  const nYears = Math.max(1, Math.min(15, options.years ?? 10));
  const curDw = daewoon.periods.find((d) => d.startDate <= now && now < d.endDate);

  // 7) 세운·월운 + 점수
  const ctx = { chart, gender: input.gender };
  const years: YearResult[] = [];
  for (let y = startYear; y < startYear + nYears; y++) {
    const seyun = computeSeyun(p, chart.relItems, daewoon, y);
    const wolun = computeWolunOfYear(p, chart.relItems, daewoon, y);
    const months: MonthResult[] = wolun.map((w) => {
      const sy = w.sajuYear === y ? seyun : computeSeyun(p, chart.relItems, daewoon, w.sajuYear);
      const dw = daewoon.periods.find((d) => d.ganzhi === w.daewoonGanzhi) ?? null;
      return { wolun: w, score: scoreMonth(ctx, w, sy, dw), startLocal: fmtLocal(w.startUtc), endLocal: fmtLocal(w.endUtc) };
    });
    const score = scoreYear(ctx, seyun, seyun.daewoon, months.filter((m) => m.wolun.sajuYear === y).map((m) => m.score.score));
    const notable = [...months].sort((a, b) => b.score.score - a.score.score).filter((m) => m.score.score >= 60).slice(0, 3).map((m) => m.wolun.month).sort((a, b) => a - b);
    years.push({ year: y, seyun, score, months, notableMonths: notable });
  }
  const topMonths = years
    .flatMap((y) => y.months.map((m) => ({ year: y.year, month: m.wolun.month, score: m.score.score, ganzhi: m.wolun.ganzhi, type: m.score.type })))
    .sort((a, b) => b.score - a.score || a.year - b.year || a.month - b.month)
    .slice(0, 15);

  // 8) 해석
  const profile = analyzeProfile(chart, input.gender);
  const pref = analyzePreferences(chart, input.gender);
  const summary = { timing: buildTimingSummary(years, now), style: buildStyleSummary(chart, input.gender) };
  const reading = buildReading(chart, input.gender);
  // E. 운의 시기적 작용 — 원국 분석 이후 보조적으로
  const sgGroup = input.gender === "male" ? "재성" : "관성";
  const starYears = years.filter((y) => TEN_GOD_GROUP[y.seyun.stemTenGod] === sgGroup || TEN_GOD_GROUP[y.seyun.branchTenGod] === sgGroup).map((y) => y.year);
  const palaceYears = years.flatMap((y) => {
    const r = y.seyun.relations.find((x) => x.involvesDayBranch && ["육합", "반합", "삼합", "방합", "충", "형", "자형", "파", "해"].includes(x.kind));
    return r ? [{ year: y.year, kind: r.kind === "자형" ? "형" : r.kind.replace(/^(육|반|삼|방)합$/, "합") }] : [];
  });
  const love = buildLoveAnalysis(chart, input.gender, { starYears, palaceYears, hasHour: Boolean(p.hour), nearest: summary.timing.nearest ? `${summary.timing.nearest.year}년 ${summary.timing.nearest.month}월` : null, bestYears: summary.timing.bestYears.map((b) => b.year) });

  const comparisons = comparePillarSettings(birth).map((r) => ({
    ziMode: r.ziMode, ziLabel: ZI_MODE_LABEL[r.ziMode], solarTime: r.solarTime, solarLabel: SOLAR_TIME_MODE_LABEL[r.solarTime], reckoning: r.reckoning,
    day: ganzhiText(r.day.stem, r.day.branch), hour: ganzhiText(r.hour.stem, r.hour.branch), ziKind: r.ziKind,
    selected: r.ziMode === options.ziMode && r.solarTime === options.solarTime,
  }));

  const resolved = pc.resolved;
  const settings = [
    { label: "입력 달력", value: input.calendar === "solar" ? "양력" : `음력${input.isLeapMonth ? " (윤달)" : " (평달)"}` },
    { label: "윤달 여부", value: input.calendar === "lunar" ? (input.isLeapMonth ? "윤달" : "평달") : lunar?.isLeapMonth ? "해당 일은 음력 윤달" : "해당 없음" },
    { label: "출생 지역", value: `${input.location.country} ${input.location.city} (위도 ${latitude.toFixed(4)}, 경도 ${longitude.toFixed(4)})` },
    { label: "시간대", value: `${timezone}${resolved ? ` · 출생 당시 UTC${fmtOffset(resolved.offsetMinutes)}${resolved.isDST ? " (서머타임)" : ""}` : ""}` },
    { label: "자시(子時) 처리", value: ZI_MODE_LABEL[options.ziMode] },
    { label: "태양시 보정", value: SOLAR_TIME_MODE_LABEL[options.solarTime] },
    { label: "절입 기준", value: "연주: 입춘 절입 시각 / 월주: 12절 절입 시각 (태양 겉보기 황경, astronomy-engine)" },
    { label: "대운 환산", value: `3일 = 1년, 대운수 ${options.daewoonRounding === "round" ? "반올림" : "버림"}` },
    { label: "지장간 기준", value: "월률분야(여기·중기·정기) 표준표" },
    { label: "십이운성 기준", value: "양간 순행·음간 역행(陽生陰死), 戊己는 丙丁과 동일(화토동법)" },
  ];

  // 해석 문장의 조사 '이(가)' 등을 받침에 맞게 정리 (계산값에는 영향 없음)
  return deepFixJosa<AnalysisResult>({
    meta: {
      engineVersion: ENGINE_VERSION, scoreVersion: SCORE_VERSION, scoreVersionNote: SCORE_VERSION_NOTE, generatedAt: now.toISOString(),
      disclaimer: "본 분석은 명리학의 상징 체계와 전통적 해석에 기반한 참고 자료이며, 미래를 확정하거나 실제 연애 성사 확률을 의미하지 않습니다.",
    },
    input, options, settings,
    conversion: { solar, lunar, note: convNote },
    time: {
      known: timeKnown,
      wallClock: timeKnown ? `${solar.year}-${String(solar.month).padStart(2, "0")}-${String(solar.day).padStart(2, "0")} ${String(input.hour).padStart(2, "0")}:${String(input.minute).padStart(2, "0")}` : null,
      utc: resolved ? resolved.utc.toISOString() : null,
      zoneOffset: resolved ? `UTC${fmtOffset(resolved.offsetMinutes)}` : null,
      isDST: resolved?.isDST ?? false,
      reckoning: pc.solar ? `${pc.solar.reckoning.year}-${String(pc.solar.reckoning.month).padStart(2, "0")}-${String(pc.solar.reckoning.day).padStart(2, "0")} ${String(pc.solar.reckoning.hour).padStart(2, "0")}:${String(pc.solar.reckoning.minute).padStart(2, "0")}:${String(Math.floor(pc.solar.reckoning.second)).padStart(2, "0")}` : null,
      correctionMinutes: pc.solar ? Math.round(pc.solar.correctionFromWallMinutes * 10) / 10 : null,
      equationOfTimeMinutes: pc.solar ? Math.round(pc.solar.equationOfTimeMinutes * 10) / 10 : null,
      longitudeCorrectionMinutes: pc.solar ? Math.round(pc.solar.longitudeCorrectionMinutes * 10) / 10 : null,
      ziKind: pc.dayHour?.ziKind ?? null,
      dayHourExplanation: pc.dayHour?.explanation ?? null,
      prevJie: pc.prevJie ? { name: pc.prevJie.name, local: fmtLocal(pc.prevJie.utc) } : null,
      nextJie: pc.nextJie ? { name: pc.nextJie.name, local: fmtLocal(pc.nextJie.utc) } : null,
    },
    pillars: p,
    pillarText: {
      year: ganzhiText(p.year.stem, p.year.branch), month: ganzhiText(p.month.stem, p.month.branch), day: ganzhiText(p.day.stem, p.day.branch),
      hour: p.hour ? ganzhiText(p.hour.stem, p.hour.branch) : null,
    },
    alternatives: pc.alternatives.map((a) => ({ description: a.description, year: ganzhiText(a.pillars.year.stem, a.pillars.year.branch), month: ganzhiText(a.pillars.month.stem, a.pillars.month.branch) })),
    comparisons,
    warnings: pc.warnings,
    chart,
    profile,
    preferences: pref.sections,
    appearanceFocus: pref.appearanceFocus,
    daewoon,
    currentDaewoonIndex: curDw ? curDw.index : null,
    years,
    topMonths,
    summary,
    reading,
    love,
  });
}

export function pillarLabelKo(stem: number, branch: number): string {
  return `${STEMS[stem]}${BRANCHES[branch]}(${ganzhiKo(stem, branch)})`;
}
