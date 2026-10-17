import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Azure · Food delivery', template: '%s · Azure' },
  description: 'Order from the best restaurants in Bengaluru and track your delivery live.',
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='9' fill='%230a6ad6'/%3E%3Ctext x='16' y='22' font-family='system-ui' font-size='18' font-weight='900' fill='white' text-anchor='middle'%3EA%3C/text%3E%3C/svg%3E",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
