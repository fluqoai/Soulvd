'use client';

import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { track } from '@/lib/analytics';

/**
 * Floating WhatsApp CTA — bottom-left on desktop, bottom-center on
 * mobile. Opens a real wa.me link in a new tab. This is the single
 * highest-conversion action for a WhatsApp-automation product: a
 * visitor who clicks this is talking to the *actual* bot, not a
 * mock screenshot.
 *
 * The number is pulled from NEXT_PUBLIC_WHATSAPP_NUMBER env var;
 * the message is pre-filled so the visitor lands in a useful state.
 */

const DEFAULT_NUMBER = '966500000000'; // Placeholder — replace via env
const DEFAULT_MESSAGE_AR = 'مرحباً، أريد الاستفسار عن خدمات سولڤد';
const DEFAULT_MESSAGE_EN = "Hi, I'd like to learn more about Soulvd";

export function WhatsAppFloat() {
  const [open, setOpen] = useState(false);
  const number =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, '') || DEFAULT_NUMBER;
  const href = `https://wa.me/${number}?text=${encodeURIComponent(DEFAULT_MESSAGE_AR)}`;
  const hrefEn = `https://wa.me/${number}?text=${encodeURIComponent(DEFAULT_MESSAGE_EN)}`;

  return (
    <>
      {/* Pulse ring — purely decorative, no hover effect */}
      <span
        className="pointer-events-none fixed bottom-6 end-6 md:bottom-8 md:end-8 z-40 size-14 rounded-full bg-[#25D366]/20 animate-ping"
        aria-hidden
      />
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          track('whatsapp_clicked', { source: 'floating_button' });
        }}
        aria-label={open ? 'إغلاق' : 'محادثة على واتساب'}
        className="fixed bottom-6 end-6 md:bottom-8 md:end-8 z-50 size-14 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white shadow-[0_8px_24px_-6px_rgba(37,211,102,0.5)] grid place-items-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
      >
        {open ? <X className="size-6" aria-hidden /> : <MessageCircle className="size-6" aria-hidden />}
      </button>

      {/* Expanded card — language choice */}
      {open && (
        <div
          className="fixed bottom-24 end-6 md:bottom-28 md:end-8 z-50 w-72 rounded-2xl bg-paper border border-ink-900/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] overflow-hidden"
          role="dialog"
          aria-label="WhatsApp chat"
        >
          <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3">
            <div className="size-9 rounded-full bg-white grid place-items-center text-[#075E54] font-semibold">
              S
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">Soulvd · سولڤد</p>
              <p className="text-[11px] text-white/80 leading-tight flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-300" />
                متصل الآن
              </p>
            </div>
          </div>
          <div className="p-4 space-y-2">
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              onClick={() => track('whatsapp_clicked', { source: 'floating_ar' })}
              className="block w-full text-center rounded-lg bg-sage-50 hover:bg-sage-100 border border-ink-900/10 px-4 py-2.5 text-sm font-medium text-ink-900 transition-colors"
            >
              محادثة بالعربية
            </a>
            <a
              href={hrefEn}
              target="_blank"
              rel="noreferrer noopener"
              onClick={() => track('whatsapp_clicked', { source: 'floating_en' })}
              className="block w-full text-center rounded-lg bg-paper hover:bg-sage-50 border border-ink-900/10 px-4 py-2.5 text-sm font-medium text-ink-900 transition-colors"
            >
              Chat in English
            </a>
            <p className="text-[11px] text-ink-500 text-center pt-1">
              يفتح واتساب في تبويب جديد
            </p>
          </div>
        </div>
      )}
    </>
  );
}
