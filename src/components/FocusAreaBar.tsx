import React from 'react';
import { Play, Target, Zap, Activity, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFocusArea, FocusArea } from '../context/FocusAreaContext';

const FOCUS_AREAS: { id: FocusArea; label: string; icon: React.ElementType }[] = [
  { id: 'Initiating',               label: 'Initiating',               icon: Play       },
  { id: 'Planning',                 label: 'Planning',                 icon: Target     },
  { id: 'Executing',                label: 'Executing',                icon: Zap        },
  { id: 'Monitoring & Controlling', label: 'Monitoring & Controlling', icon: Activity   },
  { id: 'Closing',                  label: 'Closing',                  icon: CheckCircle },
];

export const FocusAreaBar: React.FC = () => {
  const { activeFocusArea, setActiveFocusArea } = useFocusArea();

  return (
    <div className="flex items-center gap-1.5 px-4 py-2 bg-white border-b border-slate-100">
      {FOCUS_AREAS.map(({ id, label, icon: Icon }) => {
        const active = activeFocusArea === id;
        return (
          <button
            key={id}
            onClick={() => setActiveFocusArea(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all',
              active
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
};
