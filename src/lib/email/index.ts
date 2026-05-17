import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let cached: Transporter | null = null;

export function getTransporter(): Transporter {
  if (cached) return cached;
  const host = process.env.SMTP_HOST ?? "localhost";
  const port = Number(process.env.SMTP_PORT ?? 1025);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  cached = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
  return cached;
}

export async function sendMail(opts: { to: string; subject: string; html: string; text?: string }) {
  const from = process.env.SMTP_FROM ?? "Ichki Ijro <no-reply@ichki-ijro.local>";
  const tx = getTransporter();
  return tx.sendMail({ from, ...opts });
}

export function renderInvitationEmail(fullName: string, link: string, locale: string): { subject: string; html: string } {
  const subjects: Record<string, string> = {
    "uz-latn": "Ichki Ijro tizimiga taklif",
    "uz-cyrl": "Ички Ижро тизимига таклиф",
    ru: "Приглашение в Ichki Ijro",
    en: "Invitation to Ichki Ijro",
  };
  const bodies: Record<string, string> = {
    "uz-latn": `Salom, ${fullName}! Sizni Ichki Ijro tizimiga taklif qilamiz.`,
    "uz-cyrl": `Салом, ${fullName}! Сизни Ички Ижро тизимига таклиф қиламиз.`,
    ru: `Здравствуйте, ${fullName}! Вас приглашают в систему Ichki Ijro.`,
    en: `Hello, ${fullName}! You are invited to the Ichki Ijro system.`,
  };
  const subject = subjects[locale] ?? subjects["en"];
  const greeting = bodies[locale] ?? bodies["en"];
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;">
      <h2 style="color:#2563EB;">Ichki Ijro</h2>
      <p>${greeting}</p>
      <p><a href="${link}" style="display:inline-block;background:#2563EB;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">Accept invitation</a></p>
      <p style="color:#6B7280;font-size:13px;">If the button does not work, open this link: <br/>${link}</p>
    </div>`;
  return { subject, html };
}

export function renderPasswordResetEmail(fullName: string, link: string, locale: string) {
  const subjects: Record<string, string> = {
    "uz-latn": "Parolni tiklash",
    "uz-cyrl": "Паролни тиклаш",
    ru: "Восстановление пароля",
    en: "Reset your password",
  };
  const subject = subjects[locale] ?? subjects["en"];
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;">
      <h2 style="color:#2563EB;">Ichki Ijro</h2>
      <p>${fullName},</p>
      <p>${subject}:</p>
      <p><a href="${link}" style="display:inline-block;background:#2563EB;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">${subject}</a></p>
      <p style="color:#6B7280;font-size:13px;">${link}</p>
    </div>`;
  return { subject, html };
}

export function renderNewDeviceLoginEmail(fullName: string, ip: string | null, ua: string | null, locale: string) {
  const subjects: Record<string, string> = {
    "uz-latn": "Yangi qurilmadan kirish",
    "uz-cyrl": "Янги қурилмадан кириш",
    ru: "Вход с нового устройства",
    en: "New device login",
  };
  const subject = subjects[locale] ?? subjects["en"];
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;">
      <h2 style="color:#2563EB;">${subject}</h2>
      <p>${fullName},</p>
      <p>IP: ${ip ?? "-"}<br/>User agent: ${ua ?? "-"}</p>
    </div>`;
  return { subject, html };
}
