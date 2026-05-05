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
      'h-screen bg-[#f8fafc] border-e border-slate-200 flex flex-col shrink-0 transition-all duration-300 relative z-40 shadow-[4px_0_12px_rgba(0,0,0,0.02)]',
      isSidebarOpen ? 'w-80 overflow-y-auto custom-scrollbar' : 'w-0 overflow-hidden border-none'
    )}>
      <div className="flex flex-col h-full" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* LOGO SECTION */}
        <div className="p-8 shrink-0 flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-slate-200 group cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-white font-black text-2xl italic group-hover:scale-110 transition-transform">Z</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-900 font-black text-2xl tracking-tighter leading-none italic uppercase">ZARYA</span>
            <span className="text-[9px] font-black text-blue-600 tracking-[0.4em] leading-none uppercase mt-2 opacity-80">{t('pmo_system')}</span>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-4 space-y-8 pb-10">
          
          {/* ── ENTERPRISE HUB (COMPANIES & PROJECTS) ── */}
          <div className="space-y-3">
             <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center justify-between opacity-60">
                {t('enterprise')}
                <Building className="w-3 h-3" />
             </h3>
             
             <div className="space-y-2">
                {/* Active Company Selector */}
                <div className="px-1">
                   <button
                     onClick={() => setExpandedCompanies(prev => ({ ...prev, _all: !prev._all }))}
                     className={cn(
                       "w-full flex items-center gap-3 px-4 py-3.5 rounded-[1.5rem] transition-all group bg-white shadow-sm border border-slate-100",
                       expandedCompanies._all ? "border-blue-200 ring-4 ring-blue-50" : "hover:border-blue-100"
                     )}
                   >
                     <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200 group-hover:scale-105 transition-transform">
                        <Building className="w-4 h-4" />
                     </div>
                     <div className="flex flex-col text-left flex-1 min-w-0">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t('company')}</span>
                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider truncate">
                           {companies.find(c => c.id === (selectedProject?.companyId || selectedCompanyId))?.name || t('select_company')}
                        </span>
                     </div>
                     <ChevronDown className={cn("w-3.5 h-3.5 text-slate-300 transition-transform", expandedCompanies._all && "rotate-180")} />
                   </button>
                </div>

                <AnimatePresence>
                  {expandedCompanies._all && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden px-1 space-y-1"
                    >
                       <div className="bg-slate-50/80 p-2 rounded-2xl border border-slate-200/50 space-y-1">
                          {companies.map((company, idx) => (
                             <button
                                key={`${company.id}-${idx}`}
                                onClick={() => {
                                  setSelectedCompanyId(company.id);
                                  setExpandedCompanies({}); // Close list
                                }}
                                className={cn(
                                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-left",
                                  (selectedProject?.companyId === company.id || selectedCompanyId === company.id)
                                    ? "bg-white shadow-sm border border-slate-200 text-blue-600"
                                    : "text-slate-500 hover:bg-white/80 hover:text-slate-900"
                                )}
                             >
                                <div className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  (selectedProject?.companyId === company.id || selectedCompanyId === company.id) ? "bg-blue-600" : "bg-slate-300"
                                )} />
                                <span className="text-[10px] font-black uppercase tracking-wider truncate">{company.name}</span>
                             </button>
                          ))}
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Projects for Selected Company */}
                {(selectedProject?.companyId || selectedCompanyId) && (
                   <div className="pt-2 px-1 relative pl-6 space-y-2">
                       {/* Tree Line for Projects */}
                       <div className={cn(
                         "absolute top-0 bottom-4 w-[1px] bg-slate-200",
                         isRtl ? "right-5" : "left-5"
                       )} />
                       
                       <h4 className="px-2 text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('project_vault')}</h4>
                       <div className="space-y-1.5">
                          {projects
                            .filter(p => p.companyId === (selectedProject?.companyId || selectedCompanyId))
                            .map((project, idx) => (
                              <div key={`${project.id}-${idx}`} className="flex items-center gap-0">
                                <div className={cn(
                                  "w-3 h-3 border-b border-slate-200 rounded-bl-lg shrink-0",
                                  isRtl ? "border-r -mr-[1px]" : "border-l -ml-[1px]"
                                )} />
                                <button
                                  onClick={() => {
                                    setSelectedProject(project);
                                    navigate(`/project/${project.id}`);
                                  }}
                                  className={cn(
                                    "flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                                    selectedProject?.id === project.id 
                                      ? "bg-white shadow-md border border-slate-200 ring-4 ring-blue-50/50" 
                                      : "text-slate-500 hover:bg-white hover:text-slate-900"
                                  )}
                                >
                                  <div className={cn(
                                    "w-6 h-6 rounded-lg flex items-center justify-center transition-colors",
                                    selectedProject?.id === project.id ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600"
                                  )}>
                                     <FolderOpen className="w-3 h-3" />
                                  </div>
                                  <div className="flex flex-col text-left flex-1 min-w-0">
                                     <span className={cn("text-[10px] font-black tracking-tight truncate leading-none mb-1 uppercase", selectedProject?.id === project.id ? "text-slate-900" : "text-slate-600")}>{project.name}</span>
                                     <span className={cn("text-[7px] font-black uppercase tracking-[0.2em]", selectedProject?.id === project.id ? "text-blue-600" : "text-slate-400")}>{project.code}</span>
                                  </div>
                                </button>
                              </div>
                            ))}
                       </div>
                   </div>
                )}
             </div>
          </div>
          
          {/* ── PERFORMANCE DOMAINS (TREE STRUCTURE) ── */}
          <div className="space-y-4">
            <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] opacity-60">{t('pmp_navigation')}</h3>
            
            <div className="space-y-1">
              {FOCUS_AREAS.map((area, idx) => {
                const isExpanded = expandedAreas[area.id];
                const AreaIcon = area.icon;
                
                return (
                  <div key={`${area.id}-${idx}`}>
                    <button
                      onClick={() => toggleArea(area.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group hover:bg-white",
                        isExpanded ? "text-slate-900" : "text-slate-500"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                        isExpanded ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "bg-slate-100 text-slate-400 group-hover:text-blue-500"
                      )}>
                        <AreaIcon className="w-4 h-4" />
                      </div>
                      <span className="flex-1 text-left text-xs font-black uppercase tracking-wider">{stripNumericPrefix(t(area.id))}</span>
                      <div className="p-1 rounded-md bg-slate-50 border border-slate-100">
                        {isExpanded ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className={cn("w-3 h-3 text-slate-400", isRtl && "rotate-180")} />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-1 relative"
                        >
                          {/* Main Focus Area vertical tree line */}
                          <div className={cn(
                            "absolute top-0 bottom-4 w-[1px] bg-slate-200",
                            isRtl ? "right-[1.85rem]" : "left-[1.85rem]"
                          )} />
                          
                          {PERFORMANCE_DOMAINS.map((domain, dIdx) => {
                            const leafPages = pages.filter(p => p.domain === domain.id && p.focusArea === area.id && p.type === 'terminal');
                            const hasProcesses = leafPages.length > 0 || pages.some(p => p.id === HUB_IDS[domain.id] && p.focusArea === area.id);
                            
                            if (!hasProcesses) return null;

                            const hubId = HUB_IDS[domain.id];
                            const path = selectedProject ? `/project/${selectedProject.id}/page/${hubId}` : `/page/${hubId}`;
                            const isHubActive = currentPath.includes(`/page/${hubId}`);
                            const DomainIcon = domain.icon;

                            return (
                              <div key={`${domain.id}-${dIdx}`} className={cn("space-y-0.5 relative z-10", isRtl ? "pr-8" : "pl-8")}>
                                <div className="flex items-center gap-0 group/domain">
                                  {/* Connector from Focus Area vertical line to Domain hub */}
                                  <div className={cn(
                                    "absolute top-0 bottom-[1.15rem] w-[1px] bg-slate-200",
                                    isRtl ? "right-[-1.85rem]" : "left-[-1.85rem]"
                                  )} />
                                  <div className={cn(
                                    "w-4 h-[1px] bg-slate-200 shrink-0",
                                    isRtl ? "-mr-[1.85rem]" : "-ml-[1.85rem]"
                                  )} />
                                  
                                  <Link
                                    to={path}
                                    onClick={() => setSelectedFocusArea(area.id)}
                                    className={cn(
                                      "flex-1 flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all",
                                      isHubActive ? "bg-white text-blue-600 shadow-sm border border-slate-200" : "text-slate-400 font-bold hover:text-slate-800"
                                    )}
                                  >
                                    <div className={cn(
                                      "w-4 h-4 rounded-md flex items-center justify-center transition-colors shrink-0",
                                      isHubActive ? "bg-blue-600 text-white" : "bg-slate-100 group-hover/domain:bg-blue-50"
                                    )}>
                                      <DomainIcon className="w-2.5 h-2.5" />
                                    </div>
                                    <span className="text-[9px] font-black tracking-widest uppercase opacity-90 leading-none">{stripNumericPrefix(t(domain.id))} Hub</span>
                                  </Link>
                                </div>

                                {leafPages.length > 0 && (
                                  <div className={cn("space-y-0.5 mt-0.5 relative", isRtl ? "pr-6" : "pl-6")}>
                                    {leafPages.map((terminalPage, tIdx) => {
                                      const terminalPath = selectedProject ? `/project/${selectedProject.id}/page/${terminalPage.id}` : `/page/${terminalPage.id}`;
                                      const isTerminalActive = currentPath === terminalPath;
                                      if (!canAccess(terminalPage.id)) return null;

                                      return (
                                        <div key={`${terminalPage.id}-${tIdx}`} className="flex items-center gap-0 group/terminal">
                                           {/* Vertical connector line for terminal pages */}
                                           <div className={cn(
                                             "absolute top-0 bottom-[1.15rem] w-[1px] bg-slate-100",
                                             isRtl ? "right-[-0.72rem]" : "left-[-0.72rem]"
                                           )} />
                                           {/* Horizontal connector line */}
                                           <div className={cn(
                                             "w-2.5 h-[1px] bg-slate-100 shrink-0",
                                             isRtl ? "-mr-[0.72rem]" : "-ml-[0.72rem]"
                                           )} />

                                          <Link
                                            to={terminalPath}
                                            className={cn(
                                              "flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black transition-all uppercase tracking-tighter relative group/link",
                                              isTerminalActive ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-700 hover:bg-slate-50/50"
                                            )}
                                          >
                                            <span className="truncate group-hover/link:translate-x-1 transition-transform">{stripNumericPrefix(terminalPage.title)}</span>
                                          </Link>
                                        </div>
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

        {/* PROFILE SECTION */}
        <div className="p-6 border-t border-slate-200 bg-white/50 space-y-3">
           <Link to="/profile" className="flex items-center gap-3 p-2 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all group">
              <div className="w-9 h-9 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-slate-100">
                 {userProfile?.photoURL ? <img src={userProfile.photoURL} alt={userProfile.name} className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                 <div className="text-[10px] font-black text-slate-900 truncate tracking-tight uppercase leading-none">{userProfile?.name}</div>
                 <div className="text-[8px] font-black text-blue-600 uppercase tracking-widest mt-1 opacity-80">{userProfile?.role}</div>
              </div>
           </Link>
           
           <button 
             onClick={handleLogout}
             className="w-full flex items-center justify-center gap-2 py-3 bg-rose-50 text-rose-600 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-100 transition-all border border-rose-100 italic"
           >
             <LogOut className="w-3.5 h-3.5" />
             {t('terminate_session')}
           </button>
        </div>
      </div>
    </aside>
  );
};
