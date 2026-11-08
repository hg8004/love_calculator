/**
 * 한국어 조사 자동 선택: "재성이(가)" → "재성이", "인정을(를)" → "인정을", "午과(와)" → "午와"
 * 앞 글자의 받침을 판별한다. 한자(천간·지지·오행)는 한글 독음으로, 숫자는 한글 읽기로 판단한다.
 */
import { BRANCHES, BRANCHES_KO, STEMS, STEMS_KO } from "./saju/constants";

const HANJA_READING: Record<string, string> = { 木: "목", 火: "화", 土: "토", 金: "금", 水: "수", 局: "국", 合: "합", 冲: "충" };
STEMS.forEach((s, i) => (HANJA_READING[s] = STEMS_KO[i]));
BRANCHES.forEach((b, i) => (HANJA_READING[b] = BRANCHES_KO[i]));
const DIGIT_READING = ["영", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];

/** 받침: null(판단 불가) | 0(없음) | 8(ㄹ) | 기타 코드 */
function finalConsonant(ch: string): number | null {
  let c = ch;
  if (HANJA_READING[c]) c = HANJA_READING[c];
  else if (/[0-9]/.test(c)) c = DIGIT_READING[Number(c)];
  else if (c === "%") c = "트";
  const code = c.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return null;
  return (code - 0xac00) % 28;
}

function lastMeaningfulChar(prefix: string): string | null {
  let s = prefix;
  // 괄호로 끝나면 괄호 앞 단어 기준: "재성(37.5%)이(가)" → "성"
  for (let guard = 0; guard < 3 && /[)\]]$/.test(s); guard++) {
    const open = s.lastIndexOf(s.endsWith(")") ? "(" : "[");
    if (open <= 0) return null;
    s = s.slice(0, open);
  }
  s = s.replace(/['"’”]+$/, "");
  return s.length ? s[s.length - 1] : null;
}

const PAIRS: Array<[RegExp, (b: number) => string]> = [
  [/이\(가\)/, (b) => (b ? "이" : "가")],
  [/은\(는\)/, (b) => (b ? "은" : "는")],
  [/을\(를\)/, (b) => (b ? "을" : "를")],
  [/과\(와\)|와\(과\)/, (b) => (b ? "과" : "와")],
  [/가\(이\)/, (b) => (b ? "이" : "가")],
  [/는\(은\)/, (b) => (b ? "은" : "는")],
  [/를\(을\)/, (b) => (b ? "을" : "를")],
  [/\(으\)로/, (b) => (b && b !== 8 ? "으로" : "로")],
  [/이\(라\)/, (b) => (b ? "이라" : "라")],
];

const PATTERN = /(이\(가\)|은\(는\)|을\(를\)|과\(와\)|와\(과\)|가\(이\)|는\(은\)|를\(을\)|\(으\)로|이\(라\))/g;

export function fixJosa(text: string): string {
  if (!text.includes("(")) return text;
  return text.replace(PATTERN, (m, _g, offset: number, whole: string) => {
    const ch = lastMeaningfulChar(whole.slice(0, offset));
    if (!ch) return m;
    const b = finalConsonant(ch);
    if (b === null) return m;
    const rule = PAIRS.find(([re]) => re.test(m));
    return rule ? rule[1](b) : m;
  });
}

/** 객체 안의 모든 문자열에 fixJosa 적용 (Date 등은 보존) */
export function deepFixJosa<T>(v: T): T {
  if (typeof v === "string") return fixJosa(v) as unknown as T;
  if (Array.isArray(v)) return v.map((x) => deepFixJosa(x)) as unknown as T;
  if (v && typeof v === "object" && !(v instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[k] = deepFixJosa(x);
    return out as T;
  }
  return v;
}
