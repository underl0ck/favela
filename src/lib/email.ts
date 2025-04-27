import { Resend } from 'resend';
import { z } from 'zod';

// Initialize Resend with API key
const resend = new Resend(import.meta.env.RESEND_API_KEY);

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

function generateEmailHTML(data: ContactForm) {
  const { name, email, subject, message } = data;
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Novo Contato - Favela Hacker</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #00ff00; color: #000; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Novo Contato - Favela Hacker</h1>
          </div>
          <div class="content">
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
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateAutoReplyHTML(name: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Recebemos sua mensagem - Favela Hacker</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #00ff00; color: #000; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Recebemos sua mensagem!</h1>
          </div>
          <div class="content">
            <p>Olá ${name},</p>
            <p>Obrigado por entrar em contato com o Favela Hacker!</p>
            <p>Esta é uma confirmação automática de que recebemos sua mensagem. Nossa equipe irá analisar e responder em até 24 horas úteis.</p>
            <p>Enquanto isso, que tal conhecer mais sobre nosso trabalho?</p>
            <ul>
              <li>Visite nosso blog: <a href="https://favelahacker.com.br/blog">favelahacker.com.br/blog</a></li>
              <li>Siga-nos nas redes sociais: @favelahacker</li>
            </ul>
            <p>Atenciosamente,<br>Equipe Favela Hacker</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendContactEmail(data: ContactForm) {
  try {
    // Check if Resend API key is configured
    if (!import.meta.env.RESEND_API_KEY) {
      console.error('Resend API key not configured');
      return { 
        success: false, 
        error: 'Serviço de email não configurado. Por favor, tente novamente mais tarde.' 
      };
    }

    const { name, email, subject } = data;
    const domain = import.meta.env.RESEND_DOMAIN || 'favelahacker.com.br';
    const fromEmail = `Favela Hacker <contato@${domain}>`;
    
    // Send notification to admin
    await resend.emails.send({
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
    await resend.emails.send({
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