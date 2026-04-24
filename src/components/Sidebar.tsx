import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Shield, DraftingCompass, Calendar,
  Banknote, Users, Package, AlertTriangle, FolderOpen, Settings,
} from 'lucide-react';
import { cn, stripNumericPrefix } from '../lib/utils';
import { useAuth } from '../context/UserContext';
import { useUI } from '../context/UIContext';

import { useLanguage } from '../context/LanguageContext';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'dashboard',    icon: LayoutDashboard, path: '/' },
  { id: 'gov',       label: 'gov',          icon: Shield,           path: '/page/gov' },
  { id: 'scope',     label: 'scope',        icon: DraftingCompass,  path: '/page/scope' },
  { id: 'sched',     label: 'sched',        icon: Calendar,         path: '/page/sched' },
  { id: 'fin',       label: 'fin',          icon: Banknote,         path: '/page/fin' },
  { id: 'stak',      label: 'stak',         icon: Users,            path: '/page/stak' },
  { id: 'res',       label: 'res',          icon: Package,          path: '/page/res' },
  { id: 'risk',      label: 'risk',         icon: AlertTriangle,    path: '/page/risk' },
];

const BOTTOM_ITEMS = [
  { id: 'drive', label: 'drive',  icon: FolderOpen, path: '/page/files' },
  { id: 'admin', label: 'admin',  icon: Settings,   path: '/admin/users' },
];

export const Sidebar: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const { userProfile, isAdmin } = useAuth();
  const { isSidebarOpen } = useUI();

  const isActive = (item: typeof NAV_ITEMS[0]) =>
    location.pathname === item.path ||
    (item.id !== 'dashboard' && item.id !== 'admin' &&
      location.pathname.startsWith(`/page/${item.id}`));

  const canAccess = (item: typeof NAV_ITEMS[0]): boolean => {
    if (item.id === 'admin') return isAdmin;
    if (isAdmin) return true;
    if (!userProfile) return false;
    if (item.id === 'dashboard') return userProfile.accessiblePages?.includes('dashboard') ?? false;
    if (item.id === 'drive') return userProfile.accessiblePages?.includes('files') ?? false;
    return (userProfile.accessiblePages?.includes(item.id) ?? false);
  };

  const renderItem = (item: typeof NAV_ITEMS[0]) => {
    if (!canAccess(item)) return null;
    const active = isActive(item);
    const Icon = item.icon;
    return (
      <Link
        key={item.id}
        to={item.path}
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group',
          active
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
        )}
      >
        <Icon className={cn('w-5 h-5 shrink-0', active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600')} />
        <span className={cn('text-[11px] font-semibold uppercase tracking-widest truncate', active ? 'text-white' : '')}>
          {t(item.label)}
        </span>
      </Link>
    );
  };

  return (
    <aside className={cn(
      'h-screen bg-[#f8fafc] border-e border-slate-200 flex flex-col shrink-0 transition-all duration-300',
      isSidebarOpen ? 'w-[220px] p-3 overflow-y-auto' : 'w-0 p-0 overflow-hidden border-none'
    )}>
      <nav className="flex-1 flex flex-col gap-0.5 pt-2">
        {NAV_ITEMS.map(renderItem)}
      </nav>
      <div className="mt-auto pt-3 pb-2 border-t border-slate-100 flex flex-col gap-0.5">
        {BOTTOM_ITEMS.map(renderItem)}
      </div>
    </aside>
  );
};
