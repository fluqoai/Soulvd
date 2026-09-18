// Only team invitations can request a return path; never accept arbitrary URLs.
export function invitationPath(value: unknown): string | null {
  return typeof value === 'string' && /^\/join\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value) ? value : null;
}
