import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, User as UserIcon, LogOut, Shield, Search, Star, 
  FileText as FileIcon, Info, Building, FolderOpen, ChevronDown,
  LayoutDashboard, Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { getDoc, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { cn, stripNumericPrefix } from '../lib/utils';

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
  'governance': 'gov',
  'delivery': 'scope',
  'schedule': 'sched',
  'finance': 'fin',
  'stakeholders': 'stak',
  'resources': 'res',
  'risk': 'risk'
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
  
  const { favorites, toggleFavorite } = useUI();

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
    <header className="h-[56px] bg-white border-b border-slate-200 flex items-center px-6 shrink-0 z-50 sticky top-0 shadow-sm">
      <div className="flex items-center gap-2 w-full h-full">
        {/* Project & Company Selector */}
        <div className="relative group shrink-0" ref={projectMenuRef}>
           <button 
             onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
             className={cn(
               "flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all border border-transparent hover:border-slate-200 hover:bg-slate-50",
               isProjectMenuOpen && "border-blue-100 bg-blue-50/50 shadow-sm"
             )}
           >
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                 <Building className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                 <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1 opacity-60">ZARYA PMIS</span>
                 <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate max-w-[130px]">
                       {selectedProject?.name || selectedCompany?.name || t('select_project')}
                    </span>
                    <ChevronDown className={cn("w-3 h-3 text-slate-400 transition-transform", isProjectMenuOpen && "rotate-180")} />
                 </div>
              </div>
           </button>

           <AnimatePresence>
             {isProjectMenuOpen && (
               <motion.div
                 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                 className="absolute top-full left-0 mt-2 w-80 bg-white border border-slate-200 rounded-[1.5rem] shadow-2xl overflow-hidden z-[100] p-2"
               >
                  <div className="max-h-[70vh] overflow-y-auto no-scrollbar space-y-4">
                     {/* Company List */}
                     <div className="space-y-1">
                        <div className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('companies')}</div>
                        {companies.map((company, idx) => (
                          <div key={`${company.id}-${idx}`} className="space-y-1">
                             <button
                               onClick={() => setSelectedCompanyId(company.id)}
                               className={cn(
                                 "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left",
                                 (selectedProject?.companyId === company.id || selectedCompanyId === company.id)
                                   ? "bg-blue-50 text-blue-700 font-bold"
                                   : "text-slate-600 hover:bg-slate-50"
                               )}
                             >
                                <Building className="w-3.5 h-3.5 opacity-50" />
                                <span className="text-[10px] uppercase tracking-wider truncate">{company.name}</span>
                             </button>
                             
                             {/* Projects for this company */}
                             {(selectedProject?.companyId === company.id || selectedCompanyId === company.id) && (
                               <div className="pl-5 space-y-0.5 mt-0.5 border-l-2 border-blue-100 ml-5">
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
                                          ? "bg-slate-900 text-white font-bold shadow-lg"
                                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
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

        {/* Foundation Center Button */}
        <Link 
          to={selectedProject ? `/project/${selectedProject.id}/page/foundation` : `/page/foundation`}
          className={cn(
            "mx-4 flex items-center gap-3 px-6 h-11 rounded-2xl transition-all group shrink-0 relative overflow-hidden",
            activePageId === 'foundation' 
              ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20" 
              : "bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
          )}
        >
           <div className="absolute top-0 right-0 w-8 h-8 bg-white/10 rounded-full -mr-4 -mt-4 blur-xl group-hover:scale-150 transition-transform" />
           <Database className={cn("w-4 h-4 transition-transform group-hover:scale-110 relative z-10", activePageId === 'foundation' ? "text-blue-400" : "text-white")} />
           <div className="flex flex-col -space-y-0.5 relative z-10">
              <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-80">
                 {t('initiating')}
              </span>
              <span className="text-[11px] font-black uppercase tracking-widest leading-none">
                 {t('foundation_center') || 'Master Data'}
              </span>
           </div>
        </Link>

        {selectedProject && (
          <div className="flex items-center gap-1 mx-2">
             <SmartCard type="eef" />
             <SmartCard type="opa" />
          </div>
        )}

        {/* Global Hubs Navigation */}
        <nav className="flex items-center h-full gap-0.5 flex-1 px-4 overflow-x-auto no-scrollbar">
           {PERFORMANCE_DOMAINS.map((domain, idx) => {
             const Icon = domain.icon || Info;
             const hubId = hubIds[domain.id] || 'gov';
             const isActive = activePageId === domain.id || activePageId === hubId || (currentDomain?.id === domain.id);
             return (
               <Link 
                 key={`${domain.id}-${idx}`} 
                 to={selectedProject ? `/project/${selectedProject.id}/page/${hubId}` : `/page/${hubId}`}
                 className={cn(
                   "flex items-center gap-2 px-4 h-9 rounded-xl transition-all relative group shrink-0",
                   isActive 
                    ? "bg-slate-900 text-white shadow-lg" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                 )}
               >
                 <Icon className={cn("w-3.5 h-3.5", isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-600")} strokeWidth={isActive ? 2.5 : 2} />
                 <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                    {stripNumericPrefix(t(domain.id))}
                 </span>
                 {isActive && (
                    <motion.div layoutId="nav-glow" className="absolute inset-0 bg-blue-500/5 rounded-xl -z-10" />
                 )}
               </Link>
             );
           })}
        </nav>

        {/* Global Actions */}
        <div className="flex items-center gap-3 shrink-0">
           {/* Favorites & Search */}
           <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <div className="relative" ref={favoritesRef}>
                 <button 
                   onClick={() => setIsFavoritesOpen(!isFavoritesOpen)}
                   className={cn(
                     "p-2 rounded-lg transition-all",
                     isFavoritesOpen ? "bg-white shadow-sm text-amber-500" : "text-slate-400 hover:text-slate-600"
                   )}
                 >
                    <Star className={cn("w-3.5 h-3.5", favorites.length > 0 && "fill-amber-400 text-amber-400")} />
                 </button>
                 <AnimatePresence>
                   {isFavoritesOpen && (
                     <motion.div
                       initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                       className="absolute top-full right-0 mt-2 w-80 bg-white border border-slate-200 rounded-[1.5rem] shadow-2xl overflow-hidden z-[100] p-2"
                     >
                        <div className="px-3 py-3 bg-slate-50 rounded-xl mb-1.5 flex items-center justify-between">
                           <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t('favorites')}</span>
                           <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] font-bold">{favorites.length}</div>
                        </div>
                        <div className="max-h-80 overflow-y-auto no-scrollbar space-y-0.5">
                           {favorites.map((favId, idx) => {
                              const p = allPages.find(page => page.id === favId);
                              if (!p) return null;
                              return (
                                <button 
                                  key={`${favId}-${idx}`}
                                  onClick={() => { navigate(`/page/${favId}`); setIsFavoritesOpen(false); }}
                                  className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-all group"
                                >
                                   <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-500">
                                      <FileIcon className="w-3.5 h-3.5" />
                                   </div>
                                   <div className="flex flex-col text-left">
                                      <span className="text-[10px] font-bold text-slate-700 tracking-tight truncate max-w-[200px]">{stripNumericPrefix(p.title)}</span>
                                      <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">{p.domain}</span>
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
                 <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-all">
                    <Search className="w-3.5 h-3.5" />
                 </button>
                 <AnimatePresence>
                   {isSearchOpen && (
                     <motion.div
                       initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                       className="absolute top-full right-0 mt-2 w-96 bg-white border border-slate-200 rounded-[1.5rem] shadow-2xl overflow-hidden z-[100] p-3"
                     >
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input 
                            autoFocus 
                            placeholder={t('search_pmis')} 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 pl-10 pr-3 text-[11px] font-bold focus:ring-1 focus:ring-blue-500 outline-none" 
                          />
                        </div>
                        
                        <div className="max-h-80 overflow-y-auto no-scrollbar space-y-0.5">
                           {searchResults.length > 0 ? (
                             searchResults.map((p, idx) => (
                               <button 
                                 key={`${p.id}-${idx}`}
                                 onClick={() => handlePageNavigate(p.id)}
                                 className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-all group"
                               >
                                  <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-500">
                                     <FileIcon className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="flex flex-col text-left">
                                     <span className="text-[10px] font-bold text-slate-700 tracking-tight">{stripNumericPrefix(p.title)}</span>
                                     <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">{p.domain} ({p.id})</span>
                                  </div>
                               </button>
                             ))
                           ) : searchQuery.length > 0 ? (
                             <div className="p-6 text-center text-slate-400 text-[9px] font-bold uppercase tracking-widest leading-loose">
                               {t('no_results_found')}
                             </div>
                           ) : (
                             <div className="p-6 text-center text-slate-400 text-[9px] font-bold uppercase tracking-widest leading-loose">
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
                className="flex items-center gap-2 pl-3 border-l border-slate-200 group active:scale-95 transition-all"
              >
                 <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 p-0.5 shadow-sm group-hover:border-blue-400 transition-all">
                    <img src={appUser?.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=PMIS"} alt="Profile" className="w-full h-full rounded-[0.7rem] object-cover" />
                 </div>
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-[1.5rem] shadow-2xl overflow-hidden z-50 p-1.5"
                  >
                     <div className="p-4 bg-slate-50 rounded-xl mb-1.5 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 p-1 mx-auto mb-2.5 shadow-sm">
                           <img src={appUser?.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=PMIS"} alt="Profile" className="w-full h-full rounded-[1rem] object-cover" />
                        </div>
                        <div className="text-[13px] font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{appUser?.name || 'Authorized User'}</div>
                        <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{appUser?.role}</div>
                     </div>
                     <div className="space-y-0.5">
                        <button onClick={() => navigate('/profile')} className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all">
                           <UserIcon className="w-3.5 h-3.5" /> {t('my_profile')}
                        </button>
                        <button onClick={() => navigate('/admin/users')} className="w-full flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all">
                           <Shield className="w-3.5 h-3.5" /> {t('admin_portal')}
                        </button>
                        <div className="h-px bg-slate-100 my-1 mx-2" />
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
