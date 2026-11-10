import { Resend } from 'resend';
import { z } from 'zod';

interface Env {
  FAVELA_KV: {
    get(key: string, type: 'text'): Promise<string | null>;
    put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
  };
  RESEND_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;
}

interface PagesFunctionContext {
  request: Request;
  env: Env;
}

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(100),
  subject: z.enum(['aluno', 'mentor', 'parceria', 'outro']),
  message: z.string().trim().min(10).max(5000),
  turnstileToken: z.string().min(1).max(2048),
});

const subjectLabels = {
  aluno: 'Quero ser aluno',
  mentor: 'Quero ser mentor',
  parceria: 'Proposta de parceria',
  outro: 'Outro assunto',
};

function jsonResponse(body: { success: boolean; message?: string; error?: string }, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

async function getRateLimitKey(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `contact:${hash}`;
}

async function verifyTurnstile(token: string, secret: string, ip: string): Promise<boolean> {
  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip,
  });
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new Error(`Turnstile verification returned ${response.status}`);
  }

  const result: { success?: boolean } = await response.json();
  return result.success === true;
}

export async function onRequestPost({ request, env }: PagesFunctionContext): Promise<Response> {
  if (!env.FAVELA_KV || !env.RESEND_API_KEY || !env.TURNSTILE_SECRET_KEY) {
    console.error('Contact function is missing required environment bindings or secrets');
    return jsonResponse({ success: false, error: 'O serviço de contato está indisponível.' }, 500);
  }

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return jsonResponse({ success: false, error: 'Formato de solicitação inválido.' }, 400);
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > 16_384) {
    return jsonResponse({ success: false, error: 'A solicitação excede o tamanho permitido.' }, 400);
  }

  const ip = request.headers.get('cf-connecting-ip');
  if (!ip) {
    console.error('Contact request is missing the Cloudflare client IP header');
    return jsonResponse({ success: false, error: 'Não foi possível processar sua solicitação.' }, 500);
  }

  const rateLimitKey = await getRateLimitKey(ip);
  try {
    const storedRequests = await env.FAVELA_KV.get(rateLimitKey, 'text');
    const previousRequests: unknown = storedRequests ? JSON.parse(storedRequests) : [];
    if (!Array.isArray(previousRequests) || previousRequests.some((timestamp) => typeof timestamp !== 'number' || !Number.isFinite(timestamp))) {
      throw new Error('Invalid contact rate-limit value in KV');
    }
    const now = Date.now();
    const recentRequests = previousRequests.filter((timestamp: number) => timestamp > now - 3_600_000);
    if (recentRequests.length >= 5) {
      return jsonResponse({ success: false, error: 'Limite de envios atingido. Tente novamente mais tarde.' }, 429);
    }
    await env.FAVELA_KV.put(rateLimitKey, JSON.stringify([...recentRequests, now]), { expirationTtl: 3600 });
  } catch (error) {
    console.error('Unable to apply contact rate limit:', error);
    return jsonResponse({ success: false, error: 'O serviço de contato está indisponível.' }, 500);
  }

  let rawData: unknown;
  try {
    rawData = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Formato de solicitação inválido.' }, 400);
  }

  const parsed = contactSchema.safeParse(rawData);
  if (!parsed.success) {
    return jsonResponse({ success: false, error: 'Verifique os dados informados e tente novamente.' }, 400);
  }

  let isHuman: boolean;
  try {
    isHuman = await verifyTurnstile(parsed.data.turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
  } catch (error) {
    console.error('Turnstile verification failed:', error);
    return jsonResponse({ success: false, error: 'Não foi possível validar a solicitação. Tente novamente.' }, 500);
  }
  if (!isHuman) {
    return jsonResponse({ success: false, error: 'Verificação antirobô inválida. Tente novamente.' }, 400);
  }

  const { name, email, subject, message } = parsed.data;
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, '<br>');
  const subjectLabel = subjectLabels[subject];
  const resend = new Resend(env.RESEND_API_KEY);

  try {
    const notification = await resend.emails.send({
      from: 'Favela Hacker <contato@favelahacker.com.br>',
      to: ['contato@favelahacker.com.br'],
      reply_to: email,
      subject: `Novo contato: ${subjectLabel}`,
      html: `<h1>Novo contato</h1><p><strong>Nome:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p><strong>Assunto:</strong> ${escapeHtml(subjectLabel)}</p><p><strong>Mensagem:</strong><br>${safeMessage}</p>`,
      text: `Nome: ${name}\nEmail: ${email}\nAssunto: ${subjectLabel}\nMensagem:\n${message}`,
    });
    if (notification.error) {
      throw new Error(`Resend notification failed: ${notification.error.message}`);
    }

    const autoReply = await resend.emails.send({
      from: 'Favela Hacker <contato@favelahacker.com.br>',
      to: [email],
      subject: 'Recebemos sua mensagem - Favela Hacker',
      html: `<p>Olá ${safeName},</p><p>Obrigado por entrar em contato com o Favela Hacker. Recebemos sua mensagem e nossa equipe responderá em breve.</p>`,
      text: `Olá ${name},\n\nObrigado por entrar em contato com o Favela Hacker. Recebemos sua mensagem e nossa equipe responderá em breve.`,
    });
    if (autoReply.error) {
      throw new Error(`Resend auto-reply failed: ${autoReply.error.message}`);
    }
  } catch (error) {
    console.error('Unable to send contact email:', error);
    return jsonResponse({ success: false, error: 'Não foi possível enviar sua mensagem. Tente novamente mais tarde.' }, 500);
  }

  return jsonResponse({ success: true, message: 'Mensagem enviada com sucesso.' }, 200);
}
