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
  Award
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
  const [viewMode, setViewMode] = useState<'focus' | 'domain' | 'files'>('focus');
  const { sidebarWidth, setSidebarWidth } = useUI();
  const [isResizing, setIsResizing] = useState(false);
  const [pmPlan, setPmPlan] = useState<ProjectManagementPlan | null>(null);

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

  const renderHierarchy = () => {
    const sections = [
      {
        type: 'section',
        title: 'CORE DATA',
        items: [
          { id: '2.1.2', title: 'Project Management Plan', icon: DraftingCompass },
          { id: '2.6', title: 'Resources & Optimization', icon: Package },
          { id: '1.2.1', title: 'Stakeholder Register', icon: Users },
          { id: '2.1.5', title: 'Assumptions Log', icon: ClipboardList },
          { id: '3.1.3', title: 'Decision Log', icon: Gavel },
          { id: '5.1.1', title: 'Lessons Learned', icon: Award },
          { id: '2.2.9', title: 'WBS', icon: Grid3X3 },
        ]
      },
      {
        type: 'section',
        title: 'FINANCE',
        items: [
          { id: '2.4.0', title: 'BOQ', icon: Banknote },
          { id: '4.2.6', title: 'PO Management', icon: Package },
          { id: '4.2.3', title: 'Payment Certificate', icon: FileText },
          { id: '4.2.2', title: 'Earned Value Report', icon: Banknote },
        ]
      },
      {
        type: 'section',
        title: 'GOVERNANCE',
        items: [
          { id: '3.3.3', title: 'Progress Reports', icon: FileText },
          { id: '2.6.21', title: 'Task Management', icon: LayoutDashboard },
          { id: '2.7', title: 'Risk & Opportunity Hub', icon: AlertTriangle },
          { id: '3.4', title: 'Change Management', icon: FileText },
          { id: '2.6.22', title: 'Meeting Management', icon: Users },
        ]
      },
      {
        type: 'section',
        title: 'UTILITIES',
        items: [
          { id: 'files', title: 'Project Files', icon: FolderOpen },
          { id: 'settings', title: 'Settings', icon: Settings, path: '/profile' },
        ]
      }
    ];

    return (
      <div className="space-y-8 py-2">
        {/* Dashboard Link */}
        <Link
          to="/"
          className={cn(
            "flex items-center px-4 py-3 rounded-xl transition-all group",
            location.pathname === '/' 
              ? "bg-blue-600/10 text-blue-400 border-l-4 border-blue-500" 
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          )}
        >
          <LayoutDashboard className={cn(
            "w-5 h-5 mr-3 transition-colors",
            location.pathname === '/' ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
          )} />
          <span className="text-sm font-bold tracking-wide">Dashboard</span>
        </Link>

        {sections.map((section, idx) => (
          <div key={idx} className="space-y-3">
            <h3 className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map(item => {
                const path = item.path || `/page/${item.id}`;
                const isActive = location.pathname === path || (item.id && currentPath === item.id);
                
                return (
                  <Link
                    key={item.id}
                    to={path}
                    className={cn(
                      "flex items-center px-4 py-2.5 rounded-xl transition-all group relative",
                      isActive 
                        ? "bg-white/10 text-white border-l-4 border-blue-500" 
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    )}
                  >
                    <item.icon className={cn(
                      "w-4 h-4 mr-3 transition-colors",
                      isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                    )} />
                    <span className="text-xs font-semibold truncate">{stripNumericPrefix(item.title)}</span>
                    {(item as any).hasDot && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTree = (parentId?: string, depth = 0) => {
    if (viewMode === 'focus') {
      return renderHierarchy();
    }

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

    // Apply Tailoring Logic
    if (pmPlan && pmPlan.tailoringDecisions) {
      const tailoredOutAreas = pmPlan.tailoringDecisions
        .filter(d => d.isTailoredOut)
        .map(d => d.knowledgeArea.toLowerCase());

      items = items.filter(item => {
        // Check if the item's domain is tailored out
        const itemDomain = item.domain?.toLowerCase() || '';
        const isTailoredOut = tailoredOutAreas.some(area => itemDomain.includes(area));
        
        // Special case for Folder 2.7 (Risk)
        if (item.id === '2.7' && tailoredOutAreas.includes('risk')) return false;
        
        return !isTailoredOut;
      });
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
                    <span className="truncate font-semibold">{stripNumericPrefix(page.title)}</span>
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
                      <span className="truncate">{stripNumericPrefix(page.title)}</span>
                      {viewMode === 'domain' && !page.isCanonical && (
                        <span className="text-[9px] text-slate-500 font-medium truncate">
                          {stripNumericPrefix(getFocusArea(page.id)?.title || '')}
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
            <button
              onClick={() => setIsAdminExpanded(!isAdminExpanded)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group",
                isAdminExpanded ? "bg-white/5 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              )}
            >
              <div className="flex items-center">
                <Shield className={cn("w-4 h-4 mr-3 transition-colors", isAdminExpanded ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
                <span className="font-bold text-xs">Admin Settings</span>
              </div>
              <ChevronRight className={cn("w-4 h-4 transition-transform", isAdminExpanded ? "rotate-90" : "")} />
            </button>
            
            <AnimatePresence>
              {isAdminExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden ml-4 border-l border-white/5 pl-2 mt-1 space-y-1"
                >
                  <Link
                    to="/admin/users"
                    className={cn(
                      "flex items-center px-4 py-2 rounded-lg transition-all group",
                      location.pathname === '/admin/users' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                    )}
                  >
                    <Users className="w-3.5 h-3.5 mr-3" />
                    <span className="text-xs font-medium">Users</span>
                  </Link>
                  <Link
                    to="/admin/contacts"
                    className={cn(
                      "flex items-center px-4 py-2 rounded-lg transition-all group",
                      location.pathname === '/admin/contacts' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                    )}
                  >
                    <Users className="w-3.5 h-3.5 mr-3" />
                    <span className="text-xs font-medium">Contacts</span>
                  </Link>
                  <Link
                    to="/admin/companies"
                    className={cn(
                      "flex items-center px-4 py-2 rounded-lg transition-all group",
                      location.pathname === '/admin/companies' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                    )}
                  >
                    <Building2 className="w-3.5 h-3.5 mr-3" />
                    <span className="text-xs font-medium">Companies</span>
                  </Link>
                  <Link
                    to="/admin/resources"
                    className={cn(
                      "flex items-center px-4 py-2 rounded-lg transition-all group",
                      location.pathname === '/admin/resources' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                    )}
                  >
                    <Package className="w-3.5 h-3.5 mr-3" />
                    <span className="text-xs font-medium">3M Resources</span>
                  </Link>
                  <Link
                    to="/admin/work-packages"
                    className={cn(
                      "flex items-center px-4 py-2 rounded-lg transition-all group",
                      location.pathname === '/admin/work-packages' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                    )}
                  >
                    <Grid3X3 className="w-3.5 h-3.5 mr-3" />
                    <span className="text-xs font-medium">Work Packages</span>
                  </Link>
                  <Link
                    to="/admin/projects"
                    className={cn(
                      "flex items-center px-4 py-2 rounded-lg transition-all group",
                      location.pathname === '/admin/projects' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                    )}
                  >
                    <Layout className="w-3.5 h-3.5 mr-3" />
                    <span className="text-xs font-medium">Projects</span>
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
