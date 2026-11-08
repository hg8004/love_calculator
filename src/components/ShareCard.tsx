"use client";
import { useState } from "react";
import type { AnalysisDTO } from "@/lib/serialize";
import { ELEMENT_COLOR, ELEMENT_ORDER } from "@/lib/ui/palette";
import { buildFullResultText } from "@/lib/prompt/crossPrompt";
import { Card, CopyButton } from "./ui";
import { HEART_PATH } from "./FloatingHearts";

const W = 1080;
const H = 1350;

function serifFamily(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-myeongjo").trim();
  return `${v ? v + ", " : ""}"Noto Serif KR", Batang, AppleMyungjo, serif`;
}
const SANS = `Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const ch of text) {
    if (ctx.measureText(cur + ch).width > maxW) {
      lines.push(cur);
      cur = ch;
      if (lines.length === maxLines) break;
    } else cur += ch;
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (lines.length === maxLines && text.length > lines.join("").length) lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + "…";
  return lines;
}

/** 결과 요약 이미지 카드 (1080×1350, 4:5) */
export async function renderSummaryCard(r: AnalysisDTO, name: string): Promise<Blob> {
  const serif = serifFamily();
  try {
    await Promise.all([document.fonts.load(`800 60px ${serif}`, "사주甲子"), document.fonts.load(`700 150px ${serif}`, "甲子丙午")]);
  } catch {
    /* 글꼴을 못 불러와도 대체 글꼴로 그린다 */
  }
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // 한지 바탕 + 섬유 점
  ctx.fillStyle = "#FFF4F6";
  ctx.fillRect(0, 0, W, H);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(190,90,130,${0.02 + rnd() * 0.035})`;
    ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2.2, 1 + rnd() * 0.8);
  }
  ctx.strokeStyle = "#F3D6DF";
  ctx.lineWidth = 2;
  roundRect(ctx, 40, 40, W - 80, H - 80, 28);
  ctx.stroke();
  // 은은한 하트 장식 (글자와 겹치지 않는 모서리)
  const heart = new Path2D(HEART_PATH);
  for (const [x, y, s, a] of [[70, 70, 3.2, 0.14], [950, 92, 2.2, 0.12], [985, 150, 1.4, 0.1], [92, 1215, 1.8, 0.1], [960, 1205, 2.8, 0.12]] as const) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = `rgba(232,93,138,${a})`;
    ctx.fill(heart);
    ctx.restore();
  }

  // 머리말
  ctx.fillStyle = "#A52A58";
  ctx.font = `600 30px ${SANS}`;
  ctx.textAlign = "center";
  ctx.fillText("두근두근 인연 해 계산기", W / 2, 120);
  ctx.fillStyle = "#9C2452";
  ctx.font = `800 64px ${serif}`;
  ctx.fillText(`${name ? name + "님" : "나"}의 사주`, W / 2, 205);
  const inp = r.input;
  ctx.fillStyle = "#6B6255";
  ctx.font = `400 28px ${SANS}`;
  ctx.fillText(
    `${inp.calendar === "solar" ? "양력" : "음력"} ${inp.year}.${inp.month}.${inp.day}${inp.hour !== null ? ` ${String(inp.hour).padStart(2, "0")}:${String(inp.minute).padStart(2, "0")}` : " (시간 모름)"} · ${inp.gender === "male" ? "남성" : "여성"}`,
    W / 2,
    255,
  );

  // 네 기둥
  const keys = ["hour", "day", "month", "year"] as const;
  const labels = { year: "연주", month: "월주", day: "일주", hour: "시주" };
  const cell = 170;
  const gap = 30;
  const x0 = (W - (cell * 4 + gap * 3)) / 2;
  const yLabel = 300;
  keys.forEach((k, i) => {
    const x = x0 + i * (cell + gap);
    ctx.fillStyle = "#9C2452";
    ctx.font = `700 28px ${SANS}`;
    ctx.textAlign = "center";
    ctx.fillText(labels[k] + (k === "day" ? " (나)" : ""), x + cell / 2, yLabel);
    const p = r.chart.pillars[k];
    [0, 1].forEach((row) => {
      const y = yLabel + 22 + row * (cell + 16);
      if (!p) {
        ctx.setLineDash([10, 8]);
        ctx.strokeStyle = "#CFC5B0";
        roundRect(ctx, x, y, cell, cell, 22);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#9C927F";
        ctx.font = `400 64px ${SANS}`;
        ctx.fillText("?", x + cell / 2, y + cell / 2 + 22);
        return;
      }
      const el = row === 0 ? p.stemElement : p.branchElement;
      const ch = row === 0 ? p.stemChar : p.branchChar;
      const col = ELEMENT_COLOR[el];
      ctx.fillStyle = col.soft;
      roundRect(ctx, x, y, cell, cell, 22);
      ctx.fill();
      ctx.lineWidth = k === "day" && row === 0 ? 5 : 2;
      ctx.strokeStyle = k === "day" && row === 0 ? col.glyph : col.line;
      ctx.stroke();
      ctx.fillStyle = col.glyph;
      ctx.font = `700 118px ${serif}`;
      ctx.textBaseline = "middle";
      ctx.fillText(ch, x + cell / 2, y + cell / 2 + 6);
      ctx.textBaseline = "alphabetic";
    });
  });

  // 오행 막대
  let y = yLabel + 22 + 2 * cell + 16 + 60;
  ctx.textAlign = "left";
  ctx.fillStyle = "#9C2452";
  ctx.font = `700 34px ${serif}`;
  ctx.fillText("오행 분포", 90, y);
  y += 30;
  const counts = r.reading.elements.counts;
  const maxC = Math.max(4, ...Object.values(counts));
  ELEMENT_ORDER.forEach((e, i) => {
    const yy = y + i * 42;
    const col = ELEMENT_COLOR[e];
    ctx.fillStyle = col.ink;
    ctx.font = `700 28px ${SANS}`;
    ctx.fillText(`${e} ${col.name}`, 90, yy + 28);
    const bx = 210;
    const bw = 680;
    const seg = (bw - (maxC - 1) * 6) / maxC;
    for (let s = 0; s < maxC; s++) {
      ctx.fillStyle = s < counts[e] ? col.glyph : "#F6E1E8";
      roundRect(ctx, bx + s * (seg + 6), yy + 8, seg, 22, 6);
      ctx.fill();
    }
    ctx.fillStyle = "#252D38";
    ctx.textAlign = "right";
    ctx.fillText(`${counts[e]}개`, W - 90, yy + 30);
    ctx.textAlign = "left";
  });

  // 일간 한 줄
  y += 5 * 42 + 45;
  const dm = r.reading.dayMaster;
  ctx.fillStyle = "#9C2452";
  ctx.font = `700 32px ${serif}`;
  for (const line of wrap(ctx, `나의 일간 · ${dm.title}`, W - 180, 2)) {
    ctx.fillText(line, 90, y);
    y += 40;
  }

  // 인연 시기
  const t = r.summary.timing;
  y += 6;
  ctx.fillStyle = "#9C2452";
  roundRect(ctx, 80, y, W - 160, 150, 22);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `600 26px ${SANS}`;
  ctx.fillText("다가오는 인연 시기", 115, y + 44);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `800 52px ${serif}`;
  ctx.fillText(t.nearest ? `${t.nearest.year}년 ${t.nearest.month}월` : "흐름 확인 필요", 115, y + 102);
  ctx.font = `500 24px ${SANS}`;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  const best = t.bestYears.map((b) => `${b.year}`).join(" · ");
  ctx.fillText(`10년 중 인연운이 강한 해 ${best}`, 115, y + 134);

  // 꼬리말
  ctx.fillStyle = "#6B6255";
  ctx.font = `400 22px ${SANS}`;
  ctx.textAlign = "center";
  ctx.fillText("명리학 상징에 기반한 참고 해석이며 미래를 확정하지 않습니다", W / 2, H - 72);

  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지 생성 실패"))), "image/png"));
}

export default function ShareCard({ r, name }: { r: AnalysisDTO; name: string }) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileName = `사주_${name || "결과"}_${r.input.year}${String(r.input.month).padStart(2, "0")}${String(r.input.day).padStart(2, "0")}.png`;

  const make = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const blob = await renderSummaryCard(r, name);
      if (preview) URL.revokeObjectURL(preview);
      const url = URL.createObjectURL(blob);
      setPreview(url);
      return { blob, url };
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    const { url } = await make();
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    setMsg("이미지를 저장했어요.");
  };
  const share = async () => {
    const { blob, url } = await make();
    const file = new File([blob], fileName, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: "두근두근 인연 해 계산기", text: `${name || "나"}의 사주 결과` });
        return;
      } catch {
        return; // 사용자가 공유를 취소
      }
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    setMsg("이 기기에서는 바로 공유할 수 없어 이미지를 저장했어요. 저장된 이미지를 보내 주세요.");
  };

  return (
    <Card id="share" title="공유 · 저장" subtitle="결과 요약을 이미지 카드로 저장하거나 공유할 수 있어요. 이미지는 이 기기에서만 만들어지고 서버로 보내지 않아요.">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={save} className="rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-2 disabled:opacity-60">{busy ? "만드는 중…" : "이미지로 저장"}</button>
        <button type="button" disabled={busy} onClick={share} className="rounded-xl border border-brand bg-sheet px-4 py-3 text-sm font-bold text-brand disabled:opacity-60">공유하기</button>
        <CopyButton label="결과 글로 복사" getText={() => (name ? `${name}님의 ` : "") + buildFullResultText(r)} className="!rounded-xl !py-3" />
      </div>
      {msg && <p className="mt-3 text-sm text-sub" role="status">{msg}</p>}
      {preview && <img src={preview} alt="저장된 결과 요약 이미지 미리보기" className="mt-4 w-full max-w-xs rounded-xl border border-line" />}
    </Card>
  );
}
