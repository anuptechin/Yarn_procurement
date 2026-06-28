import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { config } from '../config.js';

fs.mkdirSync(config.paths.generated, { recursive: true });

/**
 * Pluggable mailer.
 * - draft mode (default): writes an .eml file + returns email text and a mailto: link.
 *   No credentials needed; procurement sends from their own Outlook.
 * - smtp mode: actually sends via configured SMTP (Office 365 etc.).
 */
export async function sendMail({ to, subject, text, html, attachments = [] }) {
  if (config.mail.mode === 'smtp' && config.mail.smtp.host) {
    const transporter = nodemailer.createTransport({
      host: config.mail.smtp.host,
      port: config.mail.smtp.port,
      secure: config.mail.smtp.port === 465,
      auth: config.mail.smtp.user
        ? { user: config.mail.smtp.user, pass: config.mail.smtp.pass }
        : undefined,
    });
    const info = await transporter.sendMail({
      from: config.mail.from,
      to,
      subject,
      text,
      html,
      attachments,
    });
    return { mode: 'smtp', messageId: info.messageId, accepted: info.accepted };
  }

  // draft mode
  const mailto =
    `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(text)}`;
  return {
    mode: 'draft',
    to,
    subject,
    text,
    html,
    mailto,
    note: 'Draft mode: copy/send this from Outlook, or attach the generated RFQ PDF.',
  };
}

export const mailMode = () => config.mail.mode;
