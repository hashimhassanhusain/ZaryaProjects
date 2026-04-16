import React, { useState } from 'react';
import { 
  FileText, 
  Save, 
  Loader2, 
  Download,
  AlertTriangle,
  TrendingUp,
  Shield,
  Clock,
  DollarSign,
  Plus,
  Trash2,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { RiskEntry, Stakeholder } from '../../types';
import { toast } from 'react-hot-toast';
import { db, OperationType, handleFirestoreError, auth } from '../../firebase';
import { updateDoc, doc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RiskDataSheetTabProps {
  risks: RiskEntry[];
  stakeholders: Stakeholder[];
  projectId: string;
}

export const RiskDataSheetTab: React.FC<RiskDataSheetTabProps> = ({ risks, stakeholders, projectId }) => {
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<RiskEntry>>({});

  const selectedRisk = risks.find(r => r.id === selectedRiskId);

  const handleSelect = (risk: RiskEntry) => {
    setSelectedRiskId(risk.id);
    setFormData(risk);
  };

  const updateProjectContingency = async (pId: string) => {
    try {
      const risksSnap = await getDocs(query(collection(db, 'risks'), where('projectId', '==', pId)));
      const totalContingency = risksSnap.docs.reduce((sum, d) => sum + (d.data().contingencyFunds || 0), 0);
      
      const financeRef = doc(db, 'project_finance', pId);
      const financeSnap = await getDocs(query(collection(db, 'project_finance'), where('projectId', '==', pId)));
      
      if (financeSnap.empty) {
        await setDoc(financeRef, {
          projectId: pId,
          contingency: totalContingency,
          updatedAt: new Date().toISOString(),
          updatedBy: auth.currentUser?.displayName || 'System'
        });
      } else {
        await updateDoc(financeRef, {
          contingency: totalContingency,
          updatedAt: new Date().toISOString(),
          updatedBy: auth.currentUser?.displayName || 'System'
        });
      }
    } catch (err) {
      console.error('Failed to update project contingency:', err);
    }
  };

  const handleSave = async () => {
    if (!selectedRiskId || !formData) return;
    setIsSaving(true);
    try {
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      const timestamp = new Date().toISOString();
      
      const revisedScore = (formData.revisedProbability || 0) * (formData.revisedImpact || 0);
      
      await updateDoc(doc(db, 'risks', selectedRiskId), {
        ...formData,
        revisedScore,
        updatedAt: timestamp,
        updatedBy: user
      });

      // Update global project contingency
      await updateProjectContingency(projectId);

      toast.success('Risk Data Sheet updated successfully.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'risks');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = () => {
    if (!selectedRisk) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;

    // Center Zarya Logo
    doc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RISK DATA SHEET', pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Risk ID: ${selectedRisk.riskId}`, 15, 45);
    doc.text(`Date Prepared: ${new Date().toLocaleDateString()}`, pageWidth - 15, 45, { align: 'right' });

    autoTable(doc, {
      startY: 55,
      body: [
        [{ content: 'Risk Description', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, selectedRisk.description],
        [{ content: 'Risk Cause', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, selectedRisk.category],
        [{ content: 'Status', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, selectedRisk.status],
      ],
      theme: 'grid',
      styles: { fontSize: 9 }
    });

    const lastY1 = (doc as any).lastAutoTable.finalY;
    autoTable(doc, {
      startY: lastY1 + 5,
      head: [['Probability', 'Impact', 'Score', 'Responses']],
      body: [[
        selectedRisk.probability,
        selectedRisk.impact,
        selectedRisk.score,
        selectedRisk.responses || 'N/A'
      ]],
      theme: 'grid',
      headStyles: { fillColor: [0, 82, 136] },
      styles: { fontSize: 9 }
    });

    const lastY2 = (doc as any).lastAutoTable.finalY;
    autoTable(doc, {
      startY: lastY2 + 5,
      head: [['Revised Prob', 'Revised Impact', 'Revised Score', 'Responsible Party']],
      body: [[
        selectedRisk.revisedProbability || 'N/A',
        selectedRisk.revisedImpact || 'N/A',
        selectedRisk.revisedScore || 'N/A',
        stakeholders.find(s => s.id === selectedRisk.ownerId)?.name || 'N/A'
      ]],
      theme: 'grid',
      headStyles: { fillColor: [0, 82, 136] },
      styles: { fontSize: 9 }
    });

    const lastY3 = (doc as any).lastAutoTable.finalY;
    autoTable(doc, {
      startY: lastY3 + 5,
      body: [
        [{ content: 'Secondary Risks', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, selectedRisk.secondaryRisks || 'None'],
        [{ content: 'Residual Risk', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, selectedRisk.residualRisk || 'None'],
        [{ content: 'Contingency Plan', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, selectedRisk.contingencyPlan || 'None'],
        [{ content: 'Contingency Funds', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, selectedRisk.contingencyFunds ? `$${selectedRisk.contingencyFunds.toLocaleString()}` : 'None'],
        [{ content: 'Contingency Time', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, selectedRisk.contingencyTime ? `${selectedRisk.contingencyTime} Days` : 'None'],
        [{ content: 'Fallback Plans', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, selectedRisk.fallbackPlans || 'None'],
      ],
      theme: 'grid',
      styles: { fontSize: 9 }
    });

    const dateStr = new Date().toISOString().split('T')[0];
    doc.save(`${projectId}-RSK-${selectedRisk.riskId}-V1-${dateStr}.pdf`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Sidebar List */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Risk Sheets</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {risks.map(risk => (
              <button
                key={risk.id}
                onClick={() => handleSelect(risk)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl border transition-all",
                  selectedRiskId === risk.id 
                    ? "bg-red-600 border-red-600 shadow-lg shadow-red-200" 
                    : "bg-white border-slate-100 hover:border-slate-300"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-md",
                    selectedRiskId === risk.id ? "bg-white/20 text-white" : "bg-red-50 text-red-600"
                  )}>
                    {risk.riskId}
                  </span>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    selectedRiskId === risk.id ? "text-white/60" : "text-slate-400"
                  )}>
                    v{risk.version.toFixed(1)}
                  </span>
                </div>
                <p className={cn(
                  "text-xs font-bold line-clamp-2",
                  selectedRiskId === risk.id ? "text-white" : "text-slate-700"
                )}>
                  {risk.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Form */}
      <div className="lg:col-span-3">
        {!selectedRisk ? (
          <div className="bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 p-20 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Select a risk to view detailed data sheet</p>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedRisk.riskId} Data Sheet</h2>
                  <p className="text-sm text-slate-500 font-medium">Deep-dive assessment and mitigation planning.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={generatePDF}
                  className="p-3 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-10 space-y-10">
              {/* Basic Info (Read Only) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Risk Description</label>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-medium text-slate-700">
                    {selectedRisk.description}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Risk Cause / Category</label>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-medium text-slate-700">
                    {selectedRisk.category}
                  </div>
                </div>
              </div>

              {/* Assessment & Responses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Initial Assessment
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                      <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Prob</div>
                      <div className="text-lg font-black text-slate-900">{selectedRisk.probability}</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                      <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Impact</div>
                      <div className="text-lg font-black text-slate-900">{selectedRisk.impact}</div>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-2xl text-center">
                      <div className="text-[10px] font-black text-white/40 uppercase mb-1">Score</div>
                      <div className="text-lg font-black text-white">{selectedRisk.score}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Planned Responses</label>
                  <textarea 
                    value={formData.responses || ''}
                    onChange={(e) => setFormData({ ...formData, responses: e.target.value })}
                    rows={4}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all outline-none resize-none"
                    placeholder="Detail the mitigation, avoidance, or transfer actions..."
                  />
                </div>
              </div>

              {/* Revised Score (Residual Risk) */}
              <div className="space-y-6">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Residual Risk Assessment (Revised)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Revised Prob</label>
                    <input 
                      type="number"
                      min="1"
                      max="5"
                      value={formData.revisedProbability || ''}
                      onChange={(e) => setFormData({ ...formData, revisedProbability: parseInt(e.target.value) })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Revised Impact</label>
                    <input 
                      type="number"
                      min="1"
                      max="5"
                      value={formData.revisedImpact || ''}
                      onChange={(e) => setFormData({ ...formData, revisedImpact: parseInt(e.target.value) })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all outline-none"
                    />
                  </div>
                  <div className="flex flex-col items-center justify-center bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Residual Score</span>
                    <span className="text-2xl font-black text-emerald-700">
                      {(formData.revisedProbability || 0) * (formData.revisedImpact || 0)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Residual Risk Description</label>
                    <textarea 
                      value={formData.residualRisk || ''}
                      onChange={(e) => setFormData({ ...formData, residualRisk: e.target.value })}
                      rows={2}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Contingency & Fallback */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-rose-600" />
                    Financial Guardrails
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contingency Funds</label>
                      <input 
                        type="number"
                        value={formData.contingencyFunds || ''}
                        onChange={(e) => setFormData({ ...formData, contingencyFunds: parseFloat(e.target.value) })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all outline-none"
                        placeholder="IQD Amount"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contingency Time</label>
                      <input 
                        type="number"
                        value={formData.contingencyTime || ''}
                        onChange={(e) => setFormData({ ...formData, contingencyTime: parseInt(e.target.value) })}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all outline-none"
                        placeholder="Days"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fallback Plans</label>
                  <textarea 
                    value={formData.fallbackPlans || ''}
                    onChange={(e) => setFormData({ ...formData, fallbackPlans: e.target.value })}
                    rows={4}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all outline-none resize-none"
                    placeholder="What to do if the primary response fails..."
                  />
                </div>
              </div>

              {/* Secondary Risks & Comments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secondary Risks</label>
                  <textarea 
                    value={formData.secondaryRisks || ''}
                    onChange={(e) => setFormData({ ...formData, secondaryRisks: e.target.value })}
                    rows={3}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all outline-none resize-none"
                    placeholder="Risks that arise as a direct result of implementing the response..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Comments</label>
                  <textarea 
                    value={formData.comments || ''}
                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                    rows={3}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-10 border-t border-slate-100">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-10 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Data Sheet
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
