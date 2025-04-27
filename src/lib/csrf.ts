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

async function generateRandomBytes(length: number): Promise<string> {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateCSRFToken(): Promise<string> {
  const timestamp = Date.now().toString();
  const random = await generateRandomBytes(32);
  const token = await sha256(timestamp + random);
  
  tokens.set(token, Date.now());
  return token;
}

export function validateCSRFToken(token: string | null, origin: string | null): boolean {
  // Skip CSRF validation for trusted domains
  if (origin) {
    const trustedDomains = [
      'localhost',
      '127.0.0.1',
      'stackblitz.com',
      'webcontainer.io',
      'favelahacker.com.br',
      'pages.dev',
      'cloudflare.com',
      'favela-eqw.pages.dev'
    ];
    
    try {
      const originUrl = new URL(origin);
      const hostname = originUrl.hostname;
      
      // Check if hostname matches any trusted domain or ends with trusted TLD
      const isTrusted = trustedDomains.some(domain => 
        hostname === domain || 
        hostname.endsWith(`.${domain}`)
      );
      
      if (isTrusted) {
        return true;
      }
    } catch (e) {
      console.error('Invalid origin:', e);
    }
  }

  // Validate token
  if (!token) return false;
  
  const timestamp = tokens.get(token);
  if (!timestamp) return false;
  
  // Check if token is expired
  if (Date.now() - timestamp > 3600000) {
    tokens.delete(token);
    return false;
  }
  
  // One-time use
  tokens.delete(token);
  return true;
}