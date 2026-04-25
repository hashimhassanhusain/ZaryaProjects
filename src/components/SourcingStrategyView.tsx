import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  ShoppingCart, 
  Download, 
  Save, 
  Target, 
  ShieldCheck, 
  Globe, 
  Truck,
  History,
  FileSearch,
  BadgeCheck,
  TrendingUp,
  DollarSign,
  Gavel,
  CheckCircle2,
  AlertTriangle
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

interface SourcingStrategyViewProps {
  page: Page;
}

export const SourcingStrategyView: React.FC<SourcingStrategyViewProps> = ({ page }) => {
  const { t } = useLanguage();
  const { selectedProject } = useProject();
  const [data, setData] = useState({
    sourcingMethod: 'Direct Hire / In-house',
    procurementApproach: '',
    vendorCriteria: '', // Standard criteria
    contractTypes: [
       { type: 'Fixed Price', pref: 80 },
       { type: 'Cost Plus', pref: 10 },
       { type: 'T&M', pref: 10 }
    ],
    marketAnalysis: '',
    riskMitigation: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [versions, setVersions] = useState<PageVersion[]>([]);

  useEffect(() => {
    if (!selectedProject) return;
    const unsub = onSnapshot(doc(db, 'projects', selectedProject.id), (snap) => {
      if (snap.exists()) {
        const proj = snap.data() as Project;
        if (proj.sourcingStrategyData) setData(proj.sourcingStrategyData as any);
        if (proj.sourcingStrategyHistory) setVersions(proj.sourcingStrategyHistory);
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
        sourcingStrategyData: data,
        sourcingStrategyHistory: [newVersion, ...versions],
        updatedAt: timestamp
      });
      toast.success('Sourcing Strategy Updated Successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update Sourcing Strategy');
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
    doc.text('PROJECT SOURCING STRATEGY', pageWidth / 2, 35, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Project Code: ${selectedProject.code}`, margin, 45);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin, 45, { align: 'right' });

    autoTable(doc, {
      startY: 55,
      head: [['Section', 'Strategic Content']],
      body: [
        ['Sourcing Method', data.sourcingMethod],
        ['Procurement Approach', data.procurementApproach],
        ['Market Analysis', data.marketAnalysis],
        ['Risk Mitigation', data.riskMitigation],
        ['Vendor Selection Criteria', data.vendorCriteria]
      ],
      theme: 'grid',
      headStyles: { fillColor: [48, 48, 48] }
    });

    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    doc.save(`${selectedProject.code}-ZRY-GOV-SRC-V${vStr}.pdf`);
  };

  return (
    <StandardProcessPage
      page={page}
      onSave={handleSave}
      onPrint={generatePDF}
      isSaving={isSaving}
      inputs={[
        { id: '2.1.2', title: 'Master Plan', status: 'Draft' },
        { id: '2.5.1', title: 'Resource Requirements' },
        { id: '1.1.2', title: 'Management Policies' }
      ]}
      outputs={[
        { id: '2.1.13_out', title: 'Sourcing Strategy', status: 'Active' },
        { id: '2.1.13_proc', title: 'Procurement Plan', status: 'Developing' }
      ]}
    >
      <div className="space-y-16">
        {/* Method & Approach Matrix */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100 space-y-8">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white">
                    <Truck className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Main Sourcing Method</h3>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-1">Make vs. Buy Logic</p>
                 </div>
              </div>

              <div className="space-y-4">
                 {['Direct Hire / In-house', 'Outsourced (Subcontract)', 'Hybrid Strategy', 'Leased Assets'].map(method => (
                    <button 
                       key={method}
                       onClick={() => setData({ ...data, sourcingMethod: method })}
                       className={cn(
                          "w-full p-6 rounded-2xl border transition-all text-left flex items-center justify-between group",
                          data.sourcingMethod === method 
                             ? "bg-white border-blue-600 shadow-xl shadow-blue-500/10 ring-4 ring-blue-500/5" 
                             : "bg-white border-slate-200 hover:border-slate-300"
                       )}
                    >
                       <span className={cn("text-sm font-bold", data.sourcingMethod === method ? "text-blue-600" : "text-slate-600")}>
                          {method}
                       </span>
                       {data.sourcingMethod === method && (
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white">
                             <CheckCircle2 className="w-4 h-4" />
                          </div>
                       )}
                    </button>
                 ))}
              </div>
           </div>

           <div className="space-y-6">
              <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
                 <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                       <FileSearch className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-widest">Market Analysis</h4>
                 </div>
                 <textarea 
                    value={data.marketAnalysis}
                    onChange={(e) => setData({ ...data, marketAnalysis: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-orange-500/10"
                    placeholder="Analyze current market conditions and supply availability."
                    rows={4}
                 />
              </div>

              <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full translate-x-32 -translate-y-32 blur-3xl group-hover:bg-blue-500/20 transition-all" />
                 <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-4">
                       <ShieldCheck className="w-6 h-6 text-blue-400" />
                       <h4 className="text-lg font-semibold tracking-tight">Sourcing Risk Mitigation</h4>
                    </div>
                    <textarea 
                       value={data.riskMitigation}
                       onChange={(e) => setData({ ...data, riskMitigation: e.target.value })}
                       className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-blue-500/50"
                       placeholder="Define strategies to handle supply chain disruptions."
                       rows={4}
                    />
                 </div>
              </div>
           </div>
        </section>

        {/* Evaluation Framework */}
        <section className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <BadgeCheck className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Vendor Selection Framework</h3>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-1">Weighted Criteria Matrix</p>
                 </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                 <Gavel className="w-4 h-4 text-slate-400" />
                 Legal Compliance Required
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Selection Logic</label>
                 <textarea 
                    value={data.vendorCriteria}
                    onChange={(e) => setData({ ...data, vendorCriteria: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-6 py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10"
                    placeholder="Enter key selection criteria (e.g., Technical Score, Price, Financial Stability, Track Record)..."
                    rows={6}
                 />
              </div>

              <div className="space-y-6">
                 <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1">Contract Type Preference</h4>
                 <div className="space-y-3">
                    {data.contractTypes.map((ct, idx) => (
                       <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-6">
                          <span className="text-xs font-bold text-slate-900 min-w-[100px]">{ct.type}</span>
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                             <div 
                                className="h-full bg-blue-600 rounded-full transition-all duration-1000" 
                                style={{ width: `${ct.pref}%` }}
                             />
                          </div>
                          <input 
                             type="number"
                             value={ct.pref}
                             onChange={(e) => {
                                const newCT = [...data.contractTypes];
                                newCT[idx].pref = Number(e.target.value);
                                setData({ ...data, contractTypes: newCT });
                             }}
                             className="w-12 bg-white border border-slate-200 rounded-lg text-center text-xs font-semibold p-1 outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                          <span className="text-[10px] font-semibold text-slate-400">%</span>
                       </div>
                    ))}
                 </div>
                 <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <p className="text-[10px] font-bold text-amber-800">Note: Fixed Price is prioritized to minimize financial variance.</p>
                 </div>
              </div>
           </div>
        </section>
      </div>
    </StandardProcessPage>
  );
};
