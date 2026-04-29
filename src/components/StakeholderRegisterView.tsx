import React, { useState, useEffect } from 'react';
import { Page } from '../types';
import { StandardProcessPage } from './StandardProcessPage';
import { Users, Search, Filter, Plus, Printer, Download, Mail, Phone, ExternalLink, ShieldCheck, Trash2, ArrowRight } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { stripNumericPrefix, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface Stakeholder {
  id: string;
  name: string;
  role: string;
  organization: string;
  email: string;
  phone: string;
  category: 'Internal' | 'External' | 'Regulatory' | 'Sponsor';
  confidential: boolean;
}

interface StakeholderRegisterViewProps {
  page: Page;
}

export const StakeholderRegisterView: React.FC<StakeholderRegisterViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingSh, setEditingSh] = useState<Stakeholder | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newSh, setNewSh] = useState<Partial<Stakeholder>>({
    name: '',
    role: '',
    organization: '',
    email: '',
    phone: '',
    category: 'Internal',
    confidential: false
  });

  useEffect(() => {
    if (!selectedProject?.id) return;
    const q = query(collection(db, 'stakeholders'), where('projectId', '==', selectedProject.id));
    const unsub = onSnapshot(q, (snapshot) => {
      setStakeholders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Stakeholder)));
    });
    return () => unsub();
  }, [selectedProject?.id]);

  const handleCreate = async () => {
    if (!newSh.name || !selectedProject) {
      toast.error("Please provide a name");
      return;
    }
    
    setIsSaving(true);
    try {
      if (editingSh) {
        await updateDoc(doc(db, 'stakeholders', editingSh.id), {
          ...newSh,
          updatedAt: serverTimestamp()
        });
        toast.success("Stakeholder profile updated");
      } else {
        await addDoc(collection(db, 'stakeholders'), {
          ...newSh,
          projectId: selectedProject.id,
          power: 50,
          interest: 50,
          currentEngagement: 'Neutral',
          desiredEngagement: 'Supportive',
          sentiment: 'Neutral',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast.success("Stakeholder onboarded successfully");
      }
      setView('list');
      setEditingSh(null);
      setNewSh({ name: '', role: '', organization: '', email: '', phone: '', category: 'Internal', confidential: false });
    } catch (err) {
      console.error(err);
      toast.error("Operation failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (sh: Stakeholder) => {
    setEditingSh(sh);
    setNewSh(sh);
    setView('form');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove stakeholder from register?")) return;
    try {
      await deleteDoc(doc(db, 'stakeholders', id));
      toast.success("Stakeholder retired from project");
    } catch (err) {
      toast.error("Deletion failed");
    }
  };

  const filtered = stakeholders.filter(s => 
    (s.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (s.organization || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (s.role || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  return (
    <StandardProcessPage
      page={page}
      viewMode={view === 'form' ? 'edit' : 'grid'}
      onViewModeChange={(mode) => setView(mode === 'edit' ? 'form' : 'list')}
      onSave={handleCreate}
      isSaving={isSaving}
      inputs={[{ id: '1.1.1', title: 'Project Charter' }]}
      outputs={[{ id: '1.2.5-OUT', title: 'Official Stakeholder Register', status: 'Approved' }]}
    >
      <AnimatePresence mode="wait">
        {view === 'form' ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-10 pb-32"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
              {/* Left Column: Identity & Details */}
              <div className="lg:col-span-2 space-y-10">
                <section className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-xl hover:shadow-slate-200/40">
                  <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-600/20">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                          {editingSh ? 'Update Stakeholder Profile' : 'Register New Stakeholder'}
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">Onboarding identity to project governance</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-10 space-y-12">
                    {/* Core Identity */}
                    <section className="space-y-6">
                      <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        Identity Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                          <input 
                            type="text"
                            value={newSh.name}
                            onChange={(e) => setNewSh({ ...newSh, name: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all outline-none"
                            placeholder="e.g. John Doe"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Organization / Entity</label>
                          <input 
                            type="text"
                            value={newSh.organization}
                            onChange={(e) => setNewSh({ ...newSh, organization: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all outline-none"
                            placeholder="e.g. Ministry of Finance"
                          />
                        </div>
                        <div className="space-y-2 lg:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Role / Position</label>
                          <input 
                            type="text"
                            value={newSh.role}
                            onChange={(e) => setNewSh({ ...newSh, role: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all outline-none"
                            placeholder="e.g. Senior Project Consultant"
                          />
                        </div>
                      </div>
                    </section>

                    {/* Contact Channels */}
                    <section className="space-y-6">
                      <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        Communication Channels
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                          <input 
                            type="email"
                            value={newSh.email}
                            onChange={(e) => setNewSh({ ...newSh, email: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all outline-none"
                            placeholder="j.doe@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                          <input 
                            type="tel"
                            value={newSh.phone}
                            onChange={(e) => setNewSh({ ...newSh, phone: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all outline-none"
                            placeholder="+964..."
                          />
                        </div>
                      </div>
                    </section>
                  </div>
                </section>
              </div>

              {/* Right Column: Classification & Privacy */}
              <div className="space-y-10">
                <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-purple-600/20 transition-all duration-700" />
                  <div className="relative z-10 space-y-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-600/20 text-white">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-purple-400">Classification</h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Domain Strategy</p>
                      </div>
                    </div>

                    <div className="space-y-8">
                       <div className="space-y-3">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Stakeholder Category</label>
                          <div className="grid grid-cols-2 gap-3">
                            {['Internal', 'External', 'Regulatory', 'Sponsor'].map(c => (
                              <button
                                key={c}
                                onClick={() => setNewSh({ ...newSh, category: c as any })}
                                className={cn(
                                  "px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border",
                                  newSh.category === c 
                                    ? "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-600/20" 
                                    : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                                )}
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                       </div>

                       <div className="space-y-4 pt-6 border-t border-white/10">
                          <div className="flex items-center justify-between">
                             <div className="space-y-1">
                               <div className="text-[10px] font-bold text-white uppercase tracking-widest">Confidential Identity</div>
                               <div className="text-[9px] font-medium text-slate-500 uppercase tracking-widest leading-tight">Restrict profile visibility to<br/>Project Leadership only.</div>
                             </div>
                             <button
                               onClick={() => setNewSh({ ...newSh, confidential: !newSh.confidential })}
                               className={cn(
                                 "w-14 h-8 rounded-full transition-all relative flex items-center px-1",
                                 newSh.confidential ? "bg-purple-600 shadow-lg shadow-purple-600/20" : "bg-white/10"
                               )}
                             >
                                <motion.div 
                                  animate={{ x: newSh.confidential ? 24 : 0 }}
                                  className="w-6 h-6 bg-white rounded-full shadow-sm"
                                />
                             </button>
                          </div>
                          {newSh.confidential && (
                             <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3">
                                <ShieldCheck className="w-4 h-4 text-rose-500 shrink-0" />
                                <p className="text-[9px] text-rose-200 font-bold uppercase tracking-tight leading-relaxed">
                                   Privacy Shield Active: This stakeholder will be masked in standard reports and only appear in the Executive Audit Trail.
                                </p>
                             </div>
                          )}
                       </div>
                    </div>
                  </div>
                </section>

                <div className="p-8 bg-purple-50 rounded-[2.5rem] border border-purple-100 space-y-4">
                  <div className="flex items-center gap-3 text-purple-600">
                    <Users className="w-5 h-5" />
                    <h4 className="text-[11px] font-black uppercase tracking-widest">Stakeholder Rule</h4>
                  </div>
                  <p className="text-[10px] text-purple-800 font-bold leading-relaxed opacity-70 italic uppercase">
                    Every identified stakeholder must have a clearly defined role and communication owner. Zarya tracks engagement levels (Current vs. Desired) to optimize project synergy.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden text-slate-900">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div>
                   <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Stakeholder Master Register</h2>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic italic">Formal Relationship Map: {stakeholders.length} identities registered</p>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search identities, roles, orgs..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all outline-none w-64"
                      />
                    </div>
                    <button 
                      onClick={() => setView('form')}
                      className="px-6 py-3 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-600/20 hover:bg-purple-700 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Onboard Identity
                    </button>
                 </div>
               </div>

               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-slate-50/20 border-b border-slate-50">
                          <th className="px-10 py-6 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Stakeholder Identity</th>
                          <th className="px-10 py-6 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Role within Domain</th>
                          <th className="px-10 py-6 text-[10px] font-bold uppercase text-slate-400 tracking-widest text-center">Category</th>
                          <th className="px-10 py-6 text-[10px] font-bold uppercase text-slate-400 tracking-widest text-center">Privacy</th>
                          <th className="px-10 py-6 text-[10px] font-bold uppercase text-slate-400 tracking-widest">Contact</th>
                          <th className="px-10 py-6"></th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {filtered.length === 0 ? (
                         <tr>
                            <td colSpan={6} className="px-10 py-32 text-center text-slate-300 font-bold text-[10px] uppercase tracking-[0.2em] italic">No stakeholders onboarded to selected criteria.</td>
                         </tr>
                       ) : filtered.map((s, idx) => (
                        <tr key={`${s.id}-${idx}`} onClick={() => handleEdit(s)} className="hover:bg-slate-50 group cursor-pointer transition-colors relative overflow-hidden">
                           <td className="px-10 py-8">
                             <div>
                                <p className="text-sm font-black text-slate-900 tracking-tight italic uppercase">{s.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.organization}</p>
                             </div>
                           </td>
                           <td className="px-10 py-8 min-w-[200px]">
                              <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight italic leading-tight">{s.role}</p>
                           </td>
                           <td className="px-10 py-8 text-center">
                             <div className={cn(
                               "inline-flex px-3 py-1 rounded text-[8px] font-black uppercase tracking-[0.1em]",
                               s.category === 'External' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                               s.category === 'Regulatory' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 
                               s.category === 'Sponsor' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                               'bg-purple-50 text-purple-600 border border-purple-100'
                             )}>
                               {s.category}
                             </div>
                           </td>
                           <td className="px-10 py-8 text-center uppercase tracking-widest">
                              {s.confidential ? (
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-full shadow-lg shadow-slate-900/10">
                                   <ShieldCheck className="w-3 h-3 text-purple-400" />
                                   <span className="text-[8px] font-black tracking-widest">Masked Entry</span>
                                </div>
                              ) : (
                                <span className="text-[9px] font-bold text-slate-300">Public Record</span>
                              )}
                           </td>
                           <td className="px-10 py-8">
                             <div className="flex gap-2">
                                <button className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-purple-600 transition-all shadow-sm"><Mail className="w-4 h-4" /></button>
                                <button className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-purple-600 transition-all shadow-sm"><Phone className="w-4 h-4" /></button>
                             </div>
                           </td>
                           <td className="px-10 py-8 text-right">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                                className="opacity-0 group-hover:opacity-100 p-3 bg-slate-50 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                           </td>
                        </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className="md:col-span-2 bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden flex flex-col md:flex-row gap-10 items-center shadow-2xl">
                  <div className="flex-1 space-y-6 relative z-10">
                    <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center ring-1 ring-purple-500/30 shadow-inner">
                      <ExternalLink className="w-7 h-7 text-purple-400" />
                    </div>
                    <h3 className="text-3xl font-black italic tracking-tighter leading-none uppercase">Relationship<br/>Intelligence Domain</h3>
                    <p className="text-slate-400 font-bold leading-relaxed max-w-xl text-[10px] uppercase tracking-wide opacity-80 font-sans">
                      Stakeholder management is the core of project success. Identification and classification allow for targeted communication strategies, ensuring all major entities are aligned with project objectives.
                    </p>
                  </div>
                  <div className="absolute right-[-5%] bottom-[-10%] opacity-5 rotate-12 scale-150 pointer-events-none">
                    <Users className="w-96 h-96" />
                  </div>
               </div>

               <div className="bg-purple-50 border border-purple-100 rounded-[3rem] p-10 space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                     <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200/50">
                        <Users className="w-6 h-6 text-purple-600" />
                     </div>
                     <h4 className="text-lg font-black uppercase tracking-tighter italic text-purple-900 leading-tight">Stakeholder Power Matrix Active</h4>
                     <p className="text-[10px] font-bold text-purple-800/60 leading-relaxed uppercase tracking-widest">
                       Engagement levels are automatically cross-referenced with meeting attendance logs (3.1.2) to detect relationship fatigue or disengagement.
                     </p>
                  </div>
                  <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-purple-600 hover:gap-4 transition-all group">
                    Analyze Engagement Matrix <ArrowRight className="w-3 h-3" />
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </StandardProcessPage>
  );
};
