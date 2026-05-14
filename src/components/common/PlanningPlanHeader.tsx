import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { useLanguage } from '../../context/LanguageContext';
import { getProjectMasterBasis, ProjectMasterBasis } from '../../services/planningService';
import { 
  ShieldCheck, 
  User, 
  Calendar, 
  DollarSign, 
  Info,
  Loader2,
  ChevronDown,
  Plus
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface PlanningPlanHeaderProps {
  currentVersion: string;
  onVersionChange: (versionId: string) => void;
  onNewVersion: () => void;
  versions: { id: string; version: string; timestamp: string; userName: string }[];
}

export const PlanningPlanHeader: React.FC<PlanningPlanHeaderProps> = ({ 
  currentVersion, 
  onVersionChange, 
  onNewVersion,
  versions 
}) => {
  const { selectedProject } = useProject();
  const { t, isRtl } = useLanguage();
  const [basis, setBasis] = useState<ProjectMasterBasis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedProject) {
      getProjectMasterBasis(selectedProject.id).then(data => {
        setBasis(data);
        setLoading(false);
      });
    }
  }, [selectedProject]);

  if (loading) return (
    <div className="flex items-center justify-center p-8 bg-slate-50 rounded-3xl animate-pulse">
       <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4 mb-6">
      {/* Heritage Header */}
      <div className="bg-neutral-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl">
         <div className="absolute top-0 right-0 w-48 h-48 bg-slate-500/5 rounded-full blur-3xl -mr-24 -mt-24" />
         
         <div className="flex flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-6 flex-1 min-w-0">
               <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                     <span className="px-2 py-0.5 bg-neutral-700 text-[8px] font-black uppercase tracking-widest rounded-full shrink-0">
                        {t('master_foundation_data') || 'Master Data'}
                     </span>
                     <div className="flex items-center gap-1.5 text-emerald-400 text-[9px] font-bold shrink-0">
                        <ShieldCheck className="w-3 h-3" />
                        {t('synchronized_with_charter') || 'Sync'}
                     </div>
                  </div>
                  <h2 className="text-xl font-black italic uppercase tracking-tight truncate">
                     {basis?.title || selectedProject?.name}
                  </h2>
               </div>
               
               <div className="hidden md:flex flex-wrap gap-4 border-l border-white/10 pl-6">
                  <div className="flex items-center gap-2 opacity-80 shrink-0">
                     <User className="w-3.5 h-3.5 text-neutral-400" />
                     <div className="flex flex-col">
                        <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">PM</span>
                        <span className="text-[10px] font-bold">{basis?.manager || 'Not Assigned'}</span>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-80 shrink-0">
                     <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                     <div className="flex flex-col">
                        <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">START</span>
                        <span className="text-[10px] font-bold">{basis?.startDate || '---'}</span>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-80 shrink-0">
                     <DollarSign className="w-3.5 h-3.5 text-neutral-400" />
                     <div className="flex flex-col">
                        <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">BUDGET</span>
                        <span className="text-[10px] font-bold">
                           {basis?.budget?.toLocaleString()} {basis?.currency}
                        </span>
                     </div>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
               {/* Version Selector */}
               <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-xl border border-white/10">
                  <div className="flex flex-col items-end pr-2 border-r border-white/10 italic">
                     <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">V{currentVersion}</span>
                  </div>
                  
                  <div className="relative group">
                     <select 
                       value={currentVersion}
                       onChange={(e) => onVersionChange(e.target.value)}
                       className="bg-transparent text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer pr-6 appearance-none py-1 pl-2"
                     >
                        {versions.length > 0 ? (
                          versions.map(v => (
                            <option key={v.id} value={v.version} className="text-neutral-900">V{v.version}</option>
                          ))
                        ) : (
                          <option value="1.0" className="text-neutral-900">V1.0</option>
                        )}
                     </select>
                     <ChevronDown className="w-3 h-3 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                  </div>

                  <button 
                    onClick={onNewVersion}
                    className="w-7 h-7 bg-neutral-700 rounded-lg flex items-center justify-center hover:bg-neutral-600 transition-all active:scale-90"
                    title="Generate New Version"
                  >
                     <Plus className="w-4 h-4" />
                  </button>
               </div>
            </div>
         </div>
      </div>

      {/* Description Sync - Compact */}
      <div className="flex items-center gap-3 px-4 py-2 bg-blue-50/50 rounded-xl border border-blue-100/50">
         <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
         <p className="text-[10px] text-blue-800/70 font-medium leading-none italic truncate">
            {basis?.description || 'No mission description available from charter.'}
         </p>
      </div>
    </div>
  );
};
