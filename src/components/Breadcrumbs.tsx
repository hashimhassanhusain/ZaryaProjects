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
        {/* Dashboard link removed */}
        
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
    </div>
  );
};
