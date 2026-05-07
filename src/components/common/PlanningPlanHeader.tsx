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
    <div className="space-y-6 mb-12">
      {/* Heritage Header */}
      <div className="bg-neutral-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
         
         <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
            <div className="space-y-4 max-w-2xl">
               <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-neutral-700 text-[9px] font-black uppercase tracking-[0.2em] rounded-full">
                     {t('master_foundation_data') || 'Master Foundation Data'}
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold">
                     <ShieldCheck className="w-3.5 h-3.5" />
                     {t('synchronized_with_charter') || 'Synchronized with Project Charter'}
                  </div>
               </div>
               
               <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight">
                  {basis?.title || selectedProject?.name}
               </h2>
               
               <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2.5 opacity-80">
                     <User className="w-4 h-4 text-neutral-400" />
                     <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">{t('pm') || 'Project Manager'}</span>
                        <span className="text-xs font-bold">{basis?.manager || 'Not Assigned'}</span>
                     </div>
                  </div>
                  <div className="flex items-center gap-2.5 opacity-80">
                     <Calendar className="w-4 h-4 text-neutral-400" />
                     <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">{t('start_date') || 'Planned Start'}</span>
                        <span className="text-xs font-bold">{basis?.startDate || '---'}</span>
                     </div>
                  </div>
                  <div className="flex items-center gap-2.5 opacity-80">
                     <DollarSign className="w-4 h-4 text-neutral-400" />
                     <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">{t('initial_budget') || 'Initial Budget'}</span>
                        <span className="text-xs font-bold">
                           {basis?.budget?.toLocaleString()} {basis?.currency}
                        </span>
                     </div>
                  </div>
               </div>
            </div>

            <div className="flex flex-col items-end gap-3">
               {/* Version Selector */}
               <div className="flex items-center gap-2 bg-white/5 p-2 rounded-2xl border border-white/10">
                  <div className="flex flex-col items-end pr-3 border-r border-white/10 italic">
                     <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400">{t('current_baseline') || 'Current Baseline'}</span>
                     <span className="text-xs font-black text-neutral-400">V{currentVersion}</span>
                  </div>
                  
                  <div className="relative group">
                     <select 
                       value={currentVersion}
                       onChange={(e) => onVersionChange(e.target.value)}
                       className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer pr-8 appearance-none py-2 pl-4"
                     >
                        {versions.length > 0 ? (
                          versions.map(v => (
                            <option key={v.id} value={v.version} className="text-neutral-900">V{v.version} - {v.userName}</option>
                          ))
                        ) : (
                          <option value="1.0" className="text-neutral-900">V1.0 - Default</option>
                        )}
                     </select>
                     <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                  </div>

                  <button 
                    onClick={onNewVersion}
                    className="w-10 h-10 bg-neutral-700 rounded-xl flex items-center justify-center hover:bg-neutral-600 transition-all active:scale-90"
                    title="Generate New Version"
                  >
                     <Plus className="w-5 h-5" />
                  </button>
               </div>
               
               <p className="text-[9px] font-medium text-slate-500 italic max-w-[200px] text-right">
                  {t('plan_version_desc') || 'Versions are immutable snapshots. Create a new version to apply fundamental planning changes.'}
               </p>
            </div>
         </div>
      </div>

      {/* Description Sync */}
      <div className="flex items-start gap-4 p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50">
         <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
         <div className="space-y-1">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-900">{t('inherited_mission') || 'Inherited Project Mission'}</h4>
            <p className="text-xs text-blue-800/70 font-medium leading-relaxed italic">
               "{basis?.description || 'No mission description available from charter.'}"
            </p>
         </div>
      </div>
    </div>
  );
};
