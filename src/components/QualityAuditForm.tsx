import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { 
  ShieldCheck, 
  Calendar, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  FileText, 
  Send, 
  RefreshCw,
  Sparkles,
  ArrowRight,
  Check,
  X,
  Paperclip,
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import { QualityAudit, QualityDeficiency, User as UserType, Stakeholder } from '../types';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { cn } from '../lib/utils';

interface QualityAuditFormProps {
  audit?: QualityAudit;
  isEditing: boolean;
  onSave: (data: Partial<QualityAudit>) => void;
}

export const QualityAuditForm: React.FC<QualityAuditFormProps> = ({ audit, isEditing, onSave }) => {
  const { selectedProject } = useProject();
  const [formData, setFormData] = useState<Partial<QualityAudit>>(audit || {
    title: '',
    preparationDate: new Date().toISOString().split('T')[0],
    auditDate: new Date().toISOString().split('T')[0],
    scope: {
      processes: false,
      requirements: false,
      changes: false,
      plan: false
    },
    findings: {
      goodPractices: '',
      areasForImprovement: ''
    },
    deficiencies: [],
    complianceRate: 100
  });

  const [users, setUsers] = useState<UserType[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string>>({});
  const [showAiSuggestion, setShowAiSuggestion] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProject) return;
    
    const uUnsubscribe = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserType)));
    });

    const sUnsubscribe = onSnapshot(
      query(collection(db, 'stakeholders'), where('projectId', '==', selectedProject.id)),
      (snap) => {
        setStakeholders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Stakeholder)));
      }
    );

    return () => {
      uUnsubscribe();
      sUnsubscribe();
    };
  }, [selectedProject]);

  const handleScopeChange = (key: keyof QualityAudit['scope']) => {
    setFormData(prev => ({
      ...prev,
      scope: {
        ...prev.scope!,
        [key]: !prev.scope![key]
      }
    }));
  };

  const addDeficiency = () => {
    const newDef: QualityDeficiency = {
      id: `QA-${String((formData.deficiencies?.length || 0) + 1).padStart(3, '0')}`,
      defect: '',
      action: '',
      responsiblePartyId: '',
      dueDate: '',
      status: 'Open'
    };
    setFormData(prev => ({
      ...prev,
      deficiencies: [...(prev.deficiencies || []), newDef]
    }));
  };

  const updateDeficiency = (index: number, field: keyof QualityDeficiency, value: any) => {
    const newDefs = [...(formData.deficiencies || [])];
    newDefs[index] = { ...newDefs[index], [field]: value };
    setFormData(prev => ({ ...prev, deficiencies: newDefs }));
    
    // Recalculate compliance rate
    const openDefs = newDefs.filter(d => d.status === 'Open').length;
    const rate = Math.max(0, 100 - (openDefs * 10));
    setFormData(prev => ({ ...prev, complianceRate: rate }));
  };

  const removeDeficiency = (index: number) => {
    const newDefs = formData.deficiencies?.filter((_, i) => i !== index) || [];
    setFormData(prev => ({ ...prev, deficiencies: newDefs }));
  };

  const handleTransferToLessonsLearned = async () => {
    if (!formData.findings?.goodPractices || !selectedProject) return;
    
    try {
      await addDoc(collection(db, 'lessons_learned'), {
        projectId: selectedProject.id,
        category: 'Quality',
        lesson: formData.findings.goodPractices,
        recommendation: 'Continue following this practice in future phases.',
        impact: 'Positive',
        createdAt: serverTimestamp()
      });
      toast.success('Successfully transferred to Lessons Learned!');
    } catch (error) {
      console.error('Error transferring to lessons learned:', error);
    }
  };

  const handleGenerateCR = async (deficiency: QualityDeficiency) => {
    if (!selectedProject) return;
    
    try {
      await addDoc(collection(db, 'change_requests'), {
        projectId: selectedProject.id,
        title: `Corrective Action: ${deficiency.defect}`,
        description: `Quality Audit Deficiency: ${deficiency.defect}\nRequired Action: ${deficiency.action}`,
        reason: 'Quality Audit Finding',
        priority: 'High',
        status: 'Pending',
        createdAt: serverTimestamp()
      });
      
      // Update deficiency status
      const index = formData.deficiencies?.findIndex(d => d.id === deficiency.id);
      if (index !== undefined && index !== -1) {
        updateDeficiency(index, 'status', 'Converted to CR');
      }
      
      toast.success('Change Request generated successfully!');
    } catch (error) {
      console.error('Error generating CR:', error);
    }
  };

  const getAiSuggestion = (field: string) => {
    // Mock AI logic based on project data
    const suggestions: Record<string, string> = {
      'findings.goodPractices': 'The team consistently uses the standardized concrete testing protocol, resulting in zero variance in strength reports.',
      'findings.areasForImprovement': 'Documentation of material delivery inspections is sometimes delayed. Recommend implementing a real-time mobile check-in.',
      'deficiencies.0.defect': 'Concrete slump test results for Block B foundations were not documented for the 14th April pour.',
      'deficiencies.0.action': 'Retrieve manual logs and digitize them immediately. Conduct a refresher on real-time logging.'
    };
    return suggestions[field];
  };

  const applyAiSuggestion = (field: string) => {
    const suggestion = getAiSuggestion(field);
    if (!suggestion) return;

    if (field.startsWith('findings.')) {
      const key = field.split('.')[1] as keyof QualityAudit['findings'];
      setFormData(prev => ({
        ...prev,
        findings: {
          ...prev.findings!,
          [key]: suggestion
        }
      }));
    } else if (field.startsWith('deficiencies.')) {
      const parts = field.split('.');
      const index = parseInt(parts[1]);
      const key = parts[2] as keyof QualityDeficiency;
      updateDeficiency(index, key, suggestion);
    }
    setShowAiSuggestion(null);
  };

  const AISuggestionBox = ({ field }: { field: string }) => {
    const suggestion = getAiSuggestion(field);
    if (!suggestion || formData.findings?.[field.split('.')[1] as keyof QualityAudit['findings']]) return null;

    return (
      <div className="relative">
        <button 
          onClick={() => setShowAiSuggestion(showAiSuggestion === field ? null : field)}
          className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-all animate-pulse"
        >
          <Sparkles className="w-3 h-3" /> AI Suggestion
        </button>
        
        <AnimatePresence>
          {showAiSuggestion === field && (
            <motion.div 
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              className="absolute top-full mt-2 left-0 w-64 bg-slate-900 text-white p-4 rounded-xl shadow-2xl z-50 border border-slate-700"
            >
              <div className="flex items-center gap-2 mb-2 text-blue-400">
                <Sparkles className="w-3 h-3" />
                <span className="text-[10px] font-semibold uppercase tracking-widest">PMIS AI Suggests</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic mb-4">
                "{suggestion}"
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => applyAiSuggestion(field)}
                  className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                >
                  <Check className="w-3 h-3" /> Accept
                </button>
                <button 
                  onClick={() => setShowAiSuggestion(null)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Header Area */}
      <header className="relative py-12 px-8 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 to-white border border-slate-100">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap gap-3">
            <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[10px] font-semibold uppercase tracking-widest border border-blue-200">Executing Focus Area</span>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-semibold uppercase tracking-widest border border-emerald-200">Governance Performance Domain</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight italic uppercase flex items-center gap-4">
                Quality Audit <span className="text-slate-300 font-light">|</span> <span className="text-blue-600">تدقيق الجودة</span>
              </h1>
              <p className="text-slate-500 mt-2 max-w-2xl text-sm leading-relaxed">
                Independent structural review to ensure compliance with quality policies and identify improvement opportunities.
              </p>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Compliance Rate</div>
              <div className={cn(
                "text-5xl font-semibold tracking-tighter",
                formData.complianceRate! >= 90 ? "text-emerald-500" : 
                formData.complianceRate! >= 70 ? "text-amber-500" : "text-rose-500"
              )}>
                {formData.complianceRate}%
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Section 1: Basic Data */}
      <section className="bg-white rounded-xl border border-slate-100 p-8 shadow-sm space-y-8">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-50">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">General Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project Name</label>
            <div className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700">
              {selectedProject?.name || 'Loading...'}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preparation Date</label>
            <div className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700">
              {formData.preparationDate}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project Auditor</label>
            <select 
              value={formData.auditorId}
              onChange={e => setFormData(prev => ({ ...prev, auditorId: e.target.value }))}
              disabled={!isEditing}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
            >
              <option value="">Select Auditor...</option>
              {users.map(u => <option key={u.uid} value={u.uid}>{u.name} (Team)</option>)}
              {stakeholders.map(s => <option key={s.id} value={s.id}>{s.name} (Stakeholder)</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Audit Date</label>
            <input 
              type="date"
              value={formData.auditDate}
              onChange={e => setFormData(prev => ({ ...prev, auditDate: e.target.value }))}
              disabled={!isEditing}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
            />
          </div>
        </div>

        {/* Audit Scope */}
        <div className="space-y-4 pt-4">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-3 h-3" /> Audit Scope
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { key: 'processes', label: 'Project Processes (Efficiency)' },
              { key: 'requirements', label: 'Product Requirements (Scope)' },
              { key: 'changes', label: 'Approved Changes (Accuracy)' },
              { key: 'plan', label: 'Quality Management Plan (Compliance)' }
            ].map(item => (
              <button
                key={item.key}
                onClick={() => isEditing && handleScopeChange(item.key as keyof QualityAudit['scope'])}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                  formData.scope?.[item.key as keyof QualityAudit['scope']] 
                    ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm" 
                    : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-md flex items-center justify-center transition-all",
                  formData.scope?.[item.key as keyof QualityAudit['scope']] ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-300"
                )}>
                  {formData.scope?.[item.key as keyof QualityAudit['scope']] && <Check className="w-3 h-3" />}
                </div>
                <span className="text-xs font-bold">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Audit Findings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3" /> Good Practices
              </label>
              <AISuggestionBox field="findings.goodPractices" />
            </div>
            <div className="relative">
              <textarea 
                value={formData.findings?.goodPractices}
                onChange={e => setFormData(prev => ({ ...prev, findings: { ...prev.findings!, goodPractices: e.target.value } }))}
                disabled={!isEditing}
                placeholder="Describe discovered best practices..."
                className="w-full h-32 p-4 bg-emerald-50/30 border border-emerald-100 rounded-xl text-sm text-slate-700 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all resize-none"
              />
              <button 
                onClick={handleTransferToLessonsLearned}
                className="absolute bottom-4 right-4 p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 group"
                title="Transfer to Lessons Learned"
              >
                <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
                <AlertCircle className="w-3 h-3" /> Areas for Improvement
              </label>
              <AISuggestionBox field="findings.areasForImprovement" />
            </div>
            <textarea 
              value={formData.findings?.areasForImprovement}
              onChange={e => setFormData(prev => ({ ...prev, findings: { ...prev.findings!, areasForImprovement: e.target.value } }))}
              disabled={!isEditing}
              placeholder="Identify gaps and required measurements..."
              className="w-full h-32 p-4 bg-amber-50/30 border border-amber-100 rounded-xl text-sm text-slate-700 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all resize-none"
            />
          </div>
        </div>
      </section>

      {/* Section 2: Deficiency Table */}
      <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Deficiency Register</h2>
              <p className="text-xs text-slate-500">Track and resolve quality defects discovered during audit.</p>
            </div>
          </div>
          {isEditing && (
            <button 
              onClick={addDeficiency}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Deficiency
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest w-24">ID</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Defect Description</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Required Action</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Responsible (RACI)</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest w-40">Due Date</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest w-48">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {formData.deficiencies?.map((def, idx) => (
                <tr key={def.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold text-slate-400">{def.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <textarea 
                        value={def.defect}
                        onChange={e => updateDeficiency(idx, 'defect', e.target.value)}
                        disabled={!isEditing}
                        placeholder="Describe the defect..."
                        className="w-full p-2 bg-transparent border-none text-xs font-medium text-slate-700 focus:ring-0 resize-none"
                        rows={2}
                      />
                      <AISuggestionBox field={`deficiencies.${idx}.defect`} />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <textarea 
                        value={def.action}
                        onChange={e => updateDeficiency(idx, 'action', e.target.value)}
                        disabled={!isEditing}
                        placeholder="Required corrective action..."
                        className="w-full p-2 bg-transparent border-none text-xs font-medium text-slate-700 focus:ring-0 resize-none"
                        rows={2}
                      />
                      <AISuggestionBox field={`deficiencies.${idx}.action`} />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={def.responsiblePartyId}
                      onChange={e => updateDeficiency(idx, 'responsiblePartyId', e.target.value)}
                      disabled={!isEditing}
                      className="w-full p-2 bg-transparent border border-slate-100 rounded-lg text-xs font-medium text-slate-700 outline-none"
                    >
                      <option value="">Select Responsible...</option>
                      {users.map(u => <option key={u.uid} value={u.uid}>{u.name}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="date"
                      value={def.dueDate}
                      onChange={e => updateDeficiency(idx, 'dueDate', e.target.value)}
                      disabled={!isEditing}
                      className="w-full p-2 bg-transparent border border-slate-100 rounded-lg text-xs font-medium text-slate-700 outline-none"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {def.status === 'Open' ? (
                        <button 
                          onClick={() => handleGenerateCR(def)}
                          className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                        >
                          Generate CR
                        </button>
                      ) : (
                        <span className="flex-1 px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-[10px] font-bold text-center">
                          {def.status}
                        </span>
                      )}
                      {isEditing && (
                        <button 
                          onClick={() => removeDeficiency(idx)}
                          className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(!formData.deficiencies || formData.deficiencies.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <ShieldCheck className="w-8 h-8 opacity-20" />
                      <p className="text-sm italic">No deficiencies recorded. Quality standards are maintained.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 3: Integrations & Smart Alerts */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-blue-600">
            <ShieldCheck className="w-4 h-4" />
            <h3 className="text-xs font-semibold uppercase tracking-widest">QMP Alignment</h3>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Comparing findings with <span className="font-bold">Quality Management Plan</span> acceptance criteria. 
            {formData.complianceRate! < 100 && (
              <span className="block mt-2 text-rose-600 font-bold">⚠️ Warning: Current results deviate from established quality standards.</span>
            )}
          </p>
        </div>

        <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-emerald-600">
            <RefreshCw className="w-4 h-4" />
            <h3 className="text-xs font-semibold uppercase tracking-widest">CR Automation</h3>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Corrective actions are automatically routed to the <span className="font-bold">Change Control Board</span> when a Change Request is generated.
          </p>
        </div>

        <div className="p-6 bg-slate-900 text-white rounded-xl space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-blue-400">
            <Sparkles className="w-4 h-4" />
            <h3 className="text-xs font-semibold uppercase tracking-widest">AI Intelligence</h3>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            PMIS AI analyzes historical data from similar projects to suggest potential risks and best practices for this audit.
          </p>
          <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-[10px] font-bold transition-all">
            Run Deep Analysis
          </button>
        </div>
      </section>

      {/* Save Button */}
      {isEditing && (
        <div className="fixed bottom-8 right-8 z-50">
          <button 
            onClick={() => onSave(formData)}
            className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-full font-semibold text-sm shadow-2xl shadow-blue-600/40 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all"
          >
            <CheckCircle2 className="w-5 h-5" />
            Save Quality Audit
          </button>
        </div>
      )}
    </div>
  );
};
