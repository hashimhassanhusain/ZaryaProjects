import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
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
  
  const parentPage = page.parentId ? pages.find(p => p.id === page.parentId) : null;
  const grandParentPage = parentPage?.parentId ? pages.find(p => p.id === parentPage.parentId) : null;

  const displayTitle = t(page.id) === page.id ? page.title : t(page.id);
  const parentTitle = parentPage ? (t(parentPage.id) === parentPage.id ? parentPage.title : t(parentPage.id)) : '';
  const grandParentTitle = grandParentPage ? (t(grandParentPage.id) === grandParentPage.id ? grandParentPage.title : t(grandParentPage.id)) : '';

  return (
    <div className={cn("bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm relative z-20", className)}>
      <div className="flex flex-col">
        <div className={cn("flex items-center gap-2 text-[10px] font-black text-slate-400 font-mono tracking-tighter uppercase mb-1", isRtl && "flex-row-reverse")}>
          {grandParentPage && (
            <>
              <span className="truncate max-w-[120px]">{stripNumericPrefix(grandParentTitle)}</span>
              <ChevronRight className={cn("w-3 h-3 text-slate-300 stroke-[3]", isRtl && "rotate-180")} />
            </>
          )}
          {parentPage && (
            <>
              <span className="truncate max-w-[150px]">{stripNumericPrefix(parentTitle)}</span>
              <ChevronRight className={cn("w-3 h-3 text-slate-300 stroke-[3]", isRtl && "rotate-180")} />
            </>
          )}
        </div>
        
        <div className={cn("flex items-center gap-3", isRtl && "flex-row-reverse")}>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter italic uppercase drop-shadow-sm">
            {stripNumericPrefix(displayTitle)}
            {activeTabLabel && activeTabLabel !== stripNumericPrefix(displayTitle) && (
              <span className="text-slate-400 font-medium ml-3 not-italic normal-case text-lg tracking-normal">
                / {activeTabLabel}
              </span>
            )}
          </h1>
          {page.focusArea && (
            <div className="px-3 py-1 bg-slate-900 text-white text-[8px] font-black rounded-lg uppercase tracking-widest shadow-xl shadow-slate-200">
               {stripNumericPrefix(t(page.focusArea))}
            </div>
          )}
        </div>
      </div>
      
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
};
