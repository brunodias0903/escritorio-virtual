import nodemailer from 'nodemailer';
import { describe, expect, it, vi } from 'vitest';
import { ConsoleMailer, SmtpMailer } from './mailer.js';

describe('ConsoleMailer', () => {
  it('imprime o destinatário, o assunto e o texto no terminal', async () => {
    const lines: string[] = [];
    const mailer = new ConsoleMailer((line) => lines.push(line));
    await mailer.send({
      to: 'ana@empresa.com',
      subject: 'Código',
      text: '123456',
      html: '<p>123456</p>',
    });
    expect(lines).toEqual(['[e-mail] para ana@empresa.com | Código\n123456']);
  });
});

describe('SmtpMailer', () => {
  it('cria transporte nodemailer e repassa o remetente configurado', async () => {
    const sendMail = vi.fn().mockResolvedValue({});
    const spy = vi
      .spyOn(nodemailer, 'createTransport')
      .mockReturnValue({ sendMail } as unknown as nodemailer.Transporter);

    const mailer = new SmtpMailer({
      host: 'smtp.empresa.com',
      port: 587,
      secure: false,
      user: 'u',
      pass: 'p',
      from: 'Escritório Virtual <nao-responda@empresa.com>',
    });
    await mailer.send({
      to: 'ana@empresa.com',
      subject: 'Assunto',
      text: 'Corpo',
      html: '<p>Corpo</p>',
    });

    expect(spy).toHaveBeenCalledWith({
      host: 'smtp.empresa.com',
      port: 587,
      secure: false,
      auth: { user: 'u', pass: 'p' },
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: 'Escritório Virtual <nao-responda@empresa.com>',
      to: 'ana@empresa.com',
      subject: 'Assunto',
      text: 'Corpo',
      html: '<p>Corpo</p>',
    });
    spy.mockRestore();
  });
});
