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
  const { t, th } = useLanguage();

  const getFocusColor = (area?: string) => {
    if (!area) return 'bg-slate-200';
    return focusAreaColors[area] || 'bg-slate-300';
  };

  const chunkSmallTabs = (tabs: RibbonTab[]) => {
    const chunks: RibbonTab[][] = [];
    for (let i = 0; i < tabs.length; i += 3) {
      chunks.push(tabs.slice(i, i + 3));
    }
    return chunks;
  };

  return (
    <div className={cn("bg-white border-b border-slate-200 flex items-stretch gap-0 px-1 overflow-x-auto no-scrollbar shrink-0 h-[100px] z-30 select-none", className)}>
      {groups.map((group, groupIdx) => {
        const largeTabs = group.tabs.filter(t => t.size === 'large' || !t.size);
        const smallTabs = group.tabs.filter(t => t.size === 'small');
        const smallTabChunks = chunkSmallTabs(smallTabs);

        return (
          <div key={group.id} className={cn(
            "flex flex-col h-full shrink-0 border-r border-slate-100 last:border-r-0",
            groupIdx === 0 ? "bg-slate-50/50" : ""
          )}>
            <div className="flex items-center px-1.5 flex-1 h-[78px] gap-0.5">
              {/* Large Icons */}
              {largeTabs.map((tab) => {
                const isActive = activeTabId === tab.id;
                return (
                  <HelpTooltip 
                    key={tab.id} 
                    text={tab.description || th(tab.id + '_summary')}
                    position="bottom"
                  >
                    <button
                      onClick={() => onTabChange(tab.id)}
                      className={cn(
                        "flex flex-col items-center justify-center min-w-[68px] h-[72px] mt-0.5 px-2 rounded-lg transition-all relative group",
                        isActive 
                          ? "bg-blue-50/80 text-blue-700 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.1)]" 
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      {tab.focusArea && (
                        <div className={cn("absolute top-1 right-1 w-2 h-2 rounded-full border-2 border-white shadow-sm", getFocusColor(tab.focusArea))} />
                      )}
                      <tab.icon className={cn("w-7 h-7 mb-0.5 transition-transform group-hover:scale-110", isActive ? "text-blue-600" : "text-slate-400")} strokeWidth={1.25} />
                      <span className={cn(
                        "text-[10px] font-semibold leading-tight text-center max-w-[60px] line-clamp-2",
                        isActive ? "text-blue-700" : "text-slate-500"
                      )}>
                        {tab.label}
                      </span>
                    </button>
                  </HelpTooltip>
                );
              })}

              {/* Small Icons stacked vertically */}
              {smallTabChunks.map((chunk, chunkIdx) => (
                <div key={chunkIdx} className="flex flex-col justify-center h-[72px] py-1 gap-0.5 px-0.5">
                  {chunk.map((tab) => {
                    const isActive = activeTabId === tab.id;
                    return (
                      <HelpTooltip 
                        key={tab.id} 
                        text={tab.description || th(tab.id + '_summary')}
                        position="bottom"
                      >
                        <button
                          onClick={() => onTabChange(tab.id)}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded-md min-w-[130px] transition-all group",
                            isActive 
                              ? "bg-blue-50/80 text-blue-700 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.1)]" 
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          )}
                        >
                          <tab.icon className={cn("w-3.5 h-3.5 transition-transform group-hover:scale-110", isActive ? "text-blue-600" : "text-slate-400")} strokeWidth={1.5} />
                          <span className={cn("text-[9px] font-semibold truncate", isActive ? "text-blue-700" : "text-slate-500")}>{tab.label}</span>
                          {tab.focusArea && (
                            <div className={cn("ml-auto w-1.5 h-1.5 rounded-full", getFocusColor(tab.focusArea))} />
                          )}
                        </button>
                      </HelpTooltip>
                    );
                  })}
                </div>
              ))}
            </div>
            {group.label && (
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center py-1 mt-auto bg-slate-50/30 border-t border-slate-50">
                {group.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
