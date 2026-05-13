import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Person AI Chat",
  description: "基于向量数据库的简单 AI 问答页面",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
