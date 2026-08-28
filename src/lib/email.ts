// src/lib/email.ts
// Thin Resend wrapper for contact-form notifications.
// All sends are best-effort: errors are logged but never thrown
// to the caller, so a misconfigured email pipeline can never
// block a real lead from being captured.

import { Resend } from 'resend';

export type LeadEmailPayload = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  message: string;
  locale: 'ar' | 'en';
  createdAt?: string;
};

const apiKey = process.env.RESEND_API_KEY;
const FROM_ADDRESS = process.env.LEAD_FROM ?? 'Soulvd <noreply@soulvd.sa>';
const NOTIFY_TO = process.env.LEAD_NOTIFY_TO ?? 'info@soulvd.sa';

// Singleton — only constructed when the key actually exists so
// local dev (and tests) without a key never crash on import.
const resend = apiKey ? new Resend(apiKey) : null;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safe(value: string | null | undefined): string {
  return value ? escapeHtml(value) : '—';
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://soulvd.sa';
}

function notificationSubject(l: LeadEmailPayload): string {
  const where = l.company ? ` — ${l.company}` : '';
  return `New lead: ${l.name}${where}`;
}

function notificationHtml(l: LeadEmailPayload): string {
  const dir = l.locale === 'ar' ? 'rtl' : 'ltr';
  const adminUrl = `${siteUrl()}/admin/leads`;
  return `<!doctype html>
<html dir="${dir}"><body style="margin:0;padding:24px;background:#FAF7F0;font-family:'IBM Plex Sans Arabic','Inter',system-ui,sans-serif;color:#2C2A26;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #E5EBE6;border-radius:16px;overflow:hidden;">
    <div style="padding:20px 24px;border-bottom:1px solid #E5EBE6;background:#F5F0E4;">
      <div style="font-size:18px;font-weight:600;color:#485A4D;">Soulvd</div>
      <div style="font-size:12px;color:#6B655C;margin-top:2px;">New lead from the contact form</div>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.5;">
        <tr><td style="padding:6px 0;color:#6B655C;width:110px;vertical-align:top;">Name</td><td style="padding:6px 0;font-weight:600;">${safe(l.name)}</td></tr>
        <tr><td style="padding:6px 0;color:#6B655C;vertical-align:top;">Email</td><td style="padding:6px 0;">${l.email ? `<a href="mailto:${escapeHtml(l.email)}" style="color:#1F4E79;">${escapeHtml(l.email)}</a>` : '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#6B655C;vertical-align:top;">Phone</td><td style="padding:6px 0;direction:ltr;text-align:left;">${safe(l.phone)}</td></tr>
        <tr><td style="padding:6px 0;color:#6B655C;vertical-align:top;">Company</td><td style="padding:6px 0;">${safe(l.company)}</td></tr>
      </table>
      <div style="margin-top:18px;padding:16px;background:#F4F6F4;border-radius:12px;border-inline-start:3px solid #485A4D;">
        <div style="font-size:12px;color:#6B655C;margin-bottom:6px;">Message</div>
        <div style="font-size:14px;line-height:1.6;white-space:pre-wrap;word-wrap:break-word;">${escapeHtml(l.message)}</div>
      </div>
      <div style="margin-top:24px;text-align:center;">
        <a href="${adminUrl}" style="display:inline-block;padding:10px 20px;background:#2C2A26;color:#FAF7F0;border-radius:10px;text-decoration:none;font-size:14px;font-weight:500;">View in admin →</a>
      </div>
    </div>
  </div>
</body></html>`;
}

function autoReplySubject(l: LeadEmailPayload): string {
  return l.locale === 'ar'
    ? 'شكراً لتواصلك مع سولڤد — استلمنا رسالتك'
    : 'We received your message — Soulvd';
}

function autoReplyHtml(l: LeadEmailPayload): string {
  const isAr = l.locale === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const greeting = isAr ? `مرحباً ${escapeHtml(l.name)}،` : `Hi ${escapeHtml(l.name)},`;
  const body = isAr
    ? 'شكراً لتواصلك مع سولڤد. استلمنا رسالتك، وسنرد عليك خلال ٢٤ ساعة في أيام العمل. إن كان استفسارك عاجلاً، تواصل معنا مباشرة على واتساب.'
    : "Thank you for contacting Soulvd. We've received your message and will get back to you within 24 hours on business days. If it's urgent, reach us directly on WhatsApp.";
  const signoff = isAr ? 'فريق سولڤد' : 'The Soulvd team';
  const url = siteUrl();
  return `<!doctype html>
<html dir="${dir}"><body style="margin:0;padding:24px;background:#FAF7F0;font-family:'IBM Plex Sans Arabic','Inter',system-ui,sans-serif;color:#2C2A26;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #E5EBE6;border-radius:16px;overflow:hidden;">
    <div style="padding:28px 28px 8px;text-align:center;">
      <div style="display:inline-block;padding:8px 18px;background:#F4F6F4;color:#485A4D;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:0.04em;">SOULVD</div>
    </div>
    <div style="padding:8px 28px 28px;">
      <p style="font-size:15px;line-height:1.7;margin:0 0 14px;">${greeting}</p>
      <p style="font-size:15px;line-height:1.7;margin:0 0 22px;color:#4A463E;">${body}</p>
      <p style="font-size:14px;line-height:1.6;margin:0;color:#6B655C;">${signoff}</p>
      <div style="margin-top:22px;padding-top:18px;border-top:1px solid #E5EBE6;text-align:center;font-size:11px;color:#8FA495;">
        <a href="${url}" style="color:#485A4D;text-decoration:none;">soulvd.sa</a>
      </div>
    </div>
  </div>
</body></html>`;
}

export async function sendLeadNotification(lead: LeadEmailPayload): Promise<void> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping lead notification');
    return;
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: NOTIFY_TO,
      replyTo: lead.email ?? undefined,
      subject: notificationSubject(lead),
      html: notificationHtml(lead),
    });
    if (error) {
      console.error('[email] notification send returned error:', error);
    } else {
      console.log('[email] notification sent for lead', lead.id);
    }
  } catch (err) {
    // Never throw — the DB insert is the source of truth.
    console.error('[email] notification send threw:', err);
  }
}

export async function sendLeadAutoReply(lead: LeadEmailPayload): Promise<void> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping auto-reply');
    return;
  }
  if (!lead.email) {
    return; // No address to reply to
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: lead.email,
      subject: autoReplySubject(lead),
      html: autoReplyHtml(lead),
    });
    if (error) {
      console.error('[email] auto-reply returned error:', error);
    } else {
      console.log('[email] auto-reply sent to', lead.email);
    }
  } catch (err) {
    console.error('[email] auto-reply threw:', err);
  }
}
