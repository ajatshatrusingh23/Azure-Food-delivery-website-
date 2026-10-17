'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth';
import { CartProvider } from '@/lib/cart';
import { SocketProvider } from '@/lib/socket';
import { Navbar } from './Navbar';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <SocketProvider>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 pt-6 pb-24">{children}</main>
        </SocketProvider>
      </CartProvider>
    </AuthProvider>
  );
}
