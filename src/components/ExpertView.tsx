"use client";
/** 전문가용 계산 근거 — 지장간·십이운성·신살, 가중 오행, 신강약, 합충형파해, 계산 기준·비교표, 대운 */
import type { AnalysisDTO } from "@/lib/serialize";
import { ELEMENT_KO, type Element } from "@/lib/saju/constants";
import { RELATION_GUIDE } from "@/lib/saju/relations";
import { ELEMENT_COLOR, ELEMENT_ORDER } from "@/lib/ui/palette";
import { Notice, Term, Tooltip } from "./ui";

const ORDER = ["hour", "day", "month", "year"] as const;
const PREFIX: Record<string, string> = { year: "년", month: "월", day: "일", hour: "시" };
const LABEL: Record<string, string> = { year: "연주", month: "월주", day: "일주", hour: "시주" };

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-sheet p-4 sm:p-5">
      <h3 className="font-serif text-lg font-bold text-brand">{title}</h3>
      {sub && <p className="mt-0.5 text-xs text-sub">{sub}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Hz({ ch, el }: { ch: string; el: Element }) {
  return <span className="hanja font-bold" style={{ color: ELEMENT_COLOR[el].glyph }}>{ch}</span>;
}

export default function ExpertView({ r }: { r: AnalysisDTO }) {
  const c = r.chart;
  const dw = r.daewoon;
  const shinsalAt = (k: string) => c.shinsal.filter((s) => s.positions.some((p) => p.startsWith(PREFIX[k]))).map((s) => s.name);
  return (
    <div className="grid gap-4 text-sm">
      {r.warnings.length > 0 && <div className="grid gap-2">{r.warnings.map((w, i) => <Notice key={i} tone="warn">{w}</Notice>)}</div>}

      <Section title="원국 상세" sub="지장간(지지 속에 숨은 천간)·십이운성·신살">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[330px] table-fixed text-center text-xs">
            <thead>
              <tr className="text-sub"><th className="w-14 p-1.5 text-left font-medium">구분</th>{ORDER.map((k) => <th key={k} className="p-1.5 font-semibold text-brand">{LABEL[k]}</th>)}</tr>
            </thead>
            <tbody>
              <tr className="border-t border-line">
                <th className="p-1.5 text-left font-medium text-sub">간지</th>
                {ORDER.map((k) => { const p = c.pillars[k]; return <td key={k} className="p-1.5 text-base">{p ? <><Hz ch={p.stemChar} el={p.stemElement} /><Hz ch={p.branchChar} el={p.branchElement} /></> : "—"}</td>; })}
              </tr>
              <tr className="border-t border-line">
                <th className="p-1.5 text-left font-medium text-sub">지장간</th>
                {ORDER.map((k) => {
                  const p = c.pillars[k];
                  return <td key={k} className="p-1.5 leading-relaxed">{p ? p.hidden.map((h) => <div key={h.char + h.role}><span className="hanja font-semibold">{h.char}</span> <span className="text-sub">{h.role}</span> <Term name={h.tenGod} /></div>) : "—"}</td>;
                })}
              </tr>
              <tr className="border-t border-line">
                <th className="p-1.5 text-left font-medium text-sub">십이운성</th>
                {ORDER.map((k) => { const p = c.pillars[k]; return <td key={k} className="p-1.5">{p ? <Tooltip label={p.stage} align={k === "hour" ? "left" : k === "year" ? "right" : "center"}>일간이 이 지지에서 갖는 기운의 단계(봉법). 천간 자체 기준(좌법)은 {p.selfStage}.</Tooltip> : "—"}</td>; })}
              </tr>
              <tr className="border-t border-line">
                <th className="p-1.5 text-left font-medium text-sub">신살</th>
                {ORDER.map((k) => { const l = c.pillars[k] ? shinsalAt(k) : []; return <td key={k} className="p-1.5 leading-relaxed">{l.length ? l.map((n, i) => <span key={n}>{i > 0 && ", "}<Term name={n} /></span>) : "—"}</td>; })}
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="가중 오행 · 십성 · 신강약" sub={`지장간 사령일수와 월령(2배)을 반영한 비율 · 신강약 ${c.strength.score}점(${c.strength.level})`}>
        <ul className="grid gap-1.5">
          {ELEMENT_ORDER.map((e) => (
            <li key={e} className="grid grid-cols-[3.5rem_1fr_3rem] items-center gap-2">
              <span style={{ color: ELEMENT_COLOR[e].ink }} className="font-semibold"><span className="hanja">{e}</span> {ELEMENT_KO[e]}</span>
              <span className="h-2 overflow-hidden rounded-full bg-[#F6E1E8]"><span className="block h-full rounded-full" style={{ width: `${c.elements.weighted[e]}%`, background: ELEMENT_COLOR[e].glyph }} /></span>
              <span className="num text-right text-sub">{c.elements.weighted[e]}%</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-sub">십성 비율: {Object.entries(c.tenGodWeighted).map(([g, v]) => `${g} ${v}%`).join(" · ")}</p>
        <ul className="mt-2 space-y-1 text-xs leading-relaxed text-sub">
          {c.strength.details.map((d, i) => <li key={i}>· {d}</li>)}
          <li>· 격국 참고: {c.gyeok.name} — {c.gyeok.basis}</li>
          <li>· 조후: {c.johu.description}</li>
          <li>· {c.strength.note}</li>
        </ul>
      </Section>

      <Section title="합 · 충 · 형 · 파 · 해" sub="관계의 성립과 합화 조건만 판정하며, 좋고 나쁨은 원국 맥락에서 따로 해석해요.">
        {c.relations.length === 0 ? <p className="text-sub">원국 안에서 성립하는 관계가 없어요.</p> : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {c.relations.map((x, i) => (
              <li key={i} className="rounded-lg bg-card p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Tooltip label={<span className="font-bold text-brand">{x.kind}</span>}>{RELATION_GUIDE[x.kind]}</Tooltip>
                  <span className="hanja font-semibold">{x.label}</span>
                  {x.involvesDayBranch && <span className="rounded-full bg-brand px-2 text-[10px] text-white">배우자 자리</span>}
                </div>
                <p className="mt-1 text-xs leading-relaxed">{x.description}</p>
                {x.transform && <p className="mt-1 text-xs text-sub">합화 가능성 {x.transform.possibility} — {x.transform.reasons.join(" ")}</p>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="대운 (10년 단위 큰 흐름)" sub={`${dw.rule} · 대운수 ${dw.daewoonNumber} (정밀 ${dw.exactText})`}>
        <p className="mb-3 text-xs leading-relaxed text-sub">{dw.note}</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {dw.periods.map((p) => {
            const cur = r.currentDaewoonIndex === p.index;
            return (
              <div key={p.index} className={`min-w-[6.5rem] rounded-lg border p-2.5 text-center ${cur ? "border-brand bg-brand text-white" : "border-line bg-sheet"}`}>
                <div className={`num text-[11px] ${cur ? "text-white/80" : "text-sub"}`}>{p.startAge}세 · {p.startYear}~</div>
                <div className="hanja my-0.5 text-xl font-bold">{p.ganzhi}</div>
                <div className="text-[11px]">{p.stemTenGod}/{p.branchTenGod}</div>
                {cur && <div className="text-[10px] font-bold">현재</div>}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="계산 기준">
        <dl className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
          {r.settings.map((s) => <div key={s.label} className="grid grid-cols-[6rem_1fr] gap-2"><dt className="text-sub">{s.label}</dt><dd>{s.value}</dd></div>)}
          <div className="grid grid-cols-[6rem_1fr] gap-2"><dt className="text-sub">날짜 변환</dt><dd>{r.conversion.note}</dd></div>
          {r.time.known && <div className="grid grid-cols-[6rem_1fr] gap-2"><dt className="text-sub">판정 시각</dt><dd className="num">{r.time.reckoning} (보정 {r.time.correctionMinutes}분)</dd></div>}
          {r.time.prevJie && r.time.nextJie && <div className="grid grid-cols-[6rem_1fr] gap-2"><dt className="text-sub">절입</dt><dd className="num">직전 {r.time.prevJie.name} {r.time.prevJie.local} / 다음 {r.time.nextJie.name} {r.time.nextJie.local}</dd></div>}
          <div className="grid grid-cols-[6rem_1fr] gap-2"><dt className="text-sub">버전</dt><dd>{r.meta.engineVersion} · {r.meta.scoreVersion}</dd></div>
        </dl>
        {r.comparisons.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-medium text-brand-2">계산 기준별 일주·시주 비교</summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[480px] text-xs">
                <thead><tr className="text-left text-sub"><th className="p-1.5 font-medium">시간 보정</th><th className="p-1.5 font-medium">판정 시각</th><th className="p-1.5 font-medium">자시 방식</th><th className="p-1.5 font-medium">일주</th><th className="p-1.5 font-medium">시주</th></tr></thead>
                <tbody>
                  {r.comparisons.map((x, i) => (
                    <tr key={i} className={`border-t border-line ${x.selected ? "bg-card font-bold text-brand" : ""}`}>
                      <td className="p-1.5">{x.solarLabel}</td><td className="num p-1.5">{x.reckoning}</td><td className="p-1.5">{x.ziLabel}</td><td className="hanja p-1.5">{x.day}</td><td className="hanja p-1.5">{x.hour}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </Section>
    </div>
  );
}
