import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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

import { PERFORMANCE_DOMAINS, FOCUS_AREAS, DomainId } from '../constants/navigation';

const BOTTOM_NAV = [
  { id: 'drive', label: 'Files', icon: FolderOpen, path: '/page/files' },
  { id: 'admin', label: 'Admin', icon: Settings,   path: '/admin/users' },
];

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, isAdmin } = useAuth();
  const { isSidebarOpen, setSelectedDomain, setSelectedFocusArea } = useUI();
  const { t } = useLanguage();
  const [expandedFocusArea, setExpandedFocusArea] = useState<string | null>(null);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  const canAccess = (pageId: string): boolean => {
    if (isAdmin) return true;
    if (!userProfile) return false;
    return userProfile.accessiblePages?.includes(pageId) ?? false;
  };

  const renderFocusArea = (focusArea: typeof FOCUS_AREAS[number]) => {
    const isFAOuen = expandedFocusArea === focusArea.id;
    const FAOcon = focusArea.icon;

    // Filter domains that have pages in this focus area
    const relevantDomains = PERFORMANCE_DOMAINS.filter(domain => {
      const domainPages = pages.filter(p => p.domain === domain.id && p.focusArea === focusArea.id);
      return isAdmin || domainPages.some(p => canAccess(p.id));
    });

    if (relevantDomains.length === 0 && !isAdmin) return null;

    return (
      <div key={focusArea.id} className="space-y-1">
        <button
          onClick={() => {
            setExpandedFocusArea(isFAOuen ? null : focusArea.id);
            setSelectedFocusArea(focusArea.id as any);
          }}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group mb-1",
            isFAOuen ? "bg-white shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          )}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
            <FAOcon className="w-4 h-4" />
          </div>
          <span className="flex-1 text-[10px] font-black uppercase tracking-widest text-left truncate">
            {focusArea.title}
          </span>
          {isFAOuen ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
        </button>

        {isFAOuen && (
          <div className="ml-5 pl-4 border-l border-slate-100 space-y-1 mb-3">
            {relevantDomains.map(domain => {
              const isDomainOpen = expandedDomain === `${focusArea.id}-${domain.id}`;
              const domainPages = pages.filter(p => p.domain === domain.id && p.focusArea === focusArea.id);
              const accessiblePages = domainPages.filter(p => canAccess(p.id));

              return (
                <div key={domain.id} className="space-y-1">
                  <button
                    onClick={() => setExpandedDomain(isDomainOpen ? null : `${focusArea.id}-${domain.id}`)}
                    className={cn(
                      "w-full flex items-center gap-2 py-1.5 text-left text-[9px] font-bold uppercase tracking-widest transition-all",
                      isDomainOpen ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: domain.color }} />
                    <span className="flex-1 truncate">{domain.title}</span>
                    {isDomainOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                  </button>

                  {isDomainOpen && (
                    <div className="ml-2 pl-3 border-l border-slate-100 space-y-1">
                      {accessiblePages.map(page => {
                        const active = location.pathname === `/page/${page.id}`;
                        return (
                          <Link
                            key={page.id}
                            to={`/page/${page.id}`}
                            className={cn(
                              "block px-2 py-1 rounded-lg text-[10px] font-medium transition-all truncate border-l-2",
                              active 
                                ? "bg-slate-50 text-slate-900 font-bold border-blue-600" 
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-transparent"
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
        {FOCUS_AREAS.map(renderFocusArea)}
      </nav>

      <div className="mt-auto pt-2 pb-2 border-t border-slate-100 flex flex-col gap-1">
        {BOTTOM_NAV.map(renderBottomItem)}
      </div>
    </aside>
  );
};
