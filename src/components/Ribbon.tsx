import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { HelpTooltip } from './HelpTooltip';

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
  const { t, th, isHelpRtl } = useLanguage();

  const getFocusColor = (area?: string) => {
    if (!area) return 'bg-slate-200';
    return focusAreaColors[area] || 'bg-slate-300';
  };

  return (
    <div className={cn("bg-slate-50 border-b border-slate-200 flex items-stretch gap-6 px-6 overflow-x-auto no-scrollbar shrink-0 h-[95px] z-30 select-none", className)}>
      {groups.map((group) => {
        return (
          <div key={group.id} className="flex flex-col h-full shrink-0">
            <div className="flex items-center px-1 flex-1 h-[75px]">
              {group.tabs.map((tab) => {
                const isActive = activeTabId === tab.id;
                return (
                  <HelpTooltip 
                    key={tab.id} 
                    text={tab.description || th(tab.id + '_summary')}
                    position="bottom"
                    className="z-[10000]"
                  >
                    <button
                      onClick={() => onTabChange(tab.id)}
                      className={cn(
                        "flex flex-col items-center justify-center min-w-[72px] h-[72px] mt-0.5 px-2 rounded-md transition-all relative",
                        isActive 
                          ? "bg-white/80 text-blue-700 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]" 
                          : "text-slate-600 hover:bg-white/40 hover:text-slate-900"
                      )}
                    >
                      {tab.focusArea && (
                        <div className={cn("absolute top-2 right-2 w-2 h-2 rounded-full border border-white shadow-sm", getFocusColor(tab.focusArea))} />
                      )}
                      <tab.icon className={cn("w-7 h-7 mb-1", isActive ? "text-blue-600" : "text-slate-500 opacity-80")} strokeWidth={1.5} />
                      <span className={cn(
                        "text-[10px] font-medium leading-tight text-center max-w-[64px] line-clamp-2",
                        isActive ? "font-bold" : ""
                      )}>
                        {tab.label}
                      </span>
                    </button>
                  </HelpTooltip>
                );
              })}
            </div>
            {group.label && (
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center py-0.5 mt-auto">
                {group.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
