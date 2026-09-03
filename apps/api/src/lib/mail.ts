import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../env";

/**
 * Transactional email (verification links, password resets).
 *
 * Configured through SMTP_* env vars. When SMTP_HOST is unset — every local
 * dev setup — nothing is sent and the message (including the link) is printed
 * to the API console instead, so the flow can still be exercised end-to-end.
 */

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  if (!env.smtp.host) {
    transporter = null;
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
  return transporter;
}

export type Mail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendMail(mail: Mail): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.log(
      `\n[mail] SMTP not configured — would send to ${mail.to}\n[mail] Subject: ${mail.subject}\n${mail.text}\n`,
    );
    return;
  }
  await t.sendMail({ from: env.smtp.from, ...mail });
}

/* ------------------------------------------------------------------ */
/*  Templates                                                          */
/* ------------------------------------------------------------------ */

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function layout(title: string, body: string, cta: { label: string; url: string }) {
  const url = escapeHtml(cta.url);
  return `<!doctype html>
<html><body style="margin:0;padding:32px 16px;background:#f7f6f4;font-family:Georgia,'Times New Roman',serif;color:#12171f">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
    <table role="presentation" width="520" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #e5e4e0;border-radius:6px">
      <tr><td style="padding:28px 36px 0;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#8a8f99">Daewon Model United Nations</td></tr>
      <tr><td style="padding:12px 36px 0;font-size:26px;font-weight:600;letter-spacing:0.02em">${title}</td></tr>
      <tr><td style="padding:16px 36px 0;font-size:15px;line-height:1.65;color:#4a525f">${body}</td></tr>
      <tr><td style="padding:28px 36px 0">
        <a href="${url}" style="display:inline-block;padding:12px 22px;background:#0a1428;color:#ffffff;text-decoration:none;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;border-radius:3px">${cta.label}</a>
      </td></tr>
      <tr><td style="padding:20px 36px 32px;font-size:12px;line-height:1.6;color:#8a8f99">If the button does not work, copy this link into your browser:<br><a href="${url}" style="color:#0c4884;word-break:break-all">${url}</a></td></tr>
    </table>
    <p style="margin:20px 0 0;font-size:11px;color:#8a8f99">DAEMUN III · Daewon Foreign Language High School</p>
  </td></tr></table>
</body></html>`;
}

export function verificationMail(to: string, url: string): Mail {
  return {
    to,
    subject: "Confirm your email — DAEMUN III",
    text: `Welcome to DAEMUN III.\n\nConfirm your email address by opening this link (valid for 1 hour):\n${url}\n\nIf you did not create an account, you can ignore this message.`,
    html: layout(
      "Confirm your email",
      "Thanks for registering for DAEMUN III. Confirm this email address to finish setting up your delegate account. The link is valid for one hour.",
      { label: "Confirm email", url },
    ),
  };
}

export function passwordResetMail(to: string, url: string): Mail {
  return {
    to,
    subject: "Reset your password — DAEMUN III",
    text: `Someone requested a password reset for your DAEMUN III account.\n\nOpen this link to choose a new password (valid for 1 hour):\n${url}\n\nIf this was not you, you can ignore this message — your password will not change.`,
    html: layout(
      "Reset your password",
      "Someone requested a password reset for your DAEMUN III account. Open the link below to choose a new password. If this was not you, ignore this email — nothing will change.",
      { label: "Choose a new password", url },
    ),
  };
}
