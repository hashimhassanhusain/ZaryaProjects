import React, { useState, useEffect } from 'react';
import { Page, EntityConfig } from '../types';
import { StandardProcessPage, useStandardProcessPage } from './StandardProcessPage';
import { UniversalDataTable } from './common/UniversalDataTable';
import { Users, Search, Filter, Plus, Printer, Download, Mail, Phone, ExternalLink, ShieldCheck, Trash2, ArrowRight } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
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
  const { t, isRtl } = useLanguage();
  const context = useStandardProcessPage();
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
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

  const gridConfig: EntityConfig = {
    id: 'stakeholders' as any,
    label: page.title,
    icon: Users,
    collection: 'stakeholders',
    columns: [
      { key: 'name', label: 'Name', type: 'string' },
      { key: 'organization', label: 'Organization', type: 'string' },
      { key: 'role', label: 'Role', type: 'string' },
      { key: 'category', label: 'Category', type: 'badge' }
    ]
  };

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
              <div className="lg:col-span-2 space-y-10">
                <section className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-xl hover:shadow-slate-200/40">
                  <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-600/20">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                          {editingSh ? 'Update Stakeholder Profile' : t('register_new_stakeholder')}
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">Onboarding identity to project governance</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-10 space-y-12">
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
            className="flex-1 flex flex-col"
          >
            <UniversalDataTable 
              config={gridConfig}
              data={stakeholders}
              onRowClick={(record) => handleEdit(record as Stakeholder)}
              onNewClick={() => setView('form')}
              onDeleteRecord={handleDelete}
              title={context?.pageHeader}
              favoriteControl={context?.favoriteControl}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </StandardProcessPage>
  );
};
