'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { FoodType } from './types';

export interface CartLine {
  menuItemId: string;
  name: string;
  price: number; // display only; the server re-prices everything
  foodType: FoodType;
  quantity: number;
}

interface CartData {
  restaurantId: string | null;
  restaurantName: string | null;
  restaurantSlug: string | null;
  lines: CartLine[];
}

interface CartState extends CartData {
  count: number;
  subtotal: number;
  /** Returns false if the item belongs to a different restaurant than the current cart. */
  add: (restaurant: { id: string; name: string; slug: string }, item: Omit<CartLine, 'quantity'>, replace?: boolean) => boolean;
  setQuantity: (menuItemId: string, quantity: number) => void;
  clear: () => void;
}

const EMPTY: CartData = { restaurantId: null, restaurantName: null, restaurantSlug: null, lines: [] };
const KEY = 'azure.cart.v1';
const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartData>(EMPTY);

  // Restore after hydration (localStorage isn't available during server rendering).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setCart(JSON.parse(saved) as CartData);
    } catch {
      /* private mode or corrupted value: start empty */
    }
  }, []);

  const persist = useCallback((next: CartData) => {
    setCart(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const add: CartState['add'] = useCallback(
    (restaurant, item, replace = false) => {
      if (cart.restaurantId && cart.restaurantId !== restaurant.id && !replace) return false;
      const base = cart.restaurantId === restaurant.id ? cart : { ...EMPTY, restaurantId: restaurant.id, restaurantName: restaurant.name, restaurantSlug: restaurant.slug };
      const existing = base.lines.find((l) => l.menuItemId === item.menuItemId);
      const lines = existing
        ? base.lines.map((l) => (l.menuItemId === item.menuItemId ? { ...l, quantity: Math.min(20, l.quantity + 1) } : l))
        : [...base.lines, { ...item, quantity: 1 }];
      persist({ ...base, lines });
      return true;
    },
    [cart, persist],
  );

  const setQuantity = useCallback(
    (menuItemId: string, quantity: number) => {
      const lines = cart.lines.map((l) => (l.menuItemId === menuItemId ? { ...l, quantity: Math.min(20, quantity) } : l)).filter((l) => l.quantity > 0);
      persist(lines.length ? { ...cart, lines } : EMPTY);
    },
    [cart, persist],
  );

  const clear = useCallback(() => persist(EMPTY), [persist]);

  const value = useMemo(
    () => ({
      ...cart,
      count: cart.lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: cart.lines.reduce((n, l) => n + l.quantity * l.price, 0),
      add,
      setQuantity,
      clear,
    }),
    [cart, add, setQuantity, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
