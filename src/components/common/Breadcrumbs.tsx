import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, Home, FileText, Layers } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { pages } from '../../data';
import { stripNumericPrefix } from '../../lib/utils';
import { useProject } from '../../context/ProjectContext';

export const Breadcrumbs: React.FC = () => {
  const { t, isRtl } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const { selectedProject } = useProject();

  if (!id) return null;

  const currentPage = pages.find(p => p.id === id);
  if (!currentPage) return null;

  const breadcrumbs = [];
  let curr: any = currentPage;

  while (curr) {
    breadcrumbs.unshift(curr);
    curr = curr.parentId ? pages.find(p => p.id === curr.parentId) : null;
  }

  const getTranslatedTitle = (p: any) => {
    const translated = t(p.id);
    const display = (translated === p.id || !translated) ? p.title : translated;
    return stripNumericPrefix(display);
  };

  return (
    <nav className="flex items-center gap-1.5 px-6 py-2 bg-white/40 dark:bg-black/20 border-b border-neutral-200/50 dark:border-white/5 text-[9px] font-black uppercase tracking-[0.15em] text-neutral-400 no-print" dir={isRtl ? 'rtl' : 'ltr'}>
      <Link to="/" className="hover:text-brand transition-all flex items-center gap-1 duration-200 group">
        <Home className="w-3 h-3 group-hover:scale-110" />
        <span className="sr-only">Home</span>
      </Link>
      
      {breadcrumbs.map((crumb, idx) => (
        <React.Fragment key={crumb.id}>
          <div className="flex items-center gap-1.5">
            <span className="opacity-20 select-none">
              {isRtl ? <ChevronRight className="w-2.5 h-2.5 rotate-180" /> : <ChevronRight className="w-2.5 h-2.5" />}
            </span>
            <Link
              to={selectedProject ? `/project/${selectedProject.id}/page/${crumb.id}` : `/page/${crumb.id}`}
              className={cn(
                "transition-all duration-200 flex items-center gap-1.5",
                idx === breadcrumbs.length - 1 ? "text-brand font-black" : "hover:text-neutral-600 dark:hover:text-neutral-200"
              )}
            >
              {idx === breadcrumbs.length - 1 ? <FileText className="w-3 h-3" /> : <Layers className="w-3 h-3 opacity-40" />}
              {getTranslatedTitle(crumb)}
            </Link>
          </div>
        </React.Fragment>
      ))}
    </nav>
  );
};

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
