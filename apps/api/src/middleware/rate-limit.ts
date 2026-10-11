import rateLimit from 'express-rate-limit';

export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

// AI calls spend a shared (free-tier) quota, so each signed-in user gets a small budget.
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anonymous',
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many AI requests. Wait a minute and try again.' }
  }
});

export const publicSubmitRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many submissions. Try again later.' }
  }
});
