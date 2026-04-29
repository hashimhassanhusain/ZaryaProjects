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
    <div className="space-y-3 mb-8">
      <nav className={cn("flex items-center text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]", isRtl ? "space-x-reverse space-x-1" : "space-x-1")}>
        <Link to="/" className="hover:text-blue-600 transition-colors flex items-center gap-1.5 group">
           <Home className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
           <span className="hidden sm:inline">{t('hq')}</span>
        </Link>
        {crumbs.map((crumb, index) => {
          if (index === crumbs.length - 1) return null;
          return (
            <React.Fragment key={crumb.id}>
              <span className="text-slate-200 mx-1 flex items-center justify-center">
                 <ChevronRight className={cn("w-3.5 h-3.5", isRtl && "rotate-180")} />
              </span>
              <Link
                to={`/project/${selectedProject?.id}/page/${crumb.id}`}
                className="hover:text-slate-600 transition-colors"
              >
                {stripNumericPrefix(crumb.title)}
              </Link>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Main Large Header with Parent > Child relation */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-4 flex-wrap uppercase">
          {crumbs.length > 1 && (
            <>
              <span className="text-slate-300 font-extrabold uppercase italic opacity-60 text-2xl">
                {stripNumericPrefix(t(crumbs[crumbs.length - 2].id) === crumbs[crumbs.length - 2].id ? crumbs[crumbs.length - 2].title : t(crumbs[crumbs.length - 2].id))}
              </span>
              <span className="text-slate-200 font-light mx-1">{'>'}</span>
            </>
          )}
          <span className="text-slate-900">
            {stripNumericPrefix(t(currentPageId) === currentPageId ? (currentPage?.title || '') : t(currentPageId))}
          </span>
        </h1>

        <div className="flex items-center gap-4">
           {currentPageId !== '1.1.1' && (
              <div className="flex -space-x-2">
                 {[1,2,3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                       {String.fromCharCode(64 + i)}
                    </div>
                 ))}
                 <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                    +
                 </div>
              </div>
           )}
           <button 
             onClick={() => toggleFavorite(currentPageId)}
             className={cn(
               "p-3 rounded-2xl transition-all border",
               isFav ? "bg-amber-50 border-amber-200 text-amber-500 shadow-xl shadow-amber-500/10" : "bg-white border-slate-100 text-slate-300 hover:text-slate-600"
             )}
           >
              <Star className={cn("w-5 h-5", isFav && "fill-current")} />
           </button>
        </div>
      </div>
    </div>
  );
};
