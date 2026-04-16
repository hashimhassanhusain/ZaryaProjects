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
  Trophy,
  Target,
  Users,
  CheckCircle2,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import { 
  SelectionCriterion, 
  VendorEvaluation, 
  Vendor 
} from '../../types';
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
  doc,
  setDoc
} from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface SelectionCriteriaTabProps {
  projectId: string;
}

export const SelectionCriteriaTab: React.FC<SelectionCriteriaTabProps> = ({ projectId }) => {
  const [criteria, setCriteria] = useState<SelectionCriterion[]>([]);
  const [evaluations, setEvaluations] = useState<VendorEvaluation[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingCriterion, setIsAddingCriterion] = useState(false);
  const [isAddingEvaluation, setIsAddingEvaluation] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States
  const [criterionForm, setCriterionForm] = useState<Partial<SelectionCriterion>>({
    criterion: '',
    weight: 0,
    description: ''
  });

  const [evaluationForm, setEvaluationForm] = useState<Partial<VendorEvaluation>>({
    vendorId: '',
    vendorName: '',
    criteriaScores: [],
    totalScore: 0,
    comments: ''
  });

  useEffect(() => {
    const critQ = query(collection(db, 'selection_criteria'), where('projectId', '==', projectId));
    const unsubscribeCrit = onSnapshot(critQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SelectionCriterion));
      setCriteria(data);
    });

    const evalQ = query(collection(db, 'vendor_evaluations'), where('projectId', '==', projectId));
    const unsubscribeEval = onSnapshot(evalQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VendorEvaluation));
      setEvaluations(data);
      setLoading(false);
    });

    const vendorQ = query(collection(db, 'vendors'), where('projectId', '==', projectId));
    const unsubscribeVendor = onSnapshot(vendorQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor));
      setVendors(data);
    });

    return () => {
      unsubscribeCrit();
      unsubscribeEval();
      unsubscribeVendor();
    };
  }, [projectId]);

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

  const handleSaveCriterion = async () => {
    if (totalWeight + (criterionForm.weight || 0) - (editingId ? (criteria.find(c => c.id === editingId)?.weight || 0) : 0) > 100) {
      toast.error('Total weight cannot exceed 100%');
      return;
    }
    try {
      const data = { ...criterionForm, projectId };
      if (editingId) {
        await updateDoc(doc(db, 'selection_criteria', editingId), data);
      } else {
        await addDoc(collection(db, 'selection_criteria'), data);
      }
      setIsAddingCriterion(false);
      setEditingId(null);
      setCriterionForm({ criterion: '', weight: 0, description: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'selection_criteria');
    }
  };

  const handleSaveEvaluation = async () => {
    try {
      const vendor = vendors.find(v => v.id === evaluationForm.vendorId);
      const data = { 
        ...evaluationForm, 
        projectId, 
        vendorName: vendor?.name || '',
        updatedAt: new Date().toISOString() 
      };
      if (editingId) {
        await updateDoc(doc(db, 'vendor_evaluations', editingId), data);
      } else {
        await addDoc(collection(db, 'vendor_evaluations'), data);
      }
      setIsAddingEvaluation(false);
      setEditingId(null);
      setEvaluationForm({ vendorId: '', vendorName: '', criteriaScores: [], totalScore: 0, comments: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'vendor_evaluations');
    }
  };

  const calculateScore = (criterionId: string, rating: number) => {
    const criterion = criteria.find(c => c.id === criterionId);
    if (!criterion) return 0;
    return (criterion.weight / 100) * rating;
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const date = new Date().toLocaleDateString();
    
    doc.setFontSize(20);
    doc.text('VENDOR SELECTION CRITERIA & SCORING', 148, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Project: ${projectId} | Date: ${date}`, 148, 30, { align: 'center' });

    const headers = ['Vendor', ...criteria.map(c => `${c.criterion} (${c.weight}%)`), 'Total Score'];
    const body = evaluations.map(ev => [
      ev.vendorName,
      ...criteria.map(c => {
        const score = ev.criteriaScores.find(s => s.criterionId === c.id);
        return score ? `${score.rating} (${score.score.toFixed(2)})` : '-';
      }),
      ev.totalScore.toFixed(2)
    ]);

    (doc as any).autoTable({
      startY: 40,
      head: [headers],
      body: body,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillStyle: [15, 23, 42], textColor: [255, 255, 255] }
    });

    doc.save(`${projectId}-RES-SEL-V1-${date.replace(/\//g, '-')}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Criteria Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900">Selection Criteria</h2>
            <p className="text-sm text-slate-500">Define weighted criteria for vendor evaluation.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={cn(
              "px-6 py-3 rounded-2xl border flex items-center gap-3 transition-all",
              totalWeight === 100 ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-amber-50 border-amber-200 text-amber-600"
            )}>
              <Target className="w-5 h-5" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest">Total Weight</span>
                <span className="text-lg font-black">{totalWeight}%</span>
              </div>
              {totalWeight !== 100 && <AlertTriangle className="w-5 h-5 animate-pulse" />}
            </div>
            <button
              onClick={() => setIsAddingCriterion(true)}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              <Plus className="w-4 h-4" />
              Add Criterion
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {criteria.map((crit) => (
            <div key={crit.id} className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm group relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingId(crit.id);
                      setCriterionForm(crit);
                      setIsAddingCriterion(true);
                    }}
                    className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600 transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm('Delete criterion?')) await deleteDoc(doc(db, 'selection_criteria', crit.id));
                    }}
                    className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-red-600 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-1">{crit.criterion}</h3>
              <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Weight: {crit.weight}%</div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">{crit.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Evaluations Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900">Vendor Evaluations</h2>
            <p className="text-sm text-slate-500">Multi-step evaluation and candidate scoring.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export Landscape PDF
            </button>
            <button
              onClick={() => setIsAddingEvaluation(true)}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              <Plus className="w-4 h-4" />
              New Evaluation
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor</th>
                {criteria.map(c => (
                  <th key={c.id} className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                    {c.criterion}
                  </th>
                ))}
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Score</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {evaluations.map((ev) => (
                <tr key={ev.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="font-bold text-slate-900">{ev.vendorName}</div>
                    </div>
                  </td>
                  {criteria.map(c => {
                    const score = ev.criteriaScores.find(s => s.criterionId === c.id);
                    return (
                      <td key={c.id} className="px-4 py-5 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-black text-slate-900">{score?.rating || '-'}</span>
                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                            Score: {score?.score.toFixed(2) || '0.00'}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-8 py-5 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-xl font-black text-slate-900">{ev.totalScore.toFixed(2)}</span>
                      <div className="flex items-center gap-1 text-[8px] font-black text-emerald-600 uppercase tracking-widest">
                        <Trophy className="w-2 h-2" />
                        Final Rank
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingId(ev.id);
                          setEvaluationForm(ev);
                          setIsAddingEvaluation(true);
                        }}
                        className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 transition-all shadow-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm('Delete evaluation?')) await deleteDoc(doc(db, 'vendor_evaluations', ev.id));
                        }}
                        className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-red-600 transition-all shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Criterion Modal */}
      <AnimatePresence>
        {isAddingCriterion && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900">
                  {editingId ? 'Edit Criterion' : 'Add New Criterion'}
                </h2>
                <button onClick={() => setIsAddingCriterion(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Criterion Name</label>
                  <input
                    type="text"
                    value={criterionForm.criterion}
                    onChange={(e) => setCriterionForm({ ...criterionForm, criterion: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all font-bold"
                    placeholder="e.g. Technical Expertise"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Weight (%)</label>
                  <input
                    type="number"
                    value={criterionForm.weight}
                    onChange={(e) => setCriterionForm({ ...criterionForm, weight: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                  <textarea
                    value={criterionForm.description}
                    onChange={(e) => setCriterionForm({ ...criterionForm, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all min-h-[100px]"
                    placeholder="What does this criterion measure?"
                  />
                </div>
              </div>

              <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsAddingCriterion(false)}
                  className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCriterion}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  Save Criterion
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Evaluation Modal */}
      <AnimatePresence>
        {isAddingEvaluation && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden"
            >
              <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900">
                  {editingId ? 'Edit Evaluation' : 'New Vendor Evaluation'}
                </h2>
                <button onClick={() => setIsAddingEvaluation(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Vendor</label>
                  <select
                    value={evaluationForm.vendorId}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, vendorId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all font-bold"
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Criteria Scoring (Rating 1-10)</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {criteria.map((crit) => {
                      const scoreObj = evaluationForm.criteriaScores?.find(s => s.criterionId === crit.id);
                      return (
                        <div key={crit.id} className="flex items-center gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex-1">
                            <div className="font-bold text-slate-900">{crit.criterion}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Weight: {crit.weight}%</div>
                          </div>
                          <div className="flex items-center gap-4">
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={scoreObj?.rating || 0}
                              onChange={(e) => {
                                const rating = Number(e.target.value);
                                const score = (crit.weight / 100) * rating;
                                const otherScores = evaluationForm.criteriaScores?.filter(s => s.criterionId !== crit.id) || [];
                                const newScores = [...otherScores, { criterionId: crit.id, rating, score }];
                                const total = newScores.reduce((sum, s) => sum + s.score, 0);
                                setEvaluationForm({ ...evaluationForm, criteriaScores: newScores, totalScore: total });
                              }}
                              className="w-20 px-4 py-2 bg-white border border-slate-200 rounded-xl text-center font-black text-slate-900"
                            />
                            <div className="w-24 text-right">
                              <div className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Score</div>
                              <div className="text-sm font-black text-blue-600">{scoreObj?.score.toFixed(2) || '0.00'}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-6 bg-slate-900 rounded-[2rem] flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-blue-400" />
                    <span className="text-lg font-black">Aggregate Score</span>
                  </div>
                  <div className="text-3xl font-black">
                    {evaluationForm.totalScore?.toFixed(2) || '0.00'}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Comments</label>
                  <textarea
                    value={evaluationForm.comments}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, comments: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all min-h-[100px]"
                    placeholder="Justification for ratings..."
                  />
                </div>
              </div>

              <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsAddingEvaluation(false)}
                  className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEvaluation}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  Save Evaluation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
