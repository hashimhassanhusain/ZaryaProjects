import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, ChevronDown, User as UserIcon, LogOut, Shield, Bell, Menu, 
  Loader2, Languages, Search, Star, X, Info, FolderOpen, Printer, 
  Zap, BarChart3, FileText, LayoutDashboard, DraftingCompass, Calendar, 
  Banknote, Users, Package, AlertTriangle, UserSearch, Layout, UserPlus, 
  MessageSquare, Handshake, MessagesSquare, Eye, MessageCircleWarning, 
  Smile, Archive, LineChart, Wallet, Database, Calculator, Lock, Coins, 
  Receipt, PieChart, Scale, ShoppingCart, CheckCircle, FolderArchive, 
  Clock, ListTodo, List, ArrowRightLeft, CheckSquare, Layers, ShieldCheck, 
  GitBranch, Activity, CheckCircle2, Library, Play, FileText as FileIcon,
  RefreshCw, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { auth, handleFirestoreError, OperationType } from '../firebase';
import { updateDoc, doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { User, signOut } from 'firebase/auth';
import { cn, stripNumericPrefix, toSlug } from '../lib/utils';

import { useProject } from '../context/ProjectContext';
import { useUI } from '../context/UIContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../firebase';
import { pages as allPages } from '../data';
import { User as AppUser } from '../types';
import { toast } from 'react-hot-toast';
import { HelpTooltip } from './HelpTooltip';

import { PERFORMANCE_DOMAINS, HUB_IDS } from '../constants/navigation';
import { Link } from 'react-router-dom';

const hubIds: Record<string, string> = {
  'governance': 'gov',
  'delivery': 'scope',
  'schedule': 'sched',
  'finance': 'fin',
  'stakeholders': 'stak',
  'resources': 'res',
  'risk': 'risk'
};

const ICON_MAP: Record<string, any> = {
  Settings, Shield, FolderOpen, Printer, Zap, BarChart3, Star, Search, Info,
  FileText, LayoutDashboard, DraftingCompass, Calendar, Banknote, Users, 
  Package, AlertTriangle, UserSearch, Layout, UserPlus, MessageSquare, 
  Handshake, MessagesSquare, Eye, MessageCircleWarning, Smile, Archive, 
  LineChart, Wallet, Database, Calculator, Lock, Coins, Receipt, PieChart, 
  Scale, ShoppingCart, CheckCircle, FolderArchive, Clock, ListTodo, List, 
  ArrowRightLeft, CheckSquare, Layers, ShieldCheck, GitBranch, Activity, 
  CheckCircle2, Library, Play, FileIcon
};

export const Header: React.FC = () => {
  const { language, setLanguage, t, th, isRtl, isHelpRtl } = useLanguage();
  const { selectedProject, setSelectedProject, selectedCompany, projects, companies, loading: projectsLoading } = useProject();
  const { currency, setCurrency, exchangeRate, setExchangeRate, refreshExchangeRate } = useCurrency();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { companySlug, projectSlug, domainSlug, pageSlug } = useParams();

  const projectMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const favoritesRef = useRef<HTMLDivElement>(null);

  const activePage = pageSlug || '';
  const currentDomain = PERFORMANCE_DOMAINS.find(d => activePage && (activePage === d.id || activePage.startsWith(d.id + '-')));
  
  const isHierarchical = !!companySlug && !!projectSlug;
  const { toggleSidebar, favorites, toggleFavorite, isFavorite } = useUI();
  const isCurrentFav = activePage ? isFavorite(activePage) : false;

  const getPath = (dSlug: string, pSlug: string) => {
    if (!selectedCompany || !selectedProject) return `/page/${pSlug}`;
    return `/${toSlug(selectedCompany.name)}/${toSlug(selectedProject.name)}/${dSlug}/${pSlug}`;
  };

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
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
        setIsProjectMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (favoritesRef.current && !favoritesRef.current.contains(event.target as Node)) {
        setIsFavoritesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-[60px] bg-slate-900 text-white border-b border-slate-700 flex items-center px-4 md:px-6 shrink-0 z-50">
      <div className="flex items-center gap-6 w-full h-full">
        {/* Brand & Company Context */}
        <div 
          className={cn(
            "flex items-center gap-4 pr-6 border-r border-slate-700 shrink-0 select-none",
            companies.length > 1 && "cursor-pointer hover:bg-slate-800 transition-all rounded-r-xl"
          )}
          onClick={() => {
            if (companies.length > 1) {
              navigate('/admin/companies');
            } else {
              navigate('/');
            }
          }}
        >
           <div className="flex items-center gap-3">
             <span className="text-lg font-black text-white tracking-tight leading-none">
               {selectedCompany ? selectedCompany.name : 'ZARYA'}
             </span>
             <div className="bg-blue-600 px-1.5 py-1 rounded flex items-center justify-center font-black text-[10px] text-white leading-none shadow-lg shadow-blue-600/20">
               PMIS
             </div>
           </div>
        </div>

        {/* Ribbon Selection (Top Bar) */}
        <nav className="flex items-center h-full overflow-x-auto no-scrollbar">
           {PERFORMANCE_DOMAINS.map(domain => {
             const Icon = domain.icon || Info;
             const hubId = hubIds[domain.id] || 'gov';
             const isActive = domainSlug === domain.id || pageSlug === hubId;
             return (
               <HelpTooltip key={domain.id} text={th(domain.id + '_summary')} position="bottom">
                  <Link 
                    to={getPath(domain.id, hubId)}
                    className={cn(
                      "flex flex-col items-center justify-center px-5 h-full transition-all relative group shrink-0",
                      isActive ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                    )}
                  >
                   <Icon className={cn("w-4 h-4 mb-1", isActive ? "text-white" : "text-slate-500 opacity-60")} strokeWidth={isActive ? 2.5 : 1.5} />
                   <span className="text-[9px] font-bold uppercase tracking-wider">{t(domain.id)}</span>
                   {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white shadow-[0_-2px_10px_rgba(255,255,255,0.3)]" />
                   )}
                 </Link>
               </HelpTooltip>
             );
           })}
        </nav>

        {/* Right Tools */}
        <div className="flex items-center gap-2 ml-auto shrink-0 pr-4">
           {/* Action Buttons requested by user */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2 py-1 rounded-[1.25rem] mr-2 transition-all">
              <div className="relative" ref={favoritesRef}>
                <HelpTooltip text={th('favorites_summary')} position="bottom">
                  <button 
                    onClick={() => setIsFavoritesOpen(!isFavoritesOpen)} 
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700/50 rounded-xl hover:bg-slate-700 hover:border-slate-600 transition-all text-white group", 
                      isFavoritesOpen && "bg-slate-800 border-slate-600"
                    )} 
                  >
                     <Star className={cn("w-3.5 h-3.5 transition-all group-hover:scale-110", favorites.length > 0 ? "fill-amber-400 text-amber-400" : "text-slate-400")} />
                     <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block whitespace-nowrap">{t('favorites')}</span>
                     <ChevronDown className={cn("w-3 h-3 text-slate-500 transition-transform duration-300", isFavoritesOpen && "rotate-180")} />
                  </button>
                </HelpTooltip>

                <AnimatePresence>
                  {isFavoritesOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute top-full right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-[100] p-1"
                    >
                      <div className="px-4 py-3 border-b border-slate-700/50 mb-1 flex items-center justify-between bg-slate-900/30">
                         <div className="flex items-center gap-2">
                           <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                           <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{t('favorites')}</span>
                         </div>
                         <span className="px-2 py-0.5 rounded-full bg-slate-700 text-[8px] font-bold text-slate-400 uppercase tracking-widest">{favorites.length} {t('pages')}</span>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto no-scrollbar scroll-smooth p-1 space-y-1">
                        {favorites.length === 0 ? (
                          <div className="p-8 text-center flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center border border-slate-700/50 scale-110 opacity-30">
                              <Star className="w-6 h-6 text-slate-500" />
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t('no_favorites')}</p>
                          </div>
                        ) : (
                          favorites.map(favId => {
                            const p = allPages.find(page => page.id === favId);
                            if (!p) return null;
                            const domain = PERFORMANCE_DOMAINS.find(d => d.id === p.domain) || PERFORMANCE_DOMAINS[0];
                            return (
                               <Link
                                key={favId}
                                to={getPath(domain.id, favId)}
                                onClick={() => setIsFavoritesOpen(false)}
                                className="w-full text-left p-3 hover:bg-slate-700/80 rounded-xl text-[10px] text-slate-300 flex items-center gap-4 transition-all group relative border border-transparent hover:border-slate-600/50 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
                              >
                                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-amber-400 group-hover:border-amber-400/30 group-hover:bg-amber-400/5 transition-all shrink-0">
                                  {(() => {
                                    const IconComp = ICON_MAP[p.icon || ''] || FileIcon;
                                    return <IconComp className="w-5 h-5" strokeWidth={1.2} />;
                                  })()}
                                </div>
                                <div className="flex flex-col min-w-0 pr-6">
                                  <span className="font-black text-white truncate text-[11px] tracking-tight">{stripNumericPrefix(th(favId) || p.title)}</span>
                                  <span className="text-[8px] text-slate-500 uppercase tracking-tighter opacity-60 font-mono italic flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 NOT-italic font-bold">{favId}</span>
                                    {p.domain}
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleFavorite(favId);
                                  }}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-rose-500/10 text-amber-500/20 hover:text-rose-500 transition-all z-10"
                                >
                                  <Star className="w-3.5 h-3.5 fill-current" />
                                </button>
                              </Link>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {isHierarchical && activePage && <div className="w-px h-4 bg-slate-700/30 mx-0.5" />}

              {/* Toggle current page as favorite */}
              {isHierarchical && activePage && (
                <HelpTooltip text={t(isCurrentFav ? 'in_favorites' : 'add_to_favorites')} position="bottom">
                  <button 
                    onClick={() => toggleFavorite(activePage)}
                    className={cn(
                      "p-2 rounded-xl transition-all active:scale-90 group",
                      isCurrentFav 
                        ? "text-amber-400 bg-amber-400/10" 
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    )}
                  >
                    <Star className={cn("w-4 h-4 transition-all", isCurrentFav ? "fill-amber-400" : "group-hover:scale-110")} />
                  </button>
                </HelpTooltip>
              )}
             <HelpTooltip text={th('generate_pdf_summary')} position="bottom">
               <button 
                 onClick={() => toast.success(t('pdf_saved_to_drive'))} 
                 className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all" 
               >
                  <Printer className="w-4 h-4" />
               </button>
             </HelpTooltip>
             <HelpTooltip text={th('push_baseline_summary')} position="bottom">
               <button 
                 onClick={() => toast.success(t('update_success'))} 
                 className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all" 
               >
                  <Zap className="w-4 h-4 text-blue-400" />
               </button>
             </HelpTooltip>
             <HelpTooltip text={th('drive_explorer_summary')} position="bottom">
               <button 
                 onClick={() => navigate('/explorer/root')} 
                 className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all" 
               >
                  <FolderOpen className="w-4 h-4" />
               </button>
             </HelpTooltip>
             <HelpTooltip text={th('admin_settings_summary')} position="bottom">
               <button 
                 onClick={() => navigate('/admin/users')} 
                 className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all" 
               >
                  <Settings className="w-4 h-4" />
               </button>
             </HelpTooltip>
           </div>

           {/* Project Selector */}
           <HelpTooltip text={th('project_selector_summary')} position="bottom">
             <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl">
               <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-[10px] font-bold">P</div>
               <select 
                 value={selectedProject?.id || ''} 
                 onChange={(e) => setSelectedProject(projects.find(p => p.id === e.target.value) || null)}
                 className="bg-transparent text-[10px] font-bold text-white border-none focus:ring-0 outline-none pr-6 cursor-pointer"
               >
                 {projects.map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>)}
               </select>
            </div>
           </HelpTooltip>

          <div className="flex items-center gap-1 ml-2">
             <HelpTooltip text={th('change_language_summary')} position="bottom">
               <button 
                 onClick={() => {
                   const cycle: Record<string, 'en' | 'ar'> = { en: 'ar', ar: 'en' };
                   setLanguage(cycle[language]);
                 }} 
                 className="p-2 text-slate-400 hover:text-white transition-colors relative group" 
               >
                  <Languages className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-blue-600 text-white px-1 rounded uppercase">
                    {language}
                  </span>
               </button>
             </HelpTooltip>
             
             <div className="relative" ref={searchRef}>
               <HelpTooltip text={th('search_summary')} position="bottom">
                 <button 
                   onClick={() => setIsSearchOpen(!isSearchOpen)} 
                   className={cn("p-2 text-slate-400 hover:text-white transition-colors", isSearchOpen && "text-white")}
                 >
                    <Search className="w-4 h-4" />
                 </button>
               </HelpTooltip>
               <AnimatePresence>
                 {isSearchOpen && (
                   <motion.div
                     initial={{ opacity: 0, scale: 0.95, y: -10 }}
                     animate={{ opacity: 1, scale: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.95, y: -10 }}
                     className="absolute top-full right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl p-4 z-50"
                   >
                     <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                       <input 
                         autoFocus
                         type="text" 
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         placeholder={t('search_placeholder')}
                         className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                       />
                     </div>
                     {searchQuery && (
                       <div className="mt-4 space-y-1 max-h-60 overflow-y-auto no-scrollbar">
                         {allPages.filter(p => (stripNumericPrefix(t(p.id) || p.title)).toLowerCase().includes(searchQuery.toLowerCase()))
                           .slice(0, 5).map(p => (
                           <button 
                             key={p.id}
                             onClick={() => {
                               navigate(`/page/${p.id}`);
                               setIsSearchOpen(false);
                               setSearchQuery('');
                             }}
                             className="w-full text-left p-2 hover:bg-slate-700 rounded-lg text-[10px] text-slate-300 transition-colors"
                           >
                             {stripNumericPrefix(t(p.id) || p.title)}
                           </button>
                         ))}
                       </div>
                     )}
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
          </div>

          <div className="flex items-center gap-3 pl-4 border-l border-slate-700 relative" ref={userMenuRef}>
             <HelpTooltip text={th('user_profile_summary')} position="bottom">
               <div 
                 className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all" 
                 onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
               >
                   <img src={appUser?.photoURL || user?.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=Hashim"} alt="Avatar" className="w-full h-full object-cover" />
               </div>
             </HelpTooltip>

             <AnimatePresence>
               {isUserMenuOpen && (
                 <motion.div
                   initial={{ opacity: 0, scale: 0.95, y: -10 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.95, y: -10 }}
                   className="absolute top-full right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden z-50"
                 >
                   <div className="p-4 bg-slate-900/50 border-b border-slate-700">
                     <p className="font-bold text-white text-sm">{appUser?.name || user?.displayName || 'User'}</p>
                     <p className="text-[10px] text-slate-400 font-medium">{user?.email}</p>
                     <div className="mt-2 inline-flex px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[9px] font-bold uppercase tracking-widest border border-blue-500/20">
                       {appUser?.role || 'Guest'}
                     </div>
                   </div>
                   <div className="p-2">
                     <button onClick={() => { navigate('/profile'); setIsUserMenuOpen(false); }} className="w-full text-left p-2.5 hover:bg-slate-700 rounded-xl text-xs text-slate-300 flex items-center gap-3 transition-colors">
                       <UserIcon className="w-4 h-4 text-slate-500" />
                       {t('my_profile')}
                     </button>
                     <button onClick={() => { navigate('/admin/users'); setIsUserMenuOpen(false); }} className="w-full text-left p-2.5 hover:bg-slate-700 rounded-xl text-xs text-slate-300 flex items-center gap-3 transition-colors">
                       <Shield className="w-4 h-4 text-slate-500" />
                       {t('admin_settings')}
                     </button>
                     <button onClick={() => { navigate('/explorer/root'); setIsUserMenuOpen(false); }} className="w-full text-left p-2.5 hover:bg-slate-700 rounded-xl text-xs text-slate-300 flex items-center gap-3 transition-colors">
                       <FolderOpen className="w-4 h-4 text-slate-500" />
                       {t('drive_explorer')}
                     </button>
                     <button onClick={() => { navigate('/explorer/root'); setIsUserMenuOpen(false); }} className="w-full text-left p-2.5 hover:bg-slate-700 rounded-xl text-xs text-slate-300 flex items-center gap-3 transition-colors">
                       <Star className="w-4 h-4 text-slate-500" />
                       {t('favorites')}
                     </button>
                     <div className="my-1 border-t border-slate-700 mx-2" />
                     <button onClick={() => signOut(auth)} className="w-full text-left p-2.5 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl text-xs text-slate-300 flex items-center gap-3 transition-colors group">
                       <LogOut className="w-4 h-4 text-slate-500 group-hover:text-rose-400" />
                       {t('sign_out')}
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
