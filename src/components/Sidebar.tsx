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
  DraftingCompass,
  Calendar,
  Banknote,
  Package,
  AlertTriangle,
  Target
} from 'lucide-react';
import { pages, getChildren, getBreadcrumbs, getFocusArea } from '../data';
import { Project } from '../types';
import { cn, sortDomainPages } from '../lib/utils';
import { auth, db } from '../firebase';
import { signOut, User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../context/ProjectContext';
import { useUI } from '../context/UIContext';

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
  const [viewMode, setViewMode] = useState<'focus' | 'domain' | 'files'>('focus');
  const { sidebarWidth, setSidebarWidth } = useUI();
  const [isResizing, setIsResizing] = useState(false);

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
    if (viewMode === 'files' && projectRootId) {
      fetchDriveFolders(projectRootId);
    }
  }, [viewMode, projectRootId]);

  const renderDriveTree = (folderId: string, depth = 0) => {
    const files = driveFolders[folderId] || [];
    const isLoading = loadingFolders.includes(folderId);

    if (isLoading && files.length === 0) {
      return <div className="ml-4 text-[10px] text-slate-500 py-1 italic">Loading...</div>;
    }

    return (
      <div className={cn("space-y-1", depth > 0 && "ml-4 border-l border-white/5 pl-2")}>
        {files.map(file => {
          const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
          const isExpanded = expandedIds.includes(file.id);
          
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
                    location.pathname === `/explorer/${file.id}` ? "sidebar-item-active" : "sidebar-item-inactive"
                  )}
                >
                  {isFolder ? (
                    <FolderOpen className="w-4 h-4 mr-2 text-slate-500 group-hover:text-slate-300" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2 text-slate-500 group-hover:text-slate-300" />
                  )}
                  <span className="truncate text-xs">{file.name}</span>
                </Link>
                {isFolder && (
                  <button 
                    onClick={() => {
                      toggleExpand(file.id, true);
                      fetchDriveFolders(file.id);
                    }}
                    className="p-1 hover:bg-white/5 rounded text-slate-500 hover:text-white transition-colors"
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

  const renderTree = (parentId?: string, depth = 0) => {
    if (viewMode === 'files') {
      if (!projectRootId) {
        return <div className="px-4 py-2 text-xs text-slate-500 italic">Select a project to view files.</div>;
      }
      return renderDriveTree(projectRootId, depth);
    }

    let items: any[] = [];
    
    const CANONICAL_DOMAINS = [
      { id: 'dom_gov', title: 'Governance Domain', searchKey: 'governance' },
      { id: 'dom_scope', title: 'Scope Domain', searchKey: 'scope' },
      { id: 'dom_sched', title: 'Schedule Domain', searchKey: 'schedule' },
      { id: 'dom_fin', title: 'Finance Domain', searchKey: 'finance' },
      { id: 'dom_stake', title: 'Stakeholders Domain', searchKey: 'stakeholders' },
      { id: 'dom_res', title: 'Resources Domain', searchKey: 'resources' },
      { id: 'dom_risk', title: 'Risk Domain', searchKey: 'risk' },
    ];

    if (viewMode === 'focus') {
      items = parentId ? getChildren(parentId) : pages.filter(p => !p.parentId);
    } else if (viewMode === 'domain') {
      // Domain View Logic
      if (!parentId) {
        items = CANONICAL_DOMAINS.map(d => ({
          id: d.id,
          title: d.title,
          type: 'hub',
          isCanonical: true,
          searchKey: d.searchKey
        }));
      } else {
        const canonical = CANONICAL_DOMAINS.find(d => d.id === parentId);
        if (canonical) {
          // Find all pages that belong to this domain
          const domainHubs = pages.filter(p => 
            p.type === 'hub' && 
            p.domain === canonical.searchKey
          );
          const hubIds = domainHubs.map(h => h.id);
          
          // Get all terminal pages under these hubs
          items = pages.filter(p => p.parentId && hubIds.includes(p.parentId));
          
          // Logical Sorting:
          items = sortDomainPages(items, canonical.searchKey);
        } else {
          items = getChildren(parentId);
        }
      }
    } else {
      // Master File Explorer Logic
      if (!parentId) {
        items = [
          { id: 'files_root', title: projectRootName, type: 'hub', path: '/page/files' }
        ];
      } else {
        items = []; // In a real app, we'd fetch subfolders here
      }
    }
    
    const filteredItems = items.filter(item => {
      // Filter by permissions if not admin
      if (!isAdmin && userProfile?.accessiblePages?.length > 0) {
        // If it's a hub, check if it or any of its children are accessible
        if (item.type === 'hub') {
          const isHubAccessible = userProfile.accessiblePages.includes(item.id);
          const hasAccessibleChild = pages.some(p => p.parentId === item.id && userProfile.accessiblePages.includes(p.id));
          if (!isHubAccessible && !hasAccessibleChild) return false;
        } else {
          if (!userProfile.accessiblePages.includes(item.id)) return false;
        }
      }

      if (searchQuery === '') return true;
      const matchesSelf = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (item.isCanonical) {
        // For canonical domains, check if any of their "virtual" children match
        const hubIds = pages.filter(p => 
          p.type === 'hub' && 
          p.domain === item.searchKey
        ).map(h => h.id);
        return matchesSelf || pages.some(p => p.parentId && hubIds.includes(p.parentId) && p.title.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      const hasMatchingChild = pages.some(p => 
        p.parentId === item.id && p.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return matchesSelf || hasMatchingChild;
    });

    if (filteredItems.length === 0 && searchQuery !== '') return null;

    return (
      <div className={cn("space-y-1", depth > 0 && "ml-4 border-l border-white/5 pl-2")}>
        {filteredItems.map(page => {
          const isActive = currentPath === page.id;
          const hasChildren = page.isCanonical || getChildren(page.id).length > 0;
          const isExpanded = expandedIds.includes(page.id) || searchQuery !== '';
          
          return (
            <div key={page.id} className="space-y-1">
              <div className="flex items-center group">
                {page.isCanonical ? (
                  <Link
                    to={`/page/${page.id}`}
                    onClick={() => toggleExpand(page.id, true)}
                    className={cn(
                      "sidebar-item flex-1 group text-left",
                      isActive ? "sidebar-item-active" : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {(() => {
                      const Icon = getDomainIcon(page.searchKey, page.title);
                      return <Icon className={cn("w-4 h-4 mr-2 transition-colors", isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />;
                    })()}
                    <span className="truncate font-semibold">{page.title}</span>
                  </Link>
                ) : (
                  <Link
                    to={`/page/${page.id}`}
                    onClick={() => toggleExpand(page.id, page.type === 'hub')}
                    className={cn(
                      "sidebar-item flex-1 group",
                      isActive ? "sidebar-item-active" : "sidebar-item-inactive"
                    )}
                  >
                    {page.type === 'hub' ? (
                      (() => {
                        const Icon = getDomainIcon(page.domain, page.title);
                        return <Icon className={cn("w-4 h-4 mr-2 transition-colors", isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />;
                      })()
                    ) : (
                      <FileText className={cn("w-4 h-4 mr-2 transition-colors", isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{page.title}</span>
                      {viewMode === 'domain' && !page.isCanonical && (
                        <span className="text-[9px] text-slate-500 font-medium truncate">
                          {getFocusArea(page.id)?.title}
                        </span>
                      )}
                    </div>
                  </Link>
                )}
                {hasChildren && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      toggleExpand(page.id, true);
                    }}
                    className="p-1 hover:bg-white/5 rounded text-slate-500 hover:text-white transition-colors"
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
      className="h-screen bg-slate-900 border-r border-white/10 p-4 flex flex-col relative group/sidebar shrink-0"
    >
      {/* Resize Handle */}
      <div
        onMouseDown={() => setIsResizing(true)}
        className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-blue-500/50 transition-all z-50 group-hover/sidebar:bg-white/5"
      >
        <div className={cn(
          "absolute right-0 top-0 w-0.5 h-full transition-colors",
          isResizing ? "bg-blue-500" : "group-hover:bg-blue-500/30"
        )} />
      </div>
      <div className="relative mb-6 mt-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search pages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      </div>

      <div className="flex bg-white/5 p-1 rounded-xl mb-6">
        <button
          onClick={() => setViewMode('focus')}
          className={cn(
            "flex-1 py-1.5 text-[9px] font-semibold rounded-lg transition-all",
            viewMode === 'focus' ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
          )}
        >
          HIERARCHY
        </button>
        <button
          onClick={() => setViewMode('domain')}
          className={cn(
            "flex-1 py-1.5 text-[9px] font-semibold rounded-lg transition-all",
            viewMode === 'domain' ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
          )}
        >
          DOMAINS
        </button>
        <button
          onClick={() => setViewMode('files')}
          className={cn(
            "flex-1 py-1.5 text-[9px] font-semibold rounded-lg transition-all",
            viewMode === 'files' ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
          )}
        >
          DRIVE
        </button>
      </div>
      
      <nav className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <div>
          <div>
            {renderTree()}
          </div>
        </div>
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
        {isAdmin && (
          <div className="px-2">
            <div className="gap-1 flex flex-col-reverse">
              <button
                onClick={() => setIsAdminExpanded(!isAdminExpanded)}
                className={cn(
                  "sidebar-item w-full flex items-center justify-between group",
                  isAdminExpanded ? "text-white bg-white/5" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                )}
              >
                <div className="flex items-center">
                  <Shield className={cn("w-4 h-4 mr-2 transition-colors", isAdminExpanded ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
                  <span className="font-medium text-xs">Admin Settings</span>
                </div>
                {isAdminExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              
              {isAdminExpanded && (
                <div className="ml-4 border-l border-white/5 pl-2 mb-1 space-y-1">
                  <Link
                    to="/admin/users"
                    className={cn(
                      "sidebar-item flex items-center group py-2",
                      location.pathname === '/admin/users' ? "sidebar-item-active" : "sidebar-item-inactive"
                    )}
                  >
                    <Users className="w-3 h-3 mr-2" />
                    <span className="text-xs">Users</span>
                  </Link>
                  <Link
                    to="/admin/projects"
                    className={cn(
                      "sidebar-item flex items-center group py-2",
                      location.pathname === '/admin/projects' ? "sidebar-item-active" : "sidebar-item-inactive"
                    )}
                  >
                    <Layout className="w-3 h-3 mr-2" />
                    <span className="text-xs">Projects</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
