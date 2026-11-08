"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import StepForm, { DEFAULT_FORM, DEFAULT_OPTIONS, FormState, OptionState, toRequest } from "@/components/StepForm";
import Loading from "@/components/Loading";
import { ElementChart, PillarBoard } from "@/components/PillarBoard";
import { BeginnerGuide, LoveCard, PersonalityCard } from "@/components/ReadingCards";
import Timeline from "@/components/Timeline";
import ShareCard from "@/components/ShareCard";
import ExpertView from "@/components/ExpertView";
import PromptPanel from "@/components/PromptPanel";
import HistoryList from "@/components/HistoryList";
import { HEART_PATH } from "@/components/FloatingHearts";
import type { AnalysisDTO } from "@/lib/serialize";
import { HistoryEntry, clearHistory, loadHistory, removeHistory, saveHistory } from "@/lib/history";
import { CITIES } from "@/lib/geo/cities";

type Stage = "landing" | "input" | "loading" | "result" | "history";
type Req = ReturnType<typeof toRequest>;

/** 기록의 요청 본문을 입력 폼 상태로 되돌린다(‘정보 수정’용) */
function formFromRequest(req: Req, name: string): FormState {
  const i = req.input;
  const loc = i.location;
  const city = CITIES.find((c) => c.name === loc.city && Math.abs(c.latitude - loc.latitude) < 1e-6 && Math.abs(c.longitude - loc.longitude) < 1e-6);
  return {
    name, gender: i.gender as FormState["gender"], calendar: i.calendar as FormState["calendar"], year: String(i.year), month: String(i.month), day: String(i.day),
    isLeapMonth: Boolean(i.isLeapMonth), timeUnknown: i.hour === null, hour: i.hour === null ? "" : String(i.hour), minute: i.minute === null ? "0" : String(i.minute),
    country: city ? city.country : loc.country, cityId: city ? city.id : "", custom: !city, customName: loc.city,
    latitude: String(loc.latitude), longitude: String(loc.longitude), timezone: loc.timezone,
  };
}
const MIN_LOADING_MS = 1500;

function Mark({ size = 40, beat = false }: { size?: number; beat?: boolean }) {
  // 핑크 하트 로고 (첫 화면에서는 두근두근 뛴다)
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={beat ? "heartbeat" : ""}>
      <defs>
        <linearGradient id={`hg-${size}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F07AA3" />
          <stop offset="1" stopColor="#C2386A" />
        </linearGradient>
      </defs>
      <path d={HEART_PATH} fill={`url(#hg-${size})`} />
      <path d="M7.2 8.2c.6-1 1.6-1.4 2.5-1.3" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function errorStep(msg: string): number {
  if (/음력|윤|날짜|생년|연도|양력/.test(msg)) return 2;
  if (/시각|시간/.test(msg) && !/시간대/.test(msg)) return 3;
  if (/위도|경도|시간대|지역/.test(msg)) return 4;
  if (/성별/.test(msg)) return 1;
  return 4;
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("landing");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [options, setOptions] = useState<OptionState>(DEFAULT_OPTIONS);
  const [result, setResult] = useState<AnalysisDTO | null>(null);
  const [lastRequest, setLastRequest] = useState<Req | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [conditions, setConditions] = useState("");
  const [sel, setSel] = useState<{ year: number; month: number | null }>({ year: 0, month: null });
  const resultRef = useRef<AnalysisDTO | null>(null);
  resultRef.current = result;

  // 브라우저 뒤로가기로 이전 단계 이동 — URL 해시(#input-2 등)로 기록한다.
  // (Next.js 라우터는 자신이 만들지 않은 history.state 로 뒤로가기가 일어나면 페이지를 새로고침하므로 pushState 대신 해시를 쓴다)
  const hashOf = (s: Stage, n: number) => (s === "input" ? `#input-${n}` : s === "result" ? "#result" : s === "history" ? "#history" : "#start");
  const go = useCallback((s: Stage, n = 1, replace = false) => {
    setStage(s);
    setStep(n);
    const h = hashOf(s, n);
    if (replace) location.replace(h);
    else if (location.hash !== h) location.hash = h;
    window.scrollTo({ top: 0 });
  }, []);
  useEffect(() => {
    const apply = () => {
      const m = location.hash.match(/^#(input)-(\d)$|^#(result)$|^#(history)$/);
      if (m?.[1]) {
        setStage("input");
        setStep(Math.min(4, Math.max(1, Number(m[2]))));
      } else if (m?.[3] && resultRef.current) setStage("result");
      else if (m?.[4]) {
        setHistory(loadHistory());
        setStage("history");
      } else setStage("landing");
      window.scrollTo({ top: 0 });
    };
    if (location.hash === "#result") location.replace("#start"); // 새로고침 시 결과 데이터가 없으므로
    setHistory(loadHistory());
    apply();
    window.addEventListener("hashchange", apply);
    fetch("/api/config").then((r) => r.json()).then((c) => setAiAvailable(Boolean(c.aiAvailable))).catch(() => setAiAvailable(false));
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const submit = () => run(toRequest(form, options), form.name);

  /** 계산 요청 → 결과 표시 → 기록 저장. 기록에서 다시 열 때도 같은 경로를 쓴다(결과는 항상 다시 계산). */
  const run = async (req: Req, name: string) => {
    setServerError(null);
    setStage("loading");
    window.scrollTo({ top: 0 });
    const started = Date.now();
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) });
      const raw = await res.text();
      let j;
      try {
        j = JSON.parse(raw);
      } catch {
        // 호스팅 오류 페이지 등 JSON이 아닌 응답 — 원인 파악을 위해 상태 코드를 함께 보여 준다
        setServerError(`서버 응답을 읽지 못했어요 (오류 코드 ${res.status}). 잠시 후 다시 시도해 주세요.`);
        go("input", 4, true);
        return;
      }
      const wait = Math.max(0, MIN_LOADING_MS - (Date.now() - started));
      await new Promise((r) => setTimeout(r, wait));
      if (!res.ok) {
        const msg = j.error ?? "계산에 실패했어요. 입력을 다시 확인해 주세요.";
        setServerError(msg);
        go("input", errorStep(msg), true);
        return;
      }
      const dto = j as AnalysisDTO;
      resultRef.current = dto; // hashchange 처리 시점에 결과가 있음을 보장
      setResult(dto);
      setLastRequest(req);
      const near = dto.summary.timing.nearest;
      const thisYear = new Date().getFullYear();
      setSel(near && near.year === thisYear ? { year: near.year, month: near.month } : { year: dto.years.find((y) => y.year === thisYear)?.year ?? dto.years[0].year, month: null });
      const i = dto.input;
      const saved = saveHistory({
        name,
        request: req as unknown as HistoryEntry["request"],
        birth: `${i.calendar === "solar" ? "양력" : `음력${i.isLeapMonth ? "(윤)" : ""}`} ${i.year}.${i.month}.${i.day}${i.hour !== null ? ` ${String(i.hour).padStart(2, "0")}:${String(i.minute).padStart(2, "0")}` : " 시간 모름"} · ${i.gender === "male" ? "남성" : "여성"} · ${i.location.city}`,
        pillars: [dto.pillarText.year, dto.pillarText.month, dto.pillarText.day, dto.pillarText.hour ?? "□□"].join(" "),
        nearest: near ? `${near.year}년 ${near.month}월` : null,
      });
      setSavedId(saved?.id ?? null);
      setHistory(loadHistory());
      go("result", 1);
    } catch {
      setServerError("서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.");
      go("input", 4, true);
    }
  };

  const openHistory = (e: HistoryEntry) => {
    const req = e.request as unknown as Req;
    setForm(formFromRequest(req, e.name));
    setOptions({ ...DEFAULT_OPTIONS, ...(req.options as Partial<OptionState>) });
    run(req, e.name);
  };
  const deleteHistory = (e: HistoryEntry) => {
    if (!confirm(`'${e.name || "이름 없음"}' 기록을 삭제할까요?`)) return;
    setHistory(removeHistory(e.id));
    if (savedId === e.id) setSavedId(null);
  };
  const clearAll = () => {
    if (!confirm("기록을 모두 삭제할까요? 되돌릴 수 없어요.")) return;
    clearHistory();
    setHistory([]);
    setSavedId(null);
  };

  const restart = () => {
    setResult(null);
    setForm(DEFAULT_FORM);
    setOptions(DEFAULT_OPTIONS);
    setConditions("");
    setServerError(null);
    go("landing", 1);
  };

  return (
    <div className="min-h-screen">
      {stage !== "landing" && (
        <header className="no-print sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-2.5">
            <button type="button" onClick={restart} className="flex items-center gap-2" aria-label="처음 화면으로">
              <Mark size={28} />
              <span className={`font-serif text-base font-bold text-brand ${stage === "result" ? "hidden sm:inline" : ""}`}>두근두근 인연 해 계산기</span>
            </button>
            <div className="flex gap-1.5">
              {stage === "result" && (
                <button type="button" onClick={() => go("input", 1)} className="whitespace-nowrap rounded-lg border border-line bg-sheet px-3 py-1.5 text-sm text-brand">정보 수정</button>
              )}
              {stage !== "history" && stage !== "loading" && (
                <button type="button" onClick={() => go("history")} className="whitespace-nowrap rounded-lg border border-line bg-sheet px-3 py-1.5 text-sm text-brand">
                  내 기록{history.length ? ` ${history.length}` : ""}
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {stage === "landing" && (
        <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
          <div className="fade-up flex flex-col items-center">
            <Mark size={72} beat />
            <h1 className="mt-6 font-serif text-4xl font-extrabold leading-tight tracking-tight text-brand sm:text-5xl">두근두근<br />인연 해 계산기</h1>
            <p className="mt-2 text-xs font-semibold tracking-[0.2em] text-sub">DUGEUN DUGEUN LOVE CALCULATOR</p>
            <p className="mt-8 text-lg leading-relaxed text-ink">생년월일시로 읽는 나의 기질과 인연이 찾아오는 시기</p>
            <button type="button" onClick={() => go("input", 1)} className="mt-10 rounded-full bg-brand px-10 py-4 text-lg font-bold text-white shadow-sm transition hover:bg-brand-2">
              내 사주 보기
            </button>
            {history.length > 0 && (
              <button type="button" onClick={() => go("history")} className="mt-4 rounded-full border border-line bg-sheet px-6 py-2.5 text-sm font-semibold text-brand hover:border-brand">
                내 기록 보기 ({history.length})
              </button>
            )}
            <p className="mt-6 text-xs text-sub">로그인 없이, 1분이면 충분해요</p>
          </div>
        </main>
      )}

      {stage === "history" && (
        <main className="mx-auto max-w-2xl px-4 py-10">
          <HistoryList items={history} onOpen={openHistory} onDelete={deleteHistory} onClear={clearAll} onNew={() => { setForm(DEFAULT_FORM); setOptions(DEFAULT_OPTIONS); go("input", 1); }} />
        </main>
      )}

      {stage === "input" && (
        <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
          <StepForm
            step={step}
            setStep={(n) => {
              setServerError(null);
              go("input", n);
            }}
            form={form}
            setForm={setForm}
            options={options}
            setOptions={setOptions}
            onSubmit={submit}
            serverError={serverError}
            onExit={() => go("landing", 1)}
          />
        </main>
      )}

      {stage === "loading" && (
        <main className="mx-auto max-w-2xl px-4">
          <Loading />
        </main>
      )}

      {stage === "result" && result && lastRequest && (
        <main className="mx-auto grid max-w-2xl gap-5 px-4 py-6 sm:py-8">
          <section className="fade-up rounded-2xl border border-line bg-sheet/95 p-5 sm:p-6">
            <p className="text-sm text-sub">
              {result.input.calendar === "solar" ? "양력" : `음력${result.input.isLeapMonth ? "(윤달)" : ""}`} {result.input.year}.{result.input.month}.{result.input.day}
              {result.time.known ? ` ${String(result.input.hour).padStart(2, "0")}:${String(result.input.minute).padStart(2, "0")}` : " · 시간 모름"} · {result.input.gender === "male" ? "남성" : "여성"} · {result.input.location.city}
            </p>
            <h1 className="mt-1 font-serif text-3xl font-extrabold text-brand">{form.name ? `${form.name}님의 사주` : "나의 사주"}</h1>
            {result.summary.timing.nearest && (
              <button type="button" onClick={() => document.getElementById("timeline")?.scrollIntoView({ behavior: "smooth" })} className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl bg-brand px-4 py-3 text-left text-white">
                <span>
                  <span className="block text-xs text-white/70">인연이 찾아올 가장 빠른 시기</span>
                  <span className="font-serif text-xl font-bold">{result.summary.timing.nearest.year}년 {result.summary.timing.nearest.month}월</span>
                  {result.summary.timing.nearest.nature && <span className="mt-0.5 block text-xs text-white/85">{result.summary.timing.nearest.nature.label}</span>}
                </span>
                <span className="text-sm text-white/80">월별 흐름 →</span>
              </button>
            )}
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-sub">
              {savedId ? (
                <>
                  <span>✓ 내 기록에 저장했어요 (이 기기에만 보관)</span>
                  <button type="button" onClick={() => go("history")} className="font-medium text-brand-2 underline-offset-2 hover:underline">기록 보기</button>
                  <button type="button" onClick={() => { setHistory(removeHistory(savedId)); setSavedId(null); }} className="font-medium text-[#97291E] underline-offset-2 hover:underline">기록에서 지우기</button>
                </>
              ) : (
                <span>이 결과는 기록에 저장되지 않았어요.</span>
              )}
            </p>
          </section>

          <BeginnerGuide />
          <PillarBoard r={result} name={form.name} />
          <ElementChart r={result} />
          <PersonalityCard r={result} />
          <LoveCard r={result} onGoTimeline={() => document.getElementById("timeline")?.scrollIntoView({ behavior: "smooth" })} />
          <Timeline key={result.meta.generatedAt} r={result} request={lastRequest} sel={sel.year ? sel : { year: result.years[0].year, month: null }} setSel={setSel} />
          <ShareCard r={result} name={form.name} />
          <PromptPanel r={result} request={lastRequest} aiAvailable={aiAvailable} conditions={conditions} setConditions={setConditions} />

          <details className="rounded-2xl border border-line bg-sheet/95">
            <summary className="cursor-pointer list-none p-5">
              <span className="font-serif text-lg font-bold text-brand">계산 근거 보기</span>
              <span className="mt-0.5 block text-xs text-sub">지장간·신살·합충·대운·계산 기준 (사주를 아는 분을 위한 상세)</span>
            </summary>
            <div className="border-t border-line p-3 sm:p-4"><ExpertView r={result} /></div>
          </details>

          <div className="flex justify-center py-4">
            <button type="button" onClick={restart} className="rounded-full border border-line bg-sheet px-6 py-3 text-sm font-semibold text-brand">다른 사주 보기</button>
          </div>
          <p className="pb-6 text-center text-xs leading-relaxed text-sub">{result.meta.disclaimer}</p>
        </main>
      )}
    </div>
  );
}
