/**
 * 결과 화면용 쉬운 해석 — 일간과 오행 분포에 따라 문장이 달라진다.
 *  - 성격·기질(일간 중심) / 오행 과다·부족
 *  - 연애 성향 (배우자궁·배우자성 분석은 love.ts)
 * 각 항목은 basis(근거 한 줄)를 함께 가진다.
 */
import { ELEMENTS, ELEMENT_KO, Element, STEMS, STEMS_KO, STEM_ELEMENT, TEN_GOD_GROUP, TenGod, TenGodGroup, elementOfGroup, controlledBy, controlsWhat } from "../saju/constants";
import type { NatalChart } from "../saju/chart";
import { DAY_STEM_PROFILE, FEMALE_APPEARANCE, MALE_APPEARANCE } from "../love/knowledge";
import { ELEMENT_MANY, ELEMENT_NONE, GROUP_PLAIN } from "./knowledge";

export interface ReadingItem {
  title: string;
  text: string;
  basis?: string;
}

export interface Reading {
  dayMaster: { char: string; element: Element; title: string; summary: string };
  elements: { counts: Record<Element, number>; many: Element[]; none: Element[]; notes: ReadingItem[] };
  personality: ReadingItem[];
  loveStyle: ReadingItem[];
}

export function buildReading(chart: NatalChart, gender: "male" | "female"): Reading {
  const ds = chart.dayStem;
  const dmEl = STEM_ELEMENT[ds];
  const prof = DAY_STEM_PROFILE[ds];
  const w = chart.tenGodWeighted;
  const st = chart.strength;
  const counts = chart.elements.count;

  // ── 일간 ──
  const strengthPlain =
    st.score >= 60 ? "자기 기운이 강한 편이라 주관이 뚜렷하고 스스로 이끌어 가는 힘이 있어요."
      : st.score >= 40 ? "기운이 한쪽으로 치우치지 않아 상황에 맞춰 균형을 잘 잡는 편이에요."
        : "주변의 기운을 많이 받는 편이라 좋은 사람·환경을 만나면 힘이 크게 살아나요.";
  const dayMaster = {
    char: STEMS[ds],
    element: dmEl,
    title: `${STEMS[ds]}(${STEMS_KO[ds]}${ELEMENT_KO[dmEl]}) — ${prof.image}`,
    summary: `${prof.nature} ${strengthPlain}`,
  };

  // ── 오행 ──
  const many = ELEMENTS.filter((e) => counts[e] >= 3).sort((a, b) => counts[b] - counts[a]);
  const none = ELEMENTS.filter((e) => counts[e] === 0);
  const hiddenHas = (e: Element) => Object.values(chart.pillars).some((p) => p?.hidden.some((h) => STEM_ELEMENT[h.stem] === e));
  const elNotes: ReadingItem[] = [];
  for (const e of many) elNotes.push({ title: `${ELEMENT_KO[e]}(${e})이(가) 많아요 · ${counts[e]}개`, text: `${ELEMENT_MANY[e].good} 다만 ${ELEMENT_MANY[e].care}`, basis: `여덟 글자 중 ${e} ${counts[e]}개` });
  for (const e of none)
    elNotes.push({
      title: `${ELEMENT_KO[e]}(${e})이(가) 없어요`,
      text: ELEMENT_NONE[e] + (hiddenHas(e) ? " 겉으로는 없지만 지지 속(지장간)에 숨어 있어, 필요할 때 꺼내 쓸 수 있는 기운이에요." : ""),
      basis: hiddenHas(e) ? "천간·지지 0개, 지지 속(지장간)에는 있음" : "천간·지지·지장간 모두 없음",
    });
  if (!many.length && !none.length) elNotes.push({ title: "오행이 고르게 있어요", text: "다섯 기운이 비교적 고르게 있어 어느 한쪽으로 치우치지 않는 편이에요.", basis: ELEMENTS.map((e) => `${e}${counts[e]}`).join(" ") });

  // ── 성격 ──
  const groups: TenGodGroup[] = ["비겁", "식상", "재성", "관성", "인성"];
  const topGroup = [...groups].sort((a, b) => w[b] - w[a])[0];
  const groupSocial: Record<TenGodGroup, string> = {
    비겁: "친구처럼 대등한 관계를 좋아하고, 간섭받는 것은 싫어해요.",
    식상: "대화를 이끌고 분위기를 만드는 데 능해요.",
    재성: "사람을 폭넓게 사귀고 실질적인 도움을 주고받아요.",
    관성: "예의와 약속을 중요하게 여겨 믿음직하다는 말을 들어요.",
    인성: "이야기를 잘 들어 주고 조언자 역할을 자주 맡아요.",
  };
  const personality: ReadingItem[] = [
    { title: "타고난 기질", text: dayMaster.summary, basis: `나를 뜻하는 글자(일간) ${STEMS[ds]}(${ELEMENT_KO[dmEl]}) · 기운의 세기 ${st.score}점` },
    { title: "사람을 대할 때", text: `${prof.social} ${groupSocial[topGroup]}`, basis: `가장 많은 기운: ${GROUP_PLAIN[topGroup]} ${w[topGroup]}%` },
    { title: "감정 표현", text: prof.emotion + (w["식상"] >= 25 ? " 생각한 것을 말과 행동으로 잘 드러내는 편이에요." : w["인성"] >= 25 ? " 감정을 충분히 정리한 뒤에 표현하는 편이에요." : ""), basis: `표현하는 기운 ${w["식상"]}% · 생각하는 기운 ${w["인성"]}%` },
    { title: "강점", text: prof.strengths.join(", ") + (many[0] ? `. 그리고 ${ELEMENT_MANY[many[0]].good}` : "."), basis: `일간 ${STEMS[ds]}${many[0] ? ` · ${ELEMENT_KO[many[0]]} ${counts[many[0]]}개` : ""}` },
    { title: "조심할 점", text: prof.cautions.join(", ") + (many[0] ? `. 또 ${ELEMENT_MANY[many[0]].care}` : "."), basis: `일간 ${STEMS[ds]}${many[0] ? ` · ${ELEMENT_KO[many[0]]}이(가) 많음` : ""}` },
  ];

  // ── 연애 성향 (취향은 '경향'으로만) ──
  const sg: TenGodGroup = gender === "male" ? "재성" : "관성";
  const sgEl = elementOfGroup(ds, sg);
  const look = (gender === "male" ? MALE_APPEARANCE : FEMALE_APPEARANCE)[`${dmEl}+${sgEl}`];
  const attractedEl = gender === "female" ? controlledBy(dmEl) : controlsWhat(dmEl);
  const firstSight = chart.shinsal.some((s) => s.name === "도화살") || w["식상"] >= 25;
  const day = chart.pillars.day!;
  // 문장 원칙: "사주에 ○○가 있어 ○○한 사람이 잘 맞아요/끌려요!" — 근거와 결론을 한 문장에
  const dayTg = day.branchTenGod as TenGod;
  const outerLook = look.replace(/ 이미지$/, "");
  const loveStyle: ReadingItem[] = [
    {
      title: "나의 연애 스타일",
      text: firstSight
        ? `사주에 ${chart.shinsal.some((s) => s.name === "도화살") ? "도화(사람을 끄는 매력의 기운)" : "표현의 기운(식상)"}이(가) 있어 첫인상과 설렘에 먼저 끌리는 편이에요! ${STYLE_BY_STEM[ds]}`
        : `나를 뜻하는 글자가 ${DM_SHORT[ds]}(${STEMS[ds]})이(라), 첫눈에 반하기보다 믿음이 쌓일 때 마음이 깊어지는 편이에요! ${STYLE_BY_STEM[ds]}`,
      basis: `일간 ${STEMS[ds]}${firstSight ? " · 도화 또는 식상" : ""}`,
    },
    {
      title: "끌리는 외형",
      text: `사주에서 이성을 뜻하는 별이 ${ELEMENT_KO[sgEl]}(${ELEMENT_COMMON[sgEl]})의 기운이라, ${outerLook} 외형에 눈길이 가요! ${ELEMENT_BODY[sgEl]}`,
      basis: `나의 기운 ${ELEMENT_KO[dmEl]} + 이성의 별 기운 ${ELEMENT_KO[sgEl]} (전통 해석)`,
    },
    {
      title: "잘 맞는 사람",
      text: `배우자 자리(일지)에 ${TG_TAG[dayTg]}이(가) 있어 ${PALACE_MATCH[dayTg]}`,
      basis: `일지 ${day.branchChar} · ${dayTg}`,
    },
    {
      title: "나에게 끌리는 사람",
      text:
        attractedEl === sgEl
          ? `사주에 ${ELEMENT_KO[dmEl]}(${ELEMENT_COMMON[dmEl]})의 기운이 있어, ${ELEMENT_PERSON[attractedEl]}이(가) 나에게 끌리기 쉬워요! 마침 내가 끌리는 사람도 이런 사람이라 서로 마음이 통하기 쉬워요.`
          : `사주에 ${ELEMENT_KO[dmEl]}(${ELEMENT_COMMON[dmEl]})의 기운이 있어, ${ELEMENT_PERSON[attractedEl]}이(가) 나에게 먼저 다가오기 쉬워요! 다만 내가 끌리는 건 ${ELEMENT_PERSON[sgEl]}이라, 나를 좋아하는 사람과 내가 좋아하는 사람이 다를 수 있어요.`,
      basis: `상대 사주에서 내 기운(${ELEMENT_KO[dmEl]})이 이성의 별이 되는 사람`,
    },
  ];

  return { dayMaster, elements: { counts, many, none, notes: elNotes }, personality, loveStyle };
}

/** 오행을 쉬운 말로 */
const ELEMENT_COMMON: Record<Element, string> = { 木: "나무", 火: "불", 土: "흙", 金: "쇠", 水: "물" };
/** 오행이 '어떤 사람'인지 풀어서 */
const ELEMENT_PERSON: Record<Element, string> = {
  木: "곧고 진취적이며 늘 성장하려는 사람",
  火: "밝고 열정적이며 감정 표현이 풍부한 사람",
  土: "듬직하고 믿음직하며 품이 넓은 사람",
  金: "결단력 있고 깔끔하며 기준이 분명한 사람",
  水: "지혜롭고 유연하며 생각이 깊은 사람",
};
const DM_SHORT = ["곧게 자라는 큰 나무", "유연한 화초", "환한 태양", "따뜻한 촛불", "듬직한 큰 산", "포근한 논밭", "단단한 바위", "반짝이는 보석", "깊고 넓은 바다", "촉촉한 이슬비"];
/** 이성의 별 오행에 따른 외형 */
const ELEMENT_BODY: Record<Element, string> = {
  木: "키가 크고 팔다리가 길쭉하며, 싱그럽고 풋풋한 인상의 사람에게 특히 마음이 가요.",
  火: "표정이 밝고 이목구비가 뚜렷하며, 화사하게 꾸밀 줄 아는 사람에게 특히 마음이 가요.",
  土: "어깨가 넓고 체격이 탄탄하며, 편안하고 푸근한 인상의 사람에게 특히 마음이 가요.",
  金: "골격이 반듯하고 얼굴선이 또렷하며, 깔끔하게 차려입는 사람에게 특히 마음이 가요.",
  水: "눈빛이 부드럽고 선이 고우며, 차분하고 지적인 인상의 사람에게 특히 마음이 가요.",
};
/** 일지 십성의 쉬운 이름 */
export const TG_TAG: Record<TenGod, string> = {
  비견: "나와 닮은 기운(비견)", 겁재: "경쟁하는 기운(겁재)", 식신: "여유와 표현의 기운(식신)", 상관: "재치와 표현의 기운(상관)", 편재: "활동적인 기운(편재)",
  정재: "성실한 기운(정재)", 편관: "강한 책임감의 기운(편관)", 정관: "반듯한 질서의 기운(정관)", 편인: "독특한 직관의 기운(편인)", 정인: "보살핌의 기운(정인)",
};
/** 일지 십성별 잘 맞는 사람 */
export const PALACE_MATCH: Record<TenGod, string> = {
  비견: "친구처럼 편하게 지낼 수 있는, 나와 비슷한 사람이 잘 맞아요!",
  겁재: "에너지가 넘치고 자기 세계가 뚜렷해 함께 자극을 주고받는 사람이 잘 맞아요!",
  식신: "대화가 잘 통하고, 맛있는 걸 함께 먹으며 여유를 즐길 수 있는 사람이 잘 맞아요!",
  상관: "말이 잘 통하고 재치가 넘쳐 매일이 즐거운 사람이 잘 맞아요!",
  편재: "활동적이고 사교적이라 함께 여기저기 다니며 즐길 수 있는 사람이 잘 맞아요!",
  정재: "생활력 있고 성실해서 믿고 함께 살림을 꾸릴 수 있는 사람이 잘 맞아요!",
  편관: "강단 있고 든든하게 리드해 주는 사람이 잘 맞아요!",
  정관: "예의 바르고 약속을 잘 지키는 반듯한 사람이 잘 맞아요!",
  편인: "취향이 독특하고 생각이 깊어 대화가 늘 새로운 사람이 잘 맞아요!",
  정인: "나를 깊이 이해해 주고 다정하게 챙겨 주는 사람이 잘 맞아요!",
};
/** 일간별 연애 방식 한 줄 */
const STYLE_BY_STEM = [
  "좋아하면 든든한 버팀목이 되어 주고 싶어 해요.",
  "세심하게 챙겨 주고 다정한 교감을 나누는 걸 좋아해요.",
  "좋아하는 마음을 숨기지 않고 적극적으로 표현해요.",
  "조용하지만 한번 마음을 주면 오래 깊게 사랑해요.",
  "말보다 행동과 시간으로 믿음을 보여 주는 편이에요.",
  "상대를 꼼꼼히 챙기며 함께 생활을 꾸려 가는 걸 좋아해요.",
  "한번 마음을 정하면 우직하게 지키는 편이에요.",
  "나를 소중히 대해 주는 섬세한 관계를 원해요.",
  "서로의 자유를 존중하면서 깊이 통하는 관계를 원해요.",
  "나를 이해해 주는 따뜻한 사람에게 마음을 열어요.",
];
