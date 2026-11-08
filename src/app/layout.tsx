import type { Metadata, Viewport } from "next";
import { Nanum_Myeongjo } from "next/font/google";
import "./globals.css";
import FloatingHearts from "@/components/FloatingHearts";

// 명조체 제목 — 빌드 시 내려받아 자체 호스팅(실행 중 외부 요청 없음)
const myeongjo = Nanum_Myeongjo({ weight: ["400", "700", "800"], subsets: ["latin"], preload: false, display: "swap", variable: "--font-myeongjo" });

export const metadata: Metadata = {
  title: "두근두근 인연 해 계산기",
  description: "생년월일시로 읽는 나의 기질과 인연의 시기",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#FFF4F6" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={myeongjo.variable}>
      <body className="min-h-screen">
        <FloatingHearts />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
