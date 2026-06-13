export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const NotFoundError = (message = 'Resource not found', details?: unknown) =>
  new AppError('NOT_FOUND', message, 404, details);

export const UnauthorizedError = (message = 'Authentication required', details?: unknown) =>
  new AppError('UNAUTHORIZED', message, 401, details);

export const ForbiddenError = (message = 'Forbidden', details?: unknown) =>
  new AppError('FORBIDDEN', message, 403, details);

export const ConflictError = (message = 'Conflict', details?: unknown) =>
  new AppError('CONFLICT', message, 409, details);

export const ValidationError = (message = 'Validation failed', details?: unknown) =>
  new AppError('VALIDATION_ERROR', message, 400, details);
