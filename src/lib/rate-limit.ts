import { RateLimiterMemory } from 'rate-limiter-flexible';

// Create a rate limiter instance with more lenient limits
export const contactFormLimiter = new RateLimiterMemory({
  points: 10, // Number of points
  duration: 3600, // Per hour
  blockDuration: 1800 // 30 minutes block duration
});

export async function checkRateLimit(ip: string) {
  try {
    await contactFormLimiter.consume(ip);
    return { allowed: true };
  } catch (error) {
    const retryAfter = Math.ceil((error as any).msBeforeNext / 1000) || 1800;
    return { 
      allowed: false, 
      error: `Muitas tentativas. Por favor, aguarde ${Math.ceil(retryAfter / 60)} minutos antes de tentar novamente.`,
      retryAfter
    };
  }
}