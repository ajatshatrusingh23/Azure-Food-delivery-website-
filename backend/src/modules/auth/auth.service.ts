import type { IBaseService } from '@interfaces/service.interface';
import type { PaginationQuery, PaginatedResult } from '@types/common.types';
import type { AuthRepository } from './auth.repository';
import type { AuthUser, AuthTokenPair } from './auth.types';
import type {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './auth.dto';

// ─── Auth Service ─────────────────────────────────────────────────────────────

export class AuthService implements IBaseService<AuthUser, RegisterDto, Partial<RegisterDto>> {
  constructor(private readonly authRepository: AuthRepository) {}

  async getById(id: string): Promise<AuthUser> {
    void id;
    return Promise.resolve({} as AuthUser);
  }

  async getAll(pagination: PaginationQuery): Promise<PaginatedResult<AuthUser>> {
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }

  async create(dto: RegisterDto): Promise<AuthUser> {
    void dto;
    return Promise.resolve({} as AuthUser);
  }

  async update(id: string, dto: Partial<RegisterDto>): Promise<AuthUser> {
    void id;
    void dto;
    return Promise.resolve({} as AuthUser);
  }

  async remove(id: string): Promise<void> {
    void id;
    return Promise.resolve();
  }

  async register(dto: RegisterDto): Promise<AuthTokenPair> {
    void dto;
    return Promise.resolve({ accessToken: '', refreshToken: '' });
  }

  async login(dto: LoginDto): Promise<AuthTokenPair> {
    void dto;
    return Promise.resolve({ accessToken: '', refreshToken: '' });
  }

  async logout(userId: string): Promise<void> {
    void userId;
    return Promise.resolve();
  }

  async refreshToken(dto: RefreshTokenDto): Promise<AuthTokenPair> {
    void dto;
    return Promise.resolve({ accessToken: '', refreshToken: '' });
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    void dto;
    return Promise.resolve();
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    void dto;
    return Promise.resolve();
  }
}
