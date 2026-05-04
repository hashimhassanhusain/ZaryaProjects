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
    if (!area) return 'bg-slate-200';
    return focusAreaColors[area] || 'bg-slate-300';
  };

  return (
    <div className={cn(
      "bg-white border-b border-slate-200 flex items-stretch gap-6 px-6 overflow-x-auto no-scrollbar shrink-0 transition-all duration-300 z-30 select-none relative",
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
                    text={tab.description || th(tab.id + '_summary')}
                    position="bottom"
                    className="z-[10000]"
                  >
                    <button
                      onClick={() => onTabChange(tab.id)}
                      className={cn(
                        "flex flex-col items-center justify-center min-w-[72px] h-[72px] mt-0.5 px-2 rounded-md transition-all relative",
                        isActive 
                          ? "bg-blue-50 text-blue-700 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.1)]" 
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      {tab.focusArea && (
                        <div className={cn("absolute top-2 right-2 w-2 h-2 rounded-full border border-white shadow-sm", getFocusColor(tab.focusArea))} />
                      )}
                      <tab.icon className={cn("w-7 h-7 mb-1", isActive ? "text-blue-600" : "text-slate-400 opacity-80")} strokeWidth={1.5} />
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

      {isRibbonCollapsed && (
         <div className="flex items-center gap-4 h-full">
            {groups.flatMap(g => g.tabs).filter(t => t.id === activeTabId).map(tab => (
              <div key={tab.id} className="flex items-center gap-2 text-blue-600 font-bold text-[10px] uppercase tracking-widest">
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
          "absolute right-2 flex items-center justify-center hover:bg-slate-100 rounded transition-colors z-50 text-slate-400",
          isRibbonCollapsed ? "bottom-1/2 translate-y-1/2 p-0.5" : "bottom-1 p-1"
        )}
        title={isRibbonCollapsed ? "Expand Ribbon" : "Collapse Ribbon"}
      >
        {isRibbonCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};
