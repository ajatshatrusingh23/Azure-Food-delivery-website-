import { HTTP_STATUS } from './constants';

/**
 * An expected ("operational") error with an HTTP status. Anything else that reaches the
 * error middleware is treated as a bug and returned as a generic 500.
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly errors?: Record<string, string[]>,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, code?: string) {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, message, undefined, code);
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, message);
  }
  static forbidden(message = 'You do not have permission to do this') {
    return new ApiError(HTTP_STATUS.FORBIDDEN, message);
  }
  static notFound(what = 'Resource') {
    return new ApiError(HTTP_STATUS.NOT_FOUND, `${what} not found`);
  }
  static conflict(message: string, code?: string) {
    return new ApiError(HTTP_STATUS.CONFLICT, message, undefined, code);
  }
  static unprocessable(message: string, errors?: Record<string, string[]>) {
    return new ApiError(HTTP_STATUS.UNPROCESSABLE_ENTITY, message, errors);
  }
  static badGateway(message: string) {
    return new ApiError(HTTP_STATUS.BAD_GATEWAY, message);
  }
}
