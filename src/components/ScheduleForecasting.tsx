import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  TrendingUp, 
  Calendar, 
  ArrowRight, 
  Clock, 
  Download, 
  Printer,
  History,
  Target,
  BarChart,
  ShieldCheck,
  Zap,
  LayoutGrid,
  ChevronRight
} from 'lucide-react';
import { Page, Project, PageVersion } from '../types';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { StandardProcessPage } from './StandardProcessPage';
import { ProjectScheduleView } from './ProjectScheduleView';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ScheduleForecastingProps {
  page: Page;
}

export const ScheduleForecasting: React.FC<ScheduleForecastingProps> = ({ page }) => {
  const { t } = useLanguage();
  const { selectedProject } = useProject();
  const [project, setProject] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject?.id) return;
    const unsub = onSnapshot(doc(db, 'projects', selectedProject.id), (doc) => {
      if (doc.exists()) setProject({ id: doc.id, ...doc.data() } as Project);
    });
    return () => unsub();
  }, [selectedProject?.id]);

  const forecastData = project?.scheduleForecastingData || {
    originalFinish: '2026-10-01',
    predictedFinish: '2026-11-15',
    delayReason: 'Material supply chain constraints',
    mitigationPlan: 'Authorized air freight for critical structural components.',
    confidenceScore: 85
  };

  const handleSave = async () => {
    if (!project) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'projects', project.id), { scheduleForecastingData: forecastData }, { merge: true });
      toast.success('Forecast updated');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${project.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(22);
    doc.text('SCHEDULE FORECAST REPORT', 20, 20);
    doc.setFontSize(10);
    doc.text(`Project Code: ${selectedProject?.code}`, 20, 30);
    doc.text(`Run Date: ${new Date().toLocaleDateString()}`, 20, 35);

    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Value']],
      body: [
        ['Original Baseline Finish', forecastData.originalFinish],
        ['Current Predicted Finish', forecastData.predictedFinish],
        ['Variance (Days)', '45 Days Lag'],
        ['Performance Trend', 'Slipping'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138] }
    });

    const finalY = ((doc as any).lastAutoTable?.finalY ?? 150) || 150;

    doc.setFontSize(14);
    doc.text('Root Cause of Variance', 20, finalY + 15);
    doc.setFontSize(10);
    doc.text(forecastData.delayReason, 20, finalY + 25);

    doc.setFontSize(14);
    doc.text('Mitigation Strategy', 20, finalY + 45);
    doc.setFontSize(10);
    doc.text(forecastData.mitigationPlan, 20, finalY + 55);

    doc.save(`${selectedProject?.code}-Schedule-Forecast.pdf`);
  };

  const [showGantt, setShowGantt] = useState(false);

  return (
    <StandardProcessPage
      page={page}
      inputs={[
        { id: '4.5.1', title: 'Schedule Progress', status: 'Live' },
        { id: '2.3.3', title: 'Schedule Baseline', status: 'Approved' }
      ]}
      outputs={[
        { id: '4.5.2-OUT', title: 'Schedule Update Report', status: 'Draft' }
      ]}
      onSave={handleSave}
      isSaving={isSaving}
    >
      <div className="space-y-8 pb-20">
        {/* Domain Tool: Gantt Chart Accordion */}
        <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
          <button 
            onClick={() => setShowGantt(!showGantt)}
            className="w-full px-8 py-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/10">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest">Gantt Chart Tool</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Interactive Forecasting Visualization</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                {showGantt ? 'Hide Tool' : 'Launch Tool'}
              </span>
              <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform", showGantt && "rotate-90")} />
            </div>
          </button>
          
          <AnimatePresence>
            {showGantt && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: '600px', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-slate-100 overflow-hidden"
              >
                <ProjectScheduleView page={page} hideHeader={true} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <header className="flex items-center justify-between">
           <div className="space-y-1">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 text-xl font-semibold italic">
                    F
                 </div>
                 <h2 className="text-2xl font-semibold text-slate-900 tracking-tight leading-none italic">Schedule Forecasting</h2>
              </div>
              <p className="text-sm text-slate-500 font-medium ml-13">Predicting future completions based on current execution pace.</p>
           </div>
           
           <button 
             onClick={generatePDF}
             className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-semibold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
           >
              <Printer className="w-4 h-4" />
              Generate Periodic Update
           </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {/* Forecast Summary */}
           <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />
              
              <div className="relative z-10 space-y-10">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400">
                       <TrendingUp className="w-5 h-5" />
                    </div>
                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Finish Date Projection</h3>
                 </div>

                 <div className="flex items-center gap-12">
                    <div className="space-y-1">
                       <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Baseline Finish</p>
                       <p className="text-2xl font-semibold italic italic tracking-tighter text-slate-400 line-through decoration-rose-500/50">{forecastData.originalFinish}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                       <ArrowRight className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400">Predicted Finish</p>
                       <p className="text-4xl font-semibold italic tracking-tighter text-white">{forecastData.predictedFinish}</p>
                    </div>
                 </div>

                 <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Forecasting Confidence</p>
                    <div className="flex items-center gap-4">
                       <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${forecastData.confidenceScore}%` }} />
                       </div>
                       <span className="text-xl font-semibold italic">{forecastData.confidenceScore}%</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* Trend analysis */}
           <div className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm space-y-8">
              <div className="flex items-center justify-between">
                 <h3 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                    <BarChart className="w-4 h-4 text-indigo-500" />
                    Trend Analysis
                 </h3>
                 <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[9px] font-semibold uppercase italic">Declining Performance</span>
              </div>

              <div className="space-y-6">
                 <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl group hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm transition-transform group-hover:scale-110">
                          <History className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">SPI (Current)</p>
                          <p className="text-xl font-semibold text-slate-900 italic">0.82</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-500">Behind Schedule</p>
                       <p className="text-[9px] font-bold text-slate-400">Target: 1.0</p>
                    </div>
                 </div>

                 <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl group hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm transition-transform group-hover:scale-110">
                          <Target className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Critical Path Hit Rate</p>
                          <p className="text-xl font-semibold text-slate-900 italic">65%</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-semibold uppercase tracking-widest text-orange-500">Warning</p>
                       <p className="text-[9px] font-bold text-slate-400">Target: {'>'}90%</p>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* Narrative Section */}
        <section className="bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm space-y-8">
           <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h3 className="text-lg font-semibold text-slate-900 tracking-tight leading-none">Forecasting Narrative</h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-3">
                 <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 ml-1">Delay Root Cause Analysis</label>
                 <textarea 
                   value={forecastData.delayReason}
                   onChange={(e) => setProject(p => p ? { ...p, scheduleForecastingData: { ...forecastData, delayReason: e.target.value } } : null)}
                   rows={4}
                   className="w-full bg-slate-50 border-none rounded-3xl p-6 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700"
                   placeholder="Describe why the project is deviating from baseline..."
                 />
              </div>
              <div className="space-y-3">
                 <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 ml-1">Mitigation & Recovery Plan</label>
                 <textarea 
                   value={forecastData.mitigationPlan}
                   onChange={(e) => setProject(p => p ? { ...p, scheduleForecastingData: { ...forecastData, mitigationPlan: e.target.value } } : null)}
                   rows={4}
                   className="w-full bg-slate-50 border-none rounded-3xl p-6 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-700"
                   placeholder="Describe what actions are being taken to recover time..."
                 />
              </div>
           </div>
        </section>

        <section className="p-8 bg-blue-50 border border-blue-100 rounded-[3rem] flex items-center justify-between">
           <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-200 transition-transform hover:rotate-12">
                 <Zap className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                 <h4 className="text-lg font-semibold italic tracking-tighter">Forecast Lock State</h4>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">This prediction becomes the temporary target for daily cadence monitoring.</p>
              </div>
           </div>
           
           <button 
             onClick={handleSave}
             className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-semibold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
           >
              Update Project Outlook
           </button>
        </section>
      </div>
    </StandardProcessPage>
  );
};
