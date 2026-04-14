import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  ChevronUp,
  LayoutDashboard, 
  FileText, 
  FolderOpen, 
  Search, 
  ChevronDown, 
  Shield, 
  Users, 
  Layout, 
  LogOut,
  Building2,
  Grid3X3,
  DraftingCompass,
  Calendar,
  Banknote,
  Package,
  AlertTriangle,
  Target,
  Settings,
  ClipboardList,
  Gavel,
  Award,
  Languages
} from 'lucide-react';
import { pages, getChildren, getBreadcrumbs, getFocusArea } from '../data';
import { Project } from '../types';
import { cn, sortDomainPages, stripNumericPrefix } from '../lib/utils';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { signOut, User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../context/ProjectContext';
import { useUI } from '../context/UIContext';
import { ProjectManagementPlan } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

interface SidebarProps {
  onToggleRtl?: () => void;
  isRtl?: boolean;
}

const getDomainIcon = (domain?: string, title?: string) => {
  if (title?.toLowerCase().includes('focus area')) return Target;
  
  switch (domain) {
    case 'governance': return Shield;
    case 'scope': return DraftingCompass;
    case 'schedule': return Calendar;
    case 'finance': return Banknote;
    case 'stakeholders': return Users;
    case 'resources': return Package;
    case 'risk': return AlertTriangle;
    default: return FolderOpen;
  }
};

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { selectedProject } = useProject();
  const currentPath = location.pathname.split('/').pop() || 'planning';
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [isAdminExpanded, setIsAdminExpanded] = useState(false);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [userProfile, setUserProfile] = useState<any>(null);
  const { sidebarWidth, setSidebarWidth } = useUI();
  const [isResizing, setIsResizing] = useState(false);
  const [pmPlan, setPmPlan] = useState<ProjectManagementPlan | null>(null);
  const { language, setLanguage, t, isRtl } = useLanguage();

  useEffect(() => {
    const fetchPmPlan = async () => {
      if (!selectedProject) {
        setPmPlan(null);
        return;
      }
      try {
        const q = query(
          collection(db, 'projectManagementPlans'),
          where('projectId', '==', selectedProject.id),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setPmPlan(snap.docs[0].data() as ProjectManagementPlan);
        } else {
          setPmPlan(null);
        }
      } catch (err) {
        console.error("Failed to fetch PM Plan in Sidebar:", err);
      }
    };
    fetchPmPlan();
  }, [selectedProject]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const { doc, getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) {
          setUserProfile(snap.data());
        }
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = userProfile?.role === 'admin' || user?.email === 'hashim.h.husain@gmail.com';

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth > 200 && newWidth < 600) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) {
      setIsAdminExpanded(true);
    }
    const crumbs = getBreadcrumbs(currentPath);
    const parentIds = crumbs.map(c => c.id);
    setExpandedIds(prev => {
      if (searchQuery !== '') return prev;
      // If we are in domain view and just loaded, we might want to keep the current domain open
      return [...new Set([...prev, ...parentIds])];
    });
  }, [currentPath, searchQuery]);

  const toggleExpand = (id: string, isHub: boolean) => {
    if (!isHub) return;
    
    setExpandedIds(prev => {
      const isExpanded = prev.includes(id);
      if (isExpanded) {
        return prev.filter(item => item !== id);
      } else {
        // Single-expand logic: close siblings at the same level
        const page = pages.find(p => p.id === id);
        
        // If it's a top-level item (no parentId in pages OR starts with dom_)
        if (id.startsWith('dom_') || (page && !page.parentId)) {
          return [id];
        }

        // For nested items, close siblings
        const siblings = pages.filter(p => p.parentId === page?.parentId).map(p => p.id);
        const filtered = prev.filter(item => !siblings.includes(item));
        return [...filtered, id];
      }
    });
  };

  const projectRootId = selectedProject?.driveFolderId || null;
  const projectRootName = selectedProject ? `[${selectedProject.code}] ${selectedProject.name}` : 'Master Project Folder';

  const [driveFolders, setDriveFolders] = useState<Record<string, any[]>>({});
  const [loadingFolders, setLoadingFolders] = useState<string[]>([]);

  const fetchDriveFolders = async (folderId: string) => {
    if (driveFolders[folderId] || loadingFolders.includes(folderId)) return;
    
    setLoadingFolders(prev => [...prev, folderId]);
    try {
      const response = await fetch(`/api/drive/files/${folderId}`);
      const data = await response.json();
      if (data.files) {
        setDriveFolders(prev => ({ ...prev, [folderId]: data.files }));
      }
    } catch (error) {
      console.error('Failed to fetch Drive folders:', error);
    } finally {
      setLoadingFolders(prev => prev.filter(id => id !== folderId));
    }
  };

  useEffect(() => {
    // We no longer need to fetch drive folders here as the tab is removed
  }, []);

  const renderDriveTree = (folderId: string, depth = 0) => {
    const files = driveFolders[folderId] || [];
    const isLoading = loadingFolders.includes(folderId);

    if (isLoading && files.length === 0) {
      return <div className="ms-4 text-[10px] text-slate-500 py-1 italic">{t('loading')}</div>;
    }

    return (
      <div className={cn("space-y-1", depth > 0 && "ms-4 border-s border-slate-200 ps-2")}>
        {files.map(file => {
          const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
          const isExpanded = expandedIds.includes(file.id);
          const isActive = location.pathname === `/explorer/${file.id}`;
          
          return (
            <div key={file.id} className="space-y-1">
              <div className="flex items-center group">
                <Link
                  to={`/explorer/${file.id}`}
                  onClick={() => {
                    if (isFolder) {
                      toggleExpand(file.id, true);
                      fetchDriveFolders(file.id);
                    }
                  }}
                  className={cn(
                    "sidebar-item flex-1 group cursor-pointer",
                    isActive ? "sidebar-item-active" : "sidebar-item-inactive"
                  )}
                >
                  {isFolder ? (
                    <FolderOpen className={cn("w-4 h-4 me-2 transition-colors", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                  ) : (
                    <FileText className={cn("w-4 h-4 me-2 transition-colors", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                  )}
                  <span className="truncate text-xs font-medium">{file.name}</span>
                </Link>
                {isFolder && (
                  <button 
                    onClick={() => {
                      toggleExpand(file.id, true);
                      fetchDriveFolders(file.id);
                    }}
                    className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                )}
              </div>
              {isFolder && isExpanded && renderDriveTree(file.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTree = (parentId: string | undefined, depth = 0) => {
    let items = pages.filter(p => p.parentId === parentId);
    
    // Apply Tailoring Logic
    if (pmPlan && pmPlan.tailoringDecisions) {
      const tailoredOutAreas = pmPlan.tailoringDecisions
        .filter(d => d.isTailoredOut)
        .map(d => d.knowledgeArea.toLowerCase());

      items = items.filter(item => {
        const itemDomain = item.domain?.toLowerCase() || '';
        return !tailoredOutAreas.some(area => itemDomain.includes(area));
      });
    }
    
    const filteredItems = items.filter(item => {
      const title = stripNumericPrefix(t(item.id) || item.title);
      const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase());
      const hasMatchingChild = pages.some(p => 
        p.parentId === item.id && (stripNumericPrefix(t(p.id) || p.title)).toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      if (searchQuery && !matchesSearch && !hasMatchingChild) return false;

      if (!isAdmin && userProfile?.accessiblePages?.length > 0) {
        const isAccessible = userProfile.accessiblePages.includes(item.id);
        const hasAccessibleChild = pages.some(p => p.parentId === item.id && userProfile.accessiblePages.includes(p.id));
        if (!isAccessible && !hasAccessibleChild) return false;
      }

      return true;
    });

    if (filteredItems.length === 0 && searchQuery !== '') return null;

    return (
      <div className={cn("space-y-1", depth > 0 && "ms-4 border-s border-slate-200 ps-2")}>
        {filteredItems.map(page => {
          const isActive = currentPath === page.id;
          const hasChildren = pages.some(p => p.parentId === page.id);
          const isExpanded = expandedIds.includes(page.id) || searchQuery !== '';
          const title = stripNumericPrefix(t(page.id) || page.title);
          
          return (
            <div key={page.id} className="space-y-1">
              <div className="flex items-center group">
                <Link
                  to={`/page/${page.id}`}
                  onClick={() => toggleExpand(page.id, hasChildren)}
                  className={cn(
                    "sidebar-item flex-1 group",
                    isActive ? "sidebar-item-active" : "sidebar-item-inactive"
                  )}
                >
                  {(() => {
                    const Icon = getDomainIcon(page.domain, page.title);
                    return <Icon className={cn("w-4 h-4 me-2 transition-colors", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />;
                  })()}
                  <span className={cn("truncate", depth === 0 ? "font-bold uppercase text-[10px] tracking-wider" : "text-xs font-medium")}>
                    {title}
                  </span>
                </Link>
                {hasChildren && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      toggleExpand(page.id, true);
                    }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-900 transition-colors"
                  >
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                )}
              </div>
              {hasChildren && isExpanded && renderTree(page.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <aside 
      style={{ width: sidebarWidth }}
      className="h-screen bg-[#f8fafc] border-r border-slate-200 p-4 flex flex-col relative group/sidebar shrink-0"
    >
      {/* Resize Handle */}
      <div
        onMouseDown={() => setIsResizing(true)}
        className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-blue-600/50 transition-all z-50 group-hover/sidebar:bg-slate-200"
      >
        <div className={cn(
          "absolute right-0 top-0 w-0.5 h-full transition-colors",
          isResizing ? "bg-blue-600" : "group-hover:bg-blue-600/30"
        )} />
      </div>
      <div className="relative mb-6 mt-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder={t('search_pages')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm"
        />
      </div>

      <nav className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
        <div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-4">{t('hierarchy')}</div>
          {renderTree(undefined)}
        </div>

        {selectedProject && (
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-4">{t('drive')}</div>
            <div className="space-y-1">
              <div className="flex items-center group">
                <Link
                  to={`/explorer/${selectedProject.driveFolderId}`}
                  onClick={() => {
                    toggleExpand(selectedProject.driveFolderId || '', true);
                    if (selectedProject.driveFolderId) fetchDriveFolders(selectedProject.driveFolderId);
                  }}
                  className={cn(
                    "sidebar-item flex-1 group",
                    location.pathname === `/explorer/${selectedProject.driveFolderId}` ? "sidebar-item-active" : "sidebar-item-inactive"
                  )}
                >
                  <FolderOpen className={cn("w-4 h-4 me-2 transition-colors", location.pathname.includes('/explorer') ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                  <span className="truncate text-xs font-bold uppercase tracking-wider">
                    {selectedProject.code} Workspace
                  </span>
                </Link>
                <button 
                  onClick={() => {
                    if (selectedProject.driveFolderId) {
                      toggleExpand(selectedProject.driveFolderId, true);
                      fetchDriveFolders(selectedProject.driveFolderId);
                    }
                  }}
                  className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-900 transition-colors"
                >
                  {expandedIds.includes(selectedProject.driveFolderId || '') ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
              </div>
              {selectedProject.driveFolderId && expandedIds.includes(selectedProject.driveFolderId) && renderDriveTree(selectedProject.driveFolderId, 1)}
            </div>
          </div>
        )}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-200 space-y-4">
        {isAdmin && (
          <div className="px-2">
            <button
              onClick={() => setIsAdminExpanded(!isAdminExpanded)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group",
                isAdminExpanded ? "bg-slate-50 text-slate-900" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <div className="flex items-center">
                <Shield className={cn("w-4 h-4 me-3 transition-colors", isAdminExpanded ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                <span className="font-bold text-xs">{t('admin_settings')}</span>
              </div>
              <ChevronRight className={cn("w-4 h-4 transition-transform", isAdminExpanded ? "rotate-90" : "")} />
            </button>
            
            <AnimatePresence>
              {isAdminExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden ms-4 border-s border-slate-200 ps-2 mt-1 space-y-1"
                >
                  <Link
                    to="/admin/users"
                    className={cn(
                      "flex items-center px-4 py-2 rounded-lg transition-all group",
                      location.pathname === '/admin/users' ? "bg-blue-600/5 text-blue-600" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <Users className="w-3.5 h-3.5 me-3" />
                    <span className="text-xs font-medium">{t('users')}</span>
                  </Link>
                  <Link
                    to="/admin/contacts"
                    className={cn(
                      "flex items-center px-4 py-2 rounded-lg transition-all group",
                      location.pathname === '/admin/contacts' ? "bg-blue-600/5 text-blue-600" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <Users className="w-3.5 h-3.5 me-3" />
                    <span className="text-xs font-medium">{t('contacts')}</span>
                  </Link>
                  <Link
                    to="/admin/companies"
                    className={cn(
                      "flex items-center px-4 py-2 rounded-lg transition-all group",
                      location.pathname === '/admin/companies' ? "bg-blue-600/5 text-blue-600" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <Building2 className="w-3.5 h-3.5 me-3" />
                    <span className="text-xs font-medium">{t('companies')}</span>
                  </Link>
                  <Link
                    to="/admin/resources"
                    className={cn(
                      "flex items-center px-4 py-2 rounded-lg transition-all group",
                      location.pathname === '/admin/resources' ? "bg-blue-600/5 text-blue-600" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <Package className="w-3.5 h-3.5 me-3" />
                    <span className="text-xs font-medium">{t('3m_resources')}</span>
                  </Link>
                  <Link
                    to="/admin/work-packages"
                    className={cn(
                      "flex items-center px-4 py-2 rounded-lg transition-all group",
                      location.pathname === '/admin/work-packages' ? "bg-blue-600/5 text-blue-600" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <Grid3X3 className="w-3.5 h-3.5 me-3" />
                    <span className="text-xs font-medium">{t('work_packages')}</span>
                  </Link>
                  <Link
                    to="/admin/projects"
                    className={cn(
                      "flex items-center px-4 py-2 rounded-lg transition-all group",
                      location.pathname === '/admin/projects' ? "bg-blue-600/5 text-blue-600" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <Layout className="w-3.5 h-3.5 me-3" />
                    <span className="text-xs font-medium">{t('projects')}</span>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </aside>
  );
};
