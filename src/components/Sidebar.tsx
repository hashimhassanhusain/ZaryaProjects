import React, { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Settings, 
  FolderOpen, 
  ChevronDown,
  ChevronRight,
  ArrowRight,
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
      'h-screen bg-[#f8fafc] border-e border-slate-200/60 flex flex-col shrink-0 transition-all duration-300 relative z-40',
      isSidebarOpen ? 'w-72 overflow-y-auto custom-scrollbar' : 'w-0 overflow-hidden border-none'
    )}>
      <div className="flex flex-col h-full">
        {/* LOGO SECTION */}
        <div className="p-8 shrink-0 flex items-center gap-3">
          <div className="bg-slate-900 px-2 py-1 rounded flex items-center justify-center font-black text-[10px] text-white italic shadow-sm">PMIS</div>
          <span className="text-slate-900 font-black text-lg tracking-tighter uppercase leading-none italic">PRO</span>
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
                          className="overflow-hidden pl-4 ml-3 border-l border-slate-200 space-y-1 mt-1"
                        >
                          {PERFORMANCE_DOMAINS.map(domain => {
                            // Find all pages for this domain IN THIS focus area
                            const domainPagesInArea = pages.filter(p => 
                              p.domain === domain.id && 
                              p.focusArea === area.id
                            );

                            if (domainPagesInArea.length === 0) return null;

                            const hubPage = domainPagesInArea.find(p => p.type === 'hub') || domainPagesInArea[0];
                            const terminalSubPages = domainPagesInArea.filter(p => p.type === 'terminal' && p.id !== hubPage.id);
                            
                            const hubPath = getPath(domain.id, hubPage.id);
                            const isDomainActive = domainSlug === domain.id;
                            const DomainIcon = domain.icon;

                            return (
                              <div key={domain.id} className="space-y-0.5">
                                <Link
                                  to={hubPath}
                                  onClick={() => setSelectedFocusArea(area.id)}
                                  className={cn(
                                    "flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all group relative",
                                    isDomainActive 
                                      ? "text-blue-600 bg-blue-50/50 font-bold" 
                                      : "text-slate-500 hover:text-slate-900 hover:bg-white"
                                  )}
                                >
                                  {/* Tree Connector */}
                                  <div className="absolute left-[-17px] top-[10px] w-3 h-[1px] bg-slate-200" />
                                  
                                  <DomainIcon className={cn("w-3.5 h-3.5 shrink-0", isDomainActive ? "text-blue-600" : "text-slate-400 group-hover:text-blue-500")} />
                                  <span className="text-[10px] uppercase font-bold tracking-wider truncate">
                                    {stripNumericPrefix(t(domain.id))}
                                  </span>
                                  {terminalSubPages.length > 0 && (
                                    <ChevronRight className={cn("w-3 h-3 ml-auto opacity-40 transition-transform", isDomainActive && "rotate-90")} />
                                  )}
                                </Link>

                                {/* Terminal Sub-pages */}
                                {isDomainActive && terminalSubPages.length > 0 && (
                                  <div className="pl-4 ml-2 border-l border-slate-200/50 space-y-0.5 mt-0.5">
                                    {terminalSubPages.map(subPage => {
                                      const isSubActive = pageSlug === subPage.id;
                                      return (
                                        <Link
                                          key={subPage.id}
                                          to={getPath(domain.id, subPage.id)}
                                          className={cn(
                                            "flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all relative",
                                            isSubActive ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-slate-700"
                                          )}
                                        >
                                          {/* Sub Tree Connector */}
                                          <div className="absolute left-[-13px] top-[9px] w-2.5 h-[1px] bg-slate-200/50" />
                                          <ArrowRight className="w-2.5 h-2.5 opacity-30" />
                                          <span className="truncate">{stripNumericPrefix(t(subPage.id) || subPage.title)}</span>
                                        </Link>
                                      );
                                    })}
                                  </div>
                                )}
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

