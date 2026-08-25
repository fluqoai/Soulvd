'use client';

import { useTransition } from 'react';
import { useRouter } from '@/i18n/routing';
import { Save } from 'lucide-react';
import { Select } from '@/components/admin/Field';
import { Button } from '@/components/ui/Button';
import { updateUserRole } from './actions';

export function RoleSelect({ userId, currentRole, isSelf }: { userId: string; currentRole: string; isSelf: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const role = String(fd.get('role') ?? 'editor');
        if (role === currentRole) return;
        startTransition(async () => {
          await updateUserRole(userId, role);
          router.refresh();
        });
      }}
      className="inline-flex items-center gap-1"
    >
      <Select name="role" defaultValue={currentRole} disabled={isSelf} className="text-xs py-1 pe-6">
        <option value="editor">Editor</option>
        <option value="owner">Owner</option>
      </Select>
      <Button type="submit" size="sm" variant="ghost" disabled={isPending} className="text-xs">
        <Save className="size-3" />
      </Button>
    </form>
  );
}
