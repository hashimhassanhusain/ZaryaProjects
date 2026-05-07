import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useProject } from '../context/ProjectContext';
import { Page } from '../types';
import { pages } from '../data';
import { cn, stripNumericPrefix } from '../lib/utils';

interface BreadcrumbHeaderProps {
  page: Page;
  activeTabLabel?: string;
  className?: string;
  actions?: React.ReactNode;
}

export const BreadcrumbHeader: React.FC<BreadcrumbHeaderProps> = ({ 
  page, 
  activeTabLabel, 
  className,
  actions
}) => {
  const { t, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  
  const parentPage = page.parentId ? pages.find(p => p.id === page.parentId) : null;
  const grandParentPage = parentPage?.parentId ? pages.find(p => p.id === parentPage.parentId) : null;

  const displayTitle = (page.title && !t(page.id).includes(page.title)) ? page.title : (t(page.id) === page.id ? page.title : t(page.id));
  const parentTitle = parentPage ? (t(parentPage.id) === parentPage.id ? parentPage.title : t(parentPage.id)) : '';
  const grandParentTitle = grandParentPage ? (t(grandParentPage.id) === grandParentPage.id ? grandParentPage.title : t(grandParentPage.id)) : '';
  const focusArea = page.focusArea ? stripNumericPrefix(t(page.focusArea)) : null;

  return (
    <div className={cn("bg-white dark:bg-surface border-b border-slate-100 dark:border-white/5 px-6 py-4 flex flex-col gap-2 shadow-sm relative z-20", className)}>
        {/* Dynamic Breadcrumb Trail */}
        <nav className={cn("flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none", isRtl && "flex-row-reverse")}>
          <Link to="/" className="hover:text-brand transition-colors">HQ</Link>
          <ChevronRight className={cn("w-2.5 h-2.5 opacity-30", isRtl && "rotate-180")} />
          
          {focusArea && (
            <>
              <span className="opacity-60">{focusArea}</span>
              <ChevronRight className={cn("w-2.5 h-2.5 opacity-30", isRtl && "rotate-180")} />
            </>
          )}
          {grandParentPage && (
            <>
              <Link 
                to={selectedProject ? `/project/${selectedProject.id}/page/${grandParentPage.id}` : `/page/${grandParentPage.id}`}
                className="hover:text-brand transition-colors"
              >
                {stripNumericPrefix(grandParentTitle)}
              </Link>
              <ChevronRight className={cn("w-2.5 h-2.5 opacity-30", isRtl && "rotate-180")} />
            </>
          )}

          {parentPage && (
            <>
              <Link 
                to={selectedProject ? `/project/${selectedProject.id}/page/${parentPage.id}` : `/page/${parentPage.id}`}
                className="hover:text-brand transition-colors"
              >
                {stripNumericPrefix(parentTitle)}
              </Link>
              <ChevronRight className={cn("w-2.5 h-2.5 opacity-30", isRtl && "rotate-180")} />
            </>
          )}

          <span className="text-brand">{stripNumericPrefix(displayTitle)}</span>
        </nav>

        <div className="flex items-center justify-between">
          <div className={cn("flex items-center gap-3", isRtl && "flex-row-reverse")}>
            <h1 className="text-xl md:text-2xl font-black text-neutral-900 dark:text-white tracking-tighter italic uppercase drop-shadow-sm flex items-center gap-2">
              {parentPage && (
                <span className="text-slate-400 font-medium inline-flex items-center gap-2">
                   {stripNumericPrefix(parentTitle)}
                   <ChevronRight className="w-4 h-4 opacity-50" />
                </span>
              )}
              {stripNumericPrefix(displayTitle)}
              {activeTabLabel && activeTabLabel !== stripNumericPrefix(displayTitle) && (
                <span className="text-slate-400 font-medium ml-3 not-italic normal-case text-lg tracking-normal">
                  / {activeTabLabel}
                </span>
              )}
            </h1>
            {page.focusArea && (
              <div className="px-3 py-1 bg-neutral-900 text-white text-[8px] font-black rounded-lg uppercase tracking-widest shadow-xl shadow-neutral-200">
                {stripNumericPrefix(t(page.focusArea))}
              </div>
            )}
          </div>
          
          {actions && (
            <div className="flex items-center gap-3">
              {actions}
            </div>
          )}
        </div>
    </div>
  );
};
