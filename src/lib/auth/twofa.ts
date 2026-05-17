import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

const ISSUER = "Ichki Ijro";

export function generateTwoFactorSecret(): string {
  return generateSecret();
}

export function buildOtpAuthUrl(email: string, secret: string, issuer = ISSUER): string {
  return generateURI({ label: email, issuer, secret });
}

export async function buildOtpAuthQr(email: string, secret: string, issuer = ISSUER): Promise<string> {
  return QRCode.toDataURL(buildOtpAuthUrl(email, secret, issuer));
}

export function verifyTotp(token: string, secret: string): boolean {
  if (!token || !secret) return false;
  try {
    const res = verifySync({ token: token.replace(/\s+/g, ""), secret, epochTolerance: 1 });
    return res.valid === true;
  } catch {
    return false;
  }
}
