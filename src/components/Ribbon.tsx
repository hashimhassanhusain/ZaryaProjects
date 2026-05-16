import React, { useRef, useEffect } from 'react';
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
  size?: 'large' | 'small';
}

export interface RibbonGroup {
  id: string;
  label?: string;
  tabs: RibbonTab[];
}

export interface RibbonProps {
  groups: RibbonGroup[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  className?: string;
  isCompactMode?: boolean;
}

export const Ribbon: React.FC<RibbonProps> = ({ groups, activeTabId, onTabChange, className, isCompactMode = false }) => {
  const { t, th } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheelNative = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      
      // If we are scrolling vertically, convert it to horizontal scroll
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
        e.preventDefault();
        const multiplier = 1;
        el.scrollLeft += e.deltaY * multiplier;
      }
    };
    
    el.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', handleWheelNative);
  }, []);

  const getTabColors = (isActive: boolean, index: number) => {
    if (isActive) return "bg-white text-slate-900 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] border-t border-x border-slate-200 z-10 font-bold";
    
    const shades = [
      "bg-slate-200 text-slate-600 hover:bg-slate-50 border-slate-300",
      "bg-slate-300 text-slate-700 hover:bg-slate-100 border-slate-400",
      "bg-slate-100 text-slate-500 hover:bg-white border-slate-200",
      "bg-slate-400 text-slate-800 hover:bg-slate-200 border-slate-500"
    ];
    return `${shades[index % shades.length]} hover:text-slate-900 border-t border-x`;
  };

  return (
    <div 
      ref={scrollRef}
      className={cn(
      "bg-transparent flex items-end gap-1 px-4 lg:px-8 overflow-x-auto no-scrollbar shrink-0 transition-all duration-300 z-40 relative",
      isCompactMode ? "h-[42px]" : "h-[54px]",
      className
    )}>
      {groups.map((group) => {
        return (
          <div key={group.id} className={cn("flex shrink-0 items-end flex-row h-full")}>
            <div className={cn("flex flex-1 items-end gap-1 px-1")}>
              {group.tabs.map((tab, idx) => {
                const isActive = activeTabId === tab.id;
                const fullLabel = tab.label;
                const displayWord = fullLabel.split(/[\s,&]+/)[0] || fullLabel;
                
                if (isCompactMode) {
                  const Icon = tab.icon;
                  return (
                     <div key={tab.id} className="relative flex items-end group shrink-0 h-full" style={{ width: 'min-content' }}>
                       <button
                         onClick={() => onTabChange(tab.id)}
                         className={cn(
                           "flex flex-col items-center justify-center rounded-t-[10px] transition-all duration-300 ease-out z-10 overflow-hidden",
                           "h-[32px] px-4",
                           getTabColors(isActive, idx)
                         )}
                       >
                         {/* Compact visible state */}
                         <div className="flex items-center justify-center transition-all duration-300 pointer-events-none px-1 whitespace-nowrap gap-2">
                           {Icon && <Icon className={cn("w-3.5 h-3.5", isActive ? "text-brand" : "text-slate-400")} />}
                           <span className={cn("text-[10px] lg:text-[11px] font-black uppercase tracking-widest leading-none", isActive ? "text-slate-900" : "")}>
                             {displayWord}
                           </span>
                         </div>
                       </button>
                     </div>
                  );
                }

                const Icon = tab.icon;

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
                        "flex flex-col items-center justify-center min-w-[72px] h-[40px] px-4 rounded-t-[10px] transition-all relative group",
                        getTabColors(isActive, idx)
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {Icon && <Icon className={cn("w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-brand" : "text-slate-400 group-hover:text-slate-600")} />}
                        <span className={cn(
                          "text-[10px] sm:text-xs font-black leading-tight text-center max-w-[120px] uppercase tracking-tighter transition-colors break-words",
                          isActive ? "text-[#ff6d00]" : "group-hover:text-slate-900"
                        )}>
                          {tab.label}
                        </span>
                      </div>
                    </button>
                  </HelpTooltip>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
