import type { APIRoute } from 'astro';
import { ContactFormSchema, sendContactEmail } from '../../lib/email';
import { checkRateLimit } from '../../lib/rate-limit';
import { generateCSRFToken, validateCSRFToken } from '../../lib/csrf';
import xss from 'xss';

export const POST: APIRoute = async ({ request, clientAddress, url, locals }) => {
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
    // Get client IP from request headers or clientAddress
    const forwardedFor = request.headers.get('cf-connecting-ip') || 
                        request.headers.get('x-forwarded-for') ||
                        request.headers.get('x-real-ip');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : clientAddress;
    
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
          error: 'Invalid security token. Please refresh the page and try again.',
          csrfToken: await generateCSRFToken()
        }), 
        { status: 403, headers }
      );
    }

    // Clone the request before reading the body
    const clonedRequest = request.clone();
    
    // Parse and validate request body
    let data;
    try {
      data = await clonedRequest.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid request format',
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
    let validatedData;
    try {
      validatedData = ContactFormSchema.parse(sanitizedData);
    } catch (e) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Please check your input and try again',
          csrfToken: await generateCSRFToken()
        }), 
        { status: 400, headers }
      );
    }
    
    // Send email with environment variables from context
    const result = await sendContactEmail(validatedData, url, locals.runtime.env);
    
    if (!result.success) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: result.error || 'Failed to send email. Please try again later.',
          csrfToken: await generateCSRFToken()
        }), 
        { status: 500, headers }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Message sent successfully!',
        csrfToken: await generateCSRFToken()
      }), 
      { status: 200, headers }
    );

  } catch (error) {
    console.error('Error processing contact form:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'An unexpected error occurred. Please try again later.',
        csrfToken: await generateCSRFToken()
      }), 
      { status: 500, headers }
    );
  }
};