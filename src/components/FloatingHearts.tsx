/**
 * 배경에 은은하게 떠오르는 하트들.
 * - 화면 맨 뒤(z-0)에 고정, pointer-events 없음 → 클릭·스크롤을 막지 않는다
 * - 투명도 6~14%, 카드(반투명 흰 배경) 뒤로 지나가 글 읽기를 방해하지 않는다
 * - 움직임 줄이기 설정 시 멈춘 상태로 표시
 * 위치·크기는 고정값(서버·클라이언트 렌더 결과가 같도록 난수 미사용)
 */
const HEARTS: Array<{ left: string; size: number; d: number; delay: number; o: number; sway: number; top: string; color: string }> = [
  { left: "4%", size: 18, d: 26, delay: 0, o: 0.12, sway: 20, top: "15%", color: "#E85D8A" },
  { left: "12%", size: 11, d: 31, delay: 9, o: 0.1, sway: -14, top: "62%", color: "#F28AAE" },
  { left: "21%", size: 24, d: 34, delay: 4, o: 0.08, sway: 26, top: "38%", color: "#E85D8A" },
  { left: "33%", size: 13, d: 28, delay: 15, o: 0.11, sway: -18, top: "80%", color: "#F4A3BF" },
  { left: "46%", size: 16, d: 37, delay: 7, o: 0.07, sway: 22, top: "8%", color: "#E85D8A" },
  { left: "58%", size: 10, d: 25, delay: 19, o: 0.12, sway: -12, top: "52%", color: "#F28AAE" },
  { left: "67%", size: 22, d: 33, delay: 2, o: 0.08, sway: 16, top: "72%", color: "#E85D8A" },
  { left: "76%", size: 12, d: 29, delay: 12, o: 0.11, sway: -20, top: "28%", color: "#F4A3BF" },
  { left: "85%", size: 19, d: 36, delay: 6, o: 0.09, sway: 18, top: "88%", color: "#E85D8A" },
  { left: "93%", size: 14, d: 27, delay: 17, o: 0.12, sway: -16, top: "45%", color: "#F28AAE" },
  { left: "39%", size: 9, d: 30, delay: 22, o: 0.1, sway: 12, top: "18%", color: "#F4A3BF" },
  { left: "71%", size: 9, d: 32, delay: 25, o: 0.1, sway: -10, top: "60%", color: "#F28AAE" },
];

export const HEART_PATH = "M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.6.7-1.4 2.2-2.6 4.3-2.6 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21z";

export default function FloatingHearts() {
  return (
    <div aria-hidden="true" className="no-print pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {HEARTS.map((h, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          width={h.size}
          height={h.size}
          className="heart-float"
          style={{ left: h.left, ["--d" as string]: `${h.d}s`, ["--delay" as string]: `-${h.delay}s`, ["--o" as string]: h.o, ["--sway" as string]: `${h.sway}px`, ["--top" as string]: h.top }}
        >
          <path d={HEART_PATH} fill={h.color} />
        </svg>
      ))}
    </div>
  );
}
