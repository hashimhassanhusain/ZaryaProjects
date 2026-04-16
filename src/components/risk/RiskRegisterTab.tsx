import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Download, 
  Save, 
  Loader2, 
  AlertTriangle,
  FileText,
  CheckCircle2,
  Clock,
  X
} from 'lucide-react';
import { RiskEntry, Stakeholder, User as UserType } from '../../types';
import { db, OperationType, handleFirestoreError, auth } from '../../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RiskRegisterTabProps {
  risks: RiskEntry[];
  stakeholders: Stakeholder[];
  users: UserType[];
  projectId: string;
}

export const RiskRegisterTab: React.FC<RiskRegisterTabProps> = ({ risks, stakeholders, users, projectId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingRisk, setEditingRisk] = useState<RiskEntry | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [formData, setFormData] = useState<Partial<RiskEntry>>({
    riskId: '',
    description: '',
    category: 'Technical',
    probability: 3,
    impact: 3,
    score: 9,
    strategy: 'Mitigate',
    ownerId: '',
    status: 'Draft',
    impacts: { scope: 3, quality: 3, schedule: 3, cost: 3 },
    contingencyPlan: '',
    fallbackPlans: '',
    residualRisk: ''
  });

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    toast((t) => (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-bold text-slate-900">Delete {selectedIds.length} risks?</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all">Cancel</button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                const batch = writeBatch(db);
                selectedIds.forEach(id => {
                  batch.delete(doc(db, 'risks', id));
                });
                await batch.commit();
                setSelectedIds([]);
                toast.success('Risks deleted successfully');
              } catch (err) {
                handleFirestoreError(err, OperationType.DELETE, 'risks');
              }
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
          >
            Delete
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRisks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRisks.map(r => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const getScoreColor = (score: number) => {
    if (score >= 15) return 'bg-red-100 text-red-700 border-red-200';
    if (score >= 8) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  const handleAdd = () => {
    setEditingRisk(null);
    const nextNum = risks.length + 1;
    setFormData({
      riskId: `RSK-${nextNum.toString().padStart(3, '0')}`,
      description: '',
      category: 'Technical',
      probability: 3,
      impact: 3,
      score: 9,
      strategy: 'Mitigate',
      ownerId: '',
      status: 'Draft',
      impacts: { scope: 3, quality: 3, schedule: 3, cost: 3 },
      contingencyPlan: '',
      fallbackPlans: '',
      residualRisk: ''
    });
    setView('form');
  };

  const handleEdit = (risk: RiskEntry) => {
    setEditingRisk(risk);
    setFormData(risk);
    setView('form');
  };

  const handleDelete = async (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-bold text-slate-900">Are you sure you want to delete this risk?</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await deleteDoc(doc(db, 'risks', id));
                toast.success('Risk deleted successfully');
              } catch (err) {
                handleFirestoreError(err, OperationType.DELETE, 'risks');
              }
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
          >
            Delete
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  const handleSave = async () => {
    if (!projectId || !formData.description) return;
    setIsSaving(true);
    try {
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      const timestamp = new Date().toISOString();
      
      const riskData = {
        ...formData,
        score: (formData.probability || 0) * (formData.impact || 0),
        projectId,
        updatedAt: timestamp,
        updatedBy: user,
        createdAt: editingRisk?.createdAt || timestamp,
        createdBy: editingRisk?.createdBy || user,
        version: (editingRisk?.version || 1)
      };

      if (editingRisk) {
        await updateDoc(doc(db, 'risks', editingRisk.id), riskData);
      } else {
        await addDoc(collection(db, 'risks'), riskData);
      }
      setView('list');
    } catch (err) {
      handleFirestoreError(err, editingRisk ? OperationType.UPDATE : OperationType.CREATE, 'risks');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;

    // Center Zarya Logo
    doc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RISK REGISTER', pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project ID: ${projectId}`, 15, 45);
    doc.text(`Date Prepared: ${new Date().toLocaleDateString()}`, pageWidth - 15, 45, { align: 'right' });

    autoTable(doc, {
      startY: 55,
      head: [['Risk ID', 'Risk Statement', 'Prob', 'Impact', 'Score', 'Response Strategy', 'Owner', 'Status']],
      body: risks.map(r => [
        r.riskId,
        r.description,
        r.probability,
        r.impact,
        r.score,
        r.strategy,
        users.find(u => u.uid === r.ownerId)?.name || stakeholders.find(s => s.id === r.ownerId)?.name || 'N/A',
        r.status
      ]),
      theme: 'grid',
      headStyles: { fillColor: [0, 82, 136], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        1: { cellWidth: 60 }
      }
    });

    const dateStr = new Date().toISOString().split('T')[0];
    doc.save(`${projectId}-RSK-REG-V1-${dateStr}.pdf`);
  };

  const filteredRisks = risks.filter(r => 
    r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.riskId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (view === 'form') {
    return (
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{editingRisk ? 'Edit Risk' : 'Identify New Risk'}</h3>
          </div>
          <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Risk ID</label>
              <input 
                type="text"
                value={formData.riskId}
                onChange={(e) => setFormData({ ...formData, riskId: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              >
                <option value="Technical">Technical</option>
                <option value="Management">Management</option>
                <option value="Commercial">Commercial</option>
                <option value="External">External</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              >
                <option value="Draft">Draft</option>
                <option value="Active">Active</option>
                <option value="Closed">Closed</option>
                <option value="Occurred">Occurred</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Risk Statement</label>
            <textarea 
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none"
              placeholder="Describe the risk event and its potential impact..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Probability (1-5)</label>
              <input 
                type="number"
                min="1"
                max="5"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Impact (1-5)</label>
              <input 
                type="number"
                min="1"
                max="5"
                value={formData.impact}
                onChange={(e) => setFormData({ ...formData, impact: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              />
            </div>
            <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-slate-100 p-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Risk Score</span>
              <span className={cn(
                "text-2xl font-black px-4 py-1 rounded-lg border",
                getScoreColor((formData.probability || 0) * (formData.impact || 0))
              )}>
                {(formData.probability || 0) * (formData.impact || 0)}
              </span>
            </div>
          </div>

          {/* Detailed Assessment Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
            <div className="space-y-6">
              <h4 className="text-sm font-bold text-slate-900">Response & Contingency</h4>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Response Strategy</label>
                <select 
                  value={formData.strategy}
                  onChange={(e) => setFormData({ ...formData, strategy: e.target.value as any })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                >
                  <option value="Avoid">Avoid</option>
                  <option value="Mitigate">Mitigate</option>
                  <option value="Transfer">Transfer</option>
                  <option value="Accept">Accept</option>
                  <option value="Escalate">Escalate</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Risk Owner (Employee or Stakeholder)</label>
                <select 
                  value={formData.ownerId}
                  onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                >
                  <option value="">Select Owner...</option>
                  <optgroup label="Zarya Employees">
                    {users.map(u => (
                      <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>
                    ))}
                  </optgroup>
                  <optgroup label="Stakeholders">
                    {stakeholders.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contingency Plan</label>
                <textarea 
                  value={formData.contingencyPlan}
                  onChange={(e) => setFormData({ ...formData, contingencyPlan: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none"
                />
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-sm font-bold text-slate-900">Residual & Secondary</h4>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Residual Risk</label>
                <textarea 
                  value={formData.residualRisk}
                  onChange={(e) => setFormData({ ...formData, residualRisk: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none"
                  placeholder="Risk remaining after response implementation..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fallback Plans</label>
                <textarea 
                  value={formData.fallbackPlans}
                  onChange={(e) => setFormData({ ...formData, fallbackPlans: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none"
                  placeholder="Plan B if primary response fails..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-6">
            {formData.id && (
              <button 
                onClick={() => handleDelete(formData.id!)}
                className="px-6 py-2.5 text-rose-600 font-bold text-sm hover:bg-rose-50 rounded-xl transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Risk
              </button>
            )}
            <div className="flex gap-3 ml-auto">
              <button 
                onClick={() => setView('list')}
                className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-8 py-2.5 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {formData.id ? 'Update Risk' : 'Save Risk'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search risks..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold text-sm hover:bg-red-100 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedIds.length})
            </button>
          )}
          <button 
            onClick={generatePDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button 
            onClick={handleAdd}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-200"
          >
            <Plus className="w-5 h-5" />
            Identify Risk
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length === filteredRisks.length && filteredRisks.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Risk Statement</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Score</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Strategy</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Owner</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRisks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <AlertTriangle className="w-12 h-12 text-slate-200 mb-4" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No risks identified yet</p>
                      <p className="text-xs text-slate-400 mt-2">Click "New Risk" to start identifying project risks</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRisks.map((risk) => (
                  <tr 
                    key={risk.id} 
                    className={cn(
                      "hover:bg-slate-50/50 transition-colors group cursor-pointer",
                      selectedIds.includes(risk.id) && "bg-slate-50"
                    )}
                    onClick={() => handleEdit(risk)}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(risk.id)}
                        onChange={() => toggleSelect(risk.id)}
                        className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-1 rounded-md">{risk.riskId}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900 font-bold line-clamp-1">{risk.description}</p>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{risk.category}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "inline-flex items-center justify-center w-9 h-9 rounded-lg border text-xs font-black",
                        getScoreColor(risk.score)
                      )}>
                        {risk.score}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600">{risk.strategy}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600">
                        {users.find(u => u.uid === risk.ownerId)?.name || stakeholders.find(s => s.id === risk.ownerId)?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                        risk.status === 'Closed' ? "bg-emerald-100 text-emerald-700" :
                        risk.status === 'Occurred' ? "bg-red-100 text-red-700" :
                        risk.status === 'Active' ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-700"
                      )}>
                        {risk.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEdit(risk); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(risk.id); }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
