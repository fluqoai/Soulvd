'use client';
import Image from 'next/image';
import { useState } from 'react';
import type { ChatMessage } from '@/lib/inbox/types';

export default function MessageMedia({ message }: { message: ChatMessage }) {
  const [failed, setFailed] = useState(false);
  if (!message.media) return null;
  const url = `/api/inbox/media/${message.id}`;
  return <div className="mb-2 space-y-2">
    {!failed && (message.kind === 'image' || message.kind === 'sticker') && <a href={url + '?download=1'} aria-label="تنزيل الصورة"><Image src={url} width={320} height={240} unoptimized alt={message.body || 'صورة في المحادثة'} onError={() => setFailed(true)} className="h-auto max-h-80 w-full rounded-xl object-contain" /></a>}
    {!failed && message.kind === 'audio' && <audio src={url} controls preload="none" onError={() => setFailed(true)} className="max-w-full" aria-label="رسالة صوتية" />}
    {!failed && message.kind === 'video' && <video src={url} controls preload="none" onError={() => setFailed(true)} className="max-h-80 max-w-full rounded-xl" aria-label="فيديو في المحادثة" />}
    {failed && <p role="status" className="text-xs">المرفق غير متاح أو انتهت مدة الاحتفاظ به.</p>}
    <a href={url + '?download=1'} className="block break-all text-xs underline">تنزيل {message.media.filename || (message.kind === 'document' ? 'المستند' : 'المرفق')}</a>
  </div>;
}
