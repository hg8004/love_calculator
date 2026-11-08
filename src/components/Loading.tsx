"use client";
import { useEffect, useState } from "react";
import { HEART_PATH } from "./FloatingHearts";

const MESSAGES = ["만세력에서 절기를 찾는 중…", "여덟 글자를 세우는 중…", "두근두근, 인연의 기운을 읽는 중…"];

/** 분석 중 화면 — 핑크 하트가 두근두근 뛴다 */
export default function Loading() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, MESSAGES.length - 1)), 550);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6" role="status" aria-live="polite">
      <svg viewBox="0 0 24 24" width={72} height={72} aria-hidden="true" className="heartbeat">
        <defs>
          <linearGradient id="loading-heart" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F07AA3" />
            <stop offset="1" stopColor="#C2386A" />
          </linearGradient>
        </defs>
        <path d={HEART_PATH} fill="url(#loading-heart)" />
      </svg>
      <p className="font-serif text-xl font-bold text-brand">{MESSAGES[i]}</p>
    </div>
  );
}
