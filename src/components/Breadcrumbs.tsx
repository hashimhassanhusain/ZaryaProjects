import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useUI } from '../context/UIContext';
import { 
  ChevronRight, Home, LayoutGrid, Database, Package, Target, List, Clock, 
  DollarSign, Shield, FileText, Flag, Compass, Users, TrendingUp, 
  CheckCircle2, ShieldAlert, Info, Settings, Users2, Zap, CheckSquare, 
  Calendar, Layers, Briefcase, Activity, ShieldCheck, User, Building2, 
  LayoutDashboard, ShoppingCart, BarChart3, Lightbulb, BookOpen, 
  ClipboardList, MessageSquare, ListChecks, RefreshCw, Star
} from 'lucide-react';
import { getBreadcrumbs, pages } from '../data';
import { stripNumericPrefix, cn } from '../lib/utils';
import { useProject } from '../context/ProjectContext';

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
  const { t, th, isRtl } = useLanguage();
  const { toggleFavorite, isFavorite } = useUI();
  const { selectedProject } = useProject();
  const crumbs = getBreadcrumbs(currentPageId);
  const currentPage = pages.find(p => p.id === currentPageId);
  const IconComponent = currentPage?.icon ? iconMap[currentPage.icon] : null;

  const isFav = isFavorite(currentPageId);

  return (
    <div className="mb-4">
      <nav className={cn("flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em]", isRtl ? "text-right" : "text-left")}>
        <Link to="/" className="text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1.5 group shrink-0">
           <Home className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
           <span>{t('hq')}</span>
        </Link>
        
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const label = stripNumericPrefix(t(crumb.id) === crumb.id ? crumb.title : t(crumb.id));
          
          return (
            <React.Fragment key={crumb.id}>
              <span className="text-slate-300 flex items-center shrink-0">
                 <ChevronRight className={cn("w-3 h-3 mx-1", isRtl && "rotate-180")} />
              </span>
              {isLast ? (
                <span className="text-blue-600 font-black truncate max-w-[250px]">
                  {label}
                </span>
              ) : (
                <Link
                  to={`/project/${selectedProject?.id}/page/${crumb.id}`}
                  className="text-slate-400 hover:text-blue-500 transition-colors shrink-0"
                >
                  {label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
        
        <div className="flex-1" />
        
        <button 
          onClick={() => toggleFavorite(currentPageId)}
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
            isFav ? "bg-amber-50 text-amber-500" : "text-slate-300 hover:text-slate-500"
          )}
        >
          <Star className={cn("w-3.5 h-3.5", isFav && "fill-current")} />
        </button>
      </nav>
    </div>
  );
};
