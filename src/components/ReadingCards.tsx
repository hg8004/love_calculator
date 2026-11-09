"use client";
import type { AnalysisDTO } from "@/lib/serialize";
import { ELEMENT_COLOR } from "@/lib/ui/palette";
import { BEGINNER_GUIDE } from "@/lib/reading/knowledge";
import { TEN_GOD_PLAIN } from "@/lib/reading/love";
import { ELEMENT_KO, type TenGod } from "@/lib/saju/constants";
import { fixJosa } from "@/lib/josa";
import { CARD_FRAME, Card, SECTION_TITLE } from "./ui";

type Item = { title: string; text: string; basis?: string };

function Items({ items }: { items: Item[] }) {
  return (
    <ul className="grid gap-3">
      {items.map((it, i) => (
        <li key={i} className="rounded-xl bg-card p-4 text-sm leading-relaxed">
          <h3 className="font-bold text-brand">{it.title}</h3>
          <p className="mt-1">{it.text}</p>
          {it.basis && <p className="mt-1.5 text-xs text-sub">근거: {it.basis}</p>}
        </li>
      ))}
    </ul>
  );
}

/** 사주가 처음인 사람을 위한 짧은 안내 */
export function BeginnerGuide() {
  return (
    <details className={`${CARD_FRAME} p-5 sm:p-6`}>
      <summary className="cursor-pointer list-none">
        <span className={SECTION_TITLE}>사주가 처음이라면</span>
        <span className="ml-2 text-sm text-sub">1분 안에 읽는 법 보기 ▾</span>
      </summary>
      <dl className="mt-4 grid gap-3 text-sm leading-relaxed">
        {BEGINNER_GUIDE.map((g) => (
          <div key={g.term}>
            <dt className="font-bold text-brand">{g.term}</dt>
            <dd className="mt-0.5">{g.text}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export function PersonalityCard({ r }: { r: AnalysisDTO }) {
  const dm = r.reading.dayMaster;
  const col = ELEMENT_COLOR[dm.element];
  return (
    <Card id="personality" title="성격 · 기질" subtitle="'나'를 뜻하는 글자(일간)를 중심으로, 오행 분포를 함께 본 해석이에요.">
      <div className="mb-4 flex items-center gap-4 rounded-xl p-4" style={{ background: col.soft }}>
        <span className="hanja flex size-16 shrink-0 items-center justify-center rounded-xl border bg-sheet text-4xl font-bold" style={{ color: col.glyph, borderColor: col.line }}>{dm.char}</span>
        <div>
          <p className="text-xs font-semibold" style={{ color: col.ink }}>나를 뜻하는 글자</p>
          <p className="font-serif text-lg font-bold leading-snug text-brand">{dm.title}</p>
        </div>
      </div>
      <Items items={r.reading.personality} />
    </Card>
  );
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "good" | "neutral" | "care" }) {
  const cls = tone === "good" ? "bg-[#E3F0E7] text-[#215C3A]" : tone === "care" ? "bg-[#F7E0DC] text-[#97291E]" : "bg-card text-ink";
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
}

function Block({ letter, title, summary, badges, children, why }: { letter: string; title: string; summary: string; badges?: React.ReactNode; children?: React.ReactNode; why?: string[] }) {
  return (
    <section className="rounded-xl border border-line bg-sheet p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white" aria-hidden="true">{letter}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-brand">{title}</h3>
          {badges && <div className="mt-1.5 flex flex-wrap gap-1.5">{badges}</div>}
          <p className="mt-2 text-sm leading-relaxed">{summary}</p>
          {children}
          {why && why.length > 0 && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer font-medium text-brand-2">왜 그런가요?</summary>
              <ul className="mt-2 grid gap-1 leading-relaxed text-ink">{why.map((w, i) => <li key={i}>· {w}</li>)}</ul>
            </details>
          )}
        </div>
      </div>
    </section>
  );
}

export function LoveCard({ r, onGoTimeline }: { r: AnalysisDTO; onGoTimeline: () => void }) {
  const L = r.love;
  const t = r.summary.timing;
  const pc = ELEMENT_COLOR[L.palace.element];
  const sc = ELEMENT_COLOR[L.star.element];
  const forceTone = L.palace.force.level === "강" ? "good" : L.palace.force.level === "약" ? "care" : "neutral";
  const stabTone = L.palace.stability.level === "안정" ? "good" : L.palace.stability.level === "흔들림 큼" ? "care" : "neutral";
  const starTone = L.star.level === "유력" ? "good" : L.star.level === "보통" || L.star.level === "많음" ? "neutral" : "care";
  const timeLines = L.conclusion.inferences.filter((x) => x.startsWith("운에서") || x.startsWith("운이 배우자 자리를 크게"));
  const minorLine = L.conclusion.inferences.find((x) => x.startsWith("운이 배우자 자리에 작은"));

  return (
    <Card id="love" title="연애 · 배우자 분석" subtitle="배우자 자리와 이성의 별을 따로 살펴본 뒤, 둘을 함께 봐요.">
      <div className="grid gap-4">
        {t.nearest && (
          <div className="rounded-xl bg-brand p-4 text-white">
            <p className="text-xs font-semibold text-white/70">인연이 찾아올 가장 빠른 시기</p>
            <p className="mt-1 font-serif text-2xl font-bold">{t.nearest.year}년 {t.nearest.month}월</p>
            {t.nearest.nature && <span className="mt-2 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">{t.nearest.nature.label}</span>}
            <p className="mt-2 text-sm leading-relaxed text-white/90">{t.nearest.nature?.text ?? t.oneLine}</p>
            <button type="button" onClick={onGoTimeline} className="no-print mt-3 rounded-lg bg-sheet px-3 py-1.5 text-sm font-semibold text-brand">월별 흐름 보기 →</button>
          </div>
        )}

        <div className="rounded-xl bg-card p-4">
          <p className="text-xs font-semibold text-sub">한눈에 보기 · 구조 유형 {L.type.code}</p>
          <p className="mt-1 font-serif text-lg font-bold leading-snug text-brand">{L.type.title}</p>
          <p className="mt-1.5 text-sm leading-relaxed">{L.type.summary}</p>
          <p className="mt-2 text-xs text-sub">유형은 분석의 출발점일 뿐, 좋고 나쁨을 정하는 분류가 아니에요.</p>
        </div>

        <section className="rounded-xl border border-line bg-sheet p-4" aria-labelledby="partner-title">
          <h3 id="partner-title" className="font-serif text-lg font-bold text-brand">♥ 만나게 될 이성, 이렇게 그려져요</h3>
          <p className="mt-2 text-sm leading-relaxed">
            {L.partner.story.map((s, i) => (s.b ? <strong key={i} className="font-bold text-brand">{s.t}</strong> : <span key={i}>{s.t}</span>))}
          </p>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-medium text-brand-2">항목별로 자세히 보기 (근거 포함)</summary>
            <p className="mt-2 text-xs text-sub">{L.partner.intro}</p>
            <ul className="mt-2 grid gap-2.5">
              {L.partner.items.map((it) => (
                <li key={it.title} className="rounded-lg bg-card p-3 leading-relaxed">
                  <p className="font-bold text-brand-2">{it.title}</p>
                  <p className="mt-0.5">{it.text}</p>
                  <p className="mt-1 text-xs text-sub">근거: {it.basis}</p>
                </li>
              ))}
            </ul>
          </details>
          <ul className="mt-3 grid gap-0.5 text-xs leading-relaxed text-sub">
            <li>· 사주 상징으로 본 추론이니 참고로만 봐 주세요.</li>
            {L.conclusion.limits.filter((l) => l.startsWith("배우자 자리의 글자") || l.startsWith("전통 명리학의 성별") || l.startsWith("지지 속 글자")).map((l, i) => <li key={i}>· {l}</li>)}
          </ul>
        </section>

        <section className="rounded-xl border border-line bg-sheet p-4" aria-labelledby="overview-title">
          <h3 id="overview-title" className="font-serif text-lg font-bold text-brand">배우자 자리와 이성의 별, 그리고 인연의 때</h3>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Pill tone={forceTone}>배우자 자리 힘 {L.palace.force.level}</Pill>
            <Pill tone={stabTone}>{L.palace.stability.level}</Pill>
            <Pill tone={starTone}>이성의 별 {L.star.level}</Pill>
          </div>
          <p className="mt-2 text-sm leading-relaxed">
            {L.overview.map((s, i) => (s.b ? <strong key={i} className="font-bold text-brand">{s.t}</strong> : <span key={i}>{s.t}</span>))}
          </p>
          <button type="button" onClick={onGoTimeline} className="no-print mt-2 text-xs font-medium text-brand-2 underline-offset-2 hover:underline">월별 흐름에서 보기 →</button>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-medium text-brand-2">자세히 보기 (근거 포함)</summary>
            <div className="mt-3 grid gap-4 text-xs leading-relaxed">
              <div>
                <p className="font-bold text-brand">배우자 자리 (일지)</p>
                <div className="mt-1.5 flex items-center gap-3">
                  <span className="hanja flex size-10 items-center justify-center rounded-lg border text-2xl font-bold" style={{ background: pc.soft, color: pc.glyph, borderColor: pc.line }}>{L.palace.char}</span>
                  <div>
                    <p><strong>{ELEMENT_KO[L.palace.element]}</strong> 기운 · {L.palace.yinYang} · 앉아 있는 기운: {TEN_GOD_PLAIN[L.palace.tenGod as TenGod]}({L.palace.tenGod})</p>
                    <p className="text-sub">속 글자: {L.palace.hidden.map((h) => `${h.char}(${h.role}${h.isStar ? " ♥" : ""}${h.optional ? ", 학파에 따라 제외" : ""})`).join(" · ")}</p>
                  </div>
                </div>
                <ul className="mt-1.5 grid gap-0.5">{[...L.palace.force.factors, ...L.palace.stability.items].map((w, i) => <li key={i}>· {w}</li>)}</ul>
              </div>
              <div>
                <p className="font-bold text-brand">이성의 별 ({L.starName})</p>
                {L.star.occurrences.length > 0 && (
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {L.star.occurrences.map((o, i) => (
                      <li key={i} className="rounded-lg border px-2 py-1" style={{ borderColor: sc.line, background: sc.soft }}>
                        <span className="hanja font-bold" style={{ color: sc.glyph }}>{o.char}</span> {o.where.replace(" 속", "")}{o.role ? ` · ${o.role}` : ""} <span className="text-sub">({o.tenGod})</span>
                      </li>
                    ))}
                  </ul>
                )}
                <ul className="mt-1.5 grid gap-0.5">{[L.starExplain, ...L.star.factors, ...(L.star.mixed ? [L.star.mixed] : [])].map((w, i) => <li key={i}>· {w}</li>)}</ul>
              </div>
              <div>
                <p className="font-bold text-brand">둘의 관계</p>
                <ul className="mt-1 grid gap-0.5">{[L.interaction.summary, ...L.interaction.detail].map((w, i) => <li key={i}>· {w}</li>)}</ul>
              </div>
              {L.support && (
                <div>
                  <p className="font-bold text-brand">보조로 살펴본 것</p>
                  <ul className="mt-1 grid gap-0.5">{[...L.support.items, L.support.summary].map((w, i) => <li key={i}>· {w}</li>)}</ul>
                </div>
              )}
              <div>
                <p className="font-bold text-brand">운에서 보는 시기</p>
                <ul className="mt-1 grid gap-0.5">
                  {[...timeLines, ...(minorLine ? [minorLine] : [])].map((w, i) => <li key={i}>· {w}</li>)}
                  {!timeLines.length && <li>· 앞으로 10년 안에 이성의 별이 직접 들어오거나 배우자 자리를 크게 움직이는 해는 뚜렷하지 않아요.</li>}
                </ul>
              </div>
            </div>
          </details>
        </section>

        <div>
          <h3 className="mb-2 mt-2 font-serif text-lg font-bold text-brand">나의 연애 스타일</h3>
          <Items items={r.reading.loveStyle} />
        </div>
        <div className="rounded-xl border border-line p-4 text-sm">
          <h3 className="font-bold text-brand">연애 조언</h3>
          <ul className="mt-2 space-y-1.5 leading-relaxed">
            {r.summary.style.advice.map((a, i) => <li key={i} className="flex gap-2"><span className="text-brand-2">{i + 1}.</span><span>{a}</span></li>)}
          </ul>
        </div>

        <Block letter="✓" title="정리 — 확인된 것과 추측, 그리고 한계" summary="사주에서 확인된 사실, 그것을 바탕으로 한 해석, 사주만으로는 알 수 없는 것을 나눠서 정리했어요.">
          <div className="mt-3 grid gap-3 text-xs leading-relaxed">
            <div><p className="font-bold text-brand">확인된 사실</p><ul className="mt-1 grid gap-0.5">{L.conclusion.facts.map((x, i) => <li key={i}>· {x}</li>)}</ul></div>
            <div><p className="font-bold text-brand">해석(추론)</p><ul className="mt-1 grid gap-0.5">{L.conclusion.inferences.map((x, i) => <li key={i}>· {x}</li>)}</ul></div>
            <div><p className="font-bold text-brand">판단의 한계</p><ul className="mt-1 grid gap-0.5">{L.conclusion.limits.map((x, i) => <li key={i}>· {x}</li>)}</ul></div>
          </div>
        </Block>
      </div>
    </Card>
  );
}
