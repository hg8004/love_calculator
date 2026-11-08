/**
 * PART 5 — 사주 원국의 기본 성향 분석 (규칙 기반, 근거 포함)
 * 오행 개수만으로 성격을 정하지 않고, 월령·통근·투간·신강약·격국·조후·합충·십이운성·신살을 함께 사용한다.
 */
import { BRANCHES, ELEMENT_KO, STEMS, STEM_ELEMENT, TEN_GOD_GROUP, TenGodGroup, seasonOfBranch } from "../saju/constants";
import type { NatalChart } from "../saju/chart";
import { DAY_STEM_PROFILE, GROUP_TRAIT } from "./knowledge";
import { Section, Statement, ev } from "./types";

const GROUPS: TenGodGroup[] = ["비겁", "식상", "재성", "관성", "인성"];

export function dominantGroups(chart: NatalChart): { strong: TenGodGroup[]; weak: TenGodGroup[] } {
  const w = chart.tenGodWeighted;
  const strong = GROUPS.filter((g) => w[g] >= 28).sort((a, b) => w[b] - w[a]);
  const weak = GROUPS.filter((g) => w[g] <= 6);
  return { strong, weak };
}

function groupPositions(chart: NatalChart, g: TenGodGroup): string[] {
  const out: string[] = [];
  for (const p of Object.values(chart.pillars)) {
    if (!p) continue;
    if (p.stemTenGod !== "일간" && TEN_GOD_GROUP[p.stemTenGod] === g) out.push(`${p.label.replace("주", "")}간 ${p.stemChar}(${p.stemTenGod})`);
    if (TEN_GOD_GROUP[p.branchTenGod] === g) out.push(`${p.label.replace("주", "")}지 ${p.branchChar}(${p.branchTenGod})`);
  }
  return out;
}

export function analyzeProfile(chart: NatalChart, gender: "male" | "female"): Section[] {
  const ds = chart.dayStem;
  const dsChar = STEMS[ds];
  const prof = DAY_STEM_PROFILE[ds];
  const st = chart.strength;
  const day = chart.pillars.day!;
  const month = chart.pillars.month!;
  const season = seasonOfBranch(chart.monthBranch);
  const { strong, weak } = dominantGroups(chart);
  const w = chart.tenGodWeighted;
  const dayRelations = chart.relations.filter((r) => r.involvesDayBranch || r.involvesDayStem);
  const chungs = chart.relations.filter((r) => r.kind === "충" || r.kind === "천간충");
  const haps = chart.relations.filter((r) => ["천간합", "육합", "삼합", "반합", "방합"].includes(r.kind));

  // 1. 타고난 기질
  const temperament: Statement[] = [
    {
      text: `일간 ${dsChar}(${ELEMENT_KO[STEM_ELEMENT[ds]]})은 '${prof.image}'에 비유됩니다. ${prof.nature}`,
      evidence: ev({
        positions: ["일간"], chars: [dsChar], tenGods: ["일간(나 자신)"],
        reasoning: `일간은 사주에서 '나'를 대표하는 글자이므로 기질 해석의 출발점으로 삼았습니다. ${dsChar}의 오행·음양 상징을 기본 성향으로 제시합니다.`,
      }),
    },
    {
      text:
        `${season}(${BRANCHES[chart.monthBranch]}월)에 태어나 ${st.deukryeong ? "월령의 도움을 받고" : "월령의 직접적인 도움은 받지 못하고"} 있으며, 신강약 지표는 ${st.score}점(${st.level})입니다. ` +
        (st.score >= 60
          ? "자기 기운이 강해 스스로 판단하고 주도하는 힘이 크며, 그 힘을 밖으로 풀어낼 통로(식상·재성·관성)가 있을 때 장점이 살아납니다."
          : st.score >= 40
            ? "기운이 한쪽으로 크게 치우치지 않아 상황에 맞춰 균형을 잡는 편입니다."
            : "주변 환경과 사람의 영향을 많이 받으며, 도와주는 기운(인성·비겁)이 들어올 때 안정감과 자신감이 커지는 구조입니다."),
      evidence: ev({
        positions: ["월지", "일지", "전체 천간"], chars: [BRANCHES[chart.monthBranch], day.branchChar],
        tenGods: [month.branchTenGod, day.branchTenGod], relations: [],
        balance: "신강·신약은 좋고 나쁨이 아니라 기운의 방향입니다. 신강은 주도성이 장점이자 고집이 단점이 될 수 있고, 신약은 수용성이 장점이자 의존성이 단점이 될 수 있습니다.",
        reasoning: st.details.join(" "),
      }),
    },
    {
      text: `월지 기준 격국은 ${chart.gyeok.name}으로 볼 수 있습니다. ${chart.johu.description}`,
      evidence: ev({
        positions: ["월지", "천간 투출"], chars: [month.branchChar, ...month.hidden.map((h) => h.char)],
        tenGods: month.hidden.map((h) => `${h.char}:${h.tenGod}`),
        reasoning: `${chart.gyeok.basis} 조후는 출생 계절의 한난조습을 보는 관점으로, 기질의 온도감(따뜻함·차분함)을 보조적으로 설명합니다.`,
        balance: "격국은 학파마다 잡는 방법이 다르며(투출 우선/정기 우선 등), 여기서는 투출 우선 원칙을 적용했습니다.",
      }),
    },
  ];

  // 2. 대인관계 성향
  const social: Statement[] = [
    { text: prof.social, evidence: ev({ positions: ["일간"], chars: [dsChar], reasoning: "일간의 상징에서 도출한 기본적인 대인관계 성향입니다." }) },
  ];
  for (const g of strong.slice(0, 2)) {
    social.push({
      text: `${g}이(가) 발달(가중 비율 ${w[g]}%)하여 ${GROUP_TRAIT[g].social}`,
      evidence: ev({
        positions: groupPositions(chart, g), tenGods: [g],
        reasoning: `지장간 사령일수와 월령 가중치(2배)를 반영한 십성 비율에서 ${g}이(가) 28% 이상으로 두드러집니다.`,
        balance: `${g}의 발달은 장점(${GROUP_TRAIT[g].strong.split(",")[0]})과 과잉 시의 부담이 함께 나타날 수 있습니다.`,
      }),
    });
  }
  const gwiin = chart.shinsal.find((s) => s.name === "천을귀인");
  if (gwiin) {
    social.push({
      text: "천을귀인이 있어 필요할 때 도움을 주는 사람을 만나기 쉬운 인복의 상징이 있습니다.",
      evidence: ev({ positions: gwiin.positions, chars: [], relations: [], reasoning: `산출 기준: ${gwiin.basis}`, balance: "신살은 보조 지표로, 단독으로 인복의 크기를 단정하지 않습니다." }),
    });
  }

  // 3. 감정 표현 방식
  const fire = chart.elements.weighted["火"];
  const water = chart.elements.weighted["水"];
  const emotion: Statement[] = [
    { text: prof.emotion, evidence: ev({ positions: ["일간"], chars: [dsChar], reasoning: "일간의 상징에서 도출한 감정 표현의 기본 방식입니다." }) },
    {
      text:
        w["식상"] >= 25
          ? `식상(${w["식상"]}%)이 발달해 감정과 생각을 말·행동으로 드러내는 편입니다.`
          : w["인성"] >= 25
            ? `인성(${w["인성"]}%)이 발달해 감정을 곧바로 표현하기보다 충분히 정리한 뒤 표현하는 편입니다.`
            : `식상(${w["식상"]}%)과 인성(${w["인성"]}%)이 한쪽으로 치우치지 않아, 상황에 따라 표현의 강약을 조절합니다.`,
      evidence: ev({
        positions: [...groupPositions(chart, "식상"), ...groupPositions(chart, "인성")], tenGods: ["식상", "인성"],
        reasoning: "식상은 표현·발산, 인성은 수용·사고를 상징하므로 두 그룹의 비율로 감정 표현의 방향을 판단했습니다.",
      }),
    },
  ];
  if (fire >= 25 || water >= 25) {
    emotion.push({
      text: fire >= water ? `火 기운(${fire}%)이 강해 감정의 온도가 높고 반응이 빠른 편입니다.` : `水 기운(${water}%)이 강해 감정이 깊고 겉으로는 차분해 보이는 편입니다.`,
      evidence: ev({ positions: ["오행 가중 분포"], chars: [], reasoning: "오행 가중 비율(지장간 포함, 월령 2배)에서 25% 이상인 오행의 성질을 보조적으로 반영했습니다.", balance: "오행 비율은 보조 지표이며, 일간·십성 구조가 우선합니다." }),
    });
  }

  // 4. 장점
  const strengths: Statement[] = prof.strengths.map((s) => ({
    text: s, evidence: ev({ positions: ["일간"], chars: [dsChar], reasoning: `${dsChar} 일간의 전통적 상징에서 도출한 장점입니다.` }),
  }));
  if (strong[0]) strengths.push({ text: GROUP_TRAIT[strong[0]].strong, evidence: ev({ positions: groupPositions(chart, strong[0]), tenGods: [strong[0]], reasoning: `가장 발달한 십성 그룹(${strong[0]} ${w[strong[0]]}%)의 긍정적 측면입니다.` }) });

  // 5. 주의할 성향
  const cautions: Statement[] = prof.cautions.map((s) => ({
    text: s, evidence: ev({ positions: ["일간"], chars: [dsChar], reasoning: `${dsChar} 일간의 상징이 과하게 작용할 때 나타날 수 있는 모습입니다.` }),
  }));
  for (const g of weak) {
    cautions.push({
      text: `${g}이(가) 약해(${w[g]}%) ${GROUP_TRAIT[g].weak}`,
      evidence: ev({ tenGods: [g], reasoning: `${g} 가중 비율이 6% 이하로 낮습니다. 부족한 기운은 대운·세운에서 들어올 때 체감되는 경우가 많습니다.`, balance: "부족함은 결함이 아니라 다른 영역에 힘이 집중되었다는 뜻이기도 합니다." }),
    });
  }
  if (chungs.length) {
    cautions.push({
      text: `원국에 충(${chungs.map((c) => c.label).join(", ")})이 있어 환경 변화나 내적 갈등을 겪기 쉬운 영역이 있습니다. 다만 충은 정체를 깨고 움직이게 하는 힘이기도 합니다.`,
      evidence: ev({
        relations: chungs.map((c) => `${c.label}: ${c.description}`),
        positions: chungs.flatMap((c) => c.members.map((m) => m.pos)),
        balance: "충은 불안정성과 함께 변화·활동성·기회의 측면이 공존합니다. 충의 위치(월지·일지 여부)에 따라 영향 영역이 다릅니다.",
        reasoning: "충은 자동 감점 요소가 아니라 변화가 일어나는 영역을 알려 주는 지표로 해석했습니다.",
      }),
    });
  }

  // 6. 연애에서 나타날 수 있는 특징
  const sg: TenGodGroup = gender === "male" ? "재성" : "관성";
  const sgW = w[sg];
  const love: Statement[] = [
    { text: prof.love, evidence: ev({ positions: ["일간"], chars: [dsChar], reasoning: "일간의 기본 성향을 연애 상황에 적용한 해석입니다." }) },
    {
      text:
        sgW >= 25
          ? `배우자성인 ${sg}이(가) 원국에 뚜렷하여(${sgW}%), 이성과 관계에 대한 관심과 인연의 기회가 비교적 자연스럽게 생기는 구조입니다.${st.score < 40 ? " 다만 일간이 약한 편이라 관계에서 상대에게 맞추느라 지치지 않도록 균형이 중요합니다." : ""}`
          : sgW >= 8
            ? `배우자성인 ${sg}이(가) 적당히 있어(${sgW}%), 관계에 대한 관심이 과하거나 부족하지 않은 편입니다.`
            : `배우자성인 ${sg}이(가) 원국에 약하게 드러나(${sgW}%), 연애가 삶의 우선순위에서 뒤로 밀리거나 인연을 늦게 체감할 수 있습니다. 이는 인연이 없다는 뜻이 아니며, 대운·세운에서 ${sg}이 들어올 때 관계의 계기가 뚜렷해지는 경향이 있습니다.`,
      evidence: ev({
        positions: groupPositions(chart, sg), tenGods: [sg],
        reasoning: `전통 명리 기준으로 ${gender === "male" ? "남성은 재성(정재=처성)" : "여성은 관성(정관=부성)"}을 배우자성으로 봅니다. 지장간까지 포함한 비율로 판단했습니다.`,
        balance: "배우자성이 많다고 연애가 순탄한 것도, 적다고 인연이 없는 것도 아닙니다. 운에서의 작용을 함께 검토합니다(인연 시기 분석 참조).",
      }),
    },
    {
      text: `배우자궁인 일지 ${day.branchChar}은(는) ${day.branchTenGod}이며 일간의 십이운성은 ${day.stage}입니다. ` +
        (dayRelations.length ? `일지·일간이 ${dayRelations.map((r) => r.label).join(", ")} 관계에 참여해 연애 상황에서 이 작용이 드러날 수 있습니다.` : "일지가 원국 안에서 다른 글자와 뚜렷한 합충을 이루지 않아 배우자궁이 비교적 안정적인 편입니다."),
      evidence: ev({
        positions: ["일지"], chars: [day.branchChar, ...day.hidden.map((h) => h.char)], tenGods: [day.branchTenGod, ...day.hidden.map((h) => `${h.char}:${h.tenGod}`)],
        relations: dayRelations.map((r) => `${r.label}: ${r.description}`),
        reasoning: "일지는 배우자궁으로서 연애·결혼 생활에서 드러나는 태도와 배우자와의 관계를 상징합니다. 자세한 분석은 '배우자궁' 섹션에 있습니다.",
      }),
    },
  ];
  const peach = chart.shinsal.filter((s) => s.name === "도화살" || s.name === "홍염살");
  if (peach.length) {
    love.push({
      text: `${peach.map((p) => p.name).join("·")}이(가) 있어 이성에게 매력과 분위기가 전달되기 쉬운 요소가 있습니다. 다만 신살 하나로 인기나 관계의 복잡함을 판단하지 않습니다.`,
      evidence: ev({
        positions: peach.flatMap((p) => p.positions), reasoning: peach.map((p) => `${p.name}: ${p.basis}`).join(" / "),
        balance: "도화·홍염은 매력의 상징인 동시에, 관계에서 감정 소모가 생길 가능성도 함께 해석됩니다. 원국의 관성·인성(절제)과 함께 봐야 합니다.",
      }),
    });
  }
  if (haps.some((h) => h.involvesDayStem)) {
    const h = haps.find((x) => x.involvesDayStem)!;
    love.push({
      text: `일간이 ${h.label}으로 묶여 있어, 정이 들면 쉽게 놓지 못하고 상대와 강하게 연결되려는 경향이 있습니다.`,
      evidence: ev({ relations: [`${h.label}: ${h.description}`, ...(h.transform?.reasons ?? [])], positions: h.members.map((m) => m.pos), reasoning: "일간합은 '정(情)이 끌리는 합'으로 해석하는 전통이 있습니다.", balance: "합은 결속의 장점과 집착·끌려다님의 단점을 함께 가집니다." }),
    });
  }

  return [
    { key: "temperament", title: "타고난 기질", statements: temperament },
    { key: "social", title: "대인관계 성향", statements: social },
    { key: "emotion", title: "감정 표현 방식", statements: emotion },
    { key: "strengths", title: "장점", statements: strengths },
    { key: "cautions", title: "주의해야 할 성향", statements: cautions },
    { key: "love", title: "연애에서 나타날 수 있는 특징", statements: love },
  ];
}
