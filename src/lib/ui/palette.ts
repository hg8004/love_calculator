/**
 * 오행 고정 색상 — 원국표·차트·해석·이미지 카드 전체에 동일하게 사용
 * 목=초록, 화=빨강, 토=노랑, 금=회색(흰색), 수=남색
 * glyph: 큰 한자·막대 등 표시용(한지 배경 대비 3:1 이상), soft: 옅은 배경, ink: 작은 글자용(4.5:1 이상)
 */
import type { Element } from "../saju/constants";

export const ELEMENT_COLOR: Record<Element, { glyph: string; soft: string; ink: string; line: string; name: string; plain: string }> = {
  木: { glyph: "#2E7D4F", soft: "#E3F0E7", ink: "#215C3A", line: "#B9D9C4", name: "목", plain: "나무" },
  火: { glyph: "#C0392B", soft: "#F7E0DC", ink: "#97291E", line: "#EBB8B0", name: "화", plain: "불" },
  土: { glyph: "#A87A0A", soft: "#F7ECCB", ink: "#7A5806", line: "#E5CF8E", name: "토", plain: "흙" },
  金: { glyph: "#737A84", soft: "#F6F6F4", ink: "#4E545C", line: "#CDD1D6", name: "금", plain: "쇠" },
  水: { glyph: "#1F3A6B", soft: "#E1E7F1", ink: "#1F3A6B", line: "#B3C1D8", name: "수", plain: "물" },
};

export const ELEMENT_ORDER: Element[] = ["木", "火", "土", "金", "水"];
