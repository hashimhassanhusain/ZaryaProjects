import React, { useState, useEffect, useRef } from 'react';
import { Settings, ChevronDown, User as UserIcon, LogOut, Shield, Bell, Menu, Loader2, Languages, Search, Star, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, handleFirestoreError, OperationType } from '../firebase';
import { updateDoc, doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { User, signOut } from 'firebase/auth';
import { cn, stripNumericPrefix } from '../lib/utils';

import { useProject } from '../context/ProjectContext';
import { useUI } from '../context/UIContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { RefreshCw, DollarSign, Coins } from 'lucide-react';
import { db } from '../firebase';
import { pages as allPages } from '../data';
import { User as AppUser } from '../types';
import { toast } from 'react-hot-toast';

export const Header: React.FC = () => {
  const { language, setLanguage, t, isRtl } = useLanguage();
  const { selectedProject, setSelectedProject, projects, loading: projectsLoading } = useProject();
  const { toggleSidebar } = useUI();
  const { currency, setCurrency, exchangeRate, setExchangeRate, refreshExchangeRate } = useCurrency();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(exchangeRate.toString());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const projectMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const currencyMenuRef = useRef<HTMLDivElement>(null);
  const favoritesMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Get current page ID from path
  const currentPageId = location.pathname.includes('/page/') 
    ? location.pathname.split('/page/')[1] 
    : location.pathname === '/' ? 'dashboard' : null;

  useEffect(() => {
    setEditingRate(exchangeRate.toString());
  }, [exchangeRate]);

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
      if (currencyMenuRef.current && !currencyMenuRef.current.contains(event.target as Node)) {
        setIsCurrencyMenuOpen(false);
      }
      if (favoritesMenuRef.current && !favoritesMenuRef.current.contains(event.target as Node)) {
        setIsFavoritesOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user || !selectedProject) {
      setTaskCount(0);
      return;
    }
    
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('projectId', '==', selectedProject.id),
      where('assigneeId', '==', user.uid),
      where('status', '!=', 'COMPLETED')
    );

    const issuesQuery = query(
      collection(db, 'issues'),
      where('projectId', '==', selectedProject.id),
      where('responsiblePartyId', '==', user.uid),
      where('status', 'in', ['Open', 'In Progress'])
    );

    let tasksSize = 0;
    let issuesSize = 0;

    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      tasksSize = snapshot.size;
      setTaskCount(tasksSize + issuesSize);
    });

    const unsubscribeIssues = onSnapshot(issuesQuery, (snapshot) => {
      issuesSize = snapshot.size;
      setTaskCount(tasksSize + issuesSize);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeIssues();
    };
  }, [user, selectedProject]);

  const handleRefreshRate = async () => {
    setIsRefreshing(true);
    await refreshExchangeRate();
    setIsRefreshing(false);
  };

  const toggleFavorite = async (pageId: string) => {
    if (!user || !appUser) return;
    
    const currentFavorites = appUser.favoritePages || [];
    const isFavorite = currentFavorites.includes(pageId);
    
    const newFavorites = isFavorite 
      ? currentFavorites.filter(id => id !== pageId)
      : [...currentFavorites, pageId];
      
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        favoritePages: newFavorites
      });
      setAppUser({ ...appUser, favoritePages: newFavorites });
      toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const filteredPages = searchQuery.trim() === '' ? [] : allPages.filter(page => 
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (page as any).domain?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10);

  const favoritePagesData = allPages.filter(p => appUser?.favoritePages?.includes(p.id));

  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
      {/* Left: Hamburger (Mobile) & Search */}
      <div className="flex-1 flex justify-start items-center gap-2">
        <button 
          onClick={toggleSidebar}
          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative hidden md:block" ref={searchRef}>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text"
              placeholder={t('search_pages')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="w-64 lg:w-80 px-10 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
            />
          </div>

          <AnimatePresence>
            {isSearchOpen && (searchQuery.trim() !== '' || favoritePagesData.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={cn(
                  "absolute top-full mt-2 w-[400px] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 p-2",
                  isRtl ? "right-0" : "left-0"
                )}
              >
                {searchQuery.trim() !== '' ? (
                  <div className="space-y-4 p-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">{t('search_results')}</div>
                    {filteredPages.length > 0 ? (
                      <div className="space-y-1">
                        {filteredPages.map(page => (
                          <button
                            key={page.id}
                            onClick={() => {
                              navigate(`/page/${page.id}`);
                              setIsSearchOpen(false);
                              setSearchQuery('');
                            }}
                            className="w-full flex items-center justify-between group p-3 hover:bg-blue-50 rounded-xl transition-all text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-100 group-hover:bg-white rounded-lg flex items-center justify-center text-slate-600 group-hover:text-blue-600 transition-colors">
                                <Search className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-700 group-hover:text-slate-900">{stripNumericPrefix(page.title)}</div>
                                <div className="text-[10px] text-slate-400">{page.id} • {page.domain}</div>
                              </div>
                            </div>
                            <Star 
                              className={cn(
                                "w-4 h-4 transition-colors",
                                appUser?.favoritePages?.includes(page.id) ? "fill-yellow-400 text-yellow-400" : "text-slate-300 hover:text-yellow-400"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(page.id);
                              }}
                            />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center space-y-2">
                        <div className="text-slate-400 font-medium">{t('no_results_found')}</div>
                        <div className="text-[10px] text-slate-300 uppercase tracking-widest">Try searching for domains like "Finance" or "Schedule"</div>
                      </div>
                    )}
                  </div>
                ) : null}

                {searchQuery.trim() === '' && favoritePagesData.length > 0 && (
                  <div className="space-y-4 p-2 border-t border-slate-50 mt-2 pt-4">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">{t('favorites')}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {favoritePagesData.map(page => (
                        <button
                          key={page.id}
                          onClick={() => {
                            navigate(`/page/${page.id}`);
                            setIsSearchOpen(false);
                          }}
                          className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-yellow-50 rounded-xl transition-all group"
                        >
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-700 group-hover:text-yellow-700 truncate">{stripNumericPrefix(page.title)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative" ref={projectMenuRef}>
          <button 
            onClick={() => !projectsLoading && setIsProjectMenuOpen(!isProjectMenuOpen)}
            disabled={projectsLoading}
            className="flex items-center gap-3 px-3 md:px-4 py-1.5 hover:bg-slate-50 rounded-xl transition-all group border border-slate-100 disabled:opacity-50 ml-2"
          >
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-medium text-xs shadow-sm shrink-0">
              {projectsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : (selectedProject?.name.charAt(0) || '?')}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-[9px] font-medium text-slate-400 uppercase tracking-widest leading-none mb-1">{t('project')}</div>
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                <span className="truncate max-w-[100px] md:max-w-none">
                  {projectsLoading ? t('loading') : (selectedProject?.name || t('select_project'))}
                </span>
                {!projectsLoading && <ChevronDown className={cn("w-3 h-3 text-slate-400 transition-transform", isProjectMenuOpen ? "rotate-180" : "")} />}
              </div>
            </div>
          </button>

          <AnimatePresence>
            {isProjectMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={cn(
                  "absolute top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden p-2 z-50",
                  isRtl ? "right-0" : "left-0"
                )}
              >
                {projects.length > 0 ? (
                  projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setSelectedProject(project);
                        setIsProjectMenuOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                        selectedProject?.id === project.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "hover:bg-slate-50 text-slate-600"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-xs",
                        selectedProject?.id === project.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                      )}>
                        {project.name.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold truncate">{project.name}</span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-slate-400 italic">
                    {t('no_projects_found')}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Center: Logo */}
      <div className="flex-1 flex justify-center">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img src="https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7" alt="Zarya Logo" className="h-10 w-auto" referrerPolicy="no-referrer" />
        </button>
      </div>

      {/* Right: User & Admin Settings */}
      <div className="flex-1 flex justify-end items-center gap-4">
        {/* Favorites Quick Access */}
        <div className="relative hidden lg:block" ref={favoritesMenuRef}>
          <button 
            onClick={() => setIsFavoritesOpen(!isFavoritesOpen)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border",
              isFavoritesOpen ? "bg-yellow-50 text-yellow-600 border-yellow-200" : "hover:bg-slate-50 text-slate-400 border-slate-100"
            )}
            title={t('favorites')}
          >
            <Star className={cn("w-4 h-4", favoritePagesData.length > 0 ? "fill-yellow-500 text-yellow-500" : "")} />
            <span className="text-[10px] font-black uppercase tracking-widest hidden xl:inline">{t('favorites')}</span>
            {favoritePagesData.length > 0 && (
              <span className="min-w-[16px] h-4 px-1 bg-yellow-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {favoritePagesData.length}
              </span>
            )}
          </button>

          <AnimatePresence>
            {isFavoritesOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={cn(
                  "absolute top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-2 z-50",
                  isRtl ? "left-0" : "right-0"
                )}
              >
                <div className="px-4 py-3 border-b border-slate-50 mb-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('quick_access_favorites')}</div>
                </div>

                {favoritePagesData.length > 0 ? (
                  <div className="space-y-1">
                    {favoritePagesData.map(page => (
                      <button
                        key={page.id}
                        onClick={() => {
                          navigate(`/page/${page.id}`);
                          setIsFavoritesOpen(false);
                        }}
                        className="w-full flex items-center justify-between group p-3 hover:bg-slate-50 rounded-xl transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-bold text-slate-700 truncate">{stripNumericPrefix(page.title)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center space-y-2">
                    <Star className="w-8 h-8 text-slate-100 mx-auto" />
                    <div className="text-sm font-medium text-slate-400">{t('no_favorites')}</div>
                    <p className="text-[10px] text-slate-300">{t('star_pages_to_add')}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Favorite Current Page Toggle */}
        {currentPageId && (
          <button 
            onClick={() => toggleFavorite(currentPageId)}
            className={cn(
              "p-2 rounded-xl transition-all border",
              appUser?.favoritePages?.includes(currentPageId) 
                ? "bg-yellow-50 text-yellow-600 border-yellow-200" 
                : "text-slate-400 border-slate-100 hover:bg-slate-50"
            )}
            title={appUser?.favoritePages?.includes(currentPageId) ? 'Remove Favorite' : 'Add Favorite'}
          >
            <Star className={cn("w-5 h-5", appUser?.favoritePages?.includes(currentPageId) ? "fill-yellow-500" : "")} />
          </button>
        )}

        {/* Language Toggle */}
        <button 
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-xl transition-all border border-slate-100"
          title={t('toggle_language')}
        >
          <div className="w-6 h-6 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <Languages className="w-4 h-4" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest leading-none">{t('language')}</div>
            <div className="text-xs font-semibold text-slate-800">
              {language === 'en' ? 'EN' : 'AR'}
            </div>
          </div>
        </button>

        {/* Currency Selector */}
        <div className="relative" ref={currencyMenuRef}>
          <button 
            onClick={() => setIsCurrencyMenuOpen(!isCurrencyMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-xl transition-all border border-slate-100"
          >
            <div className="w-6 h-6 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              {currency === 'USD' ? <DollarSign className="w-4 h-4" /> : <Coins className="w-4 h-4" />}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest leading-none">{t('currency')}</div>
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                {currency}
                <ChevronDown className={cn("w-3 h-3 text-slate-400 transition-transform", isCurrencyMenuOpen ? "rotate-180" : "")} />
              </div>
            </div>
          </button>

          <AnimatePresence>
            {isCurrencyMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={cn(
                  "absolute top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-4 z-50 space-y-4",
                  isRtl ? "left-0" : "right-0"
                )}
              >
                <div className="space-y-2">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{t('select_display_currency')}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => {
                        setCurrency('USD');
                        setIsCurrencyMenuOpen(false);
                      }}
                      className={cn(
                        "px-3 py-2 rounded-xl text-xs font-semibold transition-all border",
                        currency === 'USD' ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20" : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50"
                      )}
                    >
                      USD ($)
                    </button>
                    <button 
                      onClick={() => {
                        setCurrency('IQD');
                        setIsCurrencyMenuOpen(false);
                      }}
                      className={cn(
                        "px-3 py-2 rounded-xl text-xs font-semibold transition-all border",
                        currency === 'IQD' ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20" : "bg-white text-slate-600 border-slate-100 hover:bg-slate-50"
                      )}
                    >
                      IQD
                    </button>
                  </div>
                </div>

                <div className="h-px bg-slate-100"></div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{t('exchange_rate')}</div>
                    <button 
                      onClick={handleRefreshRate}
                      disabled={isRefreshing}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
                      title={t('fetch_market_rate')}
                    >
                      <RefreshCw className={cn("w-3 h-3", isRefreshing ? "animate-spin" : "")} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-semibold text-slate-400">1 USD =</div>
                    <div className="flex-1 flex items-center gap-2">
                      <input 
                        type="number"
                        value={editingRate}
                        onChange={(e) => setEditingRate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                      />
                      <div className="text-xs font-semibold text-slate-400">IQD</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setExchangeRate(parseFloat(editingRate) || 1500);
                      setIsCurrencyMenuOpen(false);
                    }}
                    className="w-full py-2 bg-slate-900 text-white rounded-xl text-[10px] font-semibold uppercase tracking-widest hover:bg-slate-800 transition-all"
                  >
                    {t('update_rate')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button 
          onClick={() => navigate('/page/2.6.21?filter=my')}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors relative"
        >
          <Bell className="w-5 h-5" />
          {taskCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-semibold rounded-full border-2 border-white flex items-center justify-center">
              {taskCount}
            </span>
          )}
        </button>

        <div className="h-8 w-px bg-slate-200"></div>

        <div className="relative" ref={userMenuRef}>
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-3 p-1 pr-3 hover:bg-slate-50 rounded-full transition-all border border-transparent hover:border-slate-100"
          >
            <div className="relative">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL || undefined} 
                  alt="User" 
                  className="w-8 h-8 rounded-full border border-white shadow-sm object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-800 leading-none">{user?.displayName || 'User'}</div>
              <div className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter mt-1">Project Manager</div>
            </div>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isUserMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className={cn(
                  "absolute top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-2",
                  isRtl ? "left-0" : "right-0"
                )}
              >
                <div className="px-4 py-3 border-b border-slate-50 mb-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{t('signed_in_as')}</div>
                  <div className="text-sm font-semibold text-slate-800 truncate">{user?.email}</div>
                </div>
                
                <button 
                  onClick={() => {
                    navigate('/profile');
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                >
                  <UserIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('my_profile')}</span>
                </button>

                <div className="h-[1px] bg-slate-50 my-2"></div>

                <button 
                  onClick={() => signOut(auth)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('sign_out')}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
