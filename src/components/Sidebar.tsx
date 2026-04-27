import React, { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Settings, 
  FolderOpen, 
  ChevronDown,
  ChevronRight,
  LogOut,
  User
} from 'lucide-react';
import { cn, stripNumericPrefix } from '../lib/utils';
import { useAuth } from '../context/UserContext';
import { useUI } from '../context/UIContext';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { toSlug } from '../lib/utils';
import { HelpTooltip } from './HelpTooltip';
import { FOCUS_AREAS, PERFORMANCE_DOMAINS, DomainId, HUB_IDS } from '../constants/navigation';
import { pages } from '../data';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export const Sidebar: React.FC = () => {
  const { t, th } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { companySlug, projectSlug, domainSlug, pageSlug } = useParams();
  const { userProfile, isAdmin } = useAuth();
  const { isSidebarOpen, setSelectedFocusArea } = useUI();
  const { selectedCompany, selectedProject } = useProject();
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({
    'Planning': true,
    'Executing': true,
    'Monitoring & Controlling': true
  });

  const getPath = (dSlug: string, pSlug: string) => {
    if (!selectedCompany || !selectedProject) return `/page/${pSlug}`;
    return `/${toSlug(selectedCompany.name)}/${toSlug(selectedProject.name)}/${dSlug}/${pSlug}`;
  };

  const toggleArea = (id: string) => {
    setExpandedAreas(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const currentPath = location.pathname;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const canAccess = (pageId: string): boolean => {
    if (isAdmin) return true;
    if (!userProfile) return false;
    return userProfile.accessiblePages?.includes(pageId) ?? false;
  };

  return (
    <aside className={cn(
      'h-screen bg-[#f1f5f9] border-e border-slate-200 flex flex-col shrink-0 transition-all duration-300 relative z-40',
      isSidebarOpen ? 'w-72 overflow-y-auto custom-scrollbar' : 'w-0 overflow-hidden border-none'
    )}>
      <div className="flex flex-col h-full">
        {/* LOGO SECTION */}
        <div className="p-6 shrink-0 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <span className="text-white font-black text-xl italic">P</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-900 font-black text-lg tracking-tighter leading-none italic uppercase">PMISPro</span>
            <span className="text-[9px] font-bold text-blue-600 tracking-[0.2em] leading-none uppercase mt-1">Enterprise PMO</span>
          </div>
        </div>

        {/* PROFILE PREVIEW */}
        <div className="px-6 mb-6">
          <Link to="/profile" className="flex items-center gap-3 p-3 bg-white/50 border border-slate-200 rounded-2xl hover:bg-white hover:border-blue-200 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-slate-100">
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt={userProfile.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
               <div className="text-[11px] font-bold text-slate-900 truncate tracking-tight">{userProfile?.name}</div>
               <div className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">{userProfile?.role}</div>
            </div>
          </Link>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-4 space-y-8 pb-10">
          {/* DASHBOARD */}
          <div className="space-y-1">
             <HelpTooltip text={th('dashboard_summary')} position="right">
               <Link
                 to="/"
                 className={cn(
                   "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-xs uppercase tracking-widest group",
                   currentPath === '/' 
                     ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                     : "text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                 )}
               >
                 <LayoutDashboard className={cn("w-4 h-4", currentPath === '/' ? "text-white" : "text-slate-400 group-hover:text-blue-600")} />
                 {t('dashboard')}
               </Link>
             </HelpTooltip>
          </div>

          {/* FOCUS AREAS TREE */}
          <div className="space-y-6">
            <h3 className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">{t('performance_domains')}</h3>
            
            <div className="space-y-2">
              {FOCUS_AREAS.map(area => {
                const isExpanded = expandedAreas[area.id];
                const AreaIcon = area.icon;
                
                return (
                  <div key={area.id} className="space-y-1">
                    <button
                      onClick={() => toggleArea(area.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group",
                        "hover:bg-white hover:shadow-sm"
                      )}
                    >
                      <AreaIcon className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                      <span className="flex-1 text-left text-[11px] font-bold text-slate-700 uppercase tracking-wider">{t(area.id)}</span>
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden pl-7 space-y-1"
                        >
                          {PERFORMANCE_DOMAINS.map(domain => {
                            // Find any pages for this domain IN THIS focus area
                            const domainPagesInArea = pages.filter(p => 
                              p.domain === domain.id && 
                              p.focusArea === area.id &&
                              p.type === 'terminal'
                            );

                            if (domainPagesInArea.length === 0) return null;

                            const hubId = HUB_IDS[domain.id];
                            const path = getPath(domain.id, hubId);
                            const isHubActive = domainSlug === domain.id || pageSlug === hubId;
                            const DomainIcon = domain.icon;

                            return (
                              <div key={domain.id} className="space-y-0.5">
                                <HelpTooltip text={th(`${domain.id}_summary`)} position="right">
                                  <Link
                                    to={path}
                                    onClick={() => setSelectedFocusArea(area.id)}
                                    className={cn(
                                      "flex items-center gap-3 px-4 py-2 rounded-xl transition-all group",
                                      isHubActive 
                                        ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-100" 
                                        : "text-slate-400 hover:text-slate-900 border border-transparent"
                                    )}
                                  >
                                    <DomainIcon className={cn("w-3.5 h-3.5", isHubActive ? "text-blue-600" : "text-slate-300 group-hover:text-blue-500")} />
                                    <span className={cn("text-[11px] font-bold tracking-tight uppercase opacity-80")}>
                                      {stripNumericPrefix(t(domain.id))}
                                    </span>
                                  </Link>
                                </HelpTooltip>

                                {/* Child Terminal Pages indented further */}
                                <div className="pl-6 border-l border-slate-200/50 ml-5 space-y-0.5">
                                  {domainPagesInArea.map(terminalPage => {
                                    const terminalPath = getPath(domain.id, terminalPage.id);
                                    const isTerminalActive = pageSlug === terminalPage.id || toSlug(terminalPage.title) === pageSlug;
                                    
                                    if (!canAccess(terminalPage.id)) return null;

                                    const translatedLabel = t(terminalPage.id);
                                    const strippedLabel = stripNumericPrefix(translatedLabel);
                                    const displayLabel = (strippedLabel && strippedLabel.trim() !== '') 
                                      ? strippedLabel 
                                      : stripNumericPrefix(terminalPage.title) || terminalPage.title;

                                    return (
                                      <Link
                                        key={terminalPage.id}
                                        to={terminalPath}
                                        onClick={() => setSelectedFocusArea(area.id)}
                                        className={cn(
                                          "block px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all",
                                          isTerminalActive
                                            ? "bg-blue-50 text-blue-600 font-bold"
                                            : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                                        )}
                                      >
                                        {displayLabel}
                                      </Link>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </nav>

        {/* BOTTOM SECTION */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 relative z-10 shrink-0">
          <div className="grid grid-cols-2 gap-2 mb-3">
             <HelpTooltip text={th('drive_explorer_summary')} position="top">
               <Link to="/page/files" className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 hover:bg-blue-50 transition-all group w-full">
                  <FolderOpen className="w-5 h-5 text-slate-400 group-hover:text-blue-600 mb-1" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t('files')}</span>
               </Link>
             </HelpTooltip>
             <HelpTooltip text={th('admin_settings_summary')} position="top">
               <Link to="/admin/users" className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 hover:bg-blue-50 transition-all group w-full">
                  <Settings className="w-5 h-5 text-slate-400 group-hover:text-blue-600 mb-1" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t('admin')}</span>
               </Link>
             </HelpTooltip>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-3 bg-rose-50 text-rose-600 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all border border-rose-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t('logout')}
          </button>
        </div>
      </div>
    </aside>
  );
};

