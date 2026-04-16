import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Save, 
  Loader2, 
  Plus, 
  Trash2, 
  CheckCircle2,
  Users,
  FileText,
  MessageSquare,
  AlertCircle,
  Gavel
} from 'lucide-react';
import { TeamOperatingAgreement, TeamMember, WBSLevel } from '../../types';
import { toast } from 'react-hot-toast';
import { db, OperationType, handleFirestoreError, auth } from '../../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where,
  getDocs,
  setDoc
} from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface TeamGovernanceTabProps {
  projectId: string;
}

export const TeamGovernanceTab: React.FC<TeamGovernanceTabProps> = ({ projectId }) => {
  const [agreement, setAgreement] = useState<TeamOperatingAgreement | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'agreement' | 'raci'>('agreement');

  useEffect(() => {
    if (!projectId) return;

    // Fetch Operating Agreement
    const q = query(collection(db, 'team_agreements'), where('projectId', '==', projectId));
    const unsubAgreement = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setAgreement({ id: snap.docs[0].id, ...snap.docs[0].data() } as TeamOperatingAgreement);
      } else {
        setAgreement({
          id: '',
          projectId,
          values: [],
          meetingGuidelines: [],
          communicationGuidelines: [],
          decisionMakingProcess: '',
          conflictManagementApproach: '',
          otherAgreements: '',
          signatures: [],
          updatedAt: new Date().toISOString()
        });
      }
    });

    // Fetch Team Members for RACI
    const unsubMembers = onSnapshot(query(collection(db, 'team_members'), where('projectId', '==', projectId)), (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeamMember)));
    });

    // Fetch WBS for RACI (Divisions/Work Packages)
    const unsubWbs = onSnapshot(query(collection(db, 'wbs'), where('projectId', '==', projectId)), (snap) => {
      setWbsLevels(snap.docs.map(d => ({ id: d.id, ...d.data() } as WBSLevel)));
    });

    return () => {
      unsubAgreement();
      unsubMembers();
      unsubWbs();
    };
  }, [projectId]);

  const handleSaveAgreement = async () => {
    if (!agreement) return;
    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const data = { ...agreement, updatedAt: timestamp };
      
      if (agreement.id) {
        await updateDoc(doc(db, 'team_agreements', agreement.id), data);
      } else {
        const docRef = await addDoc(collection(db, 'team_agreements'), data);
        setAgreement({ ...data, id: docRef.id });
      }
      toast.success('Team Operating Agreement saved successfully.');
    } catch (err) {
      handleFirestoreError(err, agreement?.id ? OperationType.UPDATE : OperationType.CREATE, 'team_agreements');
    } finally {
      setIsSaving(false);
    }
  };

  const addItem = (field: 'values' | 'meetingGuidelines' | 'communicationGuidelines') => {
    if (!agreement) return;
    setAgreement({
      ...agreement,
      [field]: [...agreement[field], '']
    });
  };

  const updateItem = (field: 'values' | 'meetingGuidelines' | 'communicationGuidelines', index: number, value: string) => {
    if (!agreement) return;
    const newList = [...agreement[field]];
    newList[index] = value;
    setAgreement({ ...agreement, [field]: newList });
  };

  const removeItem = (field: 'values' | 'meetingGuidelines' | 'communicationGuidelines', index: number) => {
    if (!agreement) return;
    setAgreement({
      ...agreement,
      [field]: agreement[field].filter((_, i) => i !== index)
    });
  };

  // RACI Logic
  const [raciData, setRaciData] = useState<Record<string, Record<string, 'R' | 'A' | 'C' | 'I' | ''>>>({});

  useEffect(() => {
    if (!projectId) return;
    const fetchRaci = async () => {
      const q = query(collection(db, 'raci_matrix'), where('projectId', '==', projectId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setRaciData(snap.docs[0].data().matrix || {});
      }
    };
    fetchRaci();
  }, [projectId]);

  const handleRaciUpdate = async (wbsId: string, memberId: string, role: 'R' | 'A' | 'C' | 'I' | '') => {
    const newMatrix = {
      ...raciData,
      [wbsId]: {
        ...(raciData[wbsId] || {}),
        [memberId]: role
      }
    };
    setRaciData(newMatrix);
    
    try {
      const raciRef = doc(db, 'raci_matrix', projectId);
      await setDoc(raciRef, {
        projectId,
        matrix: newMatrix,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error('Failed to update RACI:', err);
    }
  };

  const workPackages = wbsLevels.filter(l => l.type === 'Division' || l.type === 'Other');

  return (
    <div className="space-y-8">
      <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('agreement')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'agreement' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Gavel className="w-4 h-4" />
          Operating Agreement
        </button>
        <button
          onClick={() => setActiveTab('raci')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'raci' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Users className="w-4 h-4" />
          RACI Matrix
        </button>
      </div>

      {activeTab === 'agreement' ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Team Operating Agreement</h3>
                <p className="text-xs text-slate-500 font-medium">Core values, guidelines, and decision-making processes.</p>
              </div>
            </div>
            <button 
              onClick={handleSaveAgreement}
              disabled={isSaving}
              className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Agreement
            </button>
          </div>

          <div className="p-10 space-y-10">
            {/* Values */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Team Values & Principles
                </h4>
                <button onClick={() => addItem('values')} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agreement?.values.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input 
                      type="text"
                      value={val}
                      onChange={(e) => updateItem('values', idx, e.target.value)}
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 outline-none"
                      placeholder={`Value ${idx + 1}`}
                    />
                    <button onClick={() => removeItem('values', idx)} className="p-2 text-slate-300 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Guidelines */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Meeting Guidelines
                  </h4>
                  <button onClick={() => addItem('meetingGuidelines')} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {agreement?.meetingGuidelines.map((val, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input 
                        type="text"
                        value={val}
                        onChange={(e) => updateItem('meetingGuidelines', idx, e.target.value)}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 outline-none"
                      />
                      <button onClick={() => removeItem('meetingGuidelines', idx)} className="p-2 text-slate-300 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                    Communication Guidelines
                  </h4>
                  <button onClick={() => addItem('communicationGuidelines')} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {agreement?.communicationGuidelines.map((val, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input 
                        type="text"
                        value={val}
                        onChange={(e) => updateItem('communicationGuidelines', idx, e.target.value)}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 outline-none"
                      />
                      <button onClick={() => removeItem('communicationGuidelines', idx)} className="p-2 text-slate-300 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Processes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <section className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Decision-Making Process
                </h4>
                <textarea 
                  value={agreement?.decisionMakingProcess || ''}
                  onChange={(e) => setAgreement({ ...agreement!, decisionMakingProcess: e.target.value })}
                  rows={4}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 outline-none resize-none"
                  placeholder="How are decisions made? (e.g. Consensus, Majority, PM Final Say)..."
                />
              </section>

              <section className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-rose-600" />
                  Conflict Management Approach
                </h4>
                <textarea 
                  value={agreement?.conflictManagementApproach || ''}
                  onChange={(e) => setAgreement({ ...agreement!, conflictManagementApproach: e.target.value })}
                  rows={4}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 outline-none resize-none"
                  placeholder="How are disagreements handled?..."
                />
              </section>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-xl font-bold text-slate-900">Responsibility Assignment Matrix (RACI)</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              <span className="font-black text-slate-900">R</span>: Responsible | 
              <span className="font-black text-slate-900 ml-2">A</span>: Accountable | 
              <span className="font-black text-slate-900 ml-2">C</span>: Consulted | 
              <span className="font-black text-slate-900 ml-2">I</span>: Informed
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50/50 z-10">Work Package / Activity</th>
                  {members.map(m => (
                    <th key={m.id} className="px-6 py-5 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center border-l border-slate-100 min-w-[120px]">
                      {m.name}
                      <div className="text-[8px] text-slate-400 font-medium mt-1">{m.role}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {workPackages.map(wp => (
                  <tr key={wp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6 sticky left-0 bg-white group-hover:bg-slate-50/50 z-10 border-r border-slate-100">
                      <div className="text-sm font-bold text-slate-900">{wp.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{wp.code}</div>
                    </td>
                    {members.map(m => (
                      <td key={m.id} className="px-6 py-6 text-center border-l border-slate-100">
                        <select 
                          value={raciData[wp.id]?.[m.id] || ''}
                          onChange={(e) => handleRaciUpdate(wp.id, m.id, e.target.value as any)}
                          className={cn(
                            "w-10 h-10 rounded-lg text-xs font-black transition-all outline-none appearance-none text-center cursor-pointer",
                            raciData[wp.id]?.[m.id] === 'R' ? "bg-blue-600 text-white" :
                            raciData[wp.id]?.[m.id] === 'A' ? "bg-red-600 text-white" :
                            raciData[wp.id]?.[m.id] === 'C' ? "bg-amber-500 text-white" :
                            raciData[wp.id]?.[m.id] === 'I' ? "bg-emerald-500 text-white" :
                            "bg-slate-50 text-slate-300 hover:bg-slate-100"
                          )}
                        >
                          <option value=""></option>
                          <option value="R">R</option>
                          <option value="A">A</option>
                          <option value="C">C</option>
                          <option value="I">I</option>
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
