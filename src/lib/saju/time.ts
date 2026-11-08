/**
 * 출생 시각 → 절대 시각(UTC) 변환 및 태양시 보정.
 *
 * - 시간대: IANA Time Zone Database (luxon → ECMAScript Intl). 과거의 표준시 변경과 서머타임을
 *   출생 당시 기준으로 적용한다. (예: 한국 1954-03-21 ~ 1961-08-09 UTC+8:30, 1948~1951·1955~1960·1987~1988 서머타임)
 * - 지방평균태양시(LMT): UTC + 경도/15 시간. 경도 1°당 4분.
 * - 진태양시(apparent solar time): 태양의 실제 시각(時角) + 12h. astronomy-engine 의 HourAngle 로 계산하므로
 *   균시차(equation of time)가 자동 반영된다.
 */
import { DateTime } from "luxon";
import * as Astronomy from "astronomy-engine";

export type SolarTimeMode = "standard" | "lmt" | "apparent";

export interface NaiveDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export interface ResolvedBirthTime {
  utc: Date;
  /** 출생 당시 해당 시간대의 UTC 오프셋(분), 서머타임 포함 */
  offsetMinutes: number;
  /** 출생 당시 서머타임 여부 */
  isDST: boolean;
  /** 서머타임 차감 후 표준시 오프셋(분) */
  standardOffsetMinutes: number;
  zoneAbbr: string;
  warnings: string[];
}

const MS_MIN = 60_000;

export function naiveFromMs(ms: number): NaiveDateTime {
  const d = new Date(ms);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds() + d.getUTCMilliseconds() / 1000,
  };
}
export function naiveToMs(n: NaiveDateTime): number {
  return Date.UTC(n.year, n.month - 1, n.day, n.hour, n.minute, 0) + n.second * 1000;
}
export function formatNaive(n: NaiveDateTime, withSeconds = false): string {
  const p = (x: number) => String(Math.floor(x)).padStart(2, "0");
  return `${n.year}-${p(n.month)}-${p(n.day)} ${p(n.hour)}:${p(n.minute)}${withSeconds ? ":" + p(n.second) : ""}`;
}

function zoneOffsetAt(ms: number, zone: string): number {
  return DateTime.fromMillis(ms, { zone }).offset;
}

function dstInfo(ms: number, zone: string): { isDST: boolean; standardOffset: number } {
  const offset = zoneOffsetAt(ms, zone);
  let name = "";
  try {
    name = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "long" })
      .formatToParts(new Date(ms))
      .find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    name = "";
  }
  const half = 182 * 24 * 60 * MS_MIN;
  const before = zoneOffsetAt(ms - half, zone);
  const after = zoneOffsetAt(ms + half, zone);
  let isDST: boolean;
  if (/daylight|summer/i.test(name)) isDST = true;
  else if (/standard/i.test(name)) isDST = false;
  else isDST = offset > before && offset > after; // 이름으로 판별할 수 없는 과거 시간대: 앞뒤 6개월보다 큰 오프셋이면 서머타임
  const standardOffset = isDST ? Math.min(before, after, offset) : offset;
  return { isDST, standardOffset: isDST && standardOffset === offset ? offset - 60 : standardOffset };
}

/** 현지 벽시계 시각(출생 당시 시간대 기준)을 절대 시각으로 변환 */
export function resolveLocalBirthTime(n: NaiveDateTime, zone: string): ResolvedBirthTime {
  const warnings: string[] = [];
  const dt = DateTime.fromObject(
    { year: n.year, month: n.month, day: n.day, hour: n.hour, minute: n.minute, second: Math.floor(n.second) },
    { zone },
  );
  if (!dt.isValid) throw new Error(`시간대 변환 실패: ${dt.invalidExplanation ?? zone}`);

  // 존재하지 않는 시각(서머타임 시작 시 건너뛴 시각) 감지
  if (dt.hour !== n.hour || dt.minute !== n.minute || dt.day !== n.day) {
    warnings.push(
      `입력한 ${formatNaive(n)}은(는) 해당 지역에서 서머타임/표준시 변경으로 존재하지 않는 시각입니다. ${dt.toFormat("yyyy-MM-dd HH:mm")}(으)로 해석했습니다.`,
    );
  }
  // 중복 시각(서머타임 종료 시 반복된 시각) 감지
  const wallMs = naiveToMs(n);
  const candidates = new Set<number>();
  for (const probe of [-180, 0, 180]) {
    const off = zoneOffsetAt(wallMs - dt.offset * MS_MIN + probe * MS_MIN, zone);
    const utc = wallMs - off * MS_MIN;
    if (zoneOffsetAt(utc, zone) === off) candidates.add(utc);
  }
  if (candidates.size > 1) {
    warnings.push(
      `입력한 ${formatNaive(n)}은(는) 서머타임 종료로 두 번 존재하는 시각입니다. 더 이른 시각(서머타임 기준)으로 계산했습니다.`,
    );
  }
  const utcMs = candidates.size > 1 ? Math.min(...candidates) : dt.toMillis();
  const { isDST, standardOffset } = dstInfo(utcMs, zone);
  const offsetMinutes = zoneOffsetAt(utcMs, zone);
  return {
    utc: new Date(utcMs),
    offsetMinutes,
    isDST,
    standardOffsetMinutes: standardOffset,
    zoneAbbr: DateTime.fromMillis(utcMs, { zone }).toFormat("ZZZZ"),
    warnings,
  };
}

/** 균시차(분) = 진태양시 − 지방평균태양시 */
export function equationOfTimeMinutes(utc: Date, longitude: number, latitude = 37.5): number {
  const observer = new Astronomy.Observer(latitude, longitude, 0);
  const ha = Astronomy.HourAngle(Astronomy.Body.Sun, utc, observer); // 0..24 시
  const apparentHours = (ha + 12) % 24;
  const lmtMs = utc.getTime() + (longitude / 15) * 3600_000;
  const lmt = new Date(lmtMs);
  const lmtHours = lmt.getUTCHours() + lmt.getUTCMinutes() / 60 + lmt.getUTCSeconds() / 3600 + lmt.getUTCMilliseconds() / 3600_000;
  let diff = apparentHours - lmtHours;
  if (diff > 12) diff -= 24;
  if (diff < -12) diff += 24;
  return diff * 60;
}

export interface SolarTimeResult {
  mode: SolarTimeMode;
  /** 사주의 일주·시주 판정에 사용하는 현지 시각 */
  reckoning: NaiveDateTime;
  /** 벽시계 시각 대비 보정량(분, + 이면 늦춰짐) */
  correctionFromWallMinutes: number;
  /** 표준시(서머타임 제외) 대비 보정량(분) */
  correctionFromStandardMinutes: number;
  equationOfTimeMinutes: number;
  longitudeCorrectionMinutes: number;
}

/** 모드별로 일주·시주 판정 시각을 계산 */
export function reckoningTime(
  utc: Date,
  resolved: ResolvedBirthTime,
  longitude: number,
  latitude: number,
  mode: SolarTimeMode,
): SolarTimeResult {
  const utcMs = utc.getTime();
  const wallMs = utcMs + resolved.offsetMinutes * MS_MIN;
  const standardMs = utcMs + resolved.standardOffsetMinutes * MS_MIN;
  const lmtMs = utcMs + (longitude / 15) * 3600_000;
  const eot = equationOfTimeMinutes(utc, longitude, latitude);
  const apparentMs = lmtMs + eot * MS_MIN;
  const target = mode === "standard" ? standardMs : mode === "lmt" ? lmtMs : apparentMs;
  return {
    mode,
    reckoning: naiveFromMs(target),
    correctionFromWallMinutes: (target - wallMs) / MS_MIN,
    correctionFromStandardMinutes: (target - standardMs) / MS_MIN,
    equationOfTimeMinutes: eot,
    longitudeCorrectionMinutes: (lmtMs - standardMs) / MS_MIN,
  };
}

export const SOLAR_TIME_MODE_LABEL: Record<SolarTimeMode, string> = {
  standard: "표준시 기준 (서머타임 제외)",
  lmt: "지방평균태양시 (경도 보정)",
  apparent: "진태양시 (경도 보정 + 균시차)",
};
