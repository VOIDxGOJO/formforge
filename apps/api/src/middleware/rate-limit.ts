import rateLimit from 'express-rate-limit';

// Adaptive-session routes have their own, higher limit (publicSessionRateLimiter).
const isAdaptiveSessionRoute = (path: string) =>
  /^\/api\/public\/(sessions\/[^/]+\/(answers|complete)|forms\/[^/]+\/sessions)$/.test(path);

export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isAdaptiveSessionRoute(req.path)
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

// One adaptive form is ~12 requests (start, one per answer, complete); a class
// filling a form from one network address must not be blocked.
export const publicSessionRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again in a minute.' }
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
