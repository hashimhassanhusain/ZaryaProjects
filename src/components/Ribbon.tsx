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

  // Helper to chunk small tabs into groups of 3 for vertical stacking
  const chunkSmallTabs = (tabs: RibbonTab[]) => {
    const chunks: RibbonTab[][] = [];
    for (let i = 0; i < tabs.length; i += 3) {
      chunks.push(tabs.slice(i, i + 3));
    }
    return chunks;
  };

  return (
    <div className={cn("bg-slate-50 border-b border-slate-200 flex items-stretch gap-6 px-6 overflow-x-auto no-scrollbar shrink-0 h-[105px] z-30 select-none", className)}>
      {groups.map((group) => {
        const largeTabs = group.tabs.filter(t => t.size === 'large' || !t.size);
        const smallTabs = group.tabs.filter(t => t.size === 'small');
        const smallTabChunks = chunkSmallTabs(smallTabs);

        return (
          <div key={group.id} className="flex flex-col h-full shrink-0">
            <div className="flex items-center px-1 flex-1 h-[85px]">
              {/* Large Icons */}
              {largeTabs.map((tab) => {
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
                        "flex flex-col items-center justify-center min-w-[72px] h-[80px] mt-0.5 px-2 rounded-md transition-all relative",
                        isActive 
                          ? "bg-white/80 text-blue-700 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]" 
                          : "text-slate-600 hover:bg-white/40 hover:text-slate-900"
                      )}
                    >
                      {tab.focusArea && (
                        <div className={cn("absolute top-2 right-2 w-2 h-2 rounded-full border border-white shadow-sm", getFocusColor(tab.focusArea))} />
                      )}
                      <tab.icon className={cn("w-8 h-8 mb-1", isActive ? "text-blue-600" : "text-slate-500 opacity-80")} strokeWidth={1.5} />
                      <span className={cn(
                        "text-[11px] font-medium leading-tight text-center max-w-[64px] line-clamp-2",
                        isActive ? "font-bold" : ""
                      )}>
                        {tab.label}
                      </span>
                    </button>
                  </HelpTooltip>
                );
              })}

              {/* Small Icons stacked vertically */}
              {smallTabChunks.map((chunk, chunkIdx) => (
                <div key={chunkIdx} className="flex flex-col justify-start h-[80px] gap-0.5 px-0.5">
                  {chunk.map((tab) => {
                    const isActive = activeTabId === tab.id;
                    return (
                      <HelpTooltip 
                        key={tab.id} 
                        text={tab.description || th(tab.id + '_summary')}
                        position="right"
                        className="z-[10000]"
                      >
                        <button
                          onClick={() => onTabChange(tab.id)}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1 rounded w-full min-w-[120px] transition-all",
                            isActive 
                              ? "bg-white/80 text-blue-700 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]" 
                              : "text-slate-600 hover:bg-white/40 hover:text-slate-900"
                          )}
                        >
                          <tab.icon className={cn("w-4 h-4", isActive ? "text-blue-600" : "text-slate-500")} strokeWidth={1.5} />
                          <span className={cn("text-[11px] truncate", isActive ? "font-bold" : "")}>{tab.label}</span>
                          {tab.focusArea && (
                            <div className={cn("ml-auto w-2 h-2 rounded-full border border-white shadow-sm", getFocusColor(tab.focusArea))} />
                          )}
                        </button>
                      </HelpTooltip>
                    );
                  })}
                </div>
              ))}
            </div>
            {group.label && (
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center py-1 mt-auto">
                {group.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
