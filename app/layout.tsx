import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stellar Mastery | Level 2 Live Poll dApp',
  description:
    'Level 2 Yellow Belt — multi-wallet StellarWalletsKit, Soroban poll contract, real-time events, and transaction status on testnet.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased text-slate-100">{children}</body>
    </html>
  );
}
