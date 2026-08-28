'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Save, Trash2, Calendar, User as UserIcon } from 'lucide-react';
import { Field, Textarea } from '@/components/admin/Field';
import { Button } from '@/components/ui/Button';
import { addNote, deleteNote, type Note, type NoteParentType } from '@/lib/notes/actions';

/**
 * Reusable notes/timeline section. Drop into any detail page that has
 * a parent entity (client / lead / project) and the user can add/delete
 * timestamped notes. Each note is attributed to the user who wrote it.
 */
export function NotesSection({
  parentType,
  parentId,
  notes,
}: {
  parentType: NoteParentType;
  parentId: string;
  notes: Note[];
}) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-ink-900/10 bg-paper p-5 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-700">الملاحظات</h2>

      {notes.length > 0 ? (
        <ol className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="border-s-2 border-sage-400 ps-4 py-1">
              <div className="flex items-start justify-between gap-3 mb-1">
                <p className="text-xs text-ink-600 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <UserIcon className="size-3" />
                    {n.author_name || n.author_email || 'مستخدم'}
                  </span>
                  <span className="text-ink-400">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3" />
                    {new Date(n.created_at).toLocaleString('ar-SA', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </p>
                <button
                  type="button"
                  disabled={isPending && pendingDelete === n.id}
                  onClick={() => {
                    if (typeof window !== 'undefined' && !window.confirm('حذف هذه الملاحظة؟')) return;
                    setPendingDelete(n.id);
                    startTransition(async () => {
                      const r = await deleteNote(n.id);
                      if (!r.ok) setError(r.error);
                      else router.refresh();
                      setPendingDelete(null);
                    });
                  }}
                  className="text-ink-400 hover:text-red-600 p-1 -m-1 rounded transition-colors"
                  title="حذف"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <p className="text-sm text-ink-900 whitespace-pre-wrap leading-relaxed">{n.body}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-ink-500 italic">لا توجد ملاحظات بعد.</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          startTransition(async () => {
            setError(null);
            const r = await addNote({ parent_type: parentType, parent_id: parentId, body });
            if (!r.ok) {
              setError(r.error);
            } else {
              setBody('');
              router.refresh();
            }
          });
        }}
        className="space-y-2"
      >
        <Field label="إضافة ملاحظة">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="ملاحظة جديدة…"
          />
        </Field>
        {error && <p className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={isPending || !body.trim()}>
            <Save className="size-4" />
            {isPending ? 'جاري الحفظ…' : 'إضافة ملاحظة'}
          </Button>
        </div>
      </form>
    </section>
  );
}
