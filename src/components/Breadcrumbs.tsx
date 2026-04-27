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
  ClipboardList, MessageSquare, ListChecks, RefreshCw, Star, ArrowRight
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
  const { getPath } = useProject();
  const crumbs = getBreadcrumbs(currentPageId);
  const currentPage = pages.find(p => p.id === currentPageId);

  return (
    <div className="space-y-4">
      {/* Dynamic Breadcrumb Trail */}
      <nav className={cn("flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest", isRtl ? "space-x-reverse space-x-2" : "space-x-2")}>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const translated = t(crumb.id);
          const label = stripNumericPrefix(translated && translated !== crumb.id ? translated : crumb.title);
          
          return (
            <React.Fragment key={crumb.id}>
              {index > 0 && (
                <ArrowRight className={cn("w-3 h-3 text-slate-300 mx-1", isRtl && "rotate-180")} strokeWidth={3} />
              )}
              {isLast ? (
                <span className="text-slate-600 font-black">{label}</span>
              ) : (
                <Link
                  to={getPath(crumb.domain || 'gov', crumb.id)}
                  className="hover:text-blue-600 transition-colors"
                >
                  {label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Main Header: [Parent] > [Current] */}
      <div className="flex items-center gap-4">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-3 uppercase">
          {crumbs.length > 1 && (
            <>
              <span className="text-slate-300 opacity-60">
                {(() => {
                  const pCrumb = crumbs[crumbs.length - 2];
                  const pTrans = t(pCrumb.id);
                  return stripNumericPrefix(pTrans && pTrans !== pCrumb.id ? pTrans : pCrumb.title);
                })()}
              </span>
              <ChevronRight className={cn("w-8 h-8 text-slate-200 stroke-[3px]", isRtl && "rotate-180")} />
            </>
          )}
          <span className="relative">
            {(() => {
              const trans = t(currentPageId);
              return stripNumericPrefix(trans && trans !== currentPageId ? trans : currentPage?.title || '');
            })()}
            <div className="absolute -bottom-1 left-0 w-1/3 h-1.5 bg-blue-600/10 rounded-full" />
          </span>
        </h1>
      </div>
    </div>
  );
};
