import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, User as UserIcon, LogOut, Shield, Search, Star, 
  FileText as FileIcon, Info, Building, FolderOpen, ChevronDown,
  LayoutDashboard, Database, Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { getDoc, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { cn, stripNumericPrefix, isAdminRole } from '../lib/utils';

import { useProject } from '../context/ProjectContext';
import { useUI } from '../context/UIContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../firebase';
import { pages as allPages } from '../data';
import { User as AppUser } from '../types';
import { PERFORMANCE_DOMAINS } from '../constants/navigation';
import { SmartCard } from './SmartCard';

const hubIds: Record<string, string> = {
  'communications': 'comm',
  'governance': 'gov',
  'delivery': 'scope',
  'controls': 'ctrl',
  'finance': 'fin',
  'stakeholders': 'stak',
  'resources': 'res',
  'risk': 'risk',
  'handover': 'handover_hub',
  'administration': 'admin_hub'
};

export const Header: React.FC = () => {
  const { t, isRtl } = useLanguage();
  const { companies, projects, selectedProject, setSelectedProject, setSelectedCompanyId, selectedCompanyId } = useProject();
  const { currency } = useCurrency();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [user, setUser] = useState(auth.currentUser);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const favoritesRef = useRef<HTMLDivElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  const activePageId = location.pathname.split('/').pop() || '';
  const currentPage = allPages.find(p => p.id === activePageId);
  const currentDomain = PERFORMANCE_DOMAINS.find(d => activePageId && (activePageId === d.id || activePageId === hubIds[d.id] || currentPage?.domain === d.id));
  
  const { favorites, toggleFavorite, theme, toggleTheme } = useUI();

  const selectedCompany = companies.find(c => c.id === (selectedProject?.companyId || selectedCompanyId));

  const searchResults = searchQuery.trim().length > 0 
    ? allPages.filter(p => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.id.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 10)
    : [];

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const userSnap = await getDoc(doc(db, 'users', u.uid));
        if (userSnap.exists()) {
          setAppUser({ ...userSnap.data(), uid: u.uid } as AppUser);
        }
      } else {
        setAppUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setIsUserMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setIsSearchOpen(false);
      if (favoritesRef.current && !favoritesRef.current.contains(event.target as Node)) setIsFavoritesOpen(false);
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) setIsProjectMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePageNavigate = (pageId: string) => {
    if (selectedProject) {
      navigate(`/project/${selectedProject.id}/page/${pageId}`);
    } else {
      navigate(`/page/${pageId}`);
    }
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  return (
    <header className="h-[48px] bg-[#101217] border-b border-transparent flex items-center px-6 shrink-0 z-50 sticky top-0 shadow-sm transition-colors duration-300">
      <div className="flex items-center gap-2 w-full h-full">
        {/* Project & Company Selector */}
        <div className="relative group shrink-0" ref={projectMenuRef}>
           <button 
             onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
             className={cn(
               "flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all border border-transparent hover:bg-white/5",
               isProjectMenuOpen && "bg-white/5 shadow-sm"
             )}
           >
              {/* New Logo Replacement for Blue Icon */}
              <div className="w-8 h-8 rounded-lg bg-[#2A2A2A] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform border border-white/10 shrink-0">
                 <span className="text-[#ff6d00] font-black text-[7px] tracking-tighter italic">PMIS</span>
              </div>
              <div className="flex flex-col text-left">
                 <span className="hidden sm:block text-[8px] font-black text-[#ff6d00] uppercase tracking-widest leading-none mb-0.5 italic">Precision Tool</span>
                 <div className="flex items-center gap-1.5 leading-none">
                    <span className="text-[10px] sm:text-[11px] font-bold text-white uppercase tracking-tight truncate max-w-[80px] sm:max-w-[130px]">
                       {selectedProject?.name || selectedCompany?.name || t('select_project')}
                    </span>
                    <ChevronDown className={cn("w-3 h-3 text-slate-400 transition-transform", isProjectMenuOpen && "rotate-180")} />
                 </div>
              </div>
              {/* Mobile View: Show only code if available */}
              {!selectedProject && !selectedCompany && (
                <ChevronDown className="w-3 h-3 text-slate-400 sm:hidden" />
              )}
              {selectedProject && (
                <div className="sm:hidden flex items-center gap-1 ml-1">
                   <span className="text-[10px] font-bold text-white bg-white/10 px-1.5 py-0.5 rounded uppercase">{selectedProject.code}</span>
                   <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                </div>
              )}
           </button>

           <AnimatePresence>
             {isProjectMenuOpen && (
               <motion.div
                 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                 className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-surface border border-neutral-200 dark:border-white/10 rounded-[1.5rem] shadow-2xl overflow-hidden z-[100] p-2"
               >
                  <div className="max-h-[70vh] overflow-y-auto no-scrollbar space-y-4">
                     {/* Company List */}
                     <div className="space-y-1">
                        <div className="px-3 py-2 text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em]">{t('companies')}</div>
                        {companies.map((company, idx) => (
                          <div key={`${company.id}-${idx}`} className="space-y-1">
                             <button
                               onClick={() => setSelectedCompanyId(company.id)}
                               className={cn(
                                 "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left",
                                 (selectedProject?.companyId === company.id || selectedCompanyId === company.id)
                                   ? "bg-brand/10 text-[#ff6d00] font-bold"
                                   : "text-neutral-600 hover:bg-neutral-50"
                               )}
                             >
                                <Building className="w-3.5 h-3.5 opacity-50" />
                                <span className="text-[10px] uppercase tracking-wider truncate">{company.name}</span>
                             </button>
                             
                             {/* Projects for this company */}
                             {(selectedProject?.companyId === company.id || selectedCompanyId === company.id) && (
                               <div className="pl-5 space-y-0.5 mt-0.5 border-l-2 border-brand/20 ml-5">
                                  {projects.filter(p => p.companyId === company.id).map((proj, pIdx) => (
                                    <button
                                      key={`${proj.id}-${pIdx}`}
                                      onClick={() => {
                                        setSelectedProject(proj);
                                        setIsProjectMenuOpen(false);
                                        navigate(`/project/${proj.id}`);
                                      }}
                                      className={cn(
                                        "w-full flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all text-left",
                                        selectedProject?.id === proj.id
                                          ? "bg-neutral-900 text-white font-bold shadow-lg"
                                          : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                                      )}
                                    >
                                       <FolderOpen className="w-3 h-3 opacity-50" />
                                       <span className="text-[9px] uppercase truncate">{proj.name}</span>
                                    </button>
                                  ))}
                               </div>
                             )}
                          </div>
                        ))}
                     </div>
                  </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        {/* Global Hubs Navigation */}
        <div className="flex flex-1 items-center justify-center h-full min-w-0 px-2 lg:px-4">
          <nav className="flex items-center gap-4 lg:gap-6 overflow-x-auto no-scrollbar py-1">
            {PERFORMANCE_DOMAINS.filter(domain => !domain.isAdminOnly || (appUser && isAdminRole(appUser.role))).map((domain, idx) => {
              const Icon = domain.icon || Info;
              const hubId = hubIds[domain.id] || 'gov';
              const isActive = activePageId === domain.id || activePageId === hubId || (currentDomain?.id === domain.id);
              
              const fullTitle = stripNumericPrefix(t(domain.id) === domain.id ? domain.title : t(domain.id));
              const displayWord = fullTitle.split(/[\s,&]+/)[0] || fullTitle;

              return (
                <div key={`${domain.id}-${idx}`} className="relative flex items-center group shrink-0">
                  <Link 
                    to={selectedProject ? `/project/${selectedProject.id}/page/${hubId}` : `/page/${hubId}`}
                    className={cn(
                      "flex items-center gap-2.5 transition-all duration-300 relative py-2",
                      isActive 
                        ? "text-brand hover:text-brand-secondary scale-105" 
                        : "text-slate-400/80 hover:text-white"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive ? "text-brand" : "text-slate-500 group-hover:text-white")} />
                    <span className={cn("text-[10px] font-black uppercase tracking-[0.15em] leading-none transition-all", isActive ? "italic" : "")}>
                      {fullTitle}
                    </span>
                    
                    {/* Active Indicator Dot */}
                    {isActive && (
                      <motion.div 
                        layoutId="activeTab"
                        className="absolute -bottom-1 left-1.2 right-0 h-0.5 bg-brand rounded-full"
                      />
                    )}
                  </Link>

                  {/* Enhanced Hover Tooltip */}
                  <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 z-[100] translate-y-2 group-hover:translate-y-0">
                    <div className="bg-[#1A1C1E] border border-white/10 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-md min-w-[200px] text-center">
                       <div className="text-[10px] font-black text-white uppercase tracking-widest mb-1">{fullTitle}</div>
                       <div className="text-[8px] font-medium text-slate-400 italic leading-relaxed">{domain.description}</div>
                       <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1A1C1E] border-l border-t border-white/10 rotate-45" />
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-1.5 lg:gap-3 shrink-0">
           {/* Favorites & Search - Hidden on mobile */}
           <div className="hidden sm:flex items-center gap-1 p-1 bg-slate-100 dark:bg-neutral-800 rounded-xl border border-slate-200 dark:border-neutral-700">
               <div className="relative" ref={favoritesRef}>
                 <button 
                   onClick={() => setIsFavoritesOpen(!isFavoritesOpen)}
                   className={cn(
                     "p-2 rounded-lg transition-all",
                     isFavoritesOpen ? "bg-white shadow-sm text-amber-500" : "text-text-secondary hover:text-text-primary"
                   )}
                 >
                    <Star className={cn("w-3.5 h-3.5", favorites.length > 0 && "fill-amber-400 text-amber-400")} />
                 </button>
                 <AnimatePresence>
                   {isFavoritesOpen && (
                     <motion.div
                       initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                       className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-surface border border-neutral-200 dark:border-white/10 rounded-[1.5rem] shadow-2xl overflow-hidden z-[100] p-2"
                     >
                        <div className="px-3 py-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl mb-1.5 flex items-center justify-between">
                           <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">{t('favorites')}</span>
                           <div className="w-4 h-4 rounded-full bg-brand text-white flex items-center justify-center text-[8px] font-bold">{favorites.length}</div>
                        </div>
                        <div className="max-h-80 overflow-y-auto no-scrollbar space-y-0.5">
                           {favorites.map((favId, idx) => {
                              const p = allPages.find(page => page.id === favId);
                              if (!p) return null;
                              return (
                                <button 
                                  key={`${favId}-${idx}`}
                                  onClick={() => { navigate(`/page/${favId}`); setIsFavoritesOpen(false); }}
                                  className="w-full flex items-center gap-3 p-2 hover:bg-neutral-50 rounded-lg transition-all group"
                                >
                                   <div className="w-7 h-7 rounded bg-neutral-100 flex items-center justify-center text-neutral-400 group-hover:text-blue-500">
                                      <FileIcon className="w-3.5 h-3.5" />
                                   </div>
                                   <div className="flex flex-col text-left">
                                      <span className="text-[10px] font-bold text-neutral-700 tracking-tight truncate max-w-[200px]">{stripNumericPrefix(p.title)}</span>
                                      <span className="text-[7px] font-bold text-neutral-400 uppercase tracking-tighter">{p.domain}</span>
                                   </div>
                                </button>
                              );
                           })}
                        </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
              </div>

              <div className="relative" ref={searchRef}>
                 <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg transition-all">
                    <Search className="w-3.5 h-3.5" />
                 </button>
                 <AnimatePresence>
                   {isSearchOpen && (
                     <motion.div
                       initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                       className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-surface border border-neutral-200 dark:border-white/10 rounded-[1.5rem] shadow-2xl overflow-hidden z-[100] p-3"
                     >
                        <div className="relative mb-3">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                           <input 
                             autoFocus 
                             placeholder={t('search_pmis')} 
                             value={searchQuery}
                             onChange={(e) => setSearchQuery(e.target.value)}
                             className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl py-2 pl-10 pr-3 text-[11px] font-bold focus:ring-1 focus:ring-brand outline-none transition-colors" 
                           />
                        </div>
                        
                        <div className="max-h-80 overflow-y-auto no-scrollbar space-y-0.5">
                           {searchResults.length > 0 ? (
                             searchResults.map((p, idx) => (
                               <button 
                                 key={`${p.id}-${idx}`}
                                 onClick={() => handlePageNavigate(p.id)}
                                 className="w-full flex items-center gap-3 p-2 hover:bg-neutral-50 rounded-lg transition-all group"
                               >
                                  <div className="w-7 h-7 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:text-[#ff6d00]">
                                     <FileIcon className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="flex flex-col text-left">
                                     <span className="text-[10px] font-bold text-neutral-700 tracking-tight">{stripNumericPrefix(p.title)}</span>
                                     <span className="text-[7px] font-bold text-neutral-400 uppercase tracking-tighter">{p.domain} ({p.id})</span>
                                  </div>
                               </button>
                             ))
                           ) : searchQuery.length > 0 ? (
                             <div className="p-6 text-center text-neutral-400 text-[9px] font-bold uppercase tracking-widest leading-loose">
                               {t('no_results_found')}
                             </div>
                           ) : (
                             <div className="p-6 text-center text-neutral-400 text-[9px] font-bold uppercase tracking-widest leading-loose">
                               {t('type_to_search')}
                             </div>
                           )}
                        </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
              </div>
           </div>

           {/* User Profile */}
           <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 pl-3 border-l border-neutral-200 group active:scale-95 transition-all"
              >
                 <div className="w-8 h-8 rounded-xl bg-white border border-neutral-200 p-0.5 shadow-sm group-hover:border-brand transition-all">
                    <img src={appUser?.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=PMIS"} alt="Profile" className="w-full h-full rounded-[0.7rem] object-cover" />
                 </div>
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-surface border border-neutral-200 dark:border-white/10 rounded-[1.5rem] shadow-2xl overflow-hidden z-50 p-1.5"
                  >
                     <div className="p-4 bg-neutral-50 rounded-xl mb-1.5 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-200 p-1 mx-auto mb-2.5 shadow-sm">
                           <img src={appUser?.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=PMIS"} alt="Profile" className="w-full h-full rounded-[1rem] object-cover" />
                        </div>
                        <div className="text-[13px] font-black text-neutral-900 uppercase tracking-tight leading-none mb-1">{appUser?.name || 'Authorized User'}</div>
                        <div className="text-[8px] font-black text-[#ff6d00] uppercase tracking-widest">{appUser?.role}</div>
                     </div>
                     <div className="space-y-0.5">
                        <button onClick={() => navigate('/profile')} className="w-full flex items-center gap-3 p-2.5 hover:bg-neutral-50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-900 transition-all">
                           <UserIcon className="w-3.5 h-3.5" /> {t('my_profile')}
                        </button>
                        <button onClick={() => navigate('/admin/users')} className="w-full flex items-center gap-3 p-2.5 hover:bg-neutral-50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-900 transition-all">
                           <Shield className="w-3.5 h-3.5" /> {t('admin_portal')}
                        </button>
                        <button 
                          onClick={() => {
                            navigate('/admin/users#drive');
                          }} 
                          className="w-full flex items-center gap-3 p-2.5 hover:bg-brand/10 rounded-lg text-[10px] font-bold uppercase tracking-widest text-[#ff6d00] transition-all"
                        >
                           <Database className="w-3.5 h-3.5" /> {t('drive_status')}
                        </button>
                        <div className="h-px bg-neutral-100 my-1 mx-2" />
                        <button onClick={() => signOut(auth)} className="w-full flex items-center gap-3 p-2.5 hover:bg-rose-50 rounded-lg text-[10px] font-black uppercase tracking-widest text-rose-500 transition-all italic">
                           <LogOut className="w-3.5 h-3.5" /> {t('sign_out')}
                        </button>
                     </div>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
        </div>
      </div>
    </header>
  );
};
