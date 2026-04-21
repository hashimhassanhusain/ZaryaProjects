import React from 'react';
import { FOCUS_AREAS, FocusAreaId } from '../constants/navigation';
import { cn } from '../lib/utils';

interface FocusAreaBarProps {
  selectedFocusArea: FocusAreaId;
  onSelect: (id: FocusAreaId) => void;
}

export const FocusAreaBar: React.FC<FocusAreaBarProps> = ({ selectedFocusArea, onSelect }) => {
  return (
    <div className="flex items-center gap-1 bg-white px-6 py-3 border-b border-slate-100 overflow-x-auto no-scrollbar shadow-sm">
      {FOCUS_AREAS.map((area) => (
        <button
          key={area.id}
          onClick={() => onSelect(area.id)}
          className={cn(
            "flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
            selectedFocusArea === area.id 
              ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" 
              : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          )}
        >
          <area.icon className={cn("w-3.5 h-3.5", selectedFocusArea === area.id ? "text-blue-400" : "text-slate-300")} />
          {area.title}
        </button>
      ))}
    </div>
  );
};
