import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Shield, 
  DraftingCompass,
  Calendar,
  Banknote,
  Users,
  Package,
  AlertTriangle,
  FolderOpen,
  Settings,
  ChevronRight
} from 'lucide-react';
import { pages } from '../data';
import { cn } from '../lib/utils';
import { auth, db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/UserContext';
import { useUI } from '../context/UIContext';
import { useLanguage } from '../context/LanguageContext';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { selectedProject } = useProject();
  const { userProfile, isAdmin } = useAuth();
  const { isSidebarOpen } = useUI();
  const { t } = useLanguage();

  const mainNavItems = [
    { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, path: '/' },
  ];

  const domainNavItems = [
    { id: 'gov', title: 'Governance', icon: Shield, path: '/page/gov' },
    { id: 'scope', title: 'Scope', icon: DraftingCompass, path: '/page/scope' },
    { id: 'sched', title: 'Schedule', icon: Calendar, path: '/page/sched' },
    { id: 'fin', title: 'Finance', icon: Banknote, path: '/page/fin' },
    { id: 'stak', title: 'Stakeholders', icon: Users, path: '/page/stak' },
    { id: 'res', title: 'Resources', icon: Package, path: '/page/res' },
    { id: 'risk', title: 'Risk', icon: AlertTriangle, path: '/page/risk' },
  ];

  const bottomNavItems = [
    { id: 'drive', title: 'Drive Explorer', icon: FolderOpen, path: '/page/files' },
    { id: 'admin', title: 'Admin Settings', icon: Settings, path: '/admin/users' },
  ];

  const renderNavItem = (item: any) => {
    const isActive = location.pathname === item.path || (item.id !== 'dashboard' && item.id !== 'admin' && location.pathname.includes(`/page/${item.id}`));
    const Icon = item.icon;

    // Admin check
    if (item.id === 'admin' && !isAdmin) return null;

    // Granular permission check for non-admins
    if (!isAdmin && userProfile) {
      if (item.id === 'dashboard') {
        const isAccessible = userProfile.accessiblePages?.includes('dashboard');
        if (!isAccessible) return null;
      }
      
      if (domainNavItems.some(di => di.id === item.id)) {
        const isAccessible = userProfile.accessiblePages?.includes(item.id);
        const hasAccessibleChild = pages.filter(p => p.parentId === item.id).some(p => userProfile.accessiblePages?.includes(p.id));
        if (!isAccessible && !hasAccessibleChild) return null;
      }

      if (item.id === 'drive') {
        const isAccessible = userProfile.accessiblePages?.includes('files');
        if (!isAccessible) return null;
      }
    }

    return (
      <Link
        key={item.id}
        to={item.path}
        className={cn(
          "flex items-center px-4 py-2.5 rounded-xl transition-all group relative",
          isActive 
            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
            : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
        )}
      >
        <Icon className={cn(
          "w-4 h-4 me-3 transition-colors",
          isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
        )} />
        <span className="text-[11px] font-semibold uppercase tracking-wider truncate">
          {t(item.id) || item.title}
        </span>
        {isActive && (
          <motion.div
            layoutId="sidebarActive"
            className="absolute inset-0 bg-blue-600 rounded-xl -z-10"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
      </Link>
    );
  };

  return (
    <aside 
      className={cn(
        "h-screen bg-[#f8fafc] border-r border-slate-200 p-4 flex flex-col shrink-0 transition-all duration-300",
        isSidebarOpen ? "w-[240px]" : "w-0 p-0 overflow-hidden border-none"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Dashboard at the top */}
        <div className="mb-2">
          {mainNavItems.map(renderNavItem)}
        </div>

        {/* Space after Dashboard */}
        <div className="h-4" />

        {/* Middle items (Governance to Risk) */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1 custom-scrollbar">
          {domainNavItems.map(renderNavItem)}
        </nav>

        {/* Bottom items */}
        <div className="mt-auto pt-4 space-y-1 border-t border-slate-100">
          {bottomNavItems.map(renderNavItem)}
        </div>
      </div>
    </aside>
  );
};
