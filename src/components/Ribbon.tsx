import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export interface RibbonTab {
  id: string;
  label: string;
  icon: LucideIcon;
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
}

export const Ribbon: React.FC<RibbonProps> = ({ groups, activeTabId, onTabChange, className }) => {
  return (
    <div className={cn("bg-slate-50 border-b border-slate-200 flex items-stretch overflow-x-auto no-scrollbar shrink-0 shadow-inner min-h-[96px]", className)}>
      {groups.map((group, groupIdx) => (
        <div key={group.id} className="flex flex-col border-r border-slate-200 last:border-r-0 bg-white/40">
          <div className="flex items-center gap-1 p-1.5 px-2 flex-1">
            {group.tabs.map((tab) => {
              const isActive = activeTabId === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "relative flex flex-col items-center justify-center min-w-[84px] h-[76px] px-2 rounded-xl transition-all group",
                    isActive 
                      ? "bg-white text-blue-600 shadow-md ring-1 ring-slate-200/50" 
                      : "text-slate-500 hover:bg-white/60 hover:text-slate-900"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl transition-all duration-300 group-hover:scale-110 group-active:scale-95",
                    isActive ? "bg-blue-50 text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                  )}>
                    <tab.icon className={cn("w-6 h-6", isActive ? "stroke-[2.5]" : "stroke-[1.5]")} />
                  </div>
                  <span className={cn(
                    "text-[10px] font-semibold mt-1 uppercase tracking-tighter text-center leading-none whitespace-nowrap",
                    isActive ? "text-blue-700 font-semibold" : "text-slate-400 group-hover:text-slate-600"
                  )}>
                    {tab.label}
                  </span>
                  
                  {isActive && (
                    <motion.div 
                      layoutId="ribbonActiveIndicator"
                      className="absolute bottom-1 w-6 h-1 bg-blue-600 rounded-full"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
          {group.label && (
            <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-[0.25em] text-center pb-1.5 bg-slate-50/50 border-t border-slate-100 italic">
              {group.label}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
