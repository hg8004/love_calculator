"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { Evidence, Section } from "@/lib/love/types";
import { TEN_GOD_INFO } from "@/lib/love/knowledge";
import { SHINSAL_INFO, type ShinsalName } from "@/lib/saju/shinsal";
import type { TenGod } from "@/lib/saju/constants";

/** PC: 마우스 오버 / 모바일: 탭으로 열고 닫는 툴팁 */
export function Tooltip({
  label, children, className = "", triggerClassName = "cursor-help border-b border-dotted border-sub/60 leading-tight", ariaLabel, align = "center",
}: { label: React.ReactNode; children: React.ReactNode; className?: string; triggerClassName?: string; ariaLabel?: string; align?: "left" | "center" | "right" }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <span ref={ref} className={`relative inline-block ${className}`} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label={ariaLabel}
        className={triggerClassName}
      >
        {label}
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          className={`absolute top-full z-30 mt-1.5 w-60 max-w-[78vw] ${align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2"}`}
        >
          <span className="block rounded-lg border border-line bg-sheet p-3 text-left font-sans text-xs font-normal leading-relaxed text-ink shadow-lg">
            {children}
          </span>
        </span>
      )}
    </span>
  );
}

const TEN_GODS = new Set(Object.keys(TEN_GOD_INFO));

/** 십성·신살 용어 툴팁 */
export function Term({ name, className = "" }: { name: string; className?: string }) {
  if (TEN_GODS.has(name)) {
    const info = TEN_GOD_INFO[name as TenGod];
    return (
      <Tooltip label={name} className={className}>
        <strong className="text-brand">{name}</strong> — {info.tooltip}
      </Tooltip>
    );
  }
  const s = SHINSAL_INFO[name as ShinsalName];
  if (s)
    return (
      <Tooltip label={name} className={className}>
        <strong className="text-brand">{name}</strong> — {s.summary}
        <span className="mt-1.5 block text-sub">산출 기준: {s.basis}</span>
      </Tooltip>
    );
  return <span className={className}>{name}</span>;
}

/**
 * 결과 화면의 모든 큰 단락이 같은 테두리·그림자·제목 크기를 쓰도록 한곳에서 정한다.
 * (요약·'사주가 처음이라면'·'계산 근거 보기'처럼 Card 를 쓰지 않는 단락도 이 값을 쓴다)
 */
export const CARD_FRAME = "card rounded-2xl border border-line bg-sheet/95 shadow-[0_1px_2px_rgba(80,60,20,0.04)]";
export const SECTION_TITLE = "font-serif text-2xl font-bold leading-snug text-brand";

export function Card({ title, subtitle, children, className = "", action, id }: { title?: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode; className?: string; action?: React.ReactNode; id?: string }) {
  return (
    <section id={id} className={`${CARD_FRAME} scroll-mt-16 p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className={SECTION_TITLE}>{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-sub">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const EVIDENCE_ROWS: Array<[keyof Evidence, string]> = [
  ["positions", "① 분석한 원국 위치"],
  ["chars", "② 작용한 천간·지지"],
  ["tenGods", "③ 관련 십성"],
  ["luck", "④ 영향을 준 대운·세운·월운"],
  ["relations", "⑤ 합·충·형·파·해의 작용"],
  ["balance", "⑥ 긍정·부정 해석의 공존"],
  ["reasoning", "⑦ 결론을 도출한 이유"],
];

export function EvidenceView({ evidence, label = "분석 근거 보기" }: { evidence: Evidence; label?: string }) {
  const [open, setOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    // 인쇄·PDF 저장 시 근거를 펼친 상태로 출력
    const before = () => setPrinting(true);
    const after = () => setPrinting(false);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
  const shown = open || printing;
  return (
    <div className="mt-1.5">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="no-print text-xs font-medium text-brand-2 underline-offset-2 hover:underline">
        {open ? "근거 닫기" : label}
      </button>
      {shown && (
        <dl className="mt-2 grid gap-1.5 rounded-lg bg-card p-3 text-xs leading-relaxed">
          {EVIDENCE_ROWS.map(([k, t]) => {
            const v = evidence[k];
            const text = Array.isArray(v) ? (v.length ? v.join(" · ") : "해당 없음") : v;
            return (
              <div key={k} className="grid gap-0.5 sm:grid-cols-[11rem_1fr] sm:gap-2">
                <dt className="font-semibold text-sub">{t}</dt>
                <dd className="text-ink">{text}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}

export function SectionList({ sections }: { sections: Section[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {sections.map((s) => (
        <div key={s.key} className="rounded-xl bg-card p-4 sm:p-5">
          <h3 className="mb-3 font-bold text-brand">{s.title}</h3>
          <ul className="space-y-3">
            {s.statements.map((st, i) => (
              <li key={i} className="text-sm leading-relaxed">
                <p>{st.text}</p>
                <EvidenceView evidence={st.evidence} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function CopyButton({ getText, label, className = "" }: { getText: () => string; label: string; className?: string }) {
  const [state, setState] = useState<"idle" | "done" | "fail">("idle");
  const copy = async () => {
    const text = getText();
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
    } catch {
      // 클립보드 API를 쓸 수 없는 환경(비보안 컨텍스트 등) 대비
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      setState(ok ? "done" : "fail");
    }
    setTimeout(() => setState("idle"), 1800);
  };
  return (
    <button type="button" onClick={copy} className={`no-print rounded-lg border border-line bg-sheet px-3 py-2 text-sm font-medium text-brand transition hover:border-brand ${className}`}>
      {state === "done" ? "복사되었습니다 ✓" : state === "fail" ? "복사 실패" : label}
    </button>
  );
}

export function Badge({ children, tone = "brand" }: { children: React.ReactNode; tone?: "brand" | "gray" | "outline" }) {
  const cls = tone === "brand" ? "bg-brand text-white" : tone === "gray" ? "bg-card text-sub" : "border border-line text-brand";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warn" }) {
  return (
    <div role={tone === "warn" ? "alert" : "note"} className={`rounded-xl border p-4 text-sm leading-relaxed ${tone === "warn" ? "border-[#E5CF8E] bg-[#FBF3DA] text-[#5E4404]" : "border-line bg-card text-ink"}`}>
      {children}
    </div>
  );
}
