import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '틈픽 | 환승길 스마트 픽업',
  description:
    '신도림·영등포역 근처 맛집을 주문하고 환승길 픽업존에서 찾아가세요.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
