'use client';

import { createContext, useCallback, useContext, type ReactNode } from 'react';
import useSWR from 'swr';
import { api, ApiError } from './api';
import type { Role, User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { name: string; email: string; password: string; phone?: string; role: Role }) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const loadMe = async (): Promise<User | null> => {
  try {
    return await api.get<User>('/auth/me');
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null; // signed out
    throw err;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, mutate } = useSWR('me', loadMe, { revalidateOnFocus: false });

  const login = useCallback(
    async (email: string, password: string) => {
      const { user } = await api.post<{ user: User }>('/auth/login', { email, password });
      await mutate(user, { revalidate: false });
      return user;
    },
    [mutate],
  );

  const register = useCallback(
    async (input: { name: string; email: string; password: string; phone?: string; role: Role }) => {
      const { user } = await api.post<{ user: User }>('/auth/register', input);
      await mutate(user, { revalidate: false });
      return user;
    },
    [mutate],
  );

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    await mutate(null, { revalidate: false });
  }, [mutate]);

  return <AuthContext.Provider value={{ user: data ?? null, loading: isLoading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

/** Where each role lands after logging in. */
export const homeFor = (role: Role) =>
  ({ CUSTOMER: '/', RESTAURANT_OWNER: '/partner', DELIVERY_PARTNER: '/rider', ADMIN: '/admin' })[role];
