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
      <nav className={cn("flex items-center text-xs text-slate-400 mb-1", isRtl ? "space-x-reverse space-x-2" : "space-x-2")}>
        {crumbs.map((crumb, index) => {
          if (index === crumbs.length - 1) return null;
          return (
            <React.Fragment key={crumb.id}>
              {index > 0 && <ChevronRight className={cn("w-3.5 h-3.5 text-slate-300 mx-1", isRtl && "rotate-180")} />}
              <Link
                to={`/page/${crumb.id}`}
                className="hover:text-slate-600 transition-colors font-medium"
              >
                {stripNumericPrefix(t(crumb.id) || crumb.title)}
              </Link>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Main Large Header with Parent > Child relation */}
      <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
        {crumbs.length > 1 && (
          <>
            <span className="text-slate-400 font-bold opacity-80">{stripNumericPrefix(t(crumbs[crumbs.length - 2].id) || crumbs[crumbs.length - 2].title)}</span>
            <ChevronRight className={cn("w-6 h-6 text-slate-200 stroke-[3px]", isRtl && "rotate-180")} />
          </>
        )}
        <span>{stripNumericPrefix(t(currentPageId) || currentPage?.title || '')}</span>
      </h1>
    </div>
  );
};
