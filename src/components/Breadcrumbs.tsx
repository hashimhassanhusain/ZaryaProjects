import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronRight, Home, LayoutGrid, Database, Package, Target, List, Clock, 
  DollarSign, Shield, FileText, Flag, Compass, Users, TrendingUp, 
  CheckCircle2, ShieldAlert, Info, Settings, Users2, Zap, CheckSquare, 
  Calendar, Layers, Briefcase, Activity, ShieldCheck, User, Building2, 
  LayoutDashboard, ShoppingCart, BarChart3, Lightbulb, BookOpen, 
  ClipboardList, MessageSquare, ListChecks, RefreshCw
} from 'lucide-react';
import { getBreadcrumbs, pages } from '../data';
import { stripNumericPrefix, cn } from '../lib/utils';

interface BreadcrumbsProps {
  currentPageId: string;
}

const iconMap: Record<string, any> = {
  LayoutGrid,
  Database,
  Package,
  Target,
  List,
  Clock,
  DollarSign,
  Shield,
  FileText,
  Flag,
  Compass,
  Users,
  TrendingUp,
  CheckCircle2,
  ShieldAlert,
  Info,
  Settings,
  Users2,
  Zap,
  CheckSquare,
  Calendar,
  Layers,
  Briefcase,
  Activity,
  ShieldCheck,
  User,
  Building2,
  LayoutDashboard,
  ShoppingCart,
  BarChart3,
  Lightbulb,
  BookOpen,
  ClipboardList,
  MessageSquare,
  ListChecks,
  RefreshCw
};

const getCategoryForPage = (id: string): string => {
  const page = pages.find(p => p.id === id);
  if (!page) return '';

  // Finance
  if (page.domain === 'finance' || id.startsWith('2.4') || id.startsWith('4.2') || id.startsWith('5.2')) return 'Finance';
  
  // Governance
  if (page.domain === 'governance' || page.domain === 'risk' || id.startsWith('2.7') || id.startsWith('3.4') || id.startsWith('1.1') || id.startsWith('2.1') || id.startsWith('3.1') || id.startsWith('4.1') || id.startsWith('5.1')) return 'Governance';

  // Utilities
  if (id === 'files' || id === 'settings') return 'Utilities';

  // Default to Core Data for others (Scope, Resources, etc.)
  return 'Core Data';
};

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ currentPageId }) => {
  const category = getCategoryForPage(currentPageId);
  const crumbs = getBreadcrumbs(currentPageId);
  const currentPage = pages.find(p => p.id === currentPageId);
  const IconComponent = currentPage?.icon ? iconMap[currentPage.icon] : null;

  return (
    <div className="space-y-4 mb-8">
      <nav className="flex items-center space-x-2 text-xs text-slate-400">
        <Link to="/" className="hover:text-slate-600 transition-colors flex items-center">
          <Home className="w-3.5 h-3.5 mr-1" />
          <span>Dashboard</span>
        </Link>
        
        {category && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-400">{category}</span>
          </>
        )}

        {crumbs.map((crumb, index) => {
          // Skip focus areas if they are top level hubs like 1.0, 2.0 etc to keep it clean
          if (crumb.type === 'hub' && !crumb.parentId) return null;
          
          // Don't show the last crumb here as we show it larger below
          if (index === crumbs.length - 1) return null;

          return (
            <React.Fragment key={crumb.id}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <Link
                to={`/page/${crumb.id}`}
                className="hover:text-slate-600 transition-colors"
              >
                {stripNumericPrefix(crumb.title)}
              </Link>
            </React.Fragment>
          );
        })}
      </nav>

      {currentPage && (
        <div className="flex items-center gap-4">
          {IconComponent && (
            <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-600/20">
              <IconComponent className="w-6 h-6 text-white" />
            </div>
          )}
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {stripNumericPrefix(currentPage.title)}
          </h1>
        </div>
      )}
    </div>
  );
};
