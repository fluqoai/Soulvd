// src/app/[locale]/admin/_components/adminIcons.tsx
// Shared icon map for the admin sidebar (desktop + mobile drawer).
//
// IMPORTANT: This is a 'use client' boundary because it imports Lucide
// icon components, which are functions. Server components cannot pass
// these to client components — so the layout passes icon NAMES (strings)
// and the client side resolves them here.

'use client';

import {
  LayoutDashboard,
  Home,
  Sparkles,
  Building2,
  BarChart3,
  Wand2,
  PlugZap,
  Quote,
  Star,
  Users,
  Handshake,
  Inbox,
  UserSquare2,
  FileText,
  Receipt,
  ScrollText,
  Activity,
  Settings,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

/** Name → Lucide icon component. */
export const ADMIN_ICON_MAP: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  home: Home,
  services: Sparkles,
  sectors: Building2,
  stats: BarChart3,
  value_props: Wand2,
  integrations: PlugZap,
  case_studies: Quote,
  testimonials: Star,
  team: Users,
  partners: Handshake,
  leads: Inbox,
  clients: UserSquare2,
  templates: FileText,
  invoices: Receipt,
  quotes: ScrollText,
  users: Users,
  activity_log: Activity,
  settings: Settings,
  help: HelpCircle,
};

/** Resolve a string name to a Lucide icon, with a safe fallback. */
export function getAdminIcon(name: string): LucideIcon {
  return ADMIN_ICON_MAP[name] ?? HelpCircle;
}
