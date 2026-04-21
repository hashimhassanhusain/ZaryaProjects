import React, { useState } from 'react';
import { Page } from '../types';
import { pages } from '../data';
import { cn, stripNumericPrefix } from '../lib/utils';
import { 
  FileText, 
  ArrowRight, 
  Printer, 
  Download, 
  Save, 
  History, 
  ChevronRight, 
  Eye, 
  Settings,
  Info,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../context/ProjectContext';

interface StandardProcessPageProps {
  page: Page;
  inputs?: { id: string; title: string; status?: string }[];
  outputs?: { id: string; title: string; status?: string }[];
  children: React.ReactNode; // The Interactive Workspace
  actions?: React.ReactNode;
  onSave?: () => void;
  onPrint?: () => void;
  onExport?: () => void;
  isSaving?: boolean;
}

export const StandardProcessPage: React.FC<StandardProcessPageProps> = ({ 
  page, 
  inputs = [], 
  outputs = [],
  children,
  actions,
  onSave,
  onPrint,
  onExport,
  isSaving = false
}) => {
  const { selectedProject } = useProject();
  const [activeBlock, setActiveBlock] = useState<'inputs' | 'workspace' | 'outputs'>('workspace');

  const parentPage = page.parentId ? pages.find(p => p.id === page.parentId) : null;

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col">
      {/* Header / Breadcrumbs */}
      <div className="bg-white border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
               <span>{page.domain}</span>
               <ChevronRight className="w-3 h-3" />
               <span className="text-slate-900">{page.focusArea}</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              {parentPage && (
                <>
                  <span className="text-slate-400 font-medium">{stripNumericPrefix(parentPage.title)}</span>
                  <ChevronRight className="w-6 h-6 text-slate-300 stroke-[3]" />
                </>
              )}
              {stripNumericPrefix(page.title)}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
             <button
               onClick={onPrint}
               className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
             >
               <Printer className="w-4 h-4" />
               Print
             </button>
             <button
               onClick={onSave}
               disabled={isSaving}
               className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50"
             >
               {isSaving ? (
                 <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                   <Settings className="w-4 h-4" />
                 </motion.div>
               ) : (
                 <Save className="w-4 h-4" />
               )}
               Save Baseline
             </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-12 gap-8 p-8">
        
        {/* Block A: Input Hub (3 Columns) */}
        <aside className="col-span-3 space-y-6">
          <div className="flex items-center justify-between px-2">
             <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                Input Hub
             </h3>
             <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{inputs.length}</span>
          </div>
          
          <div className="space-y-3">
            {inputs.map((input, idx) => (
              <div 
                key={input.id}
                className="group p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-lg hover:shadow-blue-500/5 transition-all cursor-default relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/10 group-hover:bg-blue-500 transition-colors" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{input.id}</span>
                  <div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                    <Eye className="w-3.5 h-3.5" />
                  </div>
                </div>
                <h4 className="text-sm font-black text-slate-900 leading-tight mb-3">
                  {stripNumericPrefix(input.title)}
                </h4>
                <div className="flex items-center gap-2">
                   <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                   <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">Approved Baseline</span>
                </div>
              </div>
            ))}
            
            {inputs.length === 0 && (
              <div className="p-6 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100 text-center space-y-2">
                <FileText className="w-6 h-6 text-slate-200 mx-auto" />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No Inputs Linked</p>
              </div>
            )}
          </div>

          <div className="p-5 bg-blue-50 border border-blue-100 rounded-[2rem] space-y-3">
             <div className="flex items-center gap-2 text-blue-600">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Process Timeline</span>
             </div>
             <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                   <span>Last Update</span>
                   <span className="text-slate-900">2h ago</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                   <span>Version</span>
                   <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[9px]">v2.4</span>
                </div>
             </div>
          </div>
        </aside>

        {/* Block B: Interactive Workspace (6 Columns) */}
        <section className="col-span-6 space-y-6">
           <div className="bg-white border border-slate-100 rounded-[2.5rem] p-1 shadow-sm">
              <div className="flex items-center bg-slate-50/50 rounded-[2rem] p-1 mb-4">
                 <button 
                   onClick={() => setActiveBlock('workspace')}
                   className={cn(
                     "flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all",
                     activeBlock === 'workspace' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                   )}
                 >
                   Workspace Form
                 </button>
                 <button 
                    onClick={() => setActiveBlock('outputs')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all",
                      activeBlock === 'outputs' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                 >
                   Preview Output
                 </button>
              </div>
              
              <div className="p-8">
                {activeBlock === 'workspace' ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {children}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6 animate-in zoom-in-95 duration-500">
                    <div className="w-full aspect-[1/1.414] bg-slate-50 rounded-3xl border border-slate-200 shadow-inner flex items-center justify-center relative overflow-hidden group">
                       <FileText className="w-16 h-16 text-slate-200 group-hover:scale-110 transition-transform" />
                       <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 backdrop-blur-sm transition-all flex flex-col items-center justify-center gap-4">
                          <button onClick={onPrint} className="bg-white text-slate-900 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">
                             View Full Document
                          </button>
                       </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-900 font-bold">Document v2.4 (Draft)</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Auto-generated for {selectedProject?.code}</p>
                    </div>
                  </div>
                )}
              </div>
           </div>
        </section>

        {/* Block C: Output Zone (3 Columns) */}
        <aside className="col-span-3 space-y-8">
          <div className="space-y-4">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2 px-2">
               <History className="w-4 h-4 text-emerald-500" />
               Output Zone
            </h3>
            
            <div className="space-y-3">
               {outputs.map((output, idx) => (
                 <div 
                   key={output.id}
                   className="group p-5 bg-emerald-50 border border-emerald-100 rounded-3xl space-y-4 hover:shadow-lg hover:shadow-emerald-500/5 transition-all"
                 >
                   <div className="flex items-center justify-between">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                         <Printer className="w-5 h-5" />
                      </div>
                      <div className="px-2 py-1 bg-white rounded-lg text-[8px] font-black uppercase text-emerald-600 border border-emerald-100">
                         {output.status || 'Ready'}
                      </div>
                   </div>
                   <div className="space-y-1">
                      <h4 className="text-sm font-black text-emerald-900">{stripNumericPrefix(output.title)}</h4>
                      <p className="text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest">{output.id}</p>
                   </div>
                   <button 
                     onClick={onPrint}
                     className="w-full py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/10"
                   >
                     RE-RUN PDF
                   </button>
                 </div>
               ))}

               {outputs.length === 0 && (
                 <div className="group p-5 bg-emerald-50 border border-emerald-100 rounded-3xl space-y-4 hover:shadow-lg hover:shadow-emerald-500/5 transition-all">
                  <div className="flex items-center justify-between">
                     <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                        <Printer className="w-5 h-5" />
                     </div>
                     <button 
                       onClick={() => {}}
                       className="text-[9px] font-bold text-emerald-600 bg-white px-3 py-1 rounded-full shadow-sm hover:bg-emerald-600 hover:text-white transition-all"
                     >
                       RE-RUN PDF
                     </button>
                  </div>
                  <div className="space-y-1">
                     <h4 className="text-sm font-black text-emerald-900">{stripNumericPrefix(page.title)}</h4>
                     <p className="text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest">Status: Ready for Review</p>
                  </div>
                 </div>
               )}

               <div className="p-6 bg-white border border-slate-100 rounded-3xl space-y-6">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                        <History className="w-5 h-5" />
                     </div>
                     <div>
                        <h4 className="text-xs font-bold text-slate-900">Version History</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">5 Revisions</p>
                     </div>
                  </div>
                  <div className="space-y-4">
                     {[1, 2].map(v => (
                       <div key={v} className="flex items-start gap-3">
                          <div className="w-0.5 h-10 bg-slate-100 rounded-full mt-1 shrink-0" />
                          <div className="space-y-1 min-w-0">
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-900 uppercase">v2.{3-v}</span>
                                <span className="text-[9px] font-bold text-slate-400">May 12, 2023</span>
                             </div>
                             <p className="text-[10px] font-medium text-slate-500 line-clamp-1 italic">
                                "{v === 1 ? 'Updated budget thresholds' : 'Initial baseline creation'}"
                             </p>
                          </div>
                       </div>
                     ))}
                  </div>
                  <button className="w-full py-3 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all">
                     View All History
                  </button>
               </div>

               <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3 text-rose-600">
                     <AlertCircle className="w-5 h-5" />
                     <h4 className="text-xs font-bold">Process Blockers</h4>
                  </div>
                  <p className="text-[10px] font-medium text-rose-700 leading-relaxed">
                    This process requires <span className="font-bold underline">Stakeholder Register</span> to be updated before final sign-off can be initiated.
                  </p>
                  <button className="w-full py-2 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all">
                    Resolve Dependencies
                  </button>
               </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
