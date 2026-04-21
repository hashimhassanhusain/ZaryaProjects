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

const QuickViewModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  id: string 
}> = ({ isOpen, onClose, title, id }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                     <FileText className="w-6 h-6" />
                  </div>
                  <div>
                     <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">{id}</p>
                     <h2 className="text-xl font-black text-slate-900">{stripNumericPrefix(title)}</h2>
                  </div>
               </div>
               <button 
                 onClick={onClose}
                 className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
               >
                 <ArrowRight className="w-5 h-5 rotate-180" />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-12 space-y-12">
               {/* Mock Content for Quick View */}
               <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Document Executive Summary</h3>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                    This is a quick-read snapshot of the approved {stripNumericPrefix(title)}. The full interactive tool is available in the respective performance domain. 
                    This view is read-only to maintain the "Single Source of Truth."
                  </p>
               </div>

               <div className="grid grid-cols-2 gap-8">
                  <div className="p-8 bg-slate-50 rounded-[2rem] space-y-4">
                     <h4 className="text-[9px] font-black uppercase text-slate-400">Key Parameters</h4>
                     <div className="space-y-4">
                        {[1,2,3].map(i => (
                          <div key={i} className="flex items-center justify-between border-b border-slate-200 pb-2">
                             <span className="text-xs font-bold text-slate-600">Metric 0{i}</span>
                             <span className="text-xs font-black text-slate-900">Value_{i}</span>
                          </div>
                        ))}
                     </div>
                  </div>
                  <div className="p-8 bg-emerald-50 rounded-[2rem] space-y-4">
                     <h4 className="text-[9px] font-black uppercase text-emerald-600">Approval Status</h4>
                     <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        <div>
                           <p className="text-sm font-black text-emerald-900 leading-none">Digitally Signed</p>
                           <p className="text-[9px] font-bold text-emerald-600/60 uppercase mt-1">By Project Sponsor</p>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reference Details</h3>
                  <div className="h-40 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center justify-center">
                     <p className="text-[10px] font-black uppercase text-slate-300">Detailed snapshot data not yet archived</p>
                  </div>
               </div>
            </div>

            <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
               <p className="text-[10px] font-black text-slate-400 uppercase italic">Archived on: May 12, 2023 • {id}-V2.4</p>
               <button className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                  Open Source Component
                  <ChevronRight className="w-3 h-3" />
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

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
  const [quickView, setQuickView] = useState<{ isOpen: boolean; title: string, id: string }>({ isOpen: false, title: '', id: '' });

  const parentPage = page.parentId ? pages.find(p => p.id === page.parentId) : null;
  const grandParentPage = parentPage?.parentId ? pages.find(p => p.id === parentPage.parentId) : null;

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col print:bg-white print:p-0">
      <QuickViewModal 
        isOpen={quickView.isOpen} 
        onClose={() => setQuickView({ ...quickView, isOpen: false })}
        title={quickView.title}
        id={quickView.id}
      />

      {/* Header / Breadcrumbs (Hide during print) */}
      <div className="bg-white border-b border-slate-100 px-8 py-6 print:hidden">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
               {grandParentPage && (
                 <>
                   <span>{stripNumericPrefix(grandParentPage.title)}</span>
                   <ChevronRight className="w-3 h-3" />
                 </>
               )}
               {parentPage && (
                 <>
                   <span>{stripNumericPrefix(parentPage.title)}</span>
                   <ChevronRight className="w-3 h-3" />
                 </>
               )}
               <span className="text-slate-900">{stripNumericPrefix(page.title)}</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              {stripNumericPrefix(page.title)}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
             <button
               onClick={onPrint}
               className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
             >
               <Printer className="w-4 h-4" />
               Generate PDF
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
               Save & Baseline
             </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-12 gap-8 p-8 print:block print:p-0">
        
        {/* Block A: Input Hub (3 Columns) (Hide during print) */}
        <aside className="col-span-3 space-y-6 print:hidden">
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
                onClick={() => setQuickView({ isOpen: true, title: input.title, id: input.id })}
                className="group p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer relative overflow-hidden active:scale-95"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500/5 group-hover:bg-blue-600 transition-colors" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{input.id}</span>
                  <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                    <Eye className="w-3.5 h-3.5" />
                  </div>
                </div>
                <h4 className="text-xs font-black text-slate-900 leading-tight mb-3">
                  {stripNumericPrefix(input.title)}
                </h4>
                <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg w-fit">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter">Approved & Live</span>
                </div>
              </div>
            ))}
            
            {inputs.length === 0 && (
              <div className="p-8 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100 text-center space-y-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mx-auto text-slate-300">
                   <FileText className="w-5 h-5" />
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">No Automated Inputs Required for this Phase</p>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-900 rounded-[2.5rem] space-y-4 shadow-xl shadow-slate-900/10">
             <div className="flex items-center gap-3 text-rose-400">
                <Clock className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest italic">Live Lifecycle</span>
             </div>
             <div className="space-y-4">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                   <span>Modified</span>
                   <span className="text-white">Just now</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                   <span>FNC Version</span>
                   <span className="bg-rose-600 text-white px-2 py-0.5 rounded-lg text-[9px]">V2.4_PLAN</span>
                </div>
             </div>
          </div>
        </aside>

        {/* Block B: Interactive Workspace (6 Columns) */}
        <section className="col-span-6 space-y-6 print:col-span-12 print:block">
           <div className="bg-white border border-slate-100 rounded-[3rem] p-1 shadow-sm print:border-none print:shadow-none print:p-0">
              <div className="flex items-center bg-slate-50/50 rounded-[2.5rem] p-1.5 mb-4 print:hidden">
                 <button 
                   onClick={() => setActiveBlock('workspace')}
                   className={cn(
                     "flex-1 flex items-center justify-center gap-2 py-3 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all",
                     activeBlock === 'workspace' ? "bg-white text-slate-900 shadow-lg shadow-slate-900/5 scale-[1.02]" : "text-slate-400 hover:text-slate-600"
                   )}
                 >
                   Interactive Toolset
                 </button>
                 <button 
                    onClick={() => setActiveBlock('outputs')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all",
                      activeBlock === 'outputs' ? "bg-white text-slate-900 shadow-lg shadow-slate-900/5 scale-[1.02]" : "text-slate-400 hover:text-slate-600"
                    )}
                 >
                   Document Preview
                 </button>
              </div>
              
              <div className="p-10 print:p-0">
                {activeBlock === 'workspace' ? (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {children}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[600px] text-center space-y-8 animate-in zoom-in-95 duration-500 print:hidden">
                    <div className="w-full max-w-md aspect-[1/1.414] bg-white rounded-3xl border-4 border-slate-50 shadow-2xl flex flex-col relative overflow-hidden group">
                       <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                          <div className="w-6 h-6 bg-slate-900 rounded-lg" />
                          <div className="flex-1 mx-4 h-2 bg-slate-100 rounded-full" />
                          <div className="w-4 h-4 rounded-full bg-slate-200" />
                       </div>
                       <div className="flex-1 p-8 space-y-4">
                          <div className="w-3/4 h-4 bg-slate-50 rounded-lg" />
                          <div className="w-full h-2 bg-slate-50 rounded-full" />
                          <div className="w-full h-2 bg-slate-50 rounded-full" />
                          <div className="w-1/2 h-2 bg-slate-50 rounded-full" />
                          <div className="pt-8 grid grid-cols-2 gap-4">
                             <div className="aspect-video bg-slate-50 rounded-2xl" />
                             <div className="aspect-video bg-slate-50 rounded-2xl" />
                          </div>
                       </div>
                       <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 backdrop-blur-sm transition-all flex flex-col items-center justify-center gap-6">
                          <button onClick={onPrint} className="bg-white text-slate-900 px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-2xl">
                             Open Print Preview
                          </button>
                          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">High Fidelity PDF Engine v2.0</p>
                       </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xl font-black text-slate-900 tracking-tight italic uppercase">Refined Output Artifact</p>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest px-4 py-1.5 bg-slate-50 rounded-full inline-block">
                        Ready for formal sign-off & archiving
                      </p>
                    </div>
                  </div>
                )}

                {/* Print Content (Only visible when printing) */}
                <div className="hidden print:block print:w-full print:mx-auto">
                   <header className="flex items-center justify-between border-b-2 border-slate-900 pb-8 mb-12">
                      <div className="space-y-4">
                         <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-slate-900 rounded-xl" />
                            <div>
                               <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">Zarya</h1>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Construction Management PMIS</p>
                            </div>
                         </div>
                      </div>
                      <div className="text-right space-y-1">
                         <h2 className="text-xl font-black uppercase tracking-tight">{stripNumericPrefix(page.title)}</h2>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project: {selectedProject?.name}</p>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Code: {selectedProject?.code}</p>
                      </div>
                   </header>

                   <main className="space-y-12">
                      <section className="grid grid-cols-2 gap-12 p-8 bg-slate-50 rounded-3xl">
                         <div className="space-y-2">
                            <h4 className="text-[10px] font-black uppercase text-slate-400">Record ID</h4>
                            <p className="text-sm font-black italic">{selectedProject?.code}-{page.id}-V2.4</p>
                         </div>
                         <div className="space-y-2">
                            <h4 className="text-[10px] font-black uppercase text-slate-400">Baseline Date</h4>
                            <p className="text-sm font-black italic">{new Date().toLocaleDateString()}</p>
                         </div>
                      </section>
                      
                      <div className="prose prose-slate max-w-none">
                         {children}
                      </div>

                      <section className="pt-20 mt-20 border-t border-slate-200 grid grid-cols-3 gap-12">
                         <div className="space-y-8">
                            <div className="h-1 bg-slate-900 w-full" />
                            <div>
                               <p className="text-xs font-black uppercase">Prepared By</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Project Planning Engineer</p>
                            </div>
                         </div>
                         <div className="space-y-8">
                            <div className="h-1 bg-slate-900 w-full" />
                            <div>
                               <p className="text-xs font-black uppercase">Reviewed By</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Project Manager</p>
                            </div>
                         </div>
                         <div className="space-y-8">
                            <div className="h-1 bg-slate-900 w-full" />
                            <div>
                               <p className="text-xs font-black uppercase">Approved By</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Project Sponsor (Sign-off)</p>
                            </div>
                         </div>
                      </section>
                   </main>

                   <footer className="mt-20 pt-12 border-t border-slate-100 flex items-center justify-between text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">
                      <span>© {new Date().getFullYear()} Zarya Construction Mgmt. All rights reserved.</span>
                      <span>{selectedProject?.code}-{page.id}-{stripNumericPrefix(page.title).toUpperCase().replace(/\s+/g, '_')}-V2.4-{new Date().toISOString().split('T')[0]}</span>
                   </footer>
                </div>
              </div>
           </div>
        </section>

        {/* Block C: Output Zone (3 Columns) (Hide during print) */}
        <aside className="col-span-3 space-y-8 print:hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
               <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-emerald-500" />
                  Output Zone
               </h3>
               <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-3 py-0.5 rounded-full">Archive Ready</span>
            </div>
            
            <div className="space-y-4">
               {outputs.map((output, idx) => (
                 <div 
                   key={output.id}
                   className="group p-6 bg-white border border-emerald-100 rounded-[2rem] space-y-5 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all border-l-8 border-l-emerald-500"
                 >
                    <div className="flex items-center justify-between">
                       <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                          <Download className="w-5 h-5" />
                       </div>
                       <div className="px-2 py-1 bg-emerald-500 text-white rounded text-[8px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                          {output.status || 'Verified'}
                       </div>
                    </div>
                    <div className="space-y-1">
                       <h4 className="text-xs font-black text-slate-900">{stripNumericPrefix(output.title)}</h4>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{output.id}</p>
                    </div>
                    <button 
                      onClick={onPrint}
                      className="w-full py-3 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-slate-900/10"
                    >
                      Export Final PDF
                    </button>
                 </div>
               ))}

               {outputs.length === 0 && (
                 <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-[2rem] space-y-5">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                          <Printer className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black uppercase text-emerald-600">Compliance Check</p>
                          <p className="text-xs font-black text-slate-900">Output Synchronized</p>
                       </div>
                    </div>
                    <button 
                      onClick={onPrint}
                      className="w-full py-3 bg-emerald-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                    >
                      Rerun Generation
                    </button>
                 </div>
               )}

               <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                     <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                        <History className="w-5 h-5" />
                     </div>
                     <div>
                        <h4 className="text-[10px] font-black text-slate-900 uppercase">Version Log</h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Single Source Integrity</p>
                     </div>
                  </div>
                  <div className="space-y-5">
                     {[1, 2].map(v => (
                       <div key={v} className="flex gap-3 relative">
                          {v === 1 && <div className="absolute left-1.5 top-5 bottom-0 w-0.5 bg-slate-200" />}
                          <div className="w-3 h-3 rounded-full bg-slate-200 mt-1.5 relative z-10 border-2 border-slate-50" />
                          <div className="space-y-1 min-w-0">
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-900">V2.{3-v}</span>
                                <span className="text-[8px] font-bold text-slate-400 capitalize">Aug 23, 2023</span>
                             </div>
                             <p className="text-[10px] font-medium text-slate-500 italic truncate">
                                "{v === 1 ? 'Corrected resource allocation formulas' : 'Initial approved baseline'}"
                             </p>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>

               <div className="p-6 bg-rose-50 border border-rose-100 rounded-[2.5rem] space-y-5 group">
                  <div className="flex items-center gap-3 text-rose-600 group-hover:scale-105 transition-transform duration-300">
                     <AlertCircle className="w-6 h-6 animate-pulse" />
                     <h4 className="text-[10px] font-black uppercase italic tracking-widest">Process Dependency</h4>
                  </div>
                  <p className="text-[10px] font-medium text-rose-700 leading-relaxed">
                    Final signature is blocked. <span className="font-bold underline">Assumption Log (2.1.5)</span> requires verification of the marble lead-time.
                  </p>
                  <button className="w-full py-3 bg-rose-100 text-rose-600 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all">
                    Resolve & Sync
                  </button>
               </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
