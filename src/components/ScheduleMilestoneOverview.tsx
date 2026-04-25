import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  Flag, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronRight,
  Target,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { Page, Project } from '../types';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { StandardProcessPage } from './StandardProcessPage';
import { cn, stripNumericPrefix } from '../lib/utils';
import { motion } from 'motion/react';

interface ScheduleMilestoneOverviewProps {
  page: Page;
}

export const ScheduleMilestoneOverview: React.FC<ScheduleMilestoneOverviewProps> = ({ page }) => {
  const { t } = useLanguage();
  const { selectedProject } = useProject();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!selectedProject?.id) return;
    const unsub = onSnapshot(doc(db, 'projects', selectedProject.id), (doc) => {
      if (doc.exists()) setProject({ id: doc.id, ...doc.data() } as Project);
    });
    return () => unsub();
  }, [selectedProject?.id]);

  const charterMilestones = project?.charterData?.milestones 
    ? (Array.isArray(project.charterData.milestones) ? project.charterData.milestones : [])
    : [];

  return (
    <StandardProcessPage
      page={page}
      inputs={[
        { id: '1.1.1', title: 'Project Charter', status: 'Approved' },
        { id: '1.2.1', title: 'Stakeholder Register', status: 'Final' }
      ]}
      outputs={[
        { id: '1.3.1-OUT', title: 'Milestone Baseline Report', status: 'Ready' }
      ]}
    >
      <div className="space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full translate-x-10 -translate-y-10 blur-2xl group-hover:bg-blue-500/20 transition-all" />
            <div className="relative z-10 space-y-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Total Milestones</p>
                <p className="text-4xl font-semibold italic tracking-tighter">{charterMilestones.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Status Alignment</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold text-slate-900 tracking-tight">Matched</span>
                  <div className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded-full">100%</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-8">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400">Finish Date Constraint</p>
                <p className="text-2xl font-semibold text-slate-900 tracking-tight">
                  {charterMilestones.length > 0 
                    ? [...charterMilestones].sort((a: any, b: any) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())[0].dueDate 
                    : 'Not Defined'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Project Charter Milestones
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Read Only from Governance Domain</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">ID</th>
                  <th className="px-8 py-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Description</th>
                  <th className="px-8 py-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400 text-center">Due Date</th>
                  <th className="px-8 py-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400 text-right">Schedule Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {charterMilestones.map((m: any, idx: number) => (
                  <tr key={m.id || idx} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <span className="text-xs font-semibold text-slate-400 uppercase">MS-{idx + 1}</span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-slate-900">{m.description}</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-600">
                        <Clock className="w-3.5 h-3.5" />
                        {m.dueDate}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 text-emerald-500">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Synced</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {charterMilestones.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-200">
                        <AlertCircle className="w-8 h-8" />
                      </div>
                      <p className="text-slate-500 font-medium">No milestones found in Project Charter.</p>
                      <button className="text-[10px] font-semibold uppercase tracking-widest text-blue-600 hover:underline">
                        Navigate to Project Initiation
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="p-8 bg-blue-50/30 border border-blue-50 rounded-[2.5rem] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Governance Alignment Verified</p>
              <p className="text-[10px] text-slate-500 font-medium">All high-level milestones have been imported into the active schedule tracking engine.</p>
            </div>
          </div>
          <button className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-semibold uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2">
            Confirm & Proceed to Planning
            <ChevronRight className="w-4 h-4" />
          </button>
        </section>
      </div>
    </StandardProcessPage>
  );
};
