/** 모든 해석 문장은 근거(Evidence)를 동반한다 — PART 18 */
export interface Evidence {
  /** 1. 분석한 원국 위치 */
  positions: string[];
  /** 2. 작용한 천간·지지 */
  chars: string[];
  /** 3. 관련 십성 */
  tenGods: string[];
  /** 4. 영향을 준 대운·세운·월운 */
  luck: string[];
  /** 5. 합·충·형·파·해의 작용 방식 */
  relations: string[];
  /** 6. 긍정·부정 해석의 공존 여부 */
  balance: string;
  /** 7. 결론을 도출한 이유 */
  reasoning: string;
}

export interface Statement {
  text: string;
  evidence: Evidence;
}

export interface Section {
  key: string;
  title: string;
  statements: Statement[];
}

export function ev(partial: Partial<Evidence> & { reasoning: string }): Evidence {
  return {
    positions: partial.positions ?? [],
    chars: partial.chars ?? [],
    tenGods: partial.tenGods ?? [],
    luck: partial.luck ?? [],
    relations: partial.relations ?? [],
    balance: partial.balance ?? "이 문장은 단일 방향의 경향을 서술하며, 원국 전체 구조와 운의 흐름에 따라 다르게 나타날 수 있습니다.",
    reasoning: partial.reasoning,
  };
}
