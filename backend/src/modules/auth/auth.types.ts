// ─── Auth Types ───────────────────────────────────────────────────────────────

export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  provider: AuthProvider;
  createdAt: Date;
  updatedAt: Date;
}
