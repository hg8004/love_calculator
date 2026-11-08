"use client";
import type { AnalysisDTO } from "@/lib/serialize";
import { ELEMENT_COLOR, ELEMENT_ORDER } from "@/lib/ui/palette";
import { BRANCH_MEANING, PILLAR_MEANING, STEM_MEANING } from "@/lib/reading/knowledge";
import { TEN_GOD_INFO } from "@/lib/love/knowledge";
import { ELEMENT_KO, TEN_GOD_GROUP, type Element, type TenGod } from "@/lib/saju/constants";
import { TEN_GOD_PLAIN } from "@/lib/reading/love";
import { Card, Notice, Tooltip } from "./ui";
import { fixJosa } from "@/lib/josa";

const ORDER = ["hour", "day", "month", "year"] as const; // 전통 표기: 시주 > 일주 > 월주 > 연주
const alignOf = (k: (typeof ORDER)[number]) => (k === "hour" ? "left" : k === "year" ? "right" : "center") as "left" | "center" | "right";

function Glyph({ char, el, meaning, place, tenGod, isMe, isStar, starName, align }: { char: string; el: Element; meaning: string; place: string; tenGod: string; isMe?: boolean; isStar?: boolean; starName: string; align: "left" | "center" | "right" }) {
  const c = ELEMENT_COLOR[el];
  return (
    <Tooltip
      label={
        <span className="relative flex aspect-square w-full items-center justify-center rounded-xl border" style={{ background: c.soft, borderColor: isMe ? c.glyph : c.line, borderWidth: isMe ? 2 : 1 }}>
          <span className="hanja text-[2.6rem] font-bold leading-none sm:text-6xl" style={{ color: c.glyph }}>{char}</span>
          {isMe && <span className="absolute right-1 top-1 rounded-full bg-brand px-1.5 text-[10px] font-semibold text-white">나</span>}
          {isStar && <span className="absolute right-1 top-1 rounded-full bg-[#C0392B] px-1.5 text-[10px] font-semibold text-white" aria-label="이성의 별">♥</span>}
        </span>
      }
      className="block w-full"
      triggerClassName="block w-full cursor-pointer rounded-xl"
      ariaLabel={`${char} 글자 설명 보기`}
      align={align}
    >
      <span className="hanja text-lg font-bold" style={{ color: c.glyph }}>{char}</span>{" "}
      <span className="font-semibold">{meaning}</span>
      <span className="mt-1.5 block text-sub">자리: {place}</span>
      <span className="mt-1 block">
        {isMe ? "사주 전체를 해석하는 기준이 되는 '나'예요." : <>나와의 관계: <strong>{TEN_GOD_PLAIN[tenGod as TenGod]}</strong> ({tenGod}) — {TEN_GOD_INFO[tenGod as TenGod]?.tooltip ?? ""}</>}
      </span>
      {isStar && <span className="mt-1 block font-semibold text-[#97291E]">♥ 이 글자는 이성을 뜻하는 '이성의 별'({starName})이에요.</span>}
    </Tooltip>
  );
}

export function PillarBoard({ r, name }: { r: AnalysisDTO; name: string }) {
  const c = r.chart;
  const sg = r.input.gender === "male" ? "재성" : "관성";
  const isStar = (tg: string) => tg !== "일간" && TEN_GOD_GROUP[tg as TenGod] === sg;
  return (
    <Card id="board" title="사주 원국표" subtitle="태어난 시·일·월·연의 네 기둥, 여덟 글자예요(전통대로 오른쪽부터 연주). 글자를 누르면 뜻을 볼 수 있어요.">
      {(!r.time.known || r.alternatives.length > 0 || r.warnings.some((w) => w.includes("절입"))) && (
        <div className="mb-4 grid gap-2">
          {!r.time.known && <Notice>태어난 시간을 몰라 시주는 비워 두었어요. 시주를 추정하지 않아요.</Notice>}
          {r.alternatives.length > 0 && <Notice tone="warn">{fixJosa(`태어난 날에 절기가 바뀌어, 태어난 시각에 따라 ${r.alternatives.map((a) => `연주 ${a.year}·월주 ${a.month}`).join(", ")}이(가) 될 수도 있어요.`)}</Notice>}
          {r.warnings.filter((w) => w.includes("절입 시각과")).map((w, i) => <Notice key={i} tone="warn">{w}</Notice>)}
        </div>
      )}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {ORDER.map((k) => (
          <div key={k} className="text-center text-sm font-semibold text-brand">
            {PILLAR_MEANING[k].name}
            {k === "day" && <span className="ml-0.5 text-xs font-normal text-sub">(나)</span>}
          </div>
        ))}
        {ORDER.map((k) => {
          const p = c.pillars[k];
          if (!p) return <Empty key={`s-${k}`} />;
          return (
            <div key={`s-${k}`} className="grid gap-1">
              <Glyph char={p.stemChar} el={p.stemElement} meaning={STEM_MEANING[p.stem]} place={PILLAR_MEANING[k].stem} tenGod={p.stemTenGod} isMe={k === "day"} isStar={isStar(p.stemTenGod)} starName={sg} align={alignOf(k)} />
              <span className="text-center text-[11px] leading-tight text-sub">{k === "day" ? "나" : TEN_GOD_PLAIN[p.stemTenGod as TenGod]}</span>
            </div>
          );
        })}
        {ORDER.map((k) => {
          const p = c.pillars[k];
          if (!p) return <Empty key={`b-${k}`} />;
          return (
            <div key={`b-${k}`} className="grid gap-1">
              <Glyph char={p.branchChar} el={p.branchElement} meaning={BRANCH_MEANING[p.branch]} place={PILLAR_MEANING[k].branch} tenGod={p.branchTenGod} isStar={isStar(p.branchTenGod)} starName={sg} align={alignOf(k)} />
              <span className="text-center text-[11px] leading-tight text-sub">{k === "day" ? <strong className="text-brand">배우자 자리</strong> : TEN_GOD_PLAIN[p.branchTenGod as TenGod]}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-sub">
        <span className="mr-1 rounded-full bg-[#C0392B] px-1.5 font-semibold text-white">♥</span>
        이성의 별({sg}) — 땅 글자는 대표 글자 기준이에요. 땅 글자 속에 숨은 이성의 별까지는 아래 &lsquo;연애·배우자 분석&rsquo;에서 확인하세요.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-sub">
        <span>오행 색:</span>
        {ELEMENT_ORDER.map((e) => (
          <span key={e} className="inline-flex items-center gap-1">
            <span className="inline-block size-2.5 rounded-full" style={{ background: ELEMENT_COLOR[e].glyph }} />
            {ELEMENT_KO[e]}({e})
          </span>
        ))}
      </div>
      {name && <p className="sr-only">{name}님의 사주</p>}
    </Card>
  );
}

function Empty() {
  return (
    <div className="grid gap-1">
      <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-line text-2xl text-sub">?</div>
      <span className="text-center text-xs text-sub">시간 모름</span>
    </div>
  );
}

export function ElementChart({ r }: { r: AnalysisDTO }) {
  const counts = r.reading.elements.counts;
  const max = Math.max(4, ...Object.values(counts));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const many = r.reading.elements.many;
  const none = r.reading.elements.none;
  const top = [...ELEMENT_ORDER].sort((a, b) => counts[b] - counts[a])[0];
  const headline =
    many.length || none.length
      ? fixJosa(`${many.length ? `${many.map((e) => `${ELEMENT_KO[e]}(${e})`).join("·")}이(가) 많고` : `${ELEMENT_KO[top]}(${top})이(가) 가장 많고`}${none.length ? `, ${none.map((e) => `${ELEMENT_KO[e]}(${e})`).join("·")}이(가) 없어요.` : ", 없는 기운은 없어요."}`)
      : "다섯 기운이 고르게 있어요.";
  return (
    <Card id="elements" title="오행 분포" subtitle={`여덟 글자${total < 8 ? `(시간 모름으로 ${total}글자)` : ""}를 나무·불·흙·쇠·물 다섯 기운으로 나눠 센 결과예요.`}>
      <p className="mb-4 font-medium">{headline}</p>
      <ul className="grid gap-2.5" aria-label="오행별 개수">
        {ELEMENT_ORDER.map((e) => {
          const col = ELEMENT_COLOR[e];
          return (
            <li key={e} className="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-3 text-sm">
              <span className="font-semibold" style={{ color: col.ink }}>
                <span className="hanja">{e}</span> {col.name}
              </span>
              <span className="flex h-3 gap-[2px]" aria-hidden="true">
                {Array.from({ length: max }, (_, i) => (
                  <span key={i} className="h-full flex-1 rounded-[3px]" style={{ background: i < counts[e] ? col.glyph : "#F6E1E8" }} />
                ))}
              </span>
              <span className="num text-right font-semibold">{counts[e]}개</span>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 grid gap-3">
        {r.reading.elements.notes.map((n, i) => (
          <div key={i} className="rounded-xl bg-card p-4 text-sm leading-relaxed">
            <h3 className="font-bold text-brand">{n.title}</h3>
            <p className="mt-1">{n.text}</p>
            {n.basis && <p className="mt-1 text-xs text-sub">근거: {n.basis}</p>}
          </div>
        ))}
      </div>
    </Card>
  );
}
