import React, { useState } from 'react';
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
  Zap,
  Target,
  Activity,
  ShieldCheck,
  Flag,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { pages } from '../data';
import { cn, stripNumericPrefix } from '../lib/utils';
import { useAuth } from '../context/UserContext';
import { useUI } from '../context/UIContext';
import { useLanguage } from '../context/LanguageContext';

const FOCUS_AREAS = [
  { id: 'Initiating', icon: Zap },
  { id: 'Planning',   icon: Target },
  { id: 'Executing',  icon: Activity },
  { id: 'Monitoring', icon: ShieldCheck },
  { id: 'Closing',    icon: Flag },
];

const BOTTOM_NAV = [
  { id: 'drive', label: 'Files', icon: FolderOpen, path: '/page/files' },
  { id: 'admin', label: 'Admin', icon: Settings,   path: '/admin/users' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { userProfile, isAdmin } = useAuth();
  const { isSidebarOpen } = useUI();
  const { t } = useLanguage();
  const [expandedArea, setExpandedArea] = useState<string | null>(null);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  const canAccess = (pageId: string): boolean => {
    if (isAdmin) return true;
    if (!userProfile) return false;
    return userProfile.accessiblePages?.includes(pageId) ?? false;
  };

  const getAreaPages = (areaId: string) => {
    // A page belongs to an area if its focusArea matches OR if it's a hub for that area
    return pages.filter(p => p.focusArea?.includes(areaId) || p.title.includes(areaId));
  };

  const renderArea = (area: typeof FOCUS_AREAS[0]) => {
    const areaPages = getAreaPages(area.id);
    const accessiblePages = areaPages.filter(p => {
      if (isAdmin) return true;
      if (canAccess(p.id)) return true;
      // If it's a hub, check if any child is accessible
      return p.type === 'hub' && pages.filter(child => child.parentId === p.id).some(child => canAccess(child.id));
    });

    if (accessiblePages.length === 0) return null;

    const isOpen = expandedArea === area.id;
    const Icon = area.icon;

    // Group by Domain
    const domains = Array.from(new Set(accessiblePages.map(p => p.domain).filter(Boolean))) as string[];

    return (
      <div key={area.id} className="space-y-1">
        <button
          onClick={() => setExpandedArea(isOpen ? null : area.id)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
            isOpen ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          )}
        >
          <Icon className={cn("w-5 h-5 transition-colors", isOpen ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
          <span className="flex-1 text-[11px] font-black uppercase tracking-widest text-left truncate">
            {area.id}
          </span>
          {isOpen ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
        </button>

        {isOpen && (
          <div className="ml-4 pl-4 border-l border-slate-100 space-y-1 mt-1 mb-3">
            {domains.map(domain => {
              const domainPages = accessiblePages.filter(p => p.domain === domain && p.type === 'terminal');
              const isDomainOpen = expandedDomain === `${area.id}-${domain}`;
              
              if (domainPages.length === 0) return null;

              return (
                <div key={domain} className="space-y-1">
                  <button
                    onClick={() => setExpandedDomain(isDomainOpen ? null : `${area.id}-${domain}`)}
                    className="w-full flex items-center gap-2 py-1.5 text-left group"
                  >
                    <span className="flex-1 text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] group-hover:text-slate-600 transition-colors">
                      {domain}
                    </span>
                    {isDomainOpen ? <ChevronDown className="w-2.5 h-2.5 text-slate-300" /> : <ChevronRight className="w-2.5 h-2.5 text-slate-300" />}
                  </button>
                  
                  {isDomainOpen && (
                    <div className="space-y-0.5 ml-1">
                      {domainPages.map(page => {
                        const active = location.pathname === `/page/${page.id}`;
                        return (
                          <Link
                            key={page.id}
                            to={`/page/${page.id}`}
                            className={cn(
                              "block px-2 py-1 rounded-lg text-[10px] font-medium transition-all truncate",
                              active 
                                ? "bg-blue-50 text-blue-700 font-bold" 
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                            )}
                          >
                            {stripNumericPrefix(t(page.id) || page.title)}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderBottomItem = (item: typeof BOTTOM_NAV[0]) => {
    if (item.id === 'admin' && !isAdmin) return null;
    const active = location.pathname === item.path;
    const Icon = item.icon;

    return (
      <Link
        key={item.id}
        to={item.path}
        className={cn(
          "flex flex-col items-center justify-center p-2 rounded-xl transition-all group",
          active ? "bg-slate-200 text-slate-900" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        )}
      >
        <Icon className="w-5 h-5 mb-0.5" />
        <span className="text-[8px] font-bold uppercase tracking-widest">{item.label}</span>
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        'h-screen bg-[#f8fafc] border-r border-slate-200 flex flex-col shrink-0 transition-all duration-300 custom-scrollbar',
        isSidebarOpen
          ? 'w-[140px] p-2 overflow-y-auto'
          : 'w-0 p-0 overflow-hidden border-none'
      )}
    >
      <nav className="flex-1 flex flex-col gap-1 pt-2">
        <Link
          to="/"
          className={cn(
            "flex flex-col items-center justify-center py-3 mb-2 rounded-xl transition-all group",
            location.pathname === '/' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          )}
        >
          <LayoutDashboard className="w-7 h-7 mb-1" />
          <span className="text-[8px] font-black uppercase tracking-widest">Dash</span>
        </Link>
        <div className="h-px bg-slate-100 mx-2 mb-2" />
        {FOCUS_AREAS.map(renderArea)}
      </nav>

      <div className="mt-auto pt-2 pb-2 border-t border-slate-100 flex flex-col gap-1">
        {BOTTOM_NAV.map(renderBottomItem)}
      </div>
    </aside>
  );
};
