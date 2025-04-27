import { Resend } from 'resend';
import { z } from 'zod';

export const ContactFormSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(100, 'Nome muito longo'),
  email: z.string().email('Email inválido').max(100, 'Email muito longo'),
  subject: z.enum(['aluno', 'mentor', 'parceria', 'outro'], {
    errorMap: () => ({ message: 'Assunto inválido' })
  }),
  message: z.string().min(10, 'Mensagem muito curta').max(1000, 'Mensagem muito longa'),
});

export type ContactForm = z.infer<typeof ContactFormSchema>;

function getSubjectLabel(subject: string): string {
  const subjects = {
    aluno: 'Quero ser aluno',
    mentor: 'Quero ser mentor',
    parceria: 'Proposta de parceria',
    outro: 'Outro assunto'
  };
  return subjects[subject as keyof typeof subjects] || subject;
}

const emailStyles = `
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: #00ff00; color: #000; padding: 20px; text-align: center; }
  .content { padding: 20px; background: #f9f9f9; }
  .field { margin-bottom: 15px; }
  .label { font-weight: bold; }
`;

function generateEmailTemplate(title: string, content: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>${emailStyles}</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${title}</h1>
          </div>
          <div class="content">
            ${content}
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateEmailHTML(data: ContactForm) {
  const { name, email, subject, message } = data;
  const content = `
    <div class="field">
      <div class="label">Nome:</div>
      <div>${name}</div>
    </div>
    <div class="field">
      <div class="label">Email:</div>
      <div>${email}</div>
    </div>
    <div class="field">
      <div class="label">Assunto:</div>
      <div>${getSubjectLabel(subject)}</div>
    </div>
    <div class="field">
      <div class="label">Mensagem:</div>
      <div>${message}</div>
    </div>
  `;
  return generateEmailTemplate('Novo Contato - Favela Hacker', content);
}

function generateAutoReplyHTML(name: string) {
  const content = `
    <p>Olá ${name},</p>
    <p>Obrigado por entrar em contato com o Favela Hacker!</p>
    <p>Esta é uma confirmação automática de que recebemos sua mensagem. Nossa equipe irá analisar e responder em até 24 horas úteis.</p>
    <p>Enquanto isso, que tal conhecer mais sobre nosso trabalho?</p>
    <ul>
      <li>Visite nosso blog: <a href="https://favelahacker.com.br/blog">favelahacker.com.br/blog</a></li>
      <li>Siga-nos nas redes sociais: @favelahacker</li>
    </ul>
    <p>Atenciosamente,<br>Equipe Favela Hacker</p>
  `;
  return generateEmailTemplate('Recebemos sua mensagem - Favela Hacker', content);
}

// Initialize Resend with API key
let resend: Resend | null = null;

function getResendClient() {
  if (!resend) {
    const apiKey = import.meta.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('Resend API key not configured');
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

export async function sendContactEmail(data: ContactForm) {
  try {
    const client = getResendClient();
    const { name, email, subject } = data;
    const domain = import.meta.env.RESEND_DOMAIN || 'favelahacker.com.br';
    const fromEmail = `Favela Hacker <contato@${domain}>`;
    
    // Send notification to admin
    await client.emails.send({
      from: fromEmail,
      to: [`contato@${domain}`],
      reply_to: email,
      subject: `Novo contato: ${getSubjectLabel(subject)}`,
      html: generateEmailHTML(data),
      text: `
Nome: ${name}
Email: ${email}
Assunto: ${getSubjectLabel(subject)}
Mensagem: ${data.message}
      `,
    });

    // Send auto-reply to user
    await client.emails.send({
      from: fromEmail,
      to: [email],
      subject: 'Recebemos sua mensagem - Favela Hacker',
      html: generateAutoReplyHTML(name),
      text: `
Olá ${name},

Obrigado por entrar em contato com o Favela Hacker!

Esta é uma confirmação automática de que recebemos sua mensagem. Nossa equipe irá analisar e responder em até 24 horas úteis.

Enquanto isso, que tal conhecer mais sobre nosso trabalho?
- Visite nosso blog: https://favelahacker.com.br/blog
- Siga-nos nas redes sociais: @favelahacker

Atenciosamente,
Equipe Favela Hacker
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { 
      success: false, 
      error: 'Erro ao enviar email. Por favor, tente novamente mais tarde.' 
    };
  }
}