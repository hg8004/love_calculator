/**
 * PART 7~10 — 이성 취향, 외모 취향, 월지 십성 취향, 배우자궁·배우자상
 * 참고 데이터(knowledge.ts)를 공식처럼 쓰지 않고, 배우자성의 존재·위치·정편 구성과 일지·월지·오행 구조를 함께 본다.
 */
import {
  BRANCHES, ELEMENT_KO, Element, STEMS, STEM_ELEMENT, TEN_GOD_GROUP, TenGod, TenGodGroup,
  controlledBy, controlsWhat, seasonOfBranch, elementOfGroup,
} from "../saju/constants";
import type { NatalChart } from "../saju/chart";
import {
  BRANCH_SPOUSE_IMAGE, DAY_STEM_PROFILE, ELEMENT_IMAGE, ELEMENT_VALUES, FEMALE_APPEARANCE, MALE_APPEARANCE,
  MONTH_TENGOD_PREFERENCE, SEASON_SPOUSE, SPOUSE_STAR_TYPE, STAGE_SPOUSE, TEN_GOD_INFO,
} from "./knowledge";
import { Section, Statement, ev } from "./types";

interface StarOccurrence {
  pos: string;
  char: string;
  tenGod: TenGod;
  weight: number;
  layer: "천간" | "지지 정기" | "지장간";
}

export function spouseStarOccurrences(chart: NatalChart, gender: "male" | "female"): StarOccurrence[] {
  const sg: TenGodGroup = gender === "male" ? "재성" : "관성";
  const out: StarOccurrence[] = [];
  for (const p of Object.values(chart.pillars)) {
    if (!p) continue;
    const lab = p.label.replace("주", "");
    if (p.stemTenGod !== "일간" && TEN_GOD_GROUP[p.stemTenGod] === sg) out.push({ pos: `${lab}간`, char: p.stemChar, tenGod: p.stemTenGod, weight: 1, layer: "천간" });
    p.hidden.forEach((h) => {
      if (TEN_GOD_GROUP[h.tenGod] !== sg) return;
      const isMain = h.role === "정기";
      out.push({ pos: `${lab}지`, char: h.char, tenGod: h.tenGod, weight: isMain ? 0.8 : 0.3, layer: isMain ? "지지 정기" : "지장간" });
    });
  }
  return out;
}

export function analyzePreferences(chart: NatalChart, gender: "male" | "female"): { sections: Section[]; appearanceFocus: { score: number; level: string; factors: string[] } } {
  const ds = chart.dayStem;
  const dsChar = STEMS[ds];
  const dmEl = STEM_ELEMENT[ds];
  const sg: TenGodGroup = gender === "male" ? "재성" : "관성";
  const sgEl = elementOfGroup(ds, sg);
  const occ = spouseStarOccurrences(chart, gender);
  const jeong = gender === "male" ? "정재" : "정관";
  const pyeon = gender === "male" ? "편재" : "편관";
  const jW = occ.filter((o) => o.tenGod === jeong).reduce((a, o) => a + o.weight, 0);
  const pW = occ.filter((o) => o.tenGod === pyeon).reduce((a, o) => a + o.weight, 0);
  const day = chart.pillars.day!;
  const month = chart.pillars.month!;
  const w = chart.tenGodWeighted;
  const occText = occ.length ? occ.map((o) => `${o.pos} ${o.char}(${o.tenGod}, ${o.layer})`) : [`원국에 ${sg} 없음`];

  // ───────── A. 외적 취향 ─────────
  const table = gender === "male" ? MALE_APPEARANCE : FEMALE_APPEARANCE;
  const baseImage = table[`${dmEl}+${sgEl}`];
  const external: Statement[] = [
    {
      text: `${dsChar} 일간에게 ${sg}은(는) ${ELEMENT_KO[sgEl]}(${sgEl}) 오행이므로, 전통 해석상 '${baseImage}'에 끌리기 쉬운 경향이 있습니다. ${sgEl} 기운의 외적 상징은 ${ELEMENT_IMAGE[sgEl]}입니다.`,
      evidence: ev({
        positions: occ.map((o) => o.pos), chars: [dsChar, ...occ.map((o) => o.char)], tenGods: [sg],
        reasoning: `${gender === "male" ? "남성은 재성" : "여성은 관성"}을 이성(배우자)의 상징으로 보고, 일간 오행(${dmEl})과 ${sg} 오행(${sgEl})의 조합으로 선호 이미지를 참고했습니다.`,
        balance: occ.length ? "원국의 다른 구조(일지·식상·도화 등)에 따라 실제 취향은 달라질 수 있는 참고 해석입니다." : `원국에 ${sg}이(가) 드러나지 않아 이 경향은 약하게 작용하며, 운에서 ${sg}이(가) 들어올 때 더 뚜렷해질 수 있습니다.`,
      }),
    },
  ];
  if (jW + pW > 0) {
    const dominant = jW >= pW * 1.3 ? jeong : pW >= jW * 1.3 ? pyeon : null;
    external.push({
      text: dominant
        ? `${sg} 중 ${dominant}이(가) 우세하여 상대의 ${SPOUSE_STAR_TYPE[dominant as keyof typeof SPOUSE_STAR_TYPE]}에 더 눈이 가는 편입니다.`
        : `${jeong}(${SPOUSE_STAR_TYPE[jeong as keyof typeof SPOUSE_STAR_TYPE]})과 ${pyeon}(${SPOUSE_STAR_TYPE[pyeon as keyof typeof SPOUSE_STAR_TYPE]})이 비슷하게 섞여 있어, 안정감과 강렬한 매력 사이에서 취향이 상황에 따라 달라질 수 있습니다.`,
      evidence: ev({
        positions: occ.map((o) => o.pos), tenGods: [jeong, pyeon], chars: occ.map((o) => o.char),
        reasoning: `${jeong} 가중치 ${jW.toFixed(1)}, ${pyeon} 가중치 ${pW.toFixed(1)} (천간 1.0, 지지 정기 0.8, 기타 지장간 0.3)`,
        balance: gender === "female" && jW > 0 && pW > 0 ? "정관과 편관이 함께 있는 관살혼잡 구조는 다양한 유형에 끌릴 수 있다는 의미와 함께, 선택에 혼란을 겪을 수 있다는 해석이 공존합니다." : undefined,
      }),
    });
  }
  // 외모 기준 까다로움 지표
  const factors: string[] = [];
  let score = 0;
  if (w["식상"] >= 25) { score++; factors.push(`식상 발달(${w["식상"]}%): 감각적·심미적 기준이 높아지는 경향`); }
  if (w["식상"] >= 15 && Object.values(chart.pillars).some((p) => p && (p.stemTenGod === "상관" || p.branchTenGod === "상관"))) { score++; factors.push("상관 투출 또는 지지 정기: 세련됨과 센스를 따지는 경향"); }
  const dayTg = day.branchTenGod;
  if (["식신", "상관", "편재", "편관"].includes(dayTg) || (gender === "male" ? dayTg === "정재" : dayTg === "정관")) { score++; factors.push(`일지 십성 ${dayTg}: 배우자궁에서 표현·매력 요소가 작용`); }
  if ([0, 3, 6, 9].includes(chart.dayBranch)) { score++; factors.push(`일지 ${day.branchChar}가 왕지(子午卯酉, 도화 글자)`); }
  if (chart.shinsal.some((s) => s.name === "홍염살")) { score++; factors.push("홍염살: 분위기·색채감에 대한 감수성"); }
  if (Object.values(chart.pillars).some((p) => p && p.stage === "목욕")) { score++; factors.push("목욕지: 꾸밈과 매력에 대한 관심"); }
  if (chart.elements.weighted["火"] >= 25) { score++; factors.push(`火 기운(${chart.elements.weighted["火"]}%): 화려함·밝은 이미지에 반응`); }
  if (chart.shinsal.some((s) => s.name === "도화살" && s.positions.some((p) => p.startsWith("일지")))) { score++; factors.push("일지 도화: 배우자궁의 매력 요소"); }
  const level = score >= 4 ? "높음" : score >= 2 ? "보통" : "낮음";
  external.push({
    text:
      level === "높음"
        ? "외모와 분위기에 대한 기준이 까다로운 편일 가능성이 있습니다. 첫인상과 스타일, 감각이 맞는지를 중요하게 볼 수 있습니다."
        : level === "보통"
          ? "외적인 매력과 분위기를 적당히 중요하게 보지만, 그것만으로 결정하지는 않는 편입니다."
          : "외모 자체보다는 성격·가치관·편안함을 더 중시할 가능성이 큽니다.",
    evidence: ev({
      positions: ["일지", "식상", "신살", "십이운성", "오행 분포"], chars: [day.branchChar],
      reasoning: `외모 취향 보조 요소 ${score}개 해당: ${factors.length ? factors.join(" / ") : "해당 요소 없음"}. 4개 이상 '높음', 2~3개 '보통', 0~1개 '낮음'으로 분류했습니다.`,
      balance: "보조 요소의 개수는 경향성 비교를 위한 참고 지표이며 실제 취향을 단정하지 않습니다.",
    }),
  });
  const season = seasonOfBranch(chart.dayBranch);
  external.push({
    text: `배우자궁(일지 ${day.branchChar})은 ${season}의 기운으로, '${SEASON_SPOUSE[season].image}'에 끌리기 쉬운 경향을 보조적으로 나타냅니다.`,
    evidence: ev({ positions: ["일지"], chars: [day.branchChar], reasoning: `일지의 계절(${season})을 배우자상의 분위기 참고로 사용했습니다: ${SEASON_SPOUSE[season].keywords.join(", ")}.` }),
  });

  // ───────── B. 내적 취향 ─────────
  const monthTg = month.branchTenGod;
  const internal: Statement[] = [
    {
      text: `월지 ${month.branchChar}의 십성이 ${monthTg}이므로, '${MONTH_TENGOD_PREFERENCE[monthTg]}'에게 끌리기 쉬운 경향이 있습니다.`,
      evidence: ev({
        positions: ["월지"], chars: [month.branchChar], tenGods: [monthTg],
        reasoning: "월지는 사회적 환경과 가치관의 바탕을 형성하는 자리로, 월지 십성이 선호하는 사람의 성향에 영향을 준다고 보는 참고 해석입니다.",
        balance: "월지 십성만으로 결론을 내리지 않고 일지·배우자성과 함께 봅니다(아래 항목 참조).",
      }),
    },
    {
      text: `일지(배우자궁)의 십성은 ${dayTg}로, 실제 가까운 관계에서는 '${TEN_GOD_INFO[dayTg].partnerType}'과 편안함을 느끼기 쉽습니다.`,
      evidence: ev({ positions: ["일지"], chars: [day.branchChar], tenGods: [dayTg], reasoning: "일지는 가장 가까운 관계(배우자)의 자리이므로 실제 생활에서 맞는 성향을 보완적으로 보여 줍니다." }),
    },
  ];
  if (monthTg !== dayTg && TEN_GOD_GROUP[monthTg] !== TEN_GOD_GROUP[dayTg]) {
    internal.push({
      text: `월지(${monthTg})와 일지(${dayTg})의 성향이 달라, 처음 끌리는 유형과 오래 함께하기 편한 유형이 다를 수 있습니다.`,
      evidence: ev({ positions: ["월지", "일지"], tenGods: [monthTg, dayTg], reasoning: "월지(사회적 기준)와 일지(사적 관계)의 십성 그룹이 서로 다를 때 이런 차이가 생길 수 있다고 해석했습니다.", balance: "두 성향을 모두 갖춘 상대를 찾거나, 어느 쪽을 우선할지 스스로 정리하는 것이 도움이 됩니다." }),
    });
  }
  const valuesList: Array<{ k: string; v: string; why: string; tg: string[] }> = [
    { k: "가치관", v: `${ELEMENT_VALUES[sgEl]}을(를) 중시하는 사람, 그리고 당신의 ${ELEMENT_VALUES[dmEl]}을(를) 존중해 주는 사람`, why: `배우자성 오행(${sgEl})과 일간 오행(${dmEl})의 상징 가치`, tg: [sg] },
    { k: "경제관념", v: w["재성"] >= 20 ? "돈 관리가 분명하고 현실 감각이 있는 사람(본인도 재성이 발달해 경제적 기준이 분명한 편)" : "경제관념이 무리하지 않고 상식적인 사람(본인은 물질보다 의미를 우선하는 편)", why: `재성 비율 ${w["재성"]}%`, tg: ["재성"] },
    { k: "책임감", v: w["관성"] >= 20 ? "약속과 규칙을 잘 지키는 반듯한 사람" : "지나치게 통제하지 않고 자율성을 인정해 주는 사람", why: `관성 비율 ${w["관성"]}%`, tg: ["관성"] },
    { k: "대화 방식", v: w["식상"] >= 20 ? "리액션이 좋고 대화가 즐거운 사람" : w["인성"] >= 20 ? "이야기를 잘 들어 주고 깊이 있는 대화가 되는 사람" : "편안하게 일상을 나눌 수 있는 사람", why: `식상 ${w["식상"]}%, 인성 ${w["인성"]}%`, tg: ["식상", "인성"] },
    { k: "정서적 교감", v: w["인성"] >= 20 || chart.elements.weighted["水"] >= 25 ? "감정을 세심하게 이해해 주는 사람" : "감정 표현이 분명하고 솔직한 사람", why: `인성 ${w["인성"]}%, 水 ${chart.elements.weighted["水"]}%`, tg: ["인성"] },
    { k: "존경할 수 있는 점", v: gender === "female" ? (w["관성"] >= 15 ? "사회적으로 신뢰받고 자기 분야에서 인정받는 모습" : "자기 일에 대한 진정성과 꾸준함") : (w["인성"] >= 15 ? "배울 점이 있고 생각이 깊은 모습" : "생활력과 성실함"), why: gender === "female" ? `관성 ${w["관성"]}%` : `인성 ${w["인성"]}%`, tg: [gender === "female" ? "관성" : "인성"] },
    { k: "생활 방식", v: chart.strength.score >= 55 ? "서로의 독립적인 생활과 결정을 존중하는 사람" : "함께하는 시간과 일상의 공유를 소중히 여기는 사람", why: `신강약 ${chart.strength.score}점(${chart.strength.level})`, tg: ["비겁", "인성"] },
  ];
  for (const v of valuesList) {
    internal.push({ text: `${v.k}: ${v.v}`, evidence: ev({ tenGods: v.tg, reasoning: `${v.why}에 근거한 해석입니다.`, balance: "십성 비율에 따른 경향이며, 실제 선호는 경험과 환경에 따라 달라집니다." }) });
  }

  // ───────── C. 연애 방식 ─────────
  const attractFactors: string[] = [];
  if (pW > jW) attractFactors.push(`${pyeon} 우세`);
  if (w["식상"] >= 25) attractFactors.push("식상 발달");
  if (chart.shinsal.some((s) => s.name === "도화살")) attractFactors.push("도화살");
  if (chart.elements.weighted["火"] >= 25) attractFactors.push("火 기운 강함");
  const slowFactors: string[] = [];
  if (jW >= pW && jW > 0) slowFactors.push(`${jeong} 우세`);
  if (w["인성"] >= 22) slowFactors.push("인성 발달");
  if (w["관성"] >= 22 && gender === "male") slowFactors.push("관성 발달(신중함)");
  if (chart.elements.weighted["土"] >= 25) slowFactors.push("土 기운 강함");
  const firstSight = attractFactors.length > slowFactors.length;
  const styleSt: Statement[] = [
    {
      text: firstSight
        ? `첫눈에 끌리는 감각이 비교적 강한 편입니다. 강렬한 첫인상, 대화의 재미, 분위기에 먼저 반응합니다.`
        : `첫눈에 반하기보다 시간이 지나며 신뢰가 쌓일 때 마음이 깊어지는 편입니다.`,
      evidence: ev({
        tenGods: [jeong, pyeon, "식상", "인성"],
        reasoning: `즉시적 끌림 요소: ${attractFactors.join(", ") || "없음"} / 점진적 호감 요소: ${slowFactors.join(", ") || "없음"}. 두 요소의 개수를 비교했습니다.`,
        balance: attractFactors.length && slowFactors.length ? "두 요소가 모두 있어, 처음엔 끌림으로 시작하되 결국 신뢰를 확인해야 마음을 정하는 양면성이 있을 수 있습니다." : undefined,
      }),
    },
    {
      text: `첫눈에 끌리는 유형: ${TEN_GOD_INFO[pyeon as TenGod].partnerType} / 시간이 지나며 좋아지는 유형: ${TEN_GOD_INFO[jeong as TenGod].partnerType}`,
      evidence: ev({ tenGods: [pyeon, jeong], reasoning: `편(偏)의 배우자성은 강렬함·즉각적 매력, 정(正)의 배우자성은 안정·지속적 신뢰를 상징한다는 전통 해석을 적용했습니다.` }),
    },
    {
      text: `연애에서 중요하게 생각하는 요소: ${chart.strength.score >= 55 ? "존중과 자율성, 서로의 영역 인정" : "안정감과 정서적 지지, 함께하는 시간"}. 상대에게 기대하는 역할: ${gender === "female" ? (w["관성"] >= 15 ? "믿고 의지할 수 있는 든든한 파트너" : "친구처럼 편하게 소통하는 동반자") : w["재성"] >= 15 ? "삶을 함께 꾸려 가는 현실적인 동반자" : "감정을 나누는 정서적 동반자"}.`,
      evidence: ev({ tenGods: [sg], reasoning: `신강약(${chart.strength.score}점)과 배우자성 비율(${w[sg]}%)을 근거로 했습니다.` }),
    },
  ];
  const conflicts: string[] = [];
  if (gender === "male" && w["비겁"] >= 30 && w["재성"] > 0) conflicts.push("비겁이 강해 재성(배우자성)을 다투는 구조(군겁쟁재) — 자기 주장·경쟁심이 관계에서 충돌로 이어지지 않도록 주의");
  if (gender === "female" && w["식상"] >= 25 && w["관성"] > 0) conflicts.push("식상이 강해 관성을 극하는 구조(상관견관 경향) — 상대의 부족한 점을 날카롭게 지적하는 말투에 주의");
  if (gender === "female" && jW > 0 && pW > 0) conflicts.push("관살혼잡 — 서로 다른 유형 사이에서 선택이 흔들릴 수 있음");
  if (gender === "male" && jW > 0 && pW > 0) conflicts.push("정재·편재 혼재 — 안정과 자극 사이에서 기준이 흔들릴 수 있음");
  for (const r of chart.relations.filter((r) => r.involvesDayBranch && ["충", "형", "원진", "해", "귀문"].includes(r.kind))) conflicts.push(`${r.label} — 배우자궁이 ${r.kind}의 작용을 받아 관계에서 긴장이나 변화가 생길 수 있음`);
  if (chart.strength.score >= 70) conflicts.push("일간이 강해 관계에서 주도권을 쥐려는 경향");
  if (chart.strength.score < 30) conflicts.push("일간이 약해 상대에게 맞추다 지치는 경향");
  styleSt.push({
    text: conflicts.length ? `관계에서 발생할 수 있는 갈등: ${conflicts.join(" / ")}` : "원국 구조상 두드러진 갈등 요인은 적은 편입니다. 다만 운의 흐름에 따라 일시적인 긴장이 생길 수 있습니다.",
    evidence: ev({
      relations: chart.relations.filter((r) => r.involvesDayBranch).map((r) => `${r.label}: ${r.description}`),
      tenGods: ["비겁", "식상", sg],
      reasoning: "십성 간 극(剋) 구조와 배우자궁(일지)의 충·형·원진·해 여부로 갈등 요인을 도출했습니다.",
      balance: "갈등 요인은 관계를 깨는 요소가 아니라 미리 알고 조율할 수 있는 지점입니다.",
    }),
  });

  // ───────── D. 나에게 끌리기 쉬운 사람 ─────────
  const attractedEl: Element = gender === "female" ? controlledBy(dmEl) : controlsWhat(dmEl);
  const attractedStems = STEMS.filter((_, i) => STEM_ELEMENT[i] === attractedEl).join("·");
  const myImage = ELEMENT_IMAGE[dmEl];
  const dSt: Statement[] = [
    {
      text: `당신의 일간 ${dsChar}(${dmEl})은(는) ${attractedStems} 일간을 가진 ${gender === "female" ? "남성에게 재성(이성의 상징)" : "여성에게 관성(이성의 상징)"}이 됩니다. 이런 사람들은 당신에게서 ${ELEMENT_VALUES[dmEl]}과(와) ${myImage}을(를) 매력으로 느끼기 쉽습니다.`,
      evidence: ev({
        positions: ["일간"], chars: [dsChar],
        tenGods: [gender === "female" ? "상대의 재성" : "상대의 관성"],
        reasoning: (gender === "female"
          ? `${attractedEl} 일간의 남성에게는 그가 극하는 ${dmEl}이(가) 재성(이성의 상징)입니다`
          : `${attractedEl} 일간의 여성에게는 그를 극하는 ${dmEl}이(가) 관성(이성의 상징)입니다`) +
          " — 상대의 사주에서 당신의 일간 오행이 배우자성이 되는 경우를 역으로 계산했습니다.",
        balance: "상대의 사주 전체 구조에 따라 실제 끌림은 달라지며, 이는 일간 오행만 본 단순화된 참고입니다.",
      }),
    },
    {
      text: `당신이 끌리는 유형(${sgEl} 기운: ${ELEMENT_IMAGE[sgEl]})과 당신에게 끌리는 유형(${attractedEl} 기운의 사람)은 ${sgEl === attractedEl ? "같은 오행이어서, 서로 끌림이 쌍방향으로 일어나기 쉬운 구조입니다." : `서로 다릅니다. 내가 좋아하는 사람과 나를 좋아하는 사람이 다를 수 있다는 의미로, ${attractedEl} 기운의 사람은 당신을 적극적으로 원하고 당신은 ${sgEl} 기운의 사람에게 마음이 가는 엇갈림이 생길 수 있습니다.`}`,
      evidence: ev({
        tenGods: [sg],
        reasoning: `내가 끌리는 대상 = 나의 ${sg} 오행(${sgEl}) / 나에게 끌리는 대상 = 나의 일간 오행을 ${gender === "female" ? "재성" : "관성"}으로 갖는 일간(${attractedEl}).`,
        balance: "엇갈림은 단점만이 아닙니다. 나를 원하는 사람과의 관계는 존중받는 안정감을, 내가 원하는 사람과의 관계는 설렘과 동기를 줍니다.",
      }),
    },
  ];
  const peach = chart.shinsal.filter((s) => ["도화살", "홍염살"].includes(s.name));
  if (w["식상"] >= 20 || peach.length) {
    dSt.push({
      text: `${w["식상"] >= 20 ? `식상(${w["식상"]}%)의 표현력` : ""}${w["식상"] >= 20 && peach.length ? "과 " : ""}${peach.length ? peach.map((p) => p.name).join("·") : ""}이(가) 있어 대화와 분위기에서 매력이 드러나기 쉽습니다.`,
      evidence: ev({ positions: peach.flatMap((p) => p.positions), tenGods: ["식상"], reasoning: "식상은 자기표현, 도화·홍염은 이성적 매력의 상징으로 봅니다.", balance: "매력이 드러나는 만큼 원치 않는 관심이나 오해가 생길 수 있다는 해석도 함께 있습니다." }),
    });
  }

  // ───────── 배우자궁 및 배우자상 (PART 10) ─────────
  const dayRels = chart.relations.filter((r) => r.involvesDayBranch);
  const dayStemRels = chart.relations.filter((r) => r.involvesDayStem);
  const palaceStruct: Statement[] = [
    {
      text: `배우자궁은 일지 ${day.branchChar}(${BRANCHES[chart.dayBranch]}, ${ELEMENT_KO[day.branchElement]})이며 십성은 ${day.branchTenGod}입니다. ${BRANCH_SPOUSE_IMAGE[chart.dayBranch]}.`,
      evidence: ev({ positions: ["일지"], chars: [day.branchChar], tenGods: [day.branchTenGod], reasoning: "일지는 일간(나)이 앉은 자리로, 배우자와 가정생활을 상징하는 배우자궁입니다." }),
    },
    {
      text: `지장간은 ${day.hidden.map((h) => `${h.char}(${h.role}, ${h.tenGod}${h.revealed ? ", 천간 투출" : ""})`).join(" · ")}입니다.` +
        (day.hidden.some((h) => TEN_GOD_GROUP[h.tenGod] === sg) ? ` 배우자궁 안에 배우자성(${sg})이 들어 있어, 배우자와의 인연이 생활 속에서 자연스럽게 연결되는 구조로 봅니다.` : ` 배우자궁 안에 배우자성(${sg})이 없어, 배우자상은 원국 다른 위치의 ${sg}과 운에서 들어오는 ${sg}을 함께 보아야 합니다.`),
      evidence: ev({ positions: ["일지 지장간"], chars: day.hidden.map((h) => h.char), tenGods: day.hidden.map((h) => h.tenGod), reasoning: "일지 지장간은 배우자궁 안에 숨은 기운으로, 배우자의 내면적 성향과 관계의 속사정을 상징합니다." }),
    },
    {
      text: `일간 ${dsChar}이(가) 일지에서 ${day.stage}의 십이운성을 가집니다 — ${STAGE_SPOUSE[day.stage]}.`,
      evidence: ev({ positions: ["일간", "일지"], chars: [dsChar, day.branchChar], reasoning: "일간 기준 일지의 십이운성(봉법)은 배우자궁에서 나의 에너지 상태를 나타내는 참고 지표입니다.", balance: "십이운성은 기운의 강약 흐름을 보는 보조 지표로, 단독으로 길흉을 판단하지 않습니다." }),
    },
    {
      text: dayRels.length
        ? `일지가 원국 안에서 ${dayRels.map((r) => r.label).join(", ")} 관계를 맺고 있습니다. ` + dayRels.map((r) => relationPalaceComment(r.kind)).join(" ")
        : "일지가 원국 안에서 합·충·형·파·해 관계를 맺지 않아, 배우자궁 자체는 외부 간섭이 적은 편입니다. 운에서 들어오는 글자와의 관계가 더 중요하게 작용합니다.",
      evidence: ev({
        positions: ["일지", ...dayRels.flatMap((r) => r.members.map((m) => m.pos))],
        relations: dayRels.map((r) => `${r.label}: ${r.description}${r.transform ? ` (합화 가능성 ${r.transform.possibility}: ${r.transform.reasons.join(" ")})` : ""}`),
        reasoning: "배우자궁에 작용하는 합충형파해를 개별적으로 확인했습니다. 합은 자동 가점, 충은 자동 감점으로 처리하지 않았습니다.",
        balance: "합은 결속과 함께 '묶여서 본래 기능이 약해지는' 면이, 충은 갈등과 함께 '변화와 새 출발'의 면이 공존합니다.",
      }),
    },
  ];
  if (dayStemRels.length) {
    palaceStruct.push({
      text: `일간이 천간에서 ${dayStemRels.map((r) => r.label).join(", ")} 관계를 맺어 연애 감정과 태도에 영향을 줍니다.`,
      evidence: ev({ relations: dayStemRels.map((r) => `${r.label}: ${r.description}`), positions: ["일간"], reasoning: "일간과 다른 천간의 합·충은 관계에서의 감정적 태도를 보여 줍니다." }),
    });
  }

  const sp = SEASON_SPOUSE[season];
  const jeongStar = TEN_GOD_INFO[jeong as TenGod];
  const spouseImage: Statement[] = [
    {
      text: `1) 외적으로 끌리기 쉬운 배우자상: ${baseImage}, ${sp.image}. ${level === "높음" ? "분위기와 스타일이 세련된 사람에게 먼저 시선이 갈 수 있습니다." : "외모보다는 인상과 분위기의 조화가 중요합니다."}`,
      evidence: ev({ positions: ["일지", ...occ.map((o) => o.pos)], tenGods: [sg], chars: [day.branchChar], reasoning: `배우자성 오행(${sgEl})의 외적 상징 + 일지 계절(${season}) + 외모 기준 지표(${level})를 종합했습니다.`, balance: "실제 배우자의 외모를 예측하는 것이 아니라 끌리기 쉬운 경향입니다." }),
    },
    {
      text: `2) 내적으로 잘 맞을 가능성이 있는 배우자상: ${TEN_GOD_INFO[dayTg].partnerType}. 일지 ${dayTg}의 성향을 존중해 주는 사람과 생활 리듬이 잘 맞을 수 있습니다.`,
      evidence: ev({ positions: ["일지"], tenGods: [dayTg], reasoning: "배우자궁(일지)의 십성은 함께 생활할 때 편안함을 느끼는 성향을 상징합니다." }),
    },
    {
      text: `3) 장기적인 관계에 적합할 가능성이 있는 유형: ${jeongStar.partnerType}${chart.strength.favorableGroups.includes(sg) ? `. 일간이 ${chart.strength.level}이므로 배우자성(${sg}) 기운을 감당할 힘이 있어, 안정적인 배우자성의 상징과 잘 어울립니다.` : `. 다만 일간이 ${chart.strength.level}이므로, 나를 지지하고 기운을 북돋아 주는(인성·비겁의 성향) 사람이 장기적으로 편안할 수 있습니다.`}`,
      evidence: ev({ tenGods: [jeong, ...chart.strength.favorableGroups], reasoning: `정(正) 배우자성(${jeong})은 안정적 결합의 상징이며, 억부 관점의 희용 그룹(${chart.strength.favorableGroups.join("·")})을 함께 고려했습니다.`, balance: "억부 기준은 여러 용신 관점 중 하나이며, 학파에 따라 다른 결론이 가능합니다." }),
    },
    {
      text: `4) 관계에서 주의할 필요가 있는 유형: ${cautionType(chart, gender)}`,
      evidence: ev({ tenGods: chart.strength.unfavorableGroups, relations: dayRels.filter((r) => ["충", "형", "원진"].includes(r.kind)).map((r) => r.label), reasoning: "억부 관점에서 부담이 되는 기운(기신 방향)과 배우자궁의 긴장 관계를 근거로 했습니다.", balance: "주의 유형은 피해야 할 사람이 아니라, 관계에서 서로 노력이 더 필요할 수 있는 조합이라는 의미입니다." }),
    },
  ];

  return {
    sections: [
      { key: "external", title: "A. 외적 취향", statements: external },
      { key: "internal", title: "B. 내적 취향", statements: internal },
      { key: "style", title: "C. 연애 방식", statements: styleSt },
      { key: "attracted", title: "D. 나에게 끌리기 쉬운 사람", statements: dSt },
      { key: "palace", title: "배우자궁 구조", statements: palaceStruct },
      { key: "spouse", title: "배우자상", statements: spouseImage },
    ],
    appearanceFocus: { score, level, factors },
  };
}

function relationPalaceComment(kind: string): string {
  switch (kind) {
    case "육합": case "반합": case "삼합": case "방합": return "합은 배우자와의 결속·정을 상징하지만, 다른 글자와 묶여 배우자궁의 독립성이 약해질 수도 있습니다.";
    case "충": return "충은 배우자궁의 변동성(이동·생활 변화·관계 재정립)을 의미하며, 서로 거리와 변화를 인정하는 관계에서 오히려 안정될 수 있습니다.";
    case "형": return "형은 관계 안에서 조율과 책임의 문제가 반복될 수 있음을 뜻합니다.";
    case "파": return "파는 사소한 계획 차이로 어긋남이 생길 수 있음을 뜻합니다.";
    case "해": return "해는 말하지 않은 서운함이 쌓일 수 있음을 뜻합니다.";
    case "원진": return "원진은 끌리면서도 미묘한 불편함이 공존할 수 있음을 뜻합니다.";
    case "귀문": return "귀문은 서로의 감정에 예민하게 반응하는 경향을 뜻합니다.";
    case "암합": return "암합은 드러나지 않는 끌림이나 은밀한 연결을 상징하는 참고 관계입니다.";
    case "자형": return "자형은 스스로의 기준 때문에 관계에서 마음고생을 할 수 있음을 뜻합니다.";
    default: return "";
  }
}

function cautionType(chart: NatalChart, gender: "male" | "female"): string {
  const strong = chart.strength.score >= 50;
  const parts: string[] = [];
  if (strong) parts.push("나와 똑같이 고집이 세고 주도권을 다투는 유형(비겁 성향이 강한 사람)과는 부딪힐 수 있습니다");
  else parts.push("지나치게 통제하거나 요구가 많은 유형(관성·재성 성향이 과한 사람)과는 쉽게 지칠 수 있습니다");
  if (gender === "male") parts.push("강한 끌림만으로 시작한 관계(편재형)는 생활 기준을 충분히 맞춰 볼 필요가 있습니다");
  else parts.push("강렬한 카리스마에만 끌린 관계(편관형)는 존중과 배려가 함께 있는지 확인할 필요가 있습니다");
  const chung = chart.relations.find((r) => r.involvesDayBranch && r.kind === "충");
  if (chung) {
    const other = chung.members.find((m) => m.pos !== "일지");
    if (other) parts.push(`배우자궁을 충하는 ${other.char} 기운이 강한 시기·사람과는 변화가 크게 나타날 수 있습니다`);
  }
  return parts.join(". ") + ".";
}
