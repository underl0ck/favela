import { randomBytes, createHash } from 'node:crypto';

// Use a Map to store token creation times
const tokens = new Map<string, number>();

// Clean up expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, timestamp] of tokens) {
    if (now - timestamp > 3600000) { // 1 hour expiry
      tokens.delete(token);
    }
  }
}, 300000); // Clean every 5 minutes

export function generateCSRFToken(): string {
  const timestamp = Date.now().toString();
  const random = randomBytes(32).toString('hex');
  const token = createHash('sha256')
    .update(timestamp + random)
    .digest('hex');
  
  tokens.set(token, Date.now());
  return token;
}

export function validateCSRFToken(token: string): boolean {
  const timestamp = tokens.get(token);
  if (!timestamp) {
    return false;
  }
  
  // Check if token is expired
  if (Date.now() - timestamp > 3600000) {
    tokens.delete(token);
    return false;
  }
  
  // One-time use
  tokens.delete(token);
  return true;
}