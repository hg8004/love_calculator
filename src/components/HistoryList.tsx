"use client";
import type { HistoryEntry } from "@/lib/history";

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 내 기록 목록 — 누르면 다시 조회, 삭제 가능 */
export default function HistoryList({
  items, onOpen, onDelete, onClear, onNew,
}: {
  items: HistoryEntry[];
  onOpen: (e: HistoryEntry) => void;
  onDelete: (e: HistoryEntry) => void;
  onClear: () => void;
  onNew: () => void;
}) {
  return (
    <div className="mx-auto grid w-full max-w-md gap-4">
      <div>
        <h1 className="font-serif text-2xl font-bold text-brand">내 기록</h1>
        <p className="mt-1 text-sm text-sub">본 결과가 자동으로 기록돼요. 누르면 다시 볼 수 있어요. 기록은 이 기기의 브라우저에만 저장되고 서버로 보내지 않아요.</p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-sheet/80 p-8 text-center text-sm text-sub">
          아직 기록이 없어요.
          <button type="button" onClick={onNew} className="mt-4 block w-full rounded-xl bg-brand px-4 py-3 font-bold text-white">내 사주 보기</button>
        </div>
      ) : (
        <>
          <ul className="grid gap-2.5">
            {items.map((e) => (
              <li key={e.id} className="flex items-stretch gap-2">
                <button type="button" onClick={() => onOpen(e)} className="min-w-0 flex-1 rounded-xl border border-line bg-sheet p-4 text-left transition hover:border-brand">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-serif text-lg font-bold text-brand">{e.name ? `${e.name}님` : "이름 없음"}</span>
                    <span className="shrink-0 text-[11px] text-sub">{fmtDate(e.savedAt)}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-sub">{e.birth}</span>
                  <span className="hanja mt-1.5 block text-sm tracking-wide">{e.pillars}</span>
                  {e.nearest && <span className="mt-1.5 inline-block rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-semibold text-white">인연 시기 {e.nearest}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(e)}
                  aria-label={`${e.name || "이름 없음"} 기록 삭제`}
                  className="shrink-0 rounded-xl border border-line bg-sheet px-3 text-sm text-[#97291E] hover:border-[#C0392B]"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
          <div className="flex justify-between gap-2">
            <button type="button" onClick={onNew} className="rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white">새 사주 보기</button>
            <button type="button" onClick={onClear} className="rounded-xl border border-line bg-sheet px-4 py-3 text-sm text-[#97291E]">기록 전체 삭제</button>
          </div>
        </>
      )}
    </div>
  );
}
