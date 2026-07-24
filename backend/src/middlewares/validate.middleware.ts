import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from '@utils/ApiError';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Zod schema validation middleware factory.
 * Validates the specified part of the request against the provided schema.
 * Replaces the raw input with the parsed (and typed) output.
 *
 * Usage: validate(mySchema, 'body')
 */
export const validate = (
  schema: ZodSchema,
  target: ValidationTarget = 'body',
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[target]);
      req[target] = parsed as typeof req[typeof target];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        error.errors.forEach((issue) => {
          const path = issue.path.join('.');
          if (!errors[path]) errors[path] = [];
          errors[path].push(issue.message);
        });
        next(ApiError.unprocessable('Validation failed', errors));
        return;
      }
      next(error);
    }
  };
};
