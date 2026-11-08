import { describe, expect, it } from "vitest";
import { fixJosa } from "../../josa";
import { findRelations, RelItem } from "../relations";
import { checkIntegrity } from "../../ai/interpret-check";

describe("조사 자동 선택", () => {
  it.each([
    ["재성이(가) 발달", "재성이 발달"],
    ["비겁이(가) 약해", "비겁이 약해"],
    ["인성이(가) 많고", "인성이 많고"],
    ["편재이(가) 우세", "편재가 우세"],
    ["인정을(를) 중시", "인정을 중시"],
    ["깊이을(를) 존중", "깊이를 존중"],
    ["午과(와) 합", "午와 합"],
    ["辰과(와) 합", "辰과 합"],
    ["未와(과) 합", "未와 합"],
    ["재성(37.5%)이(가) 뚜렷", "재성(37.5%)이 뚜렷"],
    ["丁이(가) 정재", "丁이 정재"],
    ["火이(가) 강해", "火가 강해"],
    ["金(으)로 변함", "金으로 변함"],
    ["水(으)로 변함", "水로 변함"],
    ["월(으)로", "월로"],
  ])("%s → %s", (a, b) => expect(fixJosa(a)).toBe(b));
});

describe("관계 표기 순서와 위치 일치", () => {
  it("乙辛충·巳酉 반합 순서로 표기하고, 설명문의 위치-글자 짝은 유지", () => {
    const items: RelItem[] = [
      { pos: "년간", source: "원국", kind: "stem", value: 7 }, // 辛
      { pos: "월간", source: "원국", kind: "stem", value: 1 }, // 乙
      { pos: "년지", source: "원국", kind: "branch", value: 9 }, // 酉
      { pos: "월지", source: "원국", kind: "branch", value: 5 }, // 巳
    ];
    const rels = findRelations(items, { monthBranch: 5, stems: [7, 1], branches: [9, 5] });
    const chung = rels.find((r) => r.kind === "천간충")!;
    expect(chung.label).toBe("乙辛충");
    expect(chung.description).toContain("년간 辛");
    expect(chung.description).toContain("월간 乙");
    expect(rels.find((r) => r.kind === "반합")!.label).toBe("巳酉 반합(金)");
  });
});

describe("같은 글자가 여러 위치에 있을 때", () => {
  it("년지·일지 모두 戌 + 세운 午 → 午戌 반합이 년지와 일지(배우자궁) 각각 성립", () => {
    const items: RelItem[] = [
      { pos: "년지", source: "원국", kind: "branch", value: 10 },
      { pos: "월지", source: "원국", kind: "branch", value: 9 },
      { pos: "일지", source: "원국", kind: "branch", value: 10 },
      { pos: "시지", source: "원국", kind: "branch", value: 7 },
      { pos: "세운지지", source: "세운", kind: "branch", value: 6 },
    ];
    const rels = findRelations(items, { monthBranch: 9, stems: [], branches: [10, 9, 10, 7, 6] }, ["세운"]).filter((r) => r.kind === "반합");
    expect(rels).toHaveLength(2);
    expect(rels.some((r) => r.involvesDayBranch)).toBe(true);
    expect(rels.every((r) => r.label === "午戌 반합(火)")).toBe(true);
  });
});

describe("AI 응답 무결성 검사", () => {
  const r = { pillarText: { year: "庚午", month: "辛巳", day: "庚辰", hour: null } } as never;
  it("원국과 다른 일주 언급 시 경고, 시간 미상인데 시주 언급 시 경고", () => {
    const w = checkIntegrity("이 사람의 일주는 甲子이며 시주는 丙寅입니다. 년주 庚午는…", r);
    expect(w.some((x) => x.includes("일주를 甲子"))).toBe(true);
    expect(w.some((x) => x.includes("시주(丙寅)"))).toBe(true);
    expect(w.some((x) => x.includes("년주"))).toBe(false);
  });
});
