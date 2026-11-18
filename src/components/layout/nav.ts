import { BarChart3, Building2, CalendarDays, KanbanSquare, LayoutDashboard, Settings, Wallet, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the phone bottom bar (the rest live in the top bar / dashboard). */
  mobile?: boolean;
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard, mobile: true },
  { to: '/pipeline', label: 'Pipeline', icon: KanbanSquare, mobile: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays, mobile: true },
  { to: '/brands', label: 'Brands', icon: Building2, mobile: true },
  { to: '/finance', label: 'Money', icon: Wallet, mobile: true },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];
