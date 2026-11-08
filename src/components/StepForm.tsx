"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CITIES, COUNTRIES } from "@/lib/geo/cities";
import { Notice } from "./ui";

export interface FormState {
  name: string;
  gender: "male" | "female" | "";
  calendar: "solar" | "lunar";
  year: string;
  month: string;
  day: string;
  isLeapMonth: boolean;
  timeUnknown: boolean;
  hour: string;
  minute: string;
  country: string;
  cityId: string;
  custom: boolean;
  customName: string;
  latitude: string;
  longitude: string;
  timezone: string;
}

export interface OptionState {
  ziMode: "zi-change" | "midnight-yajasi" | "midnight-simple";
  solarTime: "standard" | "lmt" | "apparent";
  daewoonRounding: "round" | "floor";
}

export const DEFAULT_FORM: FormState = {
  name: "", gender: "", calendar: "solar", year: "", month: "", day: "", isLeapMonth: false, timeUnknown: false, hour: "", minute: "0",
  country: "대한민국", cityId: "kr-seoul", custom: false, customName: "", latitude: "", longitude: "", timezone: "Asia/Seoul",
};
export const DEFAULT_OPTIONS: OptionState = { ziMode: "zi-change", solarTime: "lmt", daewoonRounding: "round" };
export const TOTAL_STEPS = 4;

/** 서버 요청 본문 — 이름은 보내지 않는다(화면 표시용) */
export function toRequest(f: FormState, o: OptionState) {
  const city = CITIES.find((c) => c.id === f.cityId);
  const location = f.custom
    ? { country: f.country || "직접 입력", city: f.customName || "직접 입력", latitude: Number(f.latitude), longitude: Number(f.longitude), timezone: f.timezone }
    : { country: city?.country ?? "", city: city?.name ?? "", latitude: city?.latitude ?? NaN, longitude: city?.longitude ?? NaN, timezone: city?.timezone ?? "" };
  return {
    input: {
      gender: f.gender, calendar: f.calendar, year: Number(f.year), month: Number(f.month), day: Number(f.day),
      isLeapMonth: f.calendar === "lunar" && f.isLeapMonth,
      hour: f.timeUnknown ? null : Number(f.hour), minute: f.timeUnknown ? null : Number(f.minute || 0),
      location,
    },
    options: o,
  };
}

/** 단계별 입력 검증 — 통과하면 null, 아니면 안내 문구 */
export function validateStep(step: number, f: FormState): string | null {
  if (step === 1) {
    if (f.name.length > 20) return "이름은 20자 이내로 적어 주세요.";
    if (!f.gender) return "성별을 선택해 주세요. 이성을 보는 기준과 대운의 방향을 정하는 데 필요해요.";
  }
  if (step === 2) {
    if (!f.year || !f.month || !f.day) return "태어난 연도·월·일을 모두 선택해 주세요.";
    if (f.calendar === "solar") {
      const y = Number(f.year), m = Number(f.month), d = Number(f.day);
      const t = new Date(Date.UTC(y, m - 1, d));
      if (t.getUTCMonth() !== m - 1) return `${y}년 ${m}월에는 ${d}일이 없어요. 날짜를 다시 확인해 주세요.`;
    }
  }
  if (step === 3) {
    if (!f.timeUnknown && f.hour === "") return "태어난 시간을 선택하거나, 모르면 '모름'을 눌러 주세요.";
  }
  if (step === 4) {
    if (f.custom) {
      const lat = Number(f.latitude), lon = Number(f.longitude);
      if (f.latitude === "" || f.longitude === "") return "위도와 경도를 입력해 주세요. 잘 모르면 목록에서 가까운 도시를 고르세요.";
      if (!(lat >= -90 && lat <= 90) || !(lon >= -180 && lon <= 180)) return "위도는 -90~90, 경도는 -180~180 사이 숫자로 입력해 주세요.";
    }
  }
  return null;
}

const field = "w-full rounded-xl border border-line bg-sheet px-3 py-3 text-base text-ink focus:border-brand focus:outline-none";

function Choice<T extends string>({ value, onChange, options, name }: { value: T | ""; onChange: (v: T) => void; options: Array<[T, string, string?]>; name: string }) {
  return (
    <div role="radiogroup" aria-label={name} className="grid grid-flow-col gap-2">
      {options.map(([v, t, d]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`rounded-xl border px-3 py-3.5 text-base font-medium transition ${value === v ? "border-brand bg-brand text-white" : "border-line bg-sheet text-ink hover:border-brand-2"}`}
        >
          {t}
          {d && <span className={`mt-0.5 block text-xs font-normal ${value === v ? "text-white/75" : "text-sub"}`}>{d}</span>}
        </button>
      ))}
    </div>
  );
}

function Question({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="fade-up grid gap-3">
      <div>
        <h2 className="font-serif text-2xl font-bold leading-snug text-brand">{title}</h2>
        {hint && <p className="mt-1 text-sm text-sub">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export default function StepForm({
  step, setStep, form, setForm, options, setOptions, onSubmit, serverError, onExit,
}: {
  step: number;
  setStep: (n: number) => void;
  form: FormState;
  setForm: (f: FormState) => void;
  options: OptionState;
  setOptions: (o: OptionState) => void;
  onSubmit: () => void;
  serverError: string | null;
  onExit: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setError(null);
    setForm({ ...form, [k]: v });
  };
  const cities = useMemo(() => CITIES.filter((c) => c.country === form.country), [form.country]);
  const years = useMemo(() => Array.from({ length: 151 }, (_, i) => 2050 - i), []);
  const tzList = useMemo(() => {
    try {
      return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone");
    } catch {
      return Array.from(new Set(CITIES.map((c) => c.timezone)));
    }
  }, []);
  const headingRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setError(null);
    headingRef.current?.focus();
  }, [step]);
  useEffect(() => {
    if (serverError) setError(serverError);
  }, [serverError]);

  const next = () => {
    const msg = validateStep(step, form);
    if (msg) return setError(msg);
    if (step < TOTAL_STEPS) setStep(step + 1);
    else onSubmit();
  };
  const prev = () => (step > 1 ? setStep(step - 1) : onExit());

  return (
    <form
      className="mx-auto grid w-full max-w-md gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
      noValidate
    >
      <div ref={headingRef} tabIndex={-1} className="outline-none">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-brand">{step} / {TOTAL_STEPS}</span>
          <span className="text-sub">{["", "기본 정보", "생년월일", "태어난 시간", "태어난 곳"][step]}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL_STEPS} aria-valuenow={step} aria-label="입력 진행도">
          <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>
      </div>

      {step === 1 && (
        <div className="grid gap-7">
          <Question title="어떻게 불러 드릴까요?" hint="선택 사항이에요. 결과 화면과 이미지 카드에만 쓰이고 서버로 보내지 않아요.">
            <input className={field} placeholder="이름 또는 닉네임 (선택)" value={form.name} maxLength={20} onChange={(e) => set("name", e.target.value)} autoComplete="nickname" />
          </Question>
          <Question title="성별을 알려 주세요" hint="이성을 뜻하는 '배우자 별'과 대운의 방향을 정하는 데 쓰여요.">
            <Choice name="성별" value={form.gender} onChange={(v) => set("gender", v)} options={[["female", "여성"], ["male", "남성"]]} />
          </Question>
        </div>
      )}

      {step === 2 && (
        <Question title="언제 태어났나요?" hint="1900~2050년을 지원해요.">
          <Choice name="달력" value={form.calendar} onChange={(v) => setForm({ ...form, calendar: v, isLeapMonth: false })} options={[["solar", "양력"], ["lunar", "음력"]]} />
          {form.calendar === "lunar" && (
            <Choice name="평달/윤달" value={form.isLeapMonth ? "leap" : "normal"} onChange={(v) => set("isLeapMonth", v === "leap")} options={[["normal", "평달", "보통의 달"], ["leap", "윤달", "같은 달이 한 번 더"]]} />
          )}
          <div className="grid grid-cols-[1.35fr_1fr_1fr] gap-2">
            <select aria-label="연도" className={field} value={form.year} onChange={(e) => set("year", e.target.value)}>
              <option value="">연도</option>
              {years.map((y) => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select aria-label="월" className={field} value={form.month} onChange={(e) => set("month", e.target.value)}>
              <option value="">월</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}월</option>)}
            </select>
            <select aria-label="일" className={field} value={form.day} onChange={(e) => set("day", e.target.value)}>
              <option value="">일</option>
              {Array.from({ length: form.calendar === "lunar" ? 30 : 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}일</option>)}
            </select>
          </div>
        </Question>
      )}

      {step === 3 && (
        <Question title="태어난 시간을 알려 주세요" hint="몰라도 괜찮아요. 시주(태어난 시간의 기둥)만 빼고 분석해요.">
          <div className="grid grid-cols-2 gap-2">
            <select aria-label="시" className={field} value={form.timeUnknown ? "" : form.hour} disabled={form.timeUnknown} onChange={(e) => setForm({ ...form, hour: e.target.value, timeUnknown: false })}>
              <option value="">시</option>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}시</option>)}
            </select>
            <select aria-label="분" className={field} value={form.minute} disabled={form.timeUnknown} onChange={(e) => set("minute", e.target.value)}>
              {Array.from({ length: 60 }, (_, m) => <option key={m} value={m}>{String(m).padStart(2, "0")}분</option>)}
            </select>
          </div>
          <button
            type="button"
            aria-pressed={form.timeUnknown}
            onClick={() => setForm({ ...form, timeUnknown: !form.timeUnknown, hour: "" })}
            className={`rounded-xl border px-3 py-3 text-base font-medium ${form.timeUnknown ? "border-brand bg-brand text-white" : "border-line bg-sheet text-ink"}`}
          >
            {form.timeUnknown ? "✓ 태어난 시간을 몰라요" : "태어난 시간을 몰라요"}
          </button>
          {form.timeUnknown && (
            <Notice>시간을 모르면 시주를 추정하지 않고 연·월·일주로만 분석해요. 시주와 관련된 해석(미래·자녀 자리 등)은 제한되고, 일부 정확도가 낮아질 수 있어요.</Notice>
          )}
        </Question>
      )}

      {step === 4 && (
        <Question title="어디에서 태어났나요?" hint="태어난 곳의 경도로 실제 태양 시각을 보정해요. 잘 모르면 그대로 두세요.">
          <div className="grid gap-2 sm:grid-cols-2">
            <select aria-label="국가" className={field} value={form.custom ? "__custom" : form.country}
              onChange={(e) => {
                setError(null);
                if (e.target.value === "__custom") return setForm({ ...form, custom: true });
                const first = CITIES.find((c) => c.country === e.target.value);
                setForm({ ...form, custom: false, country: e.target.value, cityId: first?.id ?? "", timezone: first?.timezone ?? form.timezone });
              }}>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__custom">목록에 없음 (직접 입력)</option>
            </select>
            {!form.custom && (
              <select aria-label="도시" className={field} value={form.cityId} onChange={(e) => set("cityId", e.target.value)}>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          {form.custom && (
            <div className="grid gap-2 sm:grid-cols-2">
              <input className={field} placeholder="지역 이름" value={form.customName} onChange={(e) => set("customName", e.target.value)} />
              <select aria-label="시간대" className={field} value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
                {tzList.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className={field} inputMode="decimal" placeholder="위도 (예: 37.5665)" value={form.latitude} onChange={(e) => set("latitude", e.target.value)} />
              <input className={field} inputMode="decimal" placeholder="경도 (예: 126.978)" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} />
            </div>
          )}
          <details className="rounded-xl border border-line bg-sheet">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-brand-2">계산 기준 바꾸기 (잘 모르면 그대로)</summary>
            <div className="grid gap-5 border-t border-line px-4 py-4 text-sm"><OptionsFields options={options} setOptions={setOptions} /></div>
          </details>
        </Question>
      )}

      {error && <p role="alert" className="rounded-xl border border-[#EBB8B0] bg-[#F7E0DC] px-4 py-3 text-sm font-medium text-[#97291E]">{error}</p>}

      <div className="grid grid-cols-[auto_1fr] gap-2">
        <button type="button" onClick={prev} className="rounded-xl border border-line bg-sheet px-5 py-3.5 text-base font-medium text-ink hover:border-brand-2">
          {step === 1 ? "처음으로" : "이전"}
        </button>
        <button type="submit" className="rounded-xl bg-brand px-5 py-3.5 text-base font-bold text-white hover:bg-brand-2">
          {step === TOTAL_STEPS ? "결과 보기" : "다음"}
        </button>
      </div>
    </form>
  );
}

export function OptionsFields({ options, setOptions }: { options: OptionState; setOptions: (o: OptionState) => void }) {
  const radio = <K extends keyof OptionState>(k: K, v: OptionState[K], title: string, desc: string, isDefault?: boolean) => (
    <label key={String(v)} className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${options[k] === v ? "border-brand bg-card" : "border-line"}`}>
      <input type="radio" className="mt-1 accent-[#C2386A]" checked={options[k] === v} onChange={() => setOptions({ ...options, [k]: v })} />
      <span>
        <span className="font-semibold text-ink">{title}{isDefault && <span className="ml-1.5 text-xs font-normal text-brand-2">(기본)</span>}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-sub">{desc}</span>
      </span>
    </label>
  );
  return (
    <>
      <fieldset className="grid gap-2">
        <legend className="mb-1 font-semibold">밤 11시~새벽 1시(자시) 출생자의 날짜 기준</legend>
        {radio("ziMode", "zi-change", "밤 11시부터 다음 날", "자시를 하루의 시작으로 보는 전통 방식이에요.", true)}
        {radio("ziMode", "midnight-yajasi", "자정 기준 + 야자시", "23시대는 당일 일주, 시주는 다음 날 기준으로 봐요.")}
        {radio("ziMode", "midnight-simple", "자정 기준 단순 적용", "23시대도 당일 기준으로 봐요.")}
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="mb-1 font-semibold">시간 보정</legend>
        {radio("solarTime", "lmt", "경도 보정 (지방평균태양시)", "태어난 곳의 경도만큼 시간을 보정해요. 서울은 약 32분 늦춰져요.", true)}
        {radio("solarTime", "apparent", "진태양시", "경도 보정에 계절별 태양 시각 차이(균시차)까지 반영해요.")}
        {radio("solarTime", "standard", "보정 없음 (표준시)", "시계 시각 그대로 사용해요(서머타임은 제외).")}
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="mb-1 font-semibold">대운수 표기</legend>
        {radio("daewoonRounding", "round", "반올림", "3일=1년 환산값을 반올림해요.", true)}
        {radio("daewoonRounding", "floor", "버림", "환산값의 정수 부분만 써요.")}
      </fieldset>
    </>
  );
}
