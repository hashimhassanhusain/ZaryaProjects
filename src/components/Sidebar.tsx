import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Shield, 
  DraftingCompass,
  Calendar,
  Banknote,
  Users,
  Package,
  AlertTriangle,
  FolderOpen,
  Settings,
  ChevronRight,
  Zap,
  Target,
  Activity,
  Flag,
  FileText,
  BookOpen,
  ClipboardList,
  BarChart3,
  List,
  Table,
  LayoutGrid,
  Layers,
  Clock,
  Briefcase,
  CheckCircle2,
  TrendingUp,
  User,
  Users2,
  ShieldAlert,
  ShieldCheck,
  Award,
  ShoppingCart,
  GitBranch,
  MessageSquare,
  ListChecks,
  Grid,
  Building2,
  CheckSquare,
  DollarSign
} from 'lucide-react';
import { pages } from '../data';
import { cn, stripNumericPrefix } from '../lib/utils';
import { auth, db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/UserContext';
import { useUI } from '../context/UIContext';
import { useLanguage } from '../context/LanguageContext';
import { Page } from '../types';

const iconMap: Record<string, any> = {
  LayoutDashboard, Shield, DraftingCompass, Calendar, Banknote, Users, Package, AlertTriangle, FolderOpen, Settings, Zap, Target, Activity, Flag, FileText, BookOpen, ClipboardList, BarChart3, List, Table, LayoutGrid, Layers, Clock, Briefcase, CheckCircle2, TrendingUp, User, Users2, ShieldAlert, ShieldCheck, Award, ShoppingCart, GitBranch, MessageSquare, ListChecks, Grid, Building2, CheckSquare, DollarSign
};

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedProject } = useProject();
  const { userProfile, isAdmin } = useAuth();
  const { isSidebarOpen } = useUI();
  const { t, isRtl } = useLanguage();

  const focusAreas = ['Initiating', 'Planning', 'Executing', 'Monitoring', 'Closing'];
  const focusIcons: Record<string, any> = {
    'Initiating': Zap,
    'Planning': Target,
    'Executing': Activity,
    'Monitoring': ShieldCheck,
    'Closing': Flag
  };

  const NavItem = (props: { item: Page, level?: number, focusArea?: string, key?: any }) => {
    const { item, level = 0, focusArea } = props;
    const isActive = location.pathname === `/page/${item.id}`;
    const IconComponent = item.icon ? iconMap[item.icon] : FileText;
    
    // Find children: either by parentId OR if it's a Focus Area group, find members
    const children = pages.filter(p => {
      if (focusArea) {
        // We are filtering a Domain's children by a specific Focus Area
        return p.parentId === item.id && p.focusArea === focusArea;
      }
      return p.parentId === item.id;
    }).filter(p => isAdmin || userProfile?.accessiblePages?.includes(p.id));
    
    const [isExpanded, setIsExpanded] = useState(isActive);

    useEffect(() => {
      const isChildActive = children.some(c => location.pathname === `/page/${c.id}` || pages.filter(p => p.parentId === c.id).some(gc => location.pathname === `/page/${gc.id}`));
      if (isActive || isChildActive) setIsExpanded(true);
    }, [isActive, children]);

    return (
      <div className="w-full">
        <div 
          onClick={() => {
            if (children.length > 0) setIsExpanded(!isExpanded);
            navigate(`/page/${item.id}`);
          }}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all group cursor-pointer mb-1 w-full",
            isActive 
              ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100",
            level > 0 && (isRtl ? "mr-4" : "ml-4")
          )}
        >
          <div className={cn(
            "p-1.5 rounded-lg transition-all duration-300",
            isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-600"
          )}>
            <IconComponent className="w-4 h-4" />
          </div>
          <span className="flex-1 truncate uppercase tracking-tight">
            {stripNumericPrefix(t(item.id) || item.title)}
          </span>
          {children.length > 0 && (
            <ChevronRight className={cn(
              "w-3.5 h-3.5 transition-transform duration-300",
              isExpanded && "rotate-90",
              isActive ? "text-white" : "text-slate-400"
            )} />
          )}
          {isActive && (
            <motion.div
              layoutId="sidebarActive"
              className="absolute inset-0 bg-blue-600 rounded-xl -z-10"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
        </div>
        
        {children.length > 0 && isExpanded && (
          <div className="flex flex-col">
            {children.map(child => (
              <NavItem key={child.id} item={child} level={level + 1} focusArea={focusArea} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside 
      className={cn(
        "h-screen bg-[#f8fafc] border-slate-200 p-4 flex flex-col shrink-0 transition-all duration-300 z-50",
        isSidebarOpen ? "w-[260px]" : "w-0 p-0 overflow-hidden border-none",
        isRtl ? "border-l" : "border-r"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Brand */}
        <div className="h-12 flex items-center px-2 gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-inner ring-1 ring-blue-500/50">
            <Zap className="w-6 h-6 text-white fill-current" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black text-slate-900 tracking-tighter leading-none">ZARYA</span>
            <span className="text-[10px] font-bold text-blue-600 tracking-[0.2em] mt-1 uppercase">Ecosystem</span>
          </div>
        </div>

        {/* Dashboard Link */}
        <Link
          to="/"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative mb-4",
            location.pathname === '/' 
              ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <div className={cn(
            "p-1.5 rounded-lg transition-all duration-300",
            location.pathname === '/' ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-600"
          )}>
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest truncate">
            {t('dashboard')}
          </span>
          {location.pathname === '/' && (
            <motion.div
              layoutId="sidebarActive"
              className="absolute inset-0 bg-blue-600 rounded-xl -z-10"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}
        </Link>

        {/* Middle items (Focus Areas -> Domains) */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1 custom-scrollbar pb-6">
          <div className="px-3 mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Process Groups</span>
          </div>
          
          {focusAreas.map(area => {
            const areaPages = pages.filter(p => p.focusArea === area && (isAdmin || userProfile?.accessiblePages?.includes(p.id)));
            if (areaPages.length === 0) return null;

            // Group by Domain within the focus area
            const domainIds = Array.from(new Set(areaPages.map(p => p.parentId)));
            const childDomains = pages.filter(p => domainIds.includes(p.id));

            return (
              <div key={area} className="mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
                  <div className="p-1 rounded-md bg-slate-100 text-slate-500">
                    {React.createElement(focusIcons[area] || Layers, { className: "w-3 h-3" })}
                  </div>
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{area}</span>
                </div>
                <div className="space-y-0.5">
                  {childDomains.map(domain => {
                    // Create a virtual hub for this domain inside this focus area
                    const domainInFocus = {
                      ...domain,
                      title: stripNumericPrefix(t(domain.id) || domain.title),
                      id: `${domain.id}-${area}` // Discriminator for virtual node
                    };
                    
                    const filteredChildren = areaPages.filter(p => p.parentId === domain.id);

                    return (
                      <NavItem 
                        key={domainInFocus.id} 
                        item={{
                          ...domain,
                          title: stripNumericPrefix(t(domain.id) || domain.title)
                        }} 
                        level={0} 
                        focusArea={area}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
          
          {/* Other Hubs without focus area */}
          <div className="px-3 mb-2 mt-6">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">General Hubs</span>
          </div>
          {pages.filter(p => !p.parentId && !p.focusArea && p.id !== 'dashboard' && (isAdmin || userProfile?.accessiblePages?.includes(p.id))).map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </nav>

        {/* Bottom items */}
        <div className="mt-auto pt-4 space-y-1 border-t border-slate-100">
          <Link
            to="/page/files"
            className={cn(
              "flex items-center px-4 py-2.5 rounded-xl transition-all group relative",
              location.pathname === '/page/files' 
                ? "bg-blue-600 text-white shadow-lg" 
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <FolderOpen className="w-4 h-4 me-3" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">{t('drive_explorer')}</span>
          </Link>

          {isAdmin && (
            <Link
              to="/admin/users"
              className={cn(
                "flex items-center px-4 py-2.5 rounded-xl transition-all group relative",
                location.pathname.startsWith('/admin') 
                  ? "bg-blue-600 text-white shadow-lg" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <Settings className="w-4 h-4 me-3" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">{t('admin_settings')}</span>
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
};

