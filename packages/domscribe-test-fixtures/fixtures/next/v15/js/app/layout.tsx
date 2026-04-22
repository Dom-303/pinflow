import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PinFlow Preview - Next.js 15',
  description: 'Test fixture for Domscribe transform validation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
