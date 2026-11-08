import type { AnalysisOptions, BirthInput } from "./analyze";
import { InputError } from "./analyze";

const ZI = new Set(["zi-change", "midnight-yajasi", "midnight-simple"]);
const SOLAR = new Set(["standard", "lmt", "apparent"]);

function num(v: unknown, name: string): number {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) throw new InputError(`${name} 값이 올바르지 않습니다.`);
  return n;
}

/** 요청 본문을 엄격하게 검증해 BirthInput/AnalysisOptions 로 변환 */
export function parseRequest(body: unknown): { input: BirthInput; options: AnalysisOptions } {
  if (!body || typeof body !== "object") throw new InputError("요청 형식이 올바르지 않습니다.");
  const b = body as Record<string, unknown>;
  const i = (b.input ?? {}) as Record<string, unknown>;
  const o = (b.options ?? {}) as Record<string, unknown>;
  const loc = (i.location ?? {}) as Record<string, unknown>;
  const timeUnknown = i.hour === null || i.hour === undefined || i.hour === "";
  const input: BirthInput = {
    gender: i.gender === "female" ? "female" : i.gender === "male" ? "male" : (() => { throw new InputError("성별을 선택해 주세요."); })(),
    calendar: i.calendar === "lunar" ? "lunar" : "solar",
    year: Math.trunc(num(i.year, "연도")),
    month: Math.trunc(num(i.month, "월")),
    day: Math.trunc(num(i.day, "일")),
    isLeapMonth: Boolean(i.isLeapMonth),
    hour: timeUnknown ? null : Math.trunc(num(i.hour, "시")),
    minute: timeUnknown ? null : Math.trunc(num(i.minute ?? 0, "분")),
    location: {
      country: String(loc.country ?? "").slice(0, 60),
      city: String(loc.city ?? "").slice(0, 60),
      latitude: num(loc.latitude, "위도"),
      longitude: num(loc.longitude, "경도"),
      timezone: String(loc.timezone ?? "").slice(0, 64),
    },
  };
  const options: AnalysisOptions = {
    ziMode: ZI.has(String(o.ziMode)) ? (o.ziMode as AnalysisOptions["ziMode"]) : "zi-change",
    solarTime: SOLAR.has(String(o.solarTime)) ? (o.solarTime as AnalysisOptions["solarTime"]) : "lmt",
    daewoonRounding: o.daewoonRounding === "floor" ? "floor" : "round",
    years: 10,
  };
  return { input, options };
}
