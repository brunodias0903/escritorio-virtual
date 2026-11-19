import nodemailer from 'nodemailer';
import type { SmtpConfig } from '../../config/env.js';

export type Mail = { to: string; subject: string; text: string; html: string };

/** Quem envia os e-mails (códigos de confirmação). */
export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/** Envia pelo servidor de e-mail (SMTP) da empresa, do Gmail ou do Mailpit (teste). */
export class SmtpMailer implements Mailer {
  private readonly transport: nodemailer.Transporter;
  private readonly from: string;

  constructor(config: SmtpConfig) {
    this.from = config.from;
    this.transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    });
  }

  async send(mail: Mail): Promise<void> {
    await this.transport.sendMail({ from: this.from, ...mail });
  }
}

/**
 * Sem servidor de e-mail (só para desenvolver): mostra o e-mail no terminal
 * do servidor. Nunca em produção: o servidor se recusa a subir sem SMTP.
 */
export class ConsoleMailer implements Mailer {
  private readonly log: (line: string) => void;

  constructor(log: (line: string) => void = console.log) {
    this.log = log;
  }

  async send(mail: Mail): Promise<void> {
    this.log(`[e-mail] para ${mail.to} | ${mail.subject}\n${mail.text}`);
  }
}
