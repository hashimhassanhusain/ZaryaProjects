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
import { Page, Stakeholder, EntityConfig } from '../types';
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
import { generateStandardPDF } from '../lib/pdfService';
import { StandardProcessPage, useStandardProcessPage } from './StandardProcessPage';
import { UniversalDataTable } from './common/UniversalDataTable';

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
    
    const columns = [t('name'), t('position'), t('organization'), t('type'), t('direction'), t('power'), t('interest'), t('engagement')];
    const rows = stakeholders.map(s => [
      s.name,
      s.position,
      s.organization,
      t(s.type.toLowerCase()),
      t(s.directionOfInfluence.toLowerCase()),
      s.powerScore,
      s.interestScore,
      t(s.currentEngagement.toLowerCase())
    ]);

    generateStandardPDF({
      page,
      project: selectedProject,
      data: stakeholders,
      columns,
      rows
    });
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

  const gridConfig: EntityConfig = {
    id: 'stakeholders',
    label: t('stakeholder_register'),
    icon: Users,
    collection: 'stakeholders',
    columns: [
      { key: 'name', label: t('name'), type: 'string' },
      { key: 'position', label: t('position'), type: 'string' },
      { key: 'organization', label: t('organization'), type: 'string' },
      { key: 'type', label: t('internal_external'), type: 'badge' },
      { key: 'currentEngagement', label: t('engagement'), type: 'badge' },
      { key: 'directionOfInfluence', label: t('influence_direction'), type: 'string' },
      { key: 'updatedAt', label: t('updated_at'), type: 'date' }
    ]
  };

  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [activeView, setActiveView] = useState<'list' | 'matrix'>('list');

  const content = (
    <AnimatePresence mode="wait">
      {viewMode === 'edit' ? (
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-8 pb-20 px-1"
        >
          <div className="flex justify-end pr-2">
            <button 
              onClick={() => setViewMode('grid')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-bold hover:bg-slate-200 transition-all uppercase tracking-wider"
            >
              <ChevronRight className="w-3 h-3 rotate-180" />
              {t('back_to_list')}
            </button>
          </div>
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
        </motion.div>
      ) : (
        <motion.div
          key="grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6 pb-20 flex-1 flex flex-col"
        >
          <div className="flex justify-start px-2 mb-2">
             <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
               <button 
                 onClick={() => setActiveView('list')}
                 className={cn(
                   "px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all",
                   activeView === 'list' ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600"
                 )}
               >
                 {t('list')}
               </button>
               <button 
                 onClick={() => setActiveView('matrix')}
                 className={cn(
                   "px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all",
                   activeView === 'matrix' ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600"
                 )}
               >
                 {t('matrix')}
               </button>
             </div>
          </div>

          {activeView === 'list' ? (
            <UniversalDataTable 
              config={gridConfig}
              data={stakeholders}
              onRowClick={handleEdit}
              onNewClick={handleAdd}
              onDeleteRecord={(id) => handleDelete(id)}
              title={useStandardProcessPage()?.pageHeader}
              favoriteControl={useStandardProcessPage()?.favoriteControl}
            />
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
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onSave={handleSave}
      onPrint={generatePDF}
      isSaving={isSaving}
      inputs={[
        { id: '1.2.2', title: 'Power/Interest Matrix' },
        { id: '1.1.2', title: 'Communications Plan' }
      ]}
    >
      {content}
    </StandardProcessPage>
  );
};
