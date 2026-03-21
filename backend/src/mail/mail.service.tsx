import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import { VerifyEmail } from './verify-email';
import { ResetPassword } from './reset-password';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: String(process.env.SMTP_PORT) === '465',
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_KEY,
    },
  });

  async sendVerifyEmail(to: string, verifyUrl: string) {
    const html = await render(<VerifyEmail verifyUrl={verifyUrl} />);
    const from = process.env.MAIL_FROM;

    await this.transporter.sendMail({
      from,
      to,
      subject: 'RamèneTaPoire - Vérifie ton adresse email',
      html,
    });
  }

  async sendResetPasswordEmail(to: string, resetUrl: string) {
    const html = await render(<ResetPassword resetUrl={resetUrl} />);
    const from = process.env.MAIL_FROM;

    await this.transporter.sendMail({
      from,
      to,
      subject: 'RamèneTaPoire - Réinitialiser le mot de passe',
      html,
    });
  }
}
