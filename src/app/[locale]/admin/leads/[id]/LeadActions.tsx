'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Save, ArrowRight, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Textarea, Select } from '@/components/admin/Field';
import {
  updateLeadStatus,
  addLeadNote,
  convertLeadToClient,
} from '../actions';

type Props = {
  id: string;
  initialStatus: string;
  locale: 'ar' | 'en';
};

const STATUSES = ['new', 'contacted', 'qualified', 'closed', 'lost'] as const;

export function LeadStatusForm({ id, initialStatus, locale }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-end gap-2">
      <Field label="Status" className="flex-1">
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          name="_status"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </Field>
      <Button
        type="button"
        disabled={isPending || status === initialStatus}
        onClick={() => {
          startTransition(async () => {
            setError(null);
            const r = await updateLeadStatus(id, status);
            if (!r.ok) setError(r.error);
            else router.refresh();
          });
        }}
      >
        <Save className="size-4" />
        Save
      </Button>
      {error && <span className="text-xs text-red-300 self-center">{error}</span>}
    </div>
  );
}

export function LeadNoteForm({ id, locale }: { id: string; locale: 'ar' | 'en' }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!note.trim()) return;
        startTransition(async () => {
          setError(null);
          const r = await addLeadNote(id, note);
          if (!r.ok) setError(r.error);
          else {
            setNote('');
            router.refresh();
          }
        });
      }}
      className="space-y-2"
    >
      <Field label="Add a note" hint="Appended to the timeline with a timestamp">
        <Textarea
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Called the prospect, they want a demo next Tuesday…"
        />
      </Field>
      {error && <p className="text-xs text-red-300">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending || !note.trim()}>
          <Save className="size-4" />
          {isPending ? 'Saving…' : 'Add note'}
        </Button>
      </div>
    </form>
  );
}

export function ConvertButton({ id, locale }: { id: string; locale: 'ar' | 'en' }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        disabled={isPending}
        onClick={() => {
          if (typeof window !== 'undefined' && !window.confirm('Create a client from this lead? The lead will be marked as closed.')) return;
          startTransition(async () => {
            setError(null);
            const r = await convertLeadToClient(id);
            if (!r.ok) {
              setError(r.error);
            } else {
              router.push(`/admin/clients/${r.clientId}`);
            }
          });
        }}
      >
        <UserPlus className="size-4" />
        Convert to client
      </Button>
      {error && <p className="text-xs text-red-300 mt-2">{error}</p>}
    </div>
  );
}
