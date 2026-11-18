import { Building2, KanbanSquare, LayoutDashboard, Settings, Wallet, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { to: '/brands', label: 'Brands', icon: Building2 },
  { to: '/finance', label: 'Money', icon: Wallet },
  { to: '/settings', label: 'Settings', icon: Settings },
];
