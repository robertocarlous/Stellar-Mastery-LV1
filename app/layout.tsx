import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stellar Mastery | White Belt Payment dApp',
  description:
    'Level 1 White Belt Stellar dApp — connect Freighter, view XLM balance, and send testnet payments.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased text-slate-100">{children}</body>
    </html>
  );
}
