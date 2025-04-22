import type { APIRoute } from 'astro';
import { ContactFormSchema, sendContactEmail } from '../../lib/email';
import { checkRateLimit } from '../../lib/rate-limit';

export const POST: APIRoute = async ({ request }) => {
  const headers = {
    'Content-Type': 'application/json'
  };

  try {
    // Get client IP from request headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : request.headers.get('x-real-ip') || '127.0.0.1';
    
    // Check rate limit using the forwarded IP
    const rateLimit = await checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: rateLimit.error 
        }), 
        { status: 429, headers }
      );
    }

    const data = await request.json();
    
    // Validate data
    const validatedData = ContactFormSchema.parse(data);
    
    const result = await sendContactEmail(validatedData);
    
    if (!result.success) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: result.error || 'Erro ao enviar email'
        }), 
        { status: 500, headers }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email enviado com sucesso' 
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
        error: errorMessage
      }), 
      { status: statusCode, headers }
    );
  }
};