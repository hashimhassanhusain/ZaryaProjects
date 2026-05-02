import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Settings, 
  FolderOpen, 
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  Building
} from 'lucide-react';
import { cn, stripNumericPrefix } from '../lib/utils';
import { useAuth } from '../context/UserContext';
import { useUI } from '../context/UIContext';
import { useLanguage } from '../context/LanguageContext';
import { HelpTooltip } from './HelpTooltip';
import { FOCUS_AREAS, PERFORMANCE_DOMAINS, DomainId } from '../constants/navigation';
import { pages } from '../data';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

import { useProject } from '../context/ProjectContext';

const HUB_IDS: Record<string, string> = {
  'governance': 'gov',
  'schedule': 'sched',
  'finance': 'fin',
  'stakeholders': 'stak',
  'resources': 'res',
  'risk': 'risk',
  'delivery': 'scope'
};

export const Sidebar: React.FC = () => {
  const { t, th, isRtl } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile, isAdmin } = useAuth();
  const { isSidebarOpen, setSelectedFocusArea } = useUI();
  const { companies, projects, selectedProject, setSelectedProject, setSelectedCompanyId, selectedCompanyId } = useProject();
  
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({
    'Planning': true,
    'Executing': true,
    'Monitoring & Controlling': true
  });
  
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});

  const toggleArea = (id: string) => {
    setExpandedAreas(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCompany = (id: string) => {
    setExpandedCompanies(prev => ({ ...prev, [id]: !prev[id] }));
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
      <div className="flex flex-col h-full" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* LOGO SECTION */}
        <div className="p-8 shrink-0 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-blue-200 group cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-white font-black text-2xl italic group-hover:scale-110 transition-transform">P</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-900 font-black text-xl tracking-tighter leading-none italic uppercase">PMIS</span>
            <span className="text-[10px] font-black text-blue-600 tracking-[0.3em] leading-none uppercase mt-1.5 opacity-80">{t('pmo_system')}</span>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-4 space-y-10 pb-10">
          
          {/* ── COMPANIES & PROJECTS HUB ── */}
          <div className="space-y-4">
             <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center justify-between">
                {t('enterprise_hub')}
                <Building className="w-3 h-3 opacity-30" />
             </h3>
             
             <div className="space-y-2">
                {/* Active Company Selector */}
                <div className="px-2">
                   <button
                     onClick={() => setExpandedCompanies(prev => ({ ...prev, _all: !prev._all }))}
                     className={cn(
                       "w-full flex items-center gap-3 px-4 py-4 rounded-3xl transition-all group bg-white shadow-sm ring-1 ring-slate-100",
                       expandedCompanies._all ? "ring-blue-200" : "hover:ring-blue-100"
                     )}
                   >
                     <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform">
                        <Building className="w-5 h-5" />
                     </div>
                     <div className="flex flex-col text-left flex-1 min-w-0">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1 opacity-60">{t('company')}</span>
                        <span className="text-[12px] font-black text-slate-800 uppercase tracking-wider truncate">
                           {companies.find(c => c.id === (selectedProject?.companyId || selectedCompanyId))?.name || t('select_company')}
                        </span>
                     </div>
                     <ChevronDown className={cn("w-4 h-4 text-slate-300 transition-transform", expandedCompanies._all && "rotate-180")} />
                   </button>
                </div>

                <AnimatePresence>
                  {expandedCompanies._all && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden px-2 space-y-1"
                    >
                       <div className="bg-slate-100/50 p-2 rounded-3xl border border-slate-200/50 space-y-1">
                          {companies.map((company, idx) => (
                             <button
                               key={`${company.id}-${idx}`}
                               onClick={() => {
                                 setSelectedCompanyId(company.id);
                                 setExpandedCompanies({}); // Close list
                               }}
                               className={cn(
                                 "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left",
                                 (selectedProject?.companyId === company.id || selectedCompanyId === company.id)
                                   ? "bg-white shadow-sm ring-1 ring-slate-200 text-blue-600"
                                   : "text-slate-500 hover:bg-white/80 hover:text-slate-900"
                               )}
                             >
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  (selectedProject?.companyId === company.id || selectedCompanyId === company.id) ? "bg-blue-600" : "bg-slate-300"
                                )} />
                                <span className="text-[11px] font-black uppercase tracking-wider truncate">{company.name}</span>
                             </button>
                          ))}
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Projects for Selected Company */}
                {(selectedProject?.companyId || selectedCompanyId) && (
                   <div className="pt-4 px-2 space-y-2">
                       <h4 className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('active_projects')}</h4>
                       <div className="space-y-1">
                          {projects
                            .filter(p => p.companyId === (selectedProject?.companyId || selectedCompanyId))
                            .map((project, idx) => (
                              <button
                                key={`${project.id}-${idx}`}
                                onClick={() => {
                                  setSelectedProject(project);
                                  navigate(`/project/${project.id}`);
                                }}
                                className={cn(
                                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group",
                                  selectedProject?.id === project.id 
                                    ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10" 
                                    : "text-slate-600 hover:bg-white hover:shadow-sm"
                                )}
                              >
                                <div className={cn(
                                  "w-7 h-7 rounded-xl flex items-center justify-center transition-colors",
                                  selectedProject?.id === project.id ? "bg-blue-600" : "bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600"
                                )}>
                                   <FolderOpen className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex flex-col text-left flex-1 min-w-0">
                                   <span className="text-[11px] font-black tracking-tight truncate leading-none mb-1">{project.name}</span>
                                   <span className={cn("text-[8px] font-bold uppercase tracking-widest", selectedProject?.id === project.id ? "text-blue-400" : "text-slate-400")}>{project.code}</span>
                                </div>
                              </button>
                            ))}
                          {projects.filter(p => p.companyId === (selectedProject?.companyId || selectedCompanyId)).length === 0 && (
                            <div className="px-4 py-4 text-[9px] font-bold text-slate-400 italic bg-white/50 rounded-2xl border border-dashed border-slate-200">
                               {t('no_active_projects')}
                            </div>
                          )}
                       </div>
                   </div>
                )}
             </div>
          </div>
          
          {/* ── FOCUS AREAS ── */}
          <div className="space-y-4">
            <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t('performance_domains')}</h3>
            
            <div className="space-y-1">
              {FOCUS_AREAS.map((area, idx) => {
                const isExpanded = expandedAreas[area.id];
                const AreaIcon = area.icon;
                
                return (
                  <div key={`${area.id}-${idx}`} className="space-y-1">
                    <button
                      onClick={() => toggleArea(area.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group hover:bg-white hover:shadow-sm"
                      )}
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                        <AreaIcon className="w-4 h-4" />
                      </div>
                        <span className="flex-1 text-left text-[11px] font-black text-slate-700 uppercase tracking-wider">{stripNumericPrefix(t(area.id))}</span>
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-300" /> : <ChevronRight className={cn("w-3.5 h-3.5 text-slate-300", isRtl && "rotate-180")} />}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-1 relative"
                        >
                          {/* Vertical tree line for Focus Area child items */}
                          <div className={cn(
                            "absolute top-0 bottom-4 w-[1px] bg-slate-200",
                            isRtl ? "right-6" : "left-6"
                          )} />
                          
                          {PERFORMANCE_DOMAINS.map((domain, idx) => {
                            const domainPagesInArea = pages.filter(p => p.domain === domain.id && p.focusArea === area.id && p.type === 'terminal');
                            if (domainPagesInArea.length === 0) return null;

                            const hubId = HUB_IDS[domain.id];
                            const path = selectedProject ? `/project/${selectedProject.id}/page/${hubId}` : `/page/${hubId}`;
                            const isHubActive = currentPath.includes(`/page/${hubId}`);
                            const DomainIcon = domain.icon;

                            return (
                              <div key={`${domain.id}-${idx}`} className={cn("space-y-1 group/domain relative", isRtl ? "pr-6" : "pl-6")}>
                                <div className="flex items-center gap-0">
                                  {/* Branch line to Domain */}
                                  <div className={cn(
                                    "w-4 h-4 border-b border-slate-200 rounded-bl-lg shrink-0",
                                    isRtl ? "border-r -mr-[1px]" : "border-l -ml-[1px]"
                                  )} />
                                  <Link
                                    to={path}
                                    onClick={() => setSelectedFocusArea(area.id)}
                                    className={cn(
                                      "flex-1 flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all relative z-10",
                                      isHubActive ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-100" : "text-slate-400 hover:text-slate-900"
                                    )}
                                  >
                                    <DomainIcon className={cn("w-3.5 h-3.5", isHubActive ? "text-blue-600 font-bold" : "text-slate-300 group-hover/domain:text-blue-500")} />
                                    <span className="text-[10px] font-black tracking-tight uppercase opacity-80 leading-none">{stripNumericPrefix(t(domain.id))}</span>
                                  </Link>
                                </div>

                                <div className={cn("space-y-1 relative", isRtl ? "pr-8" : "pl-8")}>
                                  {/* Vertical line for Terminal pages within this Domain */}
                                  <div className={cn(
                                    "absolute top-0 bottom-4 w-[1px] bg-slate-100",
                                    isRtl ? "right-3" : "left-3"
                                  )} />
                                  
                                  {domainPagesInArea.map((terminalPage, tIdx) => {
                                    const terminalPath = selectedProject ? `/project/${selectedProject.id}/page/${terminalPage.id}` : `/page/${terminalPage.id}`;
                                    const isTerminalActive = currentPath === terminalPath;
                                    if (!canAccess(terminalPage.id)) return null;

                                    return (
                                      <div key={`${terminalPage.id}-${tIdx}`} className="flex items-center gap-0">
                                        {/* Branch line to Terminal Page */}
                                        <div className={cn(
                                          "w-3 h-3 border-b border-slate-100 rounded-bl-md shrink-0",
                                          isRtl ? "border-r -mr-[1px]" : "border-l -ml-[1px]"
                                        )} />
                                        <Link
                                          to={terminalPath}
                                          className={cn(
                                            "flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all uppercase tracking-tighter relative",
                                            isTerminalActive ? "bg-blue-50 text-blue-600 font-black shadow-[inset_0_0_0_1px_rgba(37,99,235,0.1)]" : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                                          )}
                                        >
                                          <span className="truncate">{stripNumericPrefix(terminalPage.title)}</span>
                                        </Link>
                                      </div>
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

        {/* PROFILE SECTION */}
        <div className="p-6 border-t border-slate-200 bg-white/50 space-y-4">
           <Link to="/profile" className="flex items-center gap-3 p-2 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-slate-100">
                 {userProfile?.photoURL ? <img src={userProfile.photoURL} alt={userProfile.name} className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                 <div className="text-[11px] font-black text-slate-900 truncate tracking-tight">{userProfile?.name}</div>
                 <div className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{userProfile?.role}</div>
              </div>
           </Link>
           
           <button 
             onClick={handleLogout}
             className="w-full flex items-center justify-center gap-2 py-3 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all border border-rose-100 italic"
           >
             <LogOut className="w-3.5 h-3.5" />
             {t('terminate_session')}
           </button>
        </div>
      </div>
    </aside>
  );
};
