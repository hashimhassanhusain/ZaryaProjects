import React, { useState, useEffect } from 'react';
import { Page } from '../types';
import { StandardProcessPage } from './StandardProcessPage';
import { Users, Search, Filter, Plus, Printer, Download, Mail, Phone, ExternalLink, ShieldCheck } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, addDoc } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { stripNumericPrefix } from '../lib/utils';
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
  const [isAdding, setIsAdding] = useState(false);
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
    if (!newSh.name || !selectedProject) return;
    try {
      await addDoc(collection(db, 'stakeholders'), {
        ...newSh,
        projectId: selectedProject.id,
        power: 50,
        interest: 50,
        currentEngagement: 'Neutral',
        desiredEngagement: 'Supportive',
        sentiment: 'Neutral'
      });
      setIsAdding(false);
      setNewSh({ name: '', role: '', organization: '', email: '', phone: '', category: 'Internal', confidential: false });
      toast.success("Stakeholder registered successfully");
    } catch (err) {
      console.error(err);
      toast.error("Registration failed");
    }
  };

  const filtered = stakeholders.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.organization.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <StandardProcessPage
      page={page}
      inputs={[{ id: '1.1.1', title: 'Project Charter' }]}
      outputs={[{ id: '1.2.5-OUT', title: 'Official Stakeholder Register', status: 'Approved' }]}
    >
      <div className="space-y-8 pb-20">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                 <Users className="w-6 h-6" />
              </div>
              <div>
                 <h2 className="text-2xl font-semibold text-slate-900 italic uppercase">Stakeholder Master Database</h2>
                 <p className="text-sm text-slate-500 font-medium">The official repository of relationship identities for the project.</p>
              </div>
           </div>
           
           <div className="flex items-center gap-3">
              <div className="relative group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                 <input 
                   type="text" 
                   placeholder="Search database..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all w-64"
                 />
              </div>
              <button 
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-semibold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
              >
                 <Plus className="w-4 h-4" />
                 Register New
              </button>
           </div>
        </header>

        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 bg-white border-2 border-purple-100 rounded-[2.5rem] shadow-xl space-y-6"
          >
             <h3 className="text-lg font-semibold text-slate-900 italic">Stakeholder Onboarding</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <input placeholder="Full Name" value={newSh.name} onChange={e => setNewSh({...newSh, name: e.target.value})} className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-sm font-bold focus:ring-purple-500/10" />
                <input placeholder="Organization / Entity" value={newSh.organization} onChange={e => setNewSh({...newSh, organization: e.target.value})} className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-sm font-bold" />
                <select value={newSh.category} onChange={e => setNewSh({...newSh, category: e.target.value as any})} className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-sm font-bold">
                   <option>Internal</option>
                   <option>External</option>
                   <option>Regulatory</option>
                   <option>Sponsor</option>
                </select>
                <input placeholder="Role / Position" value={newSh.role} onChange={e => setNewSh({...newSh, role: e.target.value})} className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-sm font-bold" />
                <input placeholder="Email Address" value={newSh.email} onChange={e => setNewSh({...newSh, email: e.target.value})} className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-sm font-bold" />
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                    <input type="checkbox" checked={newSh.confidential} onChange={e => setNewSh({...newSh, confidential: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-purple-600" />
                    <span className="text-[10px] font-semibold uppercase text-slate-500">Confidential Entry</span>
                </div>
             </div>
             <div className="flex justify-end gap-3">
                <button onClick={() => setIsAdding(false)} className="px-6 py-2 text-[10px] font-semibold uppercase text-slate-400">Cancel</button>
                <button onClick={handleCreate} className="px-8 py-3 bg-purple-600 text-white rounded-xl text-[10px] font-semibold uppercase tracking-widest shadow-lg shadow-purple-600/20">Finalize Registration</button>
             </div>
          </motion.div>
        )}

        <section className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
           <table className="w-full text-left">
              <thead>
                 <tr className="bg-slate-50/50">
                    <th className="px-8 py-4 text-[10px] font-semibold uppercase text-slate-400 tracking-widest">Identity & Org</th>
                    <th className="px-8 py-4 text-[10px] font-semibold uppercase text-slate-400 tracking-widest">Role</th>
                    <th className="px-8 py-4 text-[10px] font-semibold uppercase text-slate-400 tracking-widest text-center">Category</th>
                    <th className="px-8 py-4 text-[10px] font-semibold uppercase text-slate-400 tracking-widest">Contact</th>
                    <th className="px-8 py-4 text-[10px] font-semibold uppercase text-slate-400 tracking-widest text-center">Privacy</th>
                    <th className="px-8 py-4"></th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {filtered.map(s => (
                   <tr key={s.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-8 py-6">
                         <div>
                            <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.organization}</p>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <span className="text-xs font-bold text-slate-600">{s.role}</span>
                      </td>
                      <td className="px-8 py-6 text-center">
                         <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                            s.category === 'External' ? 'bg-amber-50 text-amber-600' :
                            s.category === 'Regulatory' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                         }`}>
                            {s.category}
                         </span>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex gap-2">
                            <button className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-purple-600 transition-all"><Mail className="w-3.5 h-3.5" /></button>
                            <button className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-purple-600 transition-all"><Phone className="w-3.5 h-3.5" /></button>
                         </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                         {s.confidential ? (
                           <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full border border-rose-100">
                              <ShieldCheck className="w-3 h-3" />
                              <span className="text-[8px] font-semibold uppercase tracking-tight">Secret</span>
                           </div>
                         ) : (
                           <span className="text-[9px] font-bold text-slate-300 uppercase">Public</span>
                         )}
                      </td>
                      <td className="px-8 py-6">
                         <button className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-slate-900 transition-all">
                            <ExternalLink className="w-4 h-4" />
                         </button>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </section>
      </div>
    </StandardProcessPage>
  );
};
