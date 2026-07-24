// ─── User Types ───────────────────────────────────────────────────────────────

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  status: UserStatus;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}
