import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '易采协同台 · SupplyFlow Bidding | 供应链询报价与多角色在线竞价系统',
  description:
    '企业级供应链询报价（RFQ）、暗标在线竞价、多维度智能评标与采购降本分析协同工作台',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
