import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PH Weekly Research",
  description: "매주 자동 갱신되는 Product Hunt 상위 서비스 분석 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
