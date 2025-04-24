import { createHash, randomBytes } from 'crypto';

const SECRET = process.env.CSRF_SECRET || randomBytes(32).toString('hex');
const tokens = new Set<string>();

export function generateCSRFToken(): string {
  const timestamp = Date.now().toString();
  const random = randomBytes(32).toString('hex');
  const token = createHash('sha256')
    .update(timestamp + random + SECRET)
    .digest('hex');
  
  tokens.add(token);
  
  // Clean old tokens
  setTimeout(() => tokens.delete(token), 3600000); // 1 hour expiry
  
  return token;
}

export function validateCSRFToken(token: string): boolean {
  if (!tokens.has(token)) {
    return false;
  }
  
  tokens.delete(token); // One-time use
  return true;
}
