import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
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

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ currentPageId }) => {
  const { t, isRtl } = useLanguage();
  const crumbs = getBreadcrumbs(currentPageId);
  const currentPage = pages.find(p => p.id === currentPageId);
  const IconComponent = currentPage?.icon ? iconMap[currentPage.icon] : null;

  return (
    <div className="space-y-2 mb-4">
      <nav className={cn("flex items-center text-xs text-slate-400", isRtl ? "space-x-reverse space-x-2" : "space-x-2")}>
        <Link to="/" className="hover:text-slate-600 transition-colors flex items-center">
          <Home className="w-3.5 h-3.5 me-1" />
          <span>{t('dashboard')}</span>
        </Link>
        
        {crumbs.map((crumb, index) => {
          // Skip focus areas if they are top level hubs like 1.0, 2.0 etc to keep it clean
          if (crumb.type === 'hub' && !crumb.parentId) return null;
          
          // Don't show the last crumb here as we show it larger below
          if (index === crumbs.length - 1) return null;

          return (
            <React.Fragment key={crumb.id}>
              <ChevronRight className={cn("w-3.5 h-3.5 text-slate-300 mx-1", isRtl && "rotate-180")} />
              <Link
                to={`/page/${crumb.id}`}
                className="hover:text-slate-600 transition-colors"
              >
                {stripNumericPrefix(t(crumb.id) || crumb.title)}
              </Link>
            </React.Fragment>
          );
        })}
      </nav>

      {currentPage && (
        <div className="flex items-center gap-4">
          {IconComponent && (
            <div className="p-3 bg-blue-600 rounded-xl shadow-xl shadow-blue-600/20">
              <IconComponent className="w-6 h-6 text-white" />
            </div>
          )}
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center flex-wrap gap-x-2">
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1;
              const title = stripNumericPrefix(t(crumb.id) || crumb.title);
              
              if (isLast) {
                return <span key={crumb.id}>{title}</span>;
              }

              // Skip top level hubs if they are just focus areas to keep it concise
              if (crumb.type === 'hub' && !crumb.parentId) return null;

              return (
                <React.Fragment key={crumb.id}>
                  <span className="text-slate-400">{title}</span>
                  <ChevronRight className={cn("w-6 h-6 text-slate-300 mx-1", isRtl && "rotate-180")} />
                </React.Fragment>
              );
            })}
          </h1>
        </div>
      )}
    </div>
  );
};
