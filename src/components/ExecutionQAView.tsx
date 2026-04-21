import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  Play, 
  Download, 
  Save, 
  Target, 
  ShieldCheck, 
  Settings,
  History,
  CheckSquare,
  ClipboardList,
  AlertCircle,
  MessageSquare,
  Zap,
  Plus,
  Trash2,
  GitBranch,
  Search,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { Page, Project, PageVersion } from '../types';
import { db, auth } from '../firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { toast } from 'react-hot-toast';
import { StandardProcessPage } from './StandardProcessPage';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '../lib/utils';

interface ExecutionQAViewProps {
  page: Page;
}

interface Decision {
  id: string;
  date: string;
  title: string;
  impactOnPlan: string;
  status: 'Open' | 'Resolved' | 'Escalated';
}

interface AuditItem {
  id: string;
  check: string;
  status: 'Pass' | 'Fail' | 'N/A';
  notes: string;
}

export const ExecutionQAView: React.FC<ExecutionQAViewProps> = ({ page }) => {
  const { t } = useLanguage();
  const { selectedProject } = useProject();
  const [data, setData] = useState({
    decisions: [
       { id: '1', date: new Date().toISOString().split('T')[0], title: 'Resource allocation shift', impactOnPlan: 'Schedule push by 2 days', status: 'Resolved' }
    ] as Decision[],
    auditItems: [
       { id: '1', check: 'Governance Compliance', status: 'Pass', notes: 'All approvals in place' },
       { id: '2', check: 'Process Consistency', status: 'Pass', notes: 'Weekly syncs maintained' },
       { id: '3', check: 'Documentation Traceability', status: 'Pass', notes: '' },
       { id: '4', check: 'Stakeholder Communication', status: 'Pass', notes: '' }
    ] as AuditItem[],
    qaExecutiveSummary: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [versions, setVersions] = useState<PageVersion[]>([]);

  useEffect(() => {
    if (!selectedProject) return;
    const unsub = onSnapshot(doc(db, 'projects', selectedProject.id), (snap) => {
      if (snap.exists()) {
        const proj = snap.data() as Project;
        if (proj.executionQAData) setData(proj.executionQAData as any);
        if (proj.executionQAHistory) setVersions(proj.executionQAHistory);
      }
    });
    return () => unsub();
  }, [selectedProject?.id]);

  const handleSave = async () => {
    if (!selectedProject) return;
    setIsSaving(true);
    try {
      const user = auth.currentUser?.displayName || 'System';
      const timestamp = new Date().toISOString();
      const nextVersion = (versions[0]?.version || 1.0) + 0.1;
      
      const newVersion: PageVersion = {
        version: Number(nextVersion.toFixed(1)),
        date: timestamp,
        author: user,
        data: data as any
      };

      await updateDoc(doc(db, 'projects', selectedProject.id), {
        executionQAData: data,
        executionQAHistory: [newVersion, ...versions],
        updatedAt: timestamp
      });
      toast.success('Execution QA Data Updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update execution data');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;

    doc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PROJECT EXECUTION & QA HUB', pageWidth / 2, 35, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Project Code: ${selectedProject.code}`, margin, 45);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, 45, { align: 'right' });

    doc.text('Decision Log:', margin, 55);
    autoTable(doc, {
      startY: 60,
      head: [['Date', 'Title', 'Impact on Plan', 'Status']],
      body: data.decisions.map(d => [d.date, d.title, d.impactOnPlan, d.status]),
      theme: 'grid',
      headStyles: { fillColor: [48, 48, 48] }
    });

    doc.text('Quality Audit Checklist:', margin, (doc as any).lastAutoTable.finalY + 10);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Audit Check', 'Status', 'Notes']],
      body: data.auditItems.map(i => [i.check, i.status, i.notes]),
      theme: 'grid',
      headStyles: { fillColor: [48, 48, 48] }
    });

    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    doc.save(`${selectedProject.code}-ZRY-GOV-QA-V${vStr}.pdf`);
  };

  const addDecision = () => {
    setData({
      ...data,
      decisions: [...data.decisions, { id: Date.now().toString(), date: new Date().toISOString().split('T')[0], title: '', impactOnPlan: '', status: 'Open' }]
    });
  };

  return (
    <StandardProcessPage
      page={page}
      onSave={handleSave}
      onPrint={generatePDF}
      isSaving={isSaving}
      inputs={[
        { id: '2.1.2', title: 'Master Plan', status: 'Approved' },
        { id: '2.1.1', title: 'Governance Guidelines' },
        { id: 'work-directives', title: 'Work Directives' }
      ]}
      outputs={[
        { id: 'qa-reports', title: 'QA Audit Reports', status: 'Weekly' },
        { id: 'decisions', title: 'Decision Log', status: 'Updated' }
      ]}
    >
      <div className="space-y-16">
        {/* Decision Hub */}
        <section className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                    <Zap className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Governance Decision Log</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Impact-Focused State Management</p>
                 </div>
              </div>
              <button 
                 onClick={addDecision}
                 className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 flex items-center gap-2"
              >
                 <Plus className="w-4 h-4" />
                 Log Decision
              </button>
           </div>

           <div className="overflow-x-auto rounded-3xl border border-slate-100">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-slate-50">
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100">Decision Details</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100">Strategic Impact</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100">Status</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 w-20"></th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {data.decisions.map((d, idx) => (
                       <tr key={d.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-6">
                             <div className="space-y-2">
                                <input 
                                   className="text-sm font-black text-slate-900 bg-transparent outline-none w-full border-b border-transparent focus:border-blue-600 transition-all"
                                   value={d.title}
                                   placeholder="Decision title..."
                                   onChange={(e) => {
                                      const newD = [...data.decisions];
                                      newD[idx].title = e.target.value;
                                      setData({ ...data, decisions: newD });
                                   }}
                                />
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                                   <Calendar className="w-3 h-3" />
                                   <input 
                                      type="date"
                                      className="bg-transparent outline-none"
                                      value={d.date}
                                      onChange={(e) => {
                                         const newD = [...data.decisions];
                                         newD[idx].date = e.target.value;
                                         setData({ ...data, decisions: newD });
                                      }}
                                   />
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-6">
                             <div className="bg-white border border-slate-100 rounded-xl p-3 flex items-start gap-3">
                                <GitBranch className="w-4 h-4 text-blue-500 mt-0.5" />
                                <textarea 
                                   className="text-xs font-medium text-slate-600 bg-transparent outline-none w-full resize-none"
                                   value={d.impactOnPlan}
                                   placeholder="Detail the impact on the Master Plan..."
                                   rows={2}
                                   onChange={(e) => {
                                      const newD = [...data.decisions];
                                      newD[idx].impactOnPlan = e.target.value;
                                      setData({ ...data, decisions: newD });
                                   }}
                                />
                             </div>
                          </td>
                          <td className="px-6 py-6">
                             <select 
                                className={cn(
                                   "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                                   d.status === 'Open' ? "bg-amber-50 border-amber-200 text-amber-600" :
                                   d.status === 'Resolved' ? "bg-emerald-50 border-emerald-200 text-emerald-600" :
                                   "bg-red-50 border-red-200 text-red-600"
                                )}
                                value={d.status}
                                onChange={(e) => {
                                   const newD = [...data.decisions];
                                   newD[idx].status = e.target.value as any;
                                   setData({ ...data, decisions: newD });
                                }}
                             >
                                <option value="Open">Open</option>
                                <option value="Resolved">Resolved</option>
                                <option value="Escalated">Escalated</option>
                             </select>
                          </td>
                          <td className="px-6 py-6 opacity-0 group-hover:opacity-100 transition-all">
                             <button 
                                onClick={() => {
                                   setData({ ...data, decisions: data.decisions.filter(doc => doc.id !== d.id) });
                                }}
                                className="p-2 text-slate-300 hover:text-red-500"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </section>

        {/* Quality Audit Checklist */}
        <section className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100">
           <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white">
                 <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                 <h3 className="text-xl font-black text-slate-900 tracking-tight">Execution Quality Audit</h3>
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Consistency & Compliance Verification</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.auditItems.map((item, idx) => (
                 <div key={item.id} className="bg-white rounded-3xl p-6 border border-slate-200 flex flex-col gap-4 shadow-sm hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between">
                       <span className="text-sm font-black text-slate-900 tracking-tight">{item.check}</span>
                       <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                          {['Pass', 'Fail', 'N/A'].map(s => (
                             <button 
                                key={s}
                                onClick={() => {
                                   const newAudit = [...data.auditItems];
                                   newAudit[idx].status = s as any;
                                   setData({ ...data, auditItems: newAudit });
                                }}
                                className={cn(
                                   "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                   item.status === s 
                                      ? s === 'Pass' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" :
                                        s === 'Fail' ? "bg-red-600 text-white shadow-lg shadow-red-600/20" :
                                        "bg-slate-400 text-white shadow-lg shadow-slate-600/20"
                                      : "text-slate-400 hover:text-slate-600"
                                )}
                             >
                                {s}
                             </button>
                          ))}
                       </div>
                    </div>
                    <div className="flex gap-3">
                       <div className="w-1 rounded-full bg-slate-100" />
                       <input 
                          className="flex-1 bg-transparent text-xs font-medium text-slate-500 outline-none placeholder:text-slate-300"
                          placeholder="Add observation or evidence..."
                          value={item.notes}
                          onChange={(e) => {
                             const newAudit = [...data.auditItems];
                             newAudit[idx].notes = e.target.value;
                             setData({ ...data, auditItems: newAudit });
                          }}
                       />
                    </div>
                 </div>
              ))}
           </div>

           <div className="mt-10 p-6 bg-blue-600 rounded-3xl text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <History className="w-6 h-6" />
                 </div>
                 <div>
                    <h4 className="font-black text-lg tracking-tight leading-none">Last Audit: {versions[0]?.date ? new Date(versions[0].date).toLocaleDateString() : 'N/A'}</h4>
                    <p className="text-xs text-blue-200 mt-1">Audit Score: { (data.auditItems.filter(i => i.status === 'Pass').length / data.auditItems.length * 100).toFixed(0)}% Compliance</p>
                 </div>
              </div>
              <button 
                 onClick={handleSave}
                 className="px-8 py-3 bg-white text-blue-600 rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl shadow-blue-900/30"
              >
                 Authorize Update
              </button>
           </div>
        </section>
      </div>
    </StandardProcessPage>
  );
};
