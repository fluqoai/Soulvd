export type Conversation = {
  contact_id: string;
  phone: string;
  name: string | null;
  last_inbound_at: string | null;
  last_message_id: string;
  last_message_at: string;
  inbound_count: number;
  unread: number;
  preview: string;
  direction: string;
  status: string;
  handoff_at?: string | null;
  handoff_reason?: string | null;
  handoff_assignee_email?: string | null;
};
export type ChatMessage = {
  media?: { mime: string | null; filename: string | null } | null;
  id: string;
  contact_id: string;
  direction: string;
  kind: string;
  body: string;
  status: string;
  created_at: string;
  inbox_seq: number | null;
};
export type InboxSummary = {
  threads: Conversation[];
  unread: number;
  incoming: number;
};
