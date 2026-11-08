import type { AnalysisResult } from "./analyze";

/** API 응답(JSON)에서 Date 는 ISO 문자열이 된다 */
export type Serialized<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Array<Serialized<U>>
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;

export type AnalysisDTO = Serialized<AnalysisResult>;

export function toDTO(r: AnalysisResult): AnalysisDTO {
  return JSON.parse(JSON.stringify(r)) as AnalysisDTO;
}
