import { Request, Response } from 'express';
import { catchAsync } from '@utils/catchAsync';
import { ApiResponse } from '@utils/ApiResponse';
import { SUCCESS_MESSAGES } from '@utils/constants';
import type { AuthService } from './auth.service';
import type { RegisterDto, LoginDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto } from './auth.dto';

// ─── Auth Controller ──────────────────────────────────────────────────────────

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as RegisterDto;
    const data = await this.authService.register(dto);
    ApiResponse.ok(res, SUCCESS_MESSAGES.REGISTER, data);
  });

  login = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as LoginDto;
    const data = await this.authService.login(dto);
    ApiResponse.ok(res, SUCCESS_MESSAGES.LOGIN, data);
  });

  logout = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = (req as unknown as { user: { userId: string } }).user.userId;
    await this.authService.logout(userId);
    ApiResponse.ok(res, SUCCESS_MESSAGES.LOGOUT, null);
  });

  refreshToken = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as RefreshTokenDto;
    const data = await this.authService.refreshToken(dto);
    ApiResponse.ok(res, SUCCESS_MESSAGES.TOKEN_REFRESHED, data);
  });

  forgotPassword = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as ForgotPasswordDto;
    await this.authService.forgotPassword(dto);
    ApiResponse.ok(res, 'Password reset email sent', null);
  });

  resetPassword = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as ResetPasswordDto;
    await this.authService.resetPassword(dto);
    ApiResponse.ok(res, 'Password reset successfully', null);
  });
}
