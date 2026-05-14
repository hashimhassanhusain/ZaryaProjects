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
import { cn, stripNumericPrefix, isAdminRole } from '../lib/utils';
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
  'communications': 'comm',
  'governance': 'gov',
  'delivery': 'scope',
  'controls': 'ctrl',
  'finance': 'fin',
  'resources': 'res',
  'stakeholders': 'stak',
  'risk': 'risk',
  'handover': 'handover_hub',
  'administration': 'admin_hub'
};

export const Sidebar: React.FC = () => {
  const { t, th, isRtl } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile, isAdmin } = useAuth();
  const { isSidebarOpen, setSelectedFocusArea, theme, toggleTheme } = useUI();
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
      'h-screen bg-app-bg border-e border-neutral-200 flex flex-col shrink-0 transition-all duration-300 relative z-40',
      isSidebarOpen ? 'w-80 overflow-y-auto custom-scrollbar' : 'w-0 overflow-hidden border-none'
    )}>
      <div className="flex flex-col h-full" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* LOGO SECTION */}
        <div className="p-8 shrink-0 flex items-center gap-4 cursor-pointer group" onClick={() => navigate('/')}>
             {/* New Logo */}
             <div className="w-12 h-12 bg-text-primary rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <span className="text-brand font-black text-[10px] tracking-tighter">PMIS</span>
             </div>
             <div className="flex flex-col">
               <span className="text-text-primary font-black text-2xl tracking-tighter leading-none italic uppercase">ZARYA</span>
               <span className="text-[9px] font-black text-brand tracking-[0.4em] leading-none uppercase mt-2 opacity-80">{t('pmo_system')}</span>
             </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-4 space-y-8 pb-10">
          
          {/* ── ENTERPRISE HUB (COMPANIES & PROJECTS) ── */}
          <div className="space-y-3">
             <h3 className="px-4 text-[10px] font-black text-text-secondary uppercase tracking-[0.3em] flex items-center justify-between opacity-60">
                {t('enterprise')}
                <Building className="w-3 h-3" />
             </h3>
             
             <div className="space-y-2">
                {/* Active Company Selector */}
                <div className="px-1">
                   <button
                     onClick={() => setExpandedCompanies(prev => ({ ...prev, _all: !prev._all }))}
                     className={cn(
                       "w-full flex items-center gap-3 px-4 py-3.5 rounded-[1.5rem] transition-all group bg-surface shadow-sm border border-neutral-100 dark:border-neutral-800",
                       expandedCompanies._all ? "border-brand-secondary ring-4 ring-brand/10" : "hover:border-brand/20"
                     )}
                   >
                     <div className="w-9 h-9 rounded-xl bg-neutral-950 flex items-center justify-center text-white shadow-lg shadow-neutral-200 group-hover:scale-105 transition-transform">
                        <Building className="w-4 h-4" />
                     </div>
                     <div className="flex flex-col text-left flex-1 min-w-0">
                        <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest leading-none mb-1">{t('company')}</span>
                        <span className="text-[12px] font-black text-neutral-800 uppercase tracking-wider truncate">
                           {companies.find(c => c.id === (selectedProject?.companyId || selectedCompanyId))?.name || t('select_company')}
                        </span>
                     </div>
                     <ChevronDown className={cn("w-3.5 h-3.5 text-neutral-300 transition-transform", expandedCompanies._all && "rotate-180")} />
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
                       <div className="bg-neutral-50/80 p-2 rounded-2xl border border-neutral-200/50 space-y-1">
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
                                    ? "bg-white shadow-sm border border-neutral-200 text-brand"
                                    : "text-neutral-500 hover:bg-white/80 hover:text-neutral-900"
                                )}
                             >
                                <div className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  (selectedProject?.companyId === company.id || selectedCompanyId === company.id) ? "bg-brand" : "bg-neutral-300"
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
                   <div className="pt-2 px-1 relative pl-6 space-y-2">
                       {/* Tree Line for Projects */}
                       <div className={cn(
                         "absolute top-0 bottom-4 w-[1px] bg-neutral-200",
                         isRtl ? "right-5" : "left-5"
                       )} />
                       
                       <h4 className="px-2 text-[8px] font-black text-neutral-600 uppercase tracking-[0.2em]">{t('project_vault')}</h4>
                       <div className="space-y-1.5">
                          {projects
                            .filter(p => p.companyId === (selectedProject?.companyId || selectedCompanyId))
                            .map((project, idx) => (
                              <div key={`${project.id}-${idx}`} className="flex items-center gap-0">
                                <div className={cn(
                                  "w-3 h-3 border-b border-neutral-200 rounded-bl-lg shrink-0",
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
                                      ? "bg-surface shadow-md border border-neutral-200 ring-4 ring-brand/10" 
                                      : "text-neutral-500 hover:bg-surface hover:text-text-main"
                                  )}
                                >
                                  <div className={cn(
                                    "w-6 h-6 rounded-lg flex items-center justify-center transition-colors",
                                    selectedProject?.id === project.id ? "bg-brand text-white shadow-lg shadow-brand/20" : "bg-neutral-100 group-hover:bg-brand/10 group-hover:text-brand"
                                  )}>
                                     <FolderOpen className="w-3 h-3" />
                                  </div>
                                  <div className="flex flex-col text-left flex-1 min-w-0">
                                     <span className={cn("text-[11px] font-black tracking-tight truncate leading-none mb-1 uppercase", selectedProject?.id === project.id ? "text-text-main" : "text-neutral-600")}>{project.name}</span>
                                     <span className={cn("text-[8px] font-black uppercase tracking-[0.2em]", selectedProject?.id === project.id ? "text-brand" : "text-neutral-400")}>{project.code}</span>
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
            <h3 className="px-4 text-[10px] font-black text-neutral-600 uppercase tracking-[0.3em]">{t('pmp_navigation')}</h3>
            
            <div className="space-y-1">
              {FOCUS_AREAS.map((area, idx) => {
                const isExpanded = expandedAreas[area.id];
                const AreaIcon = area.icon;
                
                return (
                  <div key={`${area.id}-${idx}`}>
                    <button
                      onClick={() => toggleArea(area.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group hover:bg-surface",
                        isExpanded ? "text-text-main" : "text-neutral-500 font-bold"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                        isExpanded ? "bg-neutral-900 text-white shadow-lg shadow-neutral-200" : "bg-neutral-100 text-neutral-400 group-hover:text-brand"
                      )}>
                        <AreaIcon className="w-4 h-4" />
                      </div>
                      <span className="flex-1 text-left text-[11px] font-black uppercase tracking-wider text-text-primary">
                        {stripNumericPrefix(t(area.id.toLowerCase().replace(/\s+/g, '_')) || area.title)}
                      </span>
                      <div className="p-1 rounded-md bg-white border border-neutral-100">
                        {isExpanded ? <ChevronDown className="w-3 h-3 text-text-secondary" /> : <ChevronRight className={cn("w-3 h-3 text-text-secondary", isRtl && "rotate-180")} />}
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
                          {/* Main Focus Area content */}
                          
                          {PERFORMANCE_DOMAINS.filter(domain => !domain.isAdminOnly || (userProfile && isAdminRole(userProfile.role))).map((domain, dIdx) => {
                            const hubId = HUB_IDS[domain.id];
                            // Get ALL pages for this domain and focus area
                            const domainPages = pages.filter(p => p.domain === domain.id && p.focusArea === area.id && p.id !== hubId);
                            
                            const hasProcesses = domainPages.length > 0 || pages.some(p => p.id === hubId && p.focusArea === area.id);
                            
                            if (!hasProcesses) return null;

                            const path = selectedProject ? `/project/${selectedProject.id}/page/${hubId}` : `/page/${hubId}`;
                            const isHubActive = currentPath.includes(`/page/${hubId}`);
                            const DomainIcon = domain.icon;

                            return (
                              <div key={`${domain.id}-${dIdx}`} className={cn("space-y-0.5 relative z-10", isRtl ? "pr-8" : "pl-8")}>
                                <div className="flex items-center gap-0 group/domain relative">
                                   {/* Domain Connector Line */}
                                   <div className={cn(
                                     "absolute top-0 bottom-[1.15rem] w-[1.5px] bg-neutral-200 dark:bg-white/10",
                                     isRtl ? "right-[-0.72rem]" : "left-[-0.72rem]"
                                   )} />
                                   <div className={cn(
                                     "w-3.5 h-[1.5px] bg-neutral-200 dark:bg-white/10",
                                     isRtl ? "-mr-[0.72rem]" : "-ml-[0.72rem]"
                                   )} />

                                  <Link
                                    to={path}
                                    onClick={() => setSelectedFocusArea(area.id)}
                                    className={cn(
                                      "flex-1 flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all",
                                      isHubActive ? "bg-white text-brand shadow border border-neutral-200 font-black" : "text-neutral-500 font-bold hover:text-text-main"
                                    )}
                                  >
                                    <div className={cn(
                                      "w-4 h-4 rounded-md flex items-center justify-center transition-colors shrink-0",
                                      isHubActive ? "bg-brand text-white shadow-sm shadow-brand/20" : "bg-neutral-100 group-hover:domain:bg-brand/10"
                                    )}>
                                      <DomainIcon className="w-2.5 h-2.5" />
                                    </div>
                                    <span className="text-[10px] font-black tracking-widest uppercase opacity-90 leading-none truncate">{stripNumericPrefix(t(domain.id))}</span>
                                  </Link>
                                </div>

                                {domainPages.length > 0 && (
                                  <div className={cn("space-y-0.5 mt-0.5 relative", isRtl ? "pr-4" : "pl-4")}>
                                    {(() => {
                                      const renderPageTree = (parentId: string, depth: number = 0) => {
                                        const children = domainPages.filter(p => p.parentId === parentId || (!p.parentId && parentId === hubId));
                                        
                                        // Sort children to put parent hubs at top if needed
                                        return children.map((subPage, tIdx) => {
                                          const subPath = selectedProject ? `/project/${selectedProject.id}/page/${subPage.id}` : `/page/${subPage.id}`;
                                          const isSubActive = currentPath === subPath;
                                          if (!canAccess(subPage.id)) return null;

                                          const hasChildren = domainPages.some(p => p.parentId === subPage.id);

                                          return (
                                            <div key={`${subPage.id}-${tIdx}`} className="space-y-0.5">
                                              <div className={cn(
                                                "flex items-center gap-0 group/terminal relative",
                                                depth === 0 ? "ml-0" : depth === 1 ? "ml-4" : "ml-8",
                                                depth > 0 && (isRtl ? "pr-4" : "")
                                              )}>
                                                 {/* Vertical connector line for sub pages - Enhanced */}
                                                 <div className={cn(
                                                   "absolute top-0 bottom-[1.15rem] w-[1.5px] bg-neutral-200 dark:bg-white/10",
                                                   isRtl ? "right-[-0.72rem]" : "left-[-0.72rem]"
                                                 )} />
                                                 {/* Horizontal connector line */}
                                                 <div className={cn(
                                                   "w-3.5 h-[1.5px] bg-neutral-200 dark:bg-white/10",
                                                   isRtl ? "-mr-[0.72rem]" : "-ml-[0.72rem]"
                                                 )} />

                                                <Link
                                                  to={subPath}
                                                  className={cn(
                                                    "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black transition-all uppercase tracking-tighter relative group/link",
                                                    isSubActive ? "bg-white text-brand shadow border border-neutral-200 disabled:pointer-events-none" : "text-neutral-500 font-bold hover:text-brand hover:bg-brand/5"
                                                  )}
                                                >
                                                  <span className="truncate group-hover/link:translate-x-1 transition-transform">
                                                    {stripNumericPrefix(th(subPage.id))}
                                                  </span>
                                                  {hasChildren && (
                                                    <div className="ml-auto opacity-40">
                                                      <ChevronDown className="w-2.5 h-2.5" />
                                                    </div>
                                                  )}
                                                </Link>
                                              </div>
                                              {hasChildren && (
                                                <div className={cn("relative", isRtl ? "pr-3" : "pl-1.5")}>
                                                   {renderPageTree(subPage.id, depth + 1)}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        });
                                      };

                                      return renderPageTree(hubId);
                                    })()}
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
        <div className="p-6 border-t border-neutral-200 bg-surface/50 space-y-3">
           <Link to="/profile" className="flex items-center gap-3 p-2 bg-surface rounded-2xl border border-neutral-100 shadow-sm hover:border-brand transition-all group">
              <div className="w-9 h-9 rounded-xl bg-neutral-100 overflow-hidden flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-neutral-100">
                 {userProfile?.photoURL ? <img src={userProfile.photoURL} alt={userProfile.name} className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-neutral-400" />}
              </div>
              <div className="flex-1 min-w-0">
                 <div className="text-[11px] font-black text-text-main truncate tracking-tight uppercase leading-none">{userProfile?.name}</div>
                 <div className="text-[9px] font-black text-brand uppercase tracking-widest mt-1 opacity-80">{userProfile?.role}</div>
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
