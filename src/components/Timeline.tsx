"use client";
import { useMemo, useState } from "react";
import type { AnalysisDTO } from "@/lib/serialize";
import { BRANCH_ELEMENT, ELEMENT_KO } from "@/lib/saju/constants";
import { ELEMENT_COLOR } from "@/lib/ui/palette";
import { TYPE_LABEL } from "@/lib/love/score";
import { Card, CopyButton, EvidenceView } from "./ui";

type Year = AnalysisDTO["years"][number];
type Month = Year["months"][number];

export const TYPE_SHORT: Record<string, string> = {
  A: "진지하게 만나볼 만한 인연",
  B: "끌림은 강하지만 지켜볼 인연",
  C: "가볍게 시작될 수 있는 인연",
};

/** 점수 대신 보여 줄 대략적인 가능성 표현 */
export function levelOf(score: number): string {
  return score >= 68 ? "매우 높음" : score >= 60 ? "높음" : score >= 50 ? "보통" : "낮음";
}
/** 막대 길이 — 차이가 눈에 보이도록 30~85점 구간을 10~100%로 늘린다 */
export function barWidth(score: number): number {
  return Math.round(Math.max(10, Math.min(100, ((score - 30) / 55) * 100)));
}

const short =  (h: string) => h.replace(/\s*\(다만.*\)$/, "");

export function monthText(m: Month): string {
  const s = m.score;
  return [
    `${m.wolun.year}년 ${m.wolun.month}월 인연 가능성 ${levelOf(s.score)} (${TYPE_SHORT[s.type]})`,
    s.headline,
    `예상되는 만남: ${s.partnerTraits.join(", ")}`,
    `좋은 흐름: ${s.goodPlain.join(", ") || "-"}`,
    `주의할 점: ${s.cautionPlain.join(", ") || "-"}`,
    `조언: ${s.advice.join(" ")}`,
  ].join("\n");
}

function Bullets({ items, empty }: { items: string[]; empty?: string }) {
  if (!items.length) return <p className="text-sub">{empty ?? "-"}</p>;
  return <ul className="space-y-1">{items.map((x, i) => <li key={i} className="flex gap-2"><span className="text-brand-2">·</span><span>{x}</span></li>)}</ul>;
}

function MonthBody({ m }: { m: Month }) {
  const s = m.score;
  const w = m.wolun;
  return (
    <div className="fade-up mt-3 grid gap-4 border-t border-line pt-3 text-sm leading-relaxed">
      <p className="font-medium">{s.headline}</p>
      <span className="w-fit rounded-full bg-card px-2.5 py-0.5 text-xs font-semibold text-brand">{TYPE_SHORT[s.type]}</span>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><h4 className="mb-1 font-bold text-brand-2">이런 만남이 예상돼요</h4><Bullets items={s.partnerTraits} /></div>
        <div><h4 className="mb-1 font-bold text-brand-2">조언</h4><Bullets items={s.advice} /></div>
        <div><h4 className="mb-1 font-bold text-brand-2">좋은 흐름</h4><Bullets items={s.goodPlain} empty="두드러진 요소가 없어요." /></div>
        <div><h4 className="mb-1 font-bold text-brand-2">주의할 점</h4><Bullets items={s.cautionPlain} empty="크게 주의할 요소는 없어요." /></div>
      </div>
      <details className="rounded-lg bg-card p-3 text-xs">
        <summary className="cursor-pointer font-medium text-brand-2">명리학적 근거</summary>
        <div className="mt-2 grid gap-2 leading-relaxed">
          <p>이 달의 기운 <span className="hanja font-semibold">{w.ganzhi}</span> ({w.stemTenGod} / {w.branchTenGod}) · {w.jieName} {m.startLocal} 부터</p>
          <p>배우자 자리와의 관계: {w.relations.filter((x) => x.involvesDayBranch).map((x) => x.label).join(", ") || "없음"}</p>
          <p>유형 판단({TYPE_LABEL[s.type as "A"]}): {s.typeReasons[0]}</p>
          <ul className="grid gap-1">
            {s.contributions.slice().sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 6).map((c, i) => (
              <li key={i}><span className={`num font-bold ${c.delta >= 0 ? "text-brand" : "text-[#97291E]"}`}>{c.delta >= 0 ? "+" : ""}{c.delta}</span> {c.label} — {c.reason}</li>
            ))}
          </ul>
          <EvidenceView evidence={s.evidence} label="7단계 근거 보기" />
        </div>
      </details>
      <div><CopyButton label="이 달 내용 복사" getText={() => monthText(m)} /></div>
    </div>
  );
}

const AGE_DECADES = [10, 20, 30, 40, 50, 60, 70, 80];

export default function Timeline({ r, request, sel, setSel }: { r: AnalysisDTO; request: unknown; sel: { year: number; month: number | null }; setSel: (s: { year: number; month: number | null }) => void }) {
  const birthYear = r.conversion.solar.year;
  const nowYear = new Date().getFullYear();
  // 기간: "future"(앞으로 10년, 기본) 또는 나이 10년 단위(10대·20대…)
  const [period, setPeriod] = useState<"future" | number>("future");
  const [cache, setCache] = useState<Record<number, Year[]>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const decades = AGE_DECADES.filter((a) => birthYear + a <= 2150);
  const years: Year[] = period === "future" ? r.years : cache[birthYear + period] ?? [];
  const compare = period !== "future";

  const choose = async (p: "future" | number) => {
    setErr(null);
    setPeriod(p);
    if (p === "future") return setSel({ year: r.years[0].year, month: null });
    const start = birthYear + p;
    if (cache[start]) return setSel({ year: start, month: null });
    setLoading(true);
    try {
      const res = await fetch("/api/years", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(request as object), startYear: start }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "불러오지 못했어요.");
      setCache((c) => ({ ...c, [start]: j.years as Year[] }));
      setSel({ year: start, month: null });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "불러오지 못했어요.");
      setPeriod("future");
    } finally {
      setLoading(false);
    }
  };

  const year = years.find((y) => y.year === sel.year) ?? years[0];
  const [showPast, setShowPast] = useState(false);
  const now = Date.now();
  const months = useMemo(() => (year ? year.months.map((m) => ({ m, past: !compare && new Date(m.wolun.endUtc).getTime() < now })) : []), [year, now, compare]);
  const pastCount = months.filter((x) => x.past).length;
  const visible = months.filter((x) => showPast || !x.past || x.m.wolun.month === sel.month);

  return (
    <Card id="timeline" title="연도별 · 월별 인연운" subtitle="인연이 들어올 가능성을 해·달마다 비교한 흐름이에요. 막대가 길수록 가능성이 높아요. 정확한 확률이 아니라 같은 사람의 시기끼리 비교한 대략적인 흐름이에요.">
      <div className="no-print -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="기간 선택">
        {(["future", ...decades] as Array<"future" | number>).map((p) => {
          const active = period === p;
          const label = p === "future" ? "앞으로 10년" : `${p}대`;
          const sub = p === "future" ? `${nowYear}~` : `${birthYear + p}~${birthYear + p + 9}`;
          return (
            <button key={String(p)} role="tab" aria-selected={active} type="button" disabled={loading} onClick={() => choose(p)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm ${active ? "border-brand bg-brand font-semibold text-white" : "border-line bg-sheet text-ink hover:border-brand-2"}`}>
              {label} <span className={`num text-[11px] ${active ? "text-white/70" : "text-sub"}`}>{sub}</span>
            </button>
          );
        })}
      </div>
      {compare && (
        <p className="mb-3 rounded-xl border border-line bg-sheet p-3 text-xs leading-relaxed text-sub">
          <strong className="text-brand">지난 인연과 비교해 보세요.</strong> 실제로 연애를 시작했거나 좋은 인연이 있었던 해·달의 막대가 길게 나오는지 보면, 이 해석이 나에게 얼마나 맞는지 가늠할 수 있어요. (나이는 만 나이 기준)
        </p>
      )}
      {loading && <p className="mb-3 text-sm text-sub" role="status">불러오는 중…</p>}
      {err && <p className="mb-3 text-sm text-[#97291E]" role="alert">{err}</p>}
      {!year ? null : (<>
      <div className="no-print -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2" role="tablist" aria-label="연도 선택">
        {years.map((y) => {
          const active = y.year === year.year;
          return (
            <button key={y.year} role="tab" aria-selected={active} type="button" onClick={() => setSel({ year: y.year, month: null })}
              className={`shrink-0 rounded-xl border px-3 py-2 text-left ${active ? "border-brand bg-brand text-white" : "border-line bg-sheet text-ink hover:border-brand-2"}`}>
              <span className="block text-xs opacity-80">{y.year} · {y.year - birthYear}세</span>
              <span className="block text-sm font-bold leading-tight">{levelOf(y.score.score)}</span>
              <span className="mt-1 block h-1 w-12 overflow-hidden rounded-full bg-black/10">
                <span className="block h-full rounded-full" style={{ width: `${barWidth(y.score.score)}%`, background: active ? "#fff" : "#D9578A" }} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-xl bg-card p-4">
        <p className="text-sm font-semibold text-brand">{year.year}년 (만 {year.year - birthYear}세) 인연 가능성 <span>{levelOf(year.score.score)}</span></p>
        <p className="mt-1 text-sm leading-relaxed">{short(year.score.headline)}</p>
      </div>

      {pastCount > 0 && (
        <button type="button" onClick={() => setShowPast((v) => !v)} className="no-print mt-4 text-xs text-sub underline-offset-2 hover:underline">
          {showPast ? "지난 달 숨기기" : `지난 ${pastCount}개월 보기`}
        </button>
      )}

      <ol className="relative mt-3 grid gap-3 pl-6">
        <span className="absolute bottom-2 left-[9px] top-2 w-px bg-line" aria-hidden="true" />
        {visible.map(({ m, past }) => {
          const el = BRANCH_ELEMENT[m.wolun.branch];
          const col = ELEMENT_COLOR[el];
          const open = sel.month === m.wolun.month;
          const strong = m.score.score >= 65;
          return (
            <li key={m.wolun.month} className={`relative ${past && !open ? "opacity-55" : ""}`}>
              <span className="absolute -left-6 top-4 size-[19px] rounded-full border-[3px] border-paper" style={{ background: col.glyph }} title={`이 달의 기운: ${ELEMENT_KO[el]}`} aria-hidden="true" />
              <div className={`rounded-xl border bg-sheet p-4 ${open ? "border-brand" : strong ? "border-brand-2/50" : "border-line"}`}>
                <button type="button" aria-expanded={open} onClick={() => setSel({ year: year.year, month: open ? null : m.wolun.month })} className="flex w-full items-center gap-3 text-left">
                  <span className="w-12 shrink-0">
                    <span className="block font-serif text-lg font-bold text-brand">{m.wolun.month}월</span>
                    <span className="block text-[11px] text-sub">{m.startLocal.slice(5, 10).replace("-", ".")}~</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#F6E1E8]" aria-hidden="true"><span className="block h-full rounded-full bg-brand-2" style={{ width: `${barWidth(m.score.score)}%` }} /></span>
                      <span className="w-14 text-right text-xs font-bold text-brand">{levelOf(m.score.score)}</span>
                    </span>
                    <span className="mt-1 block truncate text-xs text-sub">{short(m.score.headline).split(" — ").pop()}</span>
                  </span>
                  {strong && !past && <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">주목</span>}
                  {past && <span className="shrink-0 text-[11px] text-sub">지남</span>}
                </button>
                {open && <MonthBody m={m} />}
              </div>
            </li>
          );
        })}
      </ol>
      </>)}
    </Card>
  );
}
