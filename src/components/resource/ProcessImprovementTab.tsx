import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Download, 
  Save, 
  X,
  Loader2,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Settings,
  ShieldCheck
} from 'lucide-react';
import { ProcessImprovement } from '../../types';
import { toast } from 'react-hot-toast';
import { db, OperationType, handleFirestoreError } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface ProcessImprovementTabProps {
  projectId: string;
}

export const ProcessImprovementTab: React.FC<ProcessImprovementTabProps> = ({ projectId }) => {
  const [improvements, setImprovements] = useState<ProcessImprovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ProcessImprovement>>({
    workflowName: '',
    currentProcess: '',
    improvedProcess: '',
    justification: '',
    status: 'Pending'
  });

  useEffect(() => {
    const q = query(collection(db, 'process_improvements'), where('projectId', '==', projectId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProcessImprovement));
      setImprovements(data);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'process_improvements'));

    return () => unsubscribe();
  }, [projectId]);

  const handleSave = async () => {
    try {
      const data = { ...formData, projectId, updatedAt: new Date().toISOString() };
      if (editingId) {
        await updateDoc(doc(db, 'process_improvements', editingId), data);
      } else {
        await addDoc(collection(db, 'process_improvements'), data);
      }
      setIsAdding(false);
      setEditingId(null);
      setFormData({ workflowName: '', currentProcess: '', improvedProcess: '', justification: '', status: 'Pending' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'process_improvements');
    }
  };

  const handleApprove = async (improvement: ProcessImprovement) => {
    try {
      await updateDoc(doc(db, 'process_improvements', improvement.id), { status: 'Approved' });
      
      // PMO TRIGGER: Update suggestion for Policies & Procedures
      toast.success(`PMO TRIGGER: Approved improvement for "${improvement.workflowName}" has been flagged for integration into the Policies & Procedures governance hub. A draft update has been suggested to the Project Manager.`);
      
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'process_improvements');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900">Process Improvement Log</h2>
          <p className="text-sm text-slate-500">Workflow optimization for PMO "Gold Standard" scalability.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
        >
          <Plus className="w-4 h-4" />
          Log Improvement
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {improvements.map((imp) => (
          <div key={imp.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
                  imp.status === 'Approved' ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-slate-900 text-white shadow-slate-200"
                )}>
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{imp.workflowName}</h3>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                      imp.status === 'Approved' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {imp.status}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Updated: {new Date(imp.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {imp.status === 'Pending' && (
                  <button
                    onClick={() => handleApprove(imp)}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl text-sm font-bold hover:bg-emerald-100 transition-all"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Approve & Sync
                  </button>
                )}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingId(imp.id);
                      setFormData(imp);
                      setIsAdding(true);
                    }}
                    className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm('Delete improvement?')) await deleteDoc(doc(db, 'process_improvements', imp.id));
                    }}
                    className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-red-600 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" />
                  Current Process
                </div>
                <div className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 text-sm text-slate-600 font-medium leading-relaxed">
                  {imp.currentProcess}
                </div>
              </div>
              <div className="space-y-4">
                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3" />
                  Improved Process
                </div>
                <div className="p-6 bg-emerald-50/50 rounded-[1.5rem] border border-emerald-100 text-sm text-slate-900 font-bold leading-relaxed">
                  {imp.improvedProcess}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Justification & Expected Impact</div>
              <p className="text-sm text-slate-500 font-medium italic">"{imp.justification}"</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900">
                  {editingId ? 'Edit Improvement' : 'Log Process Improvement'}
                </h2>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Workflow Name</label>
                  <input
                    type="text"
                    value={formData.workflowName}
                    onChange={(e) => setFormData({ ...formData, workflowName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all font-bold"
                    placeholder="e.g. Procurement Approval Cycle"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Process</label>
                    <textarea
                      value={formData.currentProcess}
                      onChange={(e) => setFormData({ ...formData, currentProcess: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all min-h-[120px]"
                      placeholder="Describe the current bottleneck or manual step..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Improved Process</label>
                    <textarea
                      value={formData.improvedProcess}
                      onChange={(e) => setFormData({ ...formData, improvedProcess: e.target.value })}
                      className="w-full px-4 py-3 bg-emerald-50/30 border border-emerald-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/5 transition-all min-h-[120px]"
                      placeholder="Describe the optimized workflow..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Justification</label>
                  <textarea
                    value={formData.justification}
                    onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all min-h-[80px]"
                    placeholder="Expected time savings, cost reduction, or quality gain..."
                  />
                </div>
              </div>

              <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  Save Improvement
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
