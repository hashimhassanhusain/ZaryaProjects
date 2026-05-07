import React from 'react';
import { LucideIcon, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { HelpTooltip } from './HelpTooltip';
import { useUI } from '../context/UIContext';

export interface RibbonTab {
  id: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  focusArea?: string;
  size?: 'large' | 'small';
}

export interface RibbonGroup {
  id: string;
  label?: string;
  tabs: RibbonTab[];
}

interface RibbonProps {
  groups: RibbonGroup[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  className?: string;
  focusAreaColors?: Record<string, string>;
}

export const Ribbon: React.FC<RibbonProps> = ({ groups, activeTabId, onTabChange, className, focusAreaColors = {} }) => {
  const { t, th } = useLanguage();
  const { isRibbonCollapsed, setIsRibbonCollapsed } = useUI();

  const getFocusColor = (area?: string) => {
    if (!area) return 'bg-neutral-200';
    return focusAreaColors[area] || 'bg-neutral-300';
  };

  return (
    <div className={cn(
      "bg-ribbon border-b border-neutral-200 dark:border-white/10 flex items-stretch gap-6 px-6 overflow-x-auto no-scrollbar shrink-0 transition-all duration-300 z-30 select-none relative",
      isRibbonCollapsed ? "h-[32px]" : "h-[95px]",
      className
    )}>
      {!isRibbonCollapsed && groups.map((group) => {
        return (
          <div key={group.id} className="flex flex-col h-full shrink-0">
            <div className="flex items-center px-1 flex-1 h-[75px]">
              {group.tabs.map((tab) => {
                const isActive = activeTabId === tab.id;
                return (
                  <HelpTooltip 
                    key={tab.id} 
                    title={tab.label}
                    text={tab.description || (t(tab.id + '_summary') !== tab.id + '_summary' && t(tab.id + '_summary') !== 'summary' ? t(tab.id + '_summary') : null)}
                    position="bottom"
                    className="z-[10000]"
                  >
                    <button
                      onClick={() => onTabChange(tab.id)}
                      className={cn(
                        "flex flex-col items-center justify-center min-w-[72px] h-[72px] mt-0.5 px-2 rounded-md transition-all relative",
                        isActive 
                          ? "bg-brand/10 text-brand shadow-[inset_0_0_0_1px_rgba(var(--color-brand),0.1)] dark:bg-white/10 dark:text-brand" 
                          : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white"
                      )}
                    >
                      {tab.focusArea && (
                        <div className={cn("absolute top-2 right-2 w-2 h-2 rounded-full border border-white shadow-sm", getFocusColor(tab.focusArea))} />
                      )}
                      <tab.icon className={cn("w-7 h-7 mb-1", isActive ? "text-brand" : "text-neutral-600 dark:text-neutral-400")} strokeWidth={1.5} />
                      <span className={cn(
                        "text-[10px] font-black leading-tight text-center max-w-[100px] uppercase tracking-tighter transition-colors break-words",
                        isActive ? "text-brand" : "text-neutral-900 group-hover:text-brand"
                      )}>
                        {tab.label}
                      </span>
                    </button>
                  </HelpTooltip>
                );
              })}
            </div>
            {group.label && (
              <div className="text-[10px] font-black text-neutral-900 dark:text-white uppercase tracking-[0.2em] text-center py-0.5 mt-auto bg-neutral-50/50 dark:bg-white/5 rounded-sm">
                {group.label}
              </div>
            )}
          </div>
        );
      })}

      {isRibbonCollapsed && (
         <div className="flex items-center gap-4 h-full">
            {groups.flatMap(g => g.tabs).filter(t => t.id === activeTabId).map(tab => (
              <div key={tab.id} className="flex items-center gap-2 text-brand font-bold text-[10px] uppercase tracking-widest">
                 <tab.icon className="w-4 h-4" />
                 {tab.label}
              </div>
            ))}
         </div>
      )}

      {/* Toggle button */}
      <button 
        onClick={() => setIsRibbonCollapsed(!isRibbonCollapsed)}
        className={cn(
          "absolute right-2 flex items-center justify-center hover:bg-neutral-100 rounded transition-colors z-50 text-neutral-400",
          isRibbonCollapsed ? "bottom-1/2 translate-y-1/2 p-0.5" : "bottom-1 p-1"
        )}
        title={isRibbonCollapsed ? "Expand Ribbon" : "Collapse Ribbon"}
      >
        {isRibbonCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};
