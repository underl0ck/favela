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
    // Check if Resend API key is configured
    if (!import.meta.env.RESEND_API_KEY) {
      console.error('Resend API key not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Serviço temporariamente indisponível. Por favor, tente novamente mais tarde.',
          csrfToken: await generateCSRFToken()
        }),
        { status: 503, headers }
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
          csrfToken: await generateCSRFToken()
        }), 
        { 
          status: 429, 
          headers: {
            ...headers,
            'Retry-After': rateLimit.retryAfter?.toString() || '1800'
          }
        }
      );
    }

    // Validate CSRF token
    const token = request.headers.get('X-CSRF-Token');
    const origin = request.headers.get('Origin');
    
    if (!validateCSRFToken(token, origin)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Sessão expirada. Por favor, recarregue a página e tente novamente.',
          csrfToken: await generateCSRFToken()
        }), 
        { status: 403, headers }
      );
    }

    let data;
    try {
      data = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Dados inválidos enviados',
          csrfToken: await generateCSRFToken()
        }),
        { status: 400, headers }
      );
    }
    
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
          csrfToken: await generateCSRFToken()
        }), 
        { status: 500, headers }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email enviado com sucesso',
        csrfToken: await generateCSRFToken()
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
        csrfToken: await generateCSRFToken()
      }), 
      { status: statusCode, headers }
    );
  }
};