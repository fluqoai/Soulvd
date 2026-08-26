'use client';

import { CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type Bubble = {
  side: 'in' | 'out';
  text: string;
  time: string;
  read?: boolean;
};

type Props = {
  /** When the chat enters the viewport, bubbles fade in one-by-one. */
  locale: 'ar' | 'en';
};

/* Locale-aware, real-feeling chat conversation.
   Saudi-dialect Arabic on AR, natural English on EN. */
function getConversation(locale: 'ar' | 'en'): Bubble[] {
  if (locale === 'ar') {
    return [
      { side: 'in', text: 'السلام عليكم، أبغى أعرف عن خدماتكم في واتساب', time: '10:23 ص' },
      { side: 'out', text: 'وعليكم السلام، سولڤد معك. البوت يرد على عملائك بالعربي خلال ثوانٍ. إيش مجال عملك؟', time: '10:23 ص', read: true },
      { side: 'in', text: 'عندي مطعم في الرياض، عايز أزيد الطلبات خاصة في الويكند', time: '10:24 ص' },
      { side: 'out', text: 'ممتاز. عندنا بوت يرد على العملاء بالعربي ٢٤/٧ وياخذ الطلبات تلقائياً. أحجز لك ديمو مجاني؟', time: '10:24 ص', read: true },
    ];
  }
  return [
    { side: 'in', text: 'Hi, I want to know more about your WhatsApp services', time: '10:23 AM' },
    { side: 'out', text: "Hi there — Soulvd here. I can book you a free demo in 2 minutes. What's your business?", time: '10:23 AM', read: true },
    { side: 'in', text: 'I run a restaurant in Riyadh. I want to grow orders, especially on weekends.', time: '10:24 AM' },
    { side: 'out', text: 'Perfect. We have a 24/7 Arabic bot that takes orders automatically. Shall I book a free demo for you?', time: '10:24 AM', read: true },
  ];
}

export function HeroChat({ locale }: Props) {
  const bubbles = getConversation(locale);
  const botName = locale === 'ar' ? 'سولڤد' : 'Soulvd';
  const botStatus = locale === 'ar' ? 'متصل الآن' : 'online now';

  return (
    <div
      className={cn(
        'relative w-full max-w-[380px] mx-auto',
        'rounded-[2.25rem] overflow-hidden',
        'bg-paper border border-ink-900/10',
        'shadow-[0_30px_80px_-20px_rgba(44,42,38,0.25),0_10px_30px_-10px_rgba(44,42,38,0.12)]'
      )}
      aria-hidden
    >
      {/* Phone notch */}
      <div className="absolute top-0 inset-x-0 h-7 bg-paper z-20 pointer-events-none">
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-24 h-4 rounded-full bg-ink-900" />
      </div>

      {/* WhatsApp-green header */}
      <div className="relative bg-[#075E54] text-white pt-7 pb-3 px-4 flex items-center gap-3">
        <div className="size-9 rounded-full bg-paper grid place-items-center shrink-0">
          {/* Mini Soulvd hex mark inside avatar */}
          <svg viewBox="0 0 24 24" className="size-5 text-sage-700" aria-hidden>
            <path
              d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <text
              x="12"
              y="15.5"
              textAnchor="middle"
              fontSize="8"
              fontFamily="serif"
              fontWeight="600"
              fill="currentColor"
            >
              S
            </text>
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight truncate">{botName}</p>
          <p className="text-[11px] text-white/75 leading-tight flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-300" />
            {botStatus}
          </p>
        </div>
        <div className="flex items-center gap-2 text-white/85 text-xs">
          <span className="font-mono">•</span>
          <span className="font-mono">▌</span>
        </div>
      </div>

      {/* Chat area — WhatsApp-light paper texture */}
      <div
        className="relative px-3 py-5 space-y-2 min-h-[420px]"
        style={{
          backgroundColor: '#ECE5DD',
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.25'/></svg>\")",
        }}
      >
        {/* Date pill */}
        <div className="flex justify-center">
          <span className="px-2.5 py-0.5 rounded-md bg-paper/90 text-[10px] text-ink-700 shadow-sm">
            {locale === 'ar' ? 'اليوم' : 'Today'}
          </span>
        </div>

        {bubbles.map((b, i) => (
          <ChatBubble key={i} bubble={b} locale={locale} />
        ))}

        {/* Typing indicator — purely decorative, no animation timing */}
        <div className="flex justify-start">
          <div className="bg-paper rounded-2xl rounded-bl-md px-3 py-2 shadow-sm flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-ink-500/60" />
            <span className="size-1.5 rounded-full bg-ink-500/60" />
            <span className="size-1.5 rounded-full bg-ink-500/60" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({
  bubble,
  locale,
}: {
  bubble: Bubble;
  locale: 'ar' | 'en';
}) {
  const isIn = bubble.side === 'in';
  return (
    <div
      className={cn(
        'flex',
        isIn ? 'justify-start' : 'justify-end'
      )}
    >
      <div
        className={cn(
          'max-w-[78%] rounded-2xl px-3 py-2 shadow-sm',
          isIn
            ? 'bg-paper text-ink-900 rounded-bl-md'
            : 'bg-[#DCF8C6] text-ink-900 rounded-br-md'
        )}
        style={{ direction: locale === 'ar' ? 'rtl' : 'ltr' }}
      >
        <p className="text-[13px] leading-snug">{bubble.text}</p>
        <p
          className={cn(
            'mt-1 text-[10px] text-ink-500 flex items-center gap-1',
            !isIn && 'justify-end'
          )}
        >
          <span>{bubble.time}</span>
          {bubble.read && (
            <CheckCheck className="size-3 text-sky-500" aria-hidden />
          )}
        </p>
      </div>
    </div>
  );
}
