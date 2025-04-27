import type { APIRoute } from 'astro';
import { ContactFormSchema, sendContactEmail } from '../../lib/email';
import { checkRateLimit } from '../../lib/rate-limit';
import { generateCSRFToken, validateCSRFToken } from '../../lib/csrf';
import xss from 'xss';

export const POST: APIRoute = async ({ request }) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Vary': 'Origin'
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    // Log request details for debugging
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    console.log('Request URL:', request.url);

    // Validate CSRF token
    const token = request.headers.get('X-CSRF-Token');
    const origin = request.headers.get('Origin');
    
    console.log('CSRF validation:', { token, origin });

    if (!validateCSRFToken(token, origin)) {
      console.error('CSRF validation failed:', { token, origin });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid CSRF token',
          csrfToken: generateCSRFToken()
        }), 
        { status: 403, headers }
      );
    }

    // Get client IP from request headers
    const forwardedFor = request.headers.get('cf-connecting-ip') || 
                        request.headers.get('x-forwarded-for') ||
                        request.headers.get('x-real-ip');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
    
    // Check rate limit
    const rateLimit = await checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: rateLimit.error,
          csrfToken: generateCSRFToken()
        }), 
        { status: 429, headers }
      );
    }

    const data = await request.json();
    
    // Sanitize input data
    const sanitizedData = {
      name: xss(data.name || ''),
      email: xss(data.email || ''),
      subject: xss(data.subject || ''),
      message: xss(data.message || '')
    };
    
    // Validate sanitized data
    const validatedData = ContactFormSchema.parse(sanitizedData);
    
    const result = await sendContactEmail(validatedData);
    
    if (!result.success) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: result.error || 'Erro ao enviar email',
          csrfToken: generateCSRFToken()
        }), 
        { status: 500, headers }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email enviado com sucesso',
        csrfToken: generateCSRFToken()
      }), 
      { status: 200, headers }
    );

  } catch (error) {
    console.error('Error processing contact form:', error);
    
    let errorMessage = 'Erro ao processar requisição';
    let statusCode = 400;
    
    if (error instanceof SyntaxError) {
      errorMessage = 'Dados inválidos enviados';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        csrfToken: generateCSRFToken()
      }), 
      { status: statusCode, headers }
    );
  }
};