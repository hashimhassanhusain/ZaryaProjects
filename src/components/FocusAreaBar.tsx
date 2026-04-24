import React from 'react';
import { Play, Target, Zap, Activity, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useUI } from '../context/UIContext';
import { useLanguage } from '../context/LanguageContext';
import { FOCUS_AREAS, FocusAreaId } from '../constants/navigation';

export const FocusAreaBar: React.FC = () => {
  const { setSelectedFocusArea, selectedFocusArea } = useUI();
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-1.5 px-6 py-2 bg-white border-b border-slate-100 overflow-x-auto no-scrollbar">
      {FOCUS_AREAS.map(({ id, title, icon: Icon }) => {
        const active = selectedFocusArea === id;
        return (
          <button
            key={id}
            onClick={() => setSelectedFocusArea(id as FocusAreaId)}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-full text-[11px] font-semibold uppercase tracking-widest transition-all shrink-0',
              active
                ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/50'
            )}
          >
            <Icon className={cn("w-3.5 h-3.5", active ? "text-blue-400" : "text-slate-400")} />
            {t(id)}
          </button>
        );
      })}
    </div>
  );
};
