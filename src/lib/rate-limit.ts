import { RateLimiterMemory } from 'rate-limiter-flexible';

// Create a rate limiter instance
export const contactFormLimiter = new RateLimiterMemory({
  points: 5, // Number of points
  duration: 3600, // Per hour
});

export async function checkRateLimit(ip: string) {
  try {
    await contactFormLimiter.consume(ip);
    return { allowed: true };
  } catch (error) {
    return { 
      allowed: false, 
      error: 'Muitas tentativas. Por favor, aguarde alguns minutos antes de tentar novamente.' 
    };
  }
}