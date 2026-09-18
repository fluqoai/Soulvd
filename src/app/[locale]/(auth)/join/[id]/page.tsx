import { notFound } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import JoinForm from './JoinForm';
export const metadata = { title: 'الانضمام إلى فريق | Soulvd', robots: { index: false, follow: false } };
export default async function JoinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  return <main dir="rtl" lang="ar" className="min-h-screen flex items-center justify-center bg-paper px-6 py-12"><div className="w-full max-w-md rounded-2xl border bg-white p-7"><p className="mb-3 font-bold" dir="ltr">Soulvd</p><h1 className="mb-5 text-2xl font-semibold">انضم إلى فريقك</h1><JoinForm id={id} signedIn={!!user} email={user?.email} /></div></main>;
}
