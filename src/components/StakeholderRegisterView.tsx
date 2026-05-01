import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Users, 
  Target, 
  Shield, 
  Download, 
  History,
  Grid,
  UserCheck,
  ChevronRight,
  Maximize2,
  Mail,
  Phone,
  Briefcase,
  AlertCircle,
  Save,
  X,
  Loader2,
  MoreVertical,
  Fingerprint,
  Map,
  Eye,
  EyeOff
} from 'lucide-react';
import { Page, Stakeholder } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StandardProcessPage } from './StandardProcessPage';

interface StakeholderRegisterViewProps {
  page: Page;
  embedded?: boolean;
}

export const StakeholderRegisterView: React.FC<StakeholderRegisterViewProps> = ({ page, embedded = false }) => {
  const { selectedProject } = useProject();
  const { t, isRtl, language } = useLanguage();
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'matrix' | 'form'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStakeholder, setEditingStakeholder] = useState<Stakeholder | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfidential, setShowConfidential] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Stakeholder>>({
    name: '',
    position: '',
    organization: '',
    email: '',
    phone: '',
    role: '',
    location: '',
    requirements: '',
    expectations: '',
    influence: 'Medium',
    interest: 'Medium',
    phaseOfMostInterest: '',
    type: 'Internal',
    directionOfInfluence: 'Downward',
    currentEngagement: 'Neutral',
    desiredEngagement: 'Supportive',
    powerScore: 5,
    interestScore: 5,
    status: 'Active'
  });

  useEffect(() => {
    if (!selectedProject) return;

    // Remove orderBy to avoid indexing issues in preview
    const q = query(
      collection(db, 'stakeholders'),
      where('projectId', '==', selectedProject.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stakeholder));
      // Sort in memory instead
      setStakeholders(docs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'stakeholders');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedProject?.id]);

  const handleAdd = () => {
    setEditingStakeholder(null);
    setFormData({
      name: '',
      position: '',
      organization: '',
      email: '',
      phone: '',
      role: '',
      location: '',
      requirements: '',
      expectations: '',
      influence: 'Medium',
      interest: 'Medium',
      phaseOfMostInterest: '',
      type: 'Internal',
      directionOfInfluence: 'Downward',
      currentEngagement: 'Neutral',
      desiredEngagement: 'Supportive',
      powerScore: 5,
      interestScore: 5,
      status: 'Active'
    });
    setView('form');
  };

  const handleEdit = (stakeholder: Stakeholder) => {
    setEditingStakeholder(stakeholder);
    setFormData({ ...stakeholder });
    setView('form');
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      await deleteDoc(doc(db, 'stakeholders', id));
      toast.success(t('entry_deleted'));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'stakeholders');
    }
  };

  const handleSave = async () => {
    if (!selectedProject || !formData.name) {
      toast.error(t('please_fill_required_fields'));
      return;
    }

    setIsSaving(true);
    try {
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      const stakeholderData = {
        ...formData,
        projectId: selectedProject.id,
        updatedAt: new Date().toISOString(),
        updatedBy: user,
        createdAt: editingStakeholder?.createdAt || new Date().toISOString(),
        createdBy: editingStakeholder?.createdBy || user,
      };

      if (editingStakeholder) {
        await updateDoc(doc(db, 'stakeholders', editingStakeholder.id), stakeholderData);
        toast.success(t('entry_updated'));
      } else {
        await addDoc(collection(db, 'stakeholders'), stakeholderData);
        toast.success(t('entry_created'));
      }

      setView('list');
    } catch (err) {
      handleFirestoreError(err, editingStakeholder ? OperationType.UPDATE : OperationType.CREATE, 'stakeholders');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(16);
    doc.text(t('stakeholder_register').toUpperCase(), pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`${t('project')}: ${selectedProject.name}`, 14, 30);
    doc.text(`${t('date')}: ${new Date().toLocaleDateString()}`, 14, 35);

    autoTable(doc, {
      startY: 45,
      head: [[t('name'), t('position'), t('organization'), t('internal_external'), t('influence_direction'), t('power'), t('interest'), t('engagement_level')]],
      body: stakeholders.map(s => [
        s.name,
        s.position,
        s.organization,
        t(s.type.toLowerCase()),
        t(s.directionOfInfluence.toLowerCase()),
        s.powerScore,
        s.interestScore,
        t(s.currentEngagement.toLowerCase())
      ]),
      styles: { font: 'helvetica', fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] }
    });

    doc.save(`StakeholderRegister_${selectedProject.code || selectedProject.id}.pdf`);
  };

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'Leading': return 'bg-emerald-500 text-white';
      case 'Supportive': return 'bg-blue-500 text-white';
      case 'Neutral': return 'bg-slate-400 text-white';
      case 'Resistant': return 'bg-orange-500 text-white';
      case 'Unaware': return 'bg-rose-500 text-white';
      default: return 'bg-slate-200 text-slate-600';
    }
  };

  const getStrategy = (power: number, interest: number) => {
    if (power >= 6 && interest >= 6) return t('manage_closely');
    if (power >= 6 && interest < 6) return t('keep_satisfied');
    if (power < 6 && interest >= 6) return t('keep_informed');
    return t('monitor');
  };

  const filteredStakeholders = stakeholders.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const content = (
    <AnimatePresence mode="wait">
      {view === 'form' ? (
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-8 pb-20 px-1"
        >
          {/* Form Container */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Left Column: Core Identity */}
             <div className="lg:col-span-2 space-y-8">
                <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden p-8 space-y-8">
                   <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                         <Fingerprint className="w-6 h-6" />
                      </div>
                      <div>
                         <h3 className="text-lg font-bold text-slate-900 tracking-tight">{t('identification_info')}</h3>
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('core_identity_details')}</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2 space-y-2">
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('name')}</label>
                         <input 
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                            placeholder={t('name_placeholder')}
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('position')}</label>
                         <input 
                            type="text"
                            value={formData.position}
                            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('organization')}</label>
                         <input 
                            type="text"
                            value={formData.organization}
                            onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('email')}</label>
                         <input 
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('phone')}</label>
                         <input 
                            type="text"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                         />
                      </div>
                   </div>
                </section>

                <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-8">
                   <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                      <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-600/20">
                         <Target className="w-6 h-6" />
                      </div>
                      <div>
                         <h3 className="text-lg font-bold text-slate-900 tracking-tight">{t('assessment_info')}</h3>
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('requirements_expectations_impact')}</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2 space-y-2">
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('major_requirements')}</label>
                         <textarea 
                            value={formData.requirements}
                            onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all min-h-[100px]"
                         />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('expectations')}</label>
                         <textarea 
                            value={formData.expectations}
                            onChange={(e) => setFormData({ ...formData, expectations: e.target.value })}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all min-h-[80px]"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('influence')} (1-10)</label>
                         <input 
                            type="number"
                            min="1" max="10"
                            value={formData.powerScore}
                            onChange={(e) => setFormData({ ...formData, powerScore: parseInt(e.target.value) })}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('interest')} (1-10)</label>
                         <input 
                            type="number"
                            min="1" max="10"
                            value={formData.interestScore}
                            onChange={(e) => setFormData({ ...formData, interestScore: parseInt(e.target.value) })}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
                         />
                      </div>
                   </div>
                </section>
             </div>

             {/* Right Column: Classification & Strategy */}
             <div className="space-y-8">
                <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl space-y-8">
                   <div className="flex items-center gap-4 border-b border-white/10 pb-6">
                      <div className="w-10 h-10 bg-purple-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                         <Map className="w-5 h-5" />
                      </div>
                      <div>
                         <h3 className="text-sm font-bold uppercase tracking-widest">{t('classification')}</h3>
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('strategic_positioning')}</p>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-3">
                         <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('internal_external')}</label>
                         <div className="grid grid-cols-2 gap-2">
                            {['Internal', 'External'].map((type) => (
                               <button
                                  key={type}
                                  onClick={() => setFormData({ ...formData, type: type as any })}
                                  className={cn(
                                     "py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                                     formData.type === type ? "bg-purple-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
                                  )}
                               >
                                  {t(type.toLowerCase())}
                               </button>
                            ))}
                         </div>
                      </div>

                      <div className="space-y-3">
                         <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('influence_direction')}</label>
                         <div className="grid grid-cols-2 gap-2">
                            {['Upward', 'Downward', 'Outward', 'Sideward'].map((dir) => (
                               <button
                                  key={dir}
                                  onClick={() => setFormData({ ...formData, directionOfInfluence: dir as any })}
                                  className={cn(
                                     "py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                                     formData.directionOfInfluence === dir ? "bg-purple-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"
                                  )}
                               >
                                  {t(dir.toLowerCase())}
                               </button>
                            ))}
                         </div>
                      </div>
                   </div>
                </section>

                <section className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                      <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
                         <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                         <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">{t('engagement_level')}</h3>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('current_engagement')}</label>
                         <select 
                            value={formData.currentEngagement}
                            onChange={(e) => setFormData({ ...formData, currentEngagement: e.target.value as any })}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
                         >
                            {['Unaware', 'Resistant', 'Neutral', 'Supportive', 'Leading'].map(l => (
                               <option key={l} value={l}>{t(l.toLowerCase())}</option>
                            ))}
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('desired_engagement')}</label>
                         <select 
                            value={formData.desiredEngagement}
                            onChange={(e) => setFormData({ ...formData, desiredEngagement: e.target.value as any })}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none"
                         >
                            {['Unaware', 'Resistant', 'Neutral', 'Supportive', 'Leading'].map(l => (
                               <option key={l} value={l}>{t(l.toLowerCase())}</option>
                            ))}
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('engagement_strategy')}</label>
                         <textarea 
                            value={formData.strategy}
                            onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none min-h-[100px]"
                            placeholder={t('strategy_placeholder')}
                         />
                      </div>
                   </div>
                </section>
             </div>
          </div>

          <div className="flex justify-end gap-4">
             <button onClick={() => setView('list')} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold uppercase tracking-widest text-[10px]">{t('cancel')}</button>
             <button onClick={handleSave} className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20">{t('save')}</button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="list"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6 pb-20"
        >
           {/* Toolbar */}
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder={t('search_stakeholders')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <button 
                  onClick={() => setView('list')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                    view === 'list' ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {t('list')}
                </button>
                <button 
                  onClick={() => setView('matrix')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                    view === 'matrix' ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {t('matrix')}
                </button>
              </div>
              
              <button 
                onClick={handleAdd}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                {t('add_stakeholder')}
              </button>
            </div>
          </div>

          {view === 'list' ? (
            <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('stakeholder')}</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('organization')} / {t('position')}</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('internal_external')}</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('influence_direction')}</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('engagement')}</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                          </td>
                        </tr>
                      ) : filteredStakeholders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs italic">
                            {t('no_stakeholders_found')}
                          </td>
                        </tr>
                      ) : (
                        filteredStakeholders.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/80 transition-all group cursor-pointer" onClick={() => handleEdit(s)}>
                             <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                   <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-xs uppercase">
                                      {s.name.substring(0, 2)}
                                   </div>
                                   <span className="text-xs font-bold text-slate-900">{s.name}</span>
                                </div>
                             </td>
                             <td className="px-6 py-4">
                                <div className="space-y-0.5">
                                   <div className="text-[11px] font-bold text-slate-700">{s.organization}</div>
                                   <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{s.position}</div>
                                </div>
                             </td>
                             <td className="px-6 py-4">
                                <span className={cn(
                                   "px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest",
                                   s.type === 'Internal' ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-purple-600"
                                )}>
                                   {t(s.type.toLowerCase())}
                                </span>
                             </td>
                             <td className="px-6 py-4">
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{t(s.directionOfInfluence.toLowerCase())}</span>
                             </td>
                             <td className="px-6 py-4">
                                <span className={cn("px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest", getEngagementColor(s.currentEngagement))}>
                                   {t(s.currentEngagement.toLowerCase())}
                                </span>
                             </td>
                             <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleEdit(s); }}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={(e) => handleDelete(s.id, e)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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
          ) : (
            /* Power/Interest Matrix View */
            <div className="relative aspect-square md:aspect-video w-full bg-slate-900 rounded-[3.5rem] p-12 overflow-hidden shadow-2xl border-4 border-slate-800">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
              
              {/* Axes Labels */}
              <div className="absolute left-6 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">{t('power')}</div>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">{t('interest')}</div>

              <div className="grid grid-cols-2 grid-rows-2 h-full w-full gap-6 relative z-10">
                {/* Keep Satisfied (High Power, Low Interest) */}
                <div className="bg-slate-800/40 rounded-3xl border border-slate-700/50 p-8 flex flex-col items-center justify-center relative backdrop-blur-sm group/quad">
                  <span className="absolute top-6 left-6 text-[10px] font-black text-amber-500 uppercase tracking-widest">{t('keep_satisfied')}</span>
                  <div className="flex flex-wrap gap-2 justify-center max-w-[80%]">
                    {stakeholders.filter(s => s.powerScore >= 6 && s.interestScore < 6).map(s => (
                      <motion.div 
                        key={s.id}
                        layoutId={s.id}
                        onClick={() => handleEdit(s)}
                        className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-xl text-[10px] font-bold cursor-pointer hover:bg-amber-500/20 active:scale-95 transition-all shadow-lg shadow-amber-500/5"
                      >
                        {s.name}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Manage Closely (High Power, High Interest) */}
                <div className="bg-blue-600/10 rounded-3xl border-2 border-blue-500/40 p-8 flex flex-col items-center justify-center relative shadow-[0_0_80px_rgba(37,99,235,0.15)] group/quad">
                  <span className="absolute top-6 right-6 text-[10px] font-black text-blue-400 uppercase tracking-widest">{t('manage_closely')}</span>
                  <div className="flex flex-wrap gap-2 justify-center max-w-[80%]">
                    {stakeholders.filter(s => s.powerScore >= 6 && s.interestScore >= 6).map(s => (
                      <motion.div 
                        key={s.id}
                        layoutId={s.id}
                        onClick={() => handleEdit(s)}
                        className="px-5 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black cursor-pointer hover:bg-blue-500 active:scale-95 transition-all shadow-xl shadow-blue-600/30"
                      >
                        {s.name}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Monitor (Low Power, Low Interest) */}
                <div className="bg-slate-800/20 rounded-3xl border border-slate-700/30 p-8 flex flex-col items-center justify-center relative group/quad">
                  <span className="absolute bottom-6 left-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('monitor')}</span>
                  <div className="flex flex-wrap gap-2 justify-center max-w-[80%]">
                    {stakeholders.filter(s => s.powerScore < 6 && s.interestScore < 6).map(s => (
                      <motion.div 
                        key={s.id}
                        layoutId={s.id}
                        onClick={() => handleEdit(s)}
                        className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl text-[10px] font-bold cursor-pointer hover:text-slate-200 active:scale-95 transition-all"
                      >
                        {s.name}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Keep Informed (Low Power, High Interest) */}
                <div className="bg-slate-800/40 rounded-3xl border border-slate-700/50 p-8 flex flex-col items-center justify-center relative group/quad">
                  <span className="absolute bottom-6 right-6 text-[10px] font-black text-emerald-500 uppercase tracking-widest">{t('keep_informed')}</span>
                   <div className="flex flex-wrap gap-2 justify-center max-w-[80%]">
                    {stakeholders.filter(s => s.powerScore < 6 && s.interestScore >= 6).map(s => (
                      <motion.div 
                        key={s.id}
                        layoutId={s.id}
                        onClick={() => handleEdit(s)}
                        className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-xl text-[10px] font-bold cursor-pointer hover:bg-emerald-500/20 active:scale-95 transition-all shadow-lg shadow-emerald-500/5"
                      >
                        {s.name}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grid Lines */}
              <div className="absolute inset-0 pointer-events-none">
                 <div className="absolute left-1/2 top-12 bottom-12 w-px bg-white/10" />
                 <div className="absolute top-1/2 left-12 right-12 h-px bg-white/10" />
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (embedded) return content;

  return (
    <StandardProcessPage
      page={page}
      viewMode={view === 'form' ? 'edit' : 'grid'}
      onViewModeChange={(mode) => setView(mode === 'edit' ? 'form' : 'list')}
      onSave={handleSave}
      onPrint={generatePDF}
      isSaving={isSaving}
    >
      {content}
    </StandardProcessPage>
  );
};
