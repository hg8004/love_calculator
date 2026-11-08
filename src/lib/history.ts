/**
 * 결과 기록 — 이 브라우저(localStorage)에만 저장한다. 서버로 보내지 않는다.
 * 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서도 오류 없이 동작하도록 모든 접근을 try/catch로 감싼다.
 */
export interface HistoryEntry {
  id: string;
  savedAt: string;
  name: string;
  /** 다시 계산할 때 쓰는 요청 본문 (input + options) */
  request: { input: Record<string, unknown>; options: Record<string, unknown> };
  /** 목록 표시용 요약 */
  birth: string;
  pillars: string;
  nearest: string | null;
}

const KEY = "dugeun-history-v1";
const MAX = 30;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? (list as HistoryEntry[]).filter((e) => e && e.id && e.request) : [];
  } catch {
    return [];
  }
}

function write(list: HistoryEntry[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    return true;
  } catch {
    return false;
  }
}

const sameKey = (a: { name: string; request: unknown }, b: { name: string; request: unknown }) =>
  a.name === b.name && JSON.stringify(a.request) === JSON.stringify(b.request);

/** 같은 이름·입력·설정이면 새로 만들지 않고 맨 위로 올린다. 저장 성공 시 항목을 반환 */
export function saveHistory(e: Omit<HistoryEntry, "id" | "savedAt">): HistoryEntry | null {
  const list = loadHistory();
  const existing = list.find((x) => sameKey(x, e));
  const entry: HistoryEntry = { ...e, id: existing?.id ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, savedAt: new Date().toISOString() };
  const next = [entry, ...list.filter((x) => x.id !== entry.id)];
  return write(next) ? entry : null;
}

export function removeHistory(id: string): HistoryEntry[] {
  const next = loadHistory().filter((x) => x.id !== id);
  write(next);
  return next;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 무시 */
  }
}
