"use client";
import { useMemo, useState } from "react";
import type { AnalysisDTO } from "@/lib/serialize";
import { buildCrossPrompt } from "@/lib/prompt/crossPrompt";
import { Card, CopyButton, Notice } from "./ui";

const EXAMPLES = [
  "배우자는 사회적으로 신뢰받는 사람이었으면 좋겠습니다.",
  "경제관념이 확실하고 책임감 있는 사람을 선호합니다.",
  "외적인 매력보다 가치관과 생활 습관을 중요하게 생각합니다.",
  "자기 일을 열심히 하고 존경할 만한 부분이 있는 사람을 원합니다.",
  "다른 사람에게 소개했을 때 자랑스러울 만한 사람을 원합니다.",
];

/** 아주 단순한 마크다운 렌더러(제목·목록·굵게) — 외부 라이브러리 없이 텍스트를 안전하게 표시 */
function Markdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  const inline = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>));
  return (
    <div className="grid gap-3 text-sm leading-relaxed">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (/^#{1,4}\s/.test(lines[0]) && lines.length === 1) return <h3 key={i} className="mt-2 font-bold text-brand">{lines[0].replace(/^#+\s*/, "")}</h3>;
        if (lines.every((l) => /^\s*([-*]|\d+\.)\s/.test(l)))
          return <ul key={i} className="list-disc space-y-1 pl-5">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*([-*]|\d+\.)\s/, ""))}</li>)}</ul>;
        return (
          <div key={i}>
            {lines.map((l, j) => /^#{1,4}\s/.test(l) ? <h3 key={j} className="mt-2 font-bold text-brand">{l.replace(/^#+\s*/, "")}</h3> : <p key={j}>{inline(l)}</p>)}
          </div>
        );
      })}
    </div>
  );
}

export default function PromptPanel({
  r, request, aiAvailable, conditions, setConditions,
}: {
  r: AnalysisDTO;
  request: unknown;
  aiAvailable: boolean;
  conditions: string;
  setConditions: (s: string) => void;
}) {
  const [preview, setPreview] = useState(false);
  const [ai, setAi] = useState<{ loading: boolean; text?: string; error?: string; warnings?: string[]; model?: string; fallback?: boolean }>({ loading: false });
  const prompt = useMemo(() => buildCrossPrompt(r, conditions), [r, conditions]);

  const runAI = async () => {
    setAi({ loading: true });
    try {
      const res = await fetch("/api/interpret", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(request as object), conditions }) });
      const j = await res.json();
      if (!j.ok) setAi({ loading: false, error: j.error });
      else setAi({ loading: false, text: j.text, warnings: j.integrityWarnings, model: j.model, fallback: j.servedByFallback });
    } catch {
      setAi({ loading: false, error: "AI 해석 요청에 실패했습니다." });
    }
  };

  return (
    <div className="grid gap-6">
      <Card id="cross" title="다른 AI에게 물어보기" subtitle="내 사주 결과를 질문 형태로 복사해, ChatGPT·Claude·Gemini 같은 AI에게 더 자세한 풀이를 받아 보세요.">
        <ol className="mb-4 grid gap-1.5 text-sm leading-relaxed">
          <li><strong className="text-brand">1.</strong> 아래 버튼으로 질문을 복사해요.</li>
          <li><strong className="text-brand">2.</strong> 원하는 AI에서 <strong>새 대화</strong>를 열고 그대로 붙여 넣어요.</li>
          <li><strong className="text-brand">3.</strong> 질문에는 &lsquo;40년 경력의 역술가로서, 이전 대화 기록은 참고하지 말고&rsquo; <strong>내가 만나게 될 이성</strong>과 <strong>인연이 들어오는 시기</strong>를 봐 달라는 요청, 그리고 이 사이트 분석에 <strong>동의하는 부분과 다른 의견</strong>을 명리학 근거로 나눠 달라는 요청이 들어 있어요.</li>
        </ol>
        <div className="flex flex-wrap gap-2">
          <CopyButton label="AI에게 보낼 질문 복사" getText={() => prompt} className="!border-brand !bg-brand !px-4 !py-3 !text-white hover:!bg-brand-2" />
          <button type="button" onClick={() => setPreview((v) => !v)} className="no-print rounded-lg border border-line px-3 py-2 text-sm">{preview ? "미리보기 닫기" : "미리보기"}</button>
        </div>
        {preview && <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-card p-3 text-xs leading-relaxed">{prompt}</pre>}
        <details className="mt-4" open={conditions.length > 0}>
        <summary className="cursor-pointer text-sm font-medium text-brand-2">내가 원하는 배우자 조건 추가하기 (선택)</summary>
        <div className="mt-3">
        <label htmlFor="conditions" className="sr-only">내가 원하는 배우자 조건</label>
        <textarea
          id="conditions"
          value={conditions}
          onChange={(e) => setConditions(e.target.value.slice(0, 2000))}
          rows={4}
          placeholder={EXAMPLES.join("\n")}
          className="w-full rounded-lg border border-line p-3 text-sm leading-relaxed focus:border-brand focus:outline-none"
        />
        <div className="no-print mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map((e) => (
            <button key={e} type="button" onClick={() => setConditions(((conditions ? conditions.trimEnd() + "\n" : "") + e).slice(0, 2000))} className="rounded-full border border-line px-2.5 py-1 text-xs text-sub hover:border-brand hover:text-brand">
              + {e.slice(0, 18)}…
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-sub">적은 조건은 복사되는 질문에 자동으로 들어가, 사주상 배우자상과 내가 원하는 배우자상을 비교해 달라고 요청해요. 서버에는 저장되지 않아요.</p>
        </div>
        </details>
      </Card>

      {aiAvailable && (
      <Card title="AI 종합 해석 (선택 기능)" subtitle="계산 엔진의 구조화 데이터만 AI에 전달합니다. 원국 표와 점수는 항상 계산 엔진 결과를 표시하며 AI가 변경할 수 없습니다.">
        {(
          <>
            <button type="button" onClick={runAI} disabled={ai.loading} className="no-print rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-2 disabled:opacity-60">
              {ai.loading ? "AI가 해석을 작성하는 중… (최대 1~2분)" : ai.text ? "다시 해석하기" : "AI 종합 해석 받기"}
            </button>
            {ai.error && <div className="mt-3"><Notice tone="warn">{ai.error}</Notice></div>}
            {ai.warnings && ai.warnings.length > 0 && (
              <div className="mt-3 grid gap-2">{ai.warnings.map((w, i) => <Notice key={i} tone="warn">{w}</Notice>)}</div>
            )}
            {ai.text && (
              <div className="mt-4 rounded-xl bg-card p-4">
                <Markdown text={ai.text} />
                <p className="mt-4 text-[11px] text-sub">생성 모델: {ai.model}{ai.fallback ? " (안전 정책에 따라 대체 모델이 응답)" : ""} · AI 해석은 참고용이며 계산 결과와 다르게 서술된 부분이 있으면 계산 엔진 결과를 따르세요.</p>
                <div className="mt-2"><CopyButton label="AI 해석 복사" getText={() => ai.text ?? ""} /></div>
              </div>
            )}
          </>
        )}
      </Card>
      )}
    </div>
  );
}
