import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ShieldAlert, 
  Database,
  History,
  Download,
  Printer,
  ChevronDown,
  Info,
  Calendar,
  User,
  AlertTriangle,
  X,
  Save,
  Loader2
} from 'lucide-react';
import { Page, AssumptionEntry, Stakeholder, User as UserType } from '../types';
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
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StandardProcessPage } from './StandardProcessPage';

interface AssumptionConstraintViewProps {
  page: Page;
  embedded?: boolean;
}

interface LogVersion {
  id: string;
  version: number;
  timestamp: string;
  authorName: string;
  actionType: string;
  data: AssumptionEntry[];
}

export const AssumptionConstraintView: React.FC<AssumptionConstraintViewProps> = ({ page, embedded = false }) => {
  const { selectedProject } = useProject();
  const { t, isRtl, language } = useLanguage();
  const [entries, setEntries] = useState<AssumptionEntry[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [team, setTeam] = useState<UserType[]>([]);
  const [versions, setVersions] = useState<LogVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingEntry, setEditingEntry] = useState<AssumptionEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [formData, setFormData] = useState<Partial<AssumptionEntry>>({
    description: '',
    type: 'Assumption',
    level: 'High',
    ownerId: '',
    ownerName: '',
    status: 'Open',
    impactLevel: 'Medium',
    dateIdentified: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'assumptions'),
      where('projectId', '==', selectedProject.id),
      orderBy('createdAt', 'desc')
    );

    const sq = query(
      collection(db, 'stakeholders'),
      where('projectId', '==', selectedProject.id)
    );

    const uq = collection(db, 'users');

    const vq = query(
      collection(db, 'assumptions_versions'),
      where('projectId', '==', selectedProject.id),
      orderBy('version', 'desc')
    );

    const unsubEntries = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssumptionEntry)));
      setLoading(false);
    });

    const unsubStakeholders = onSnapshot(sq, (snapshot) => {
      setStakeholders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stakeholder)));
    });

    const unsubTeam = onSnapshot(uq, (snapshot) => {
      setTeam(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserType)));
    });

    const unsubVersions = onSnapshot(vq, (snapshot) => {
      setVersions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogVersion)));
    });

    return () => {
      unsubEntries();
      unsubStakeholders();
      unsubTeam();
      unsubVersions();
    };
  }, [selectedProject?.id]);

  const handleAdd = () => {
    setEditingEntry(null);
    setFormData({
      description: '',
      type: 'Assumption',
      level: 'High',
      ownerId: '',
      ownerName: '',
      status: 'Open',
      impactLevel: 'Medium',
      dateIdentified: new Date().toISOString().split('T')[0],
    });
    setView('form');
  };

  const handleEdit = (entry: AssumptionEntry) => {
    setEditingEntry(entry);
    setFormData({ ...entry });
    setView('form');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      await deleteDoc(doc(db, 'assumptions', id));
      toast.success(t('entry_deleted'));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'assumptions');
    }
  };

  const handleSave = async () => {
    if (!selectedProject || !formData.description) {
      toast.error(t('please_fill_required_fields'));
      return;
    }

    setIsSaving(true);
    try {
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      const owner = team.find(u => u.uid === formData.ownerId) || stakeholders.find(s => s.id === formData.ownerId);

      const entryData = {
        ...formData,
        ownerName: owner ? (owner as any).name : 'Unassigned',
        projectId: selectedProject.id,
        updatedAt: new Date().toISOString(),
        updatedBy: user,
        version: editingEntry?.version || 1,
        createdAt: editingEntry?.createdAt || new Date().toISOString(),
        createdBy: editingEntry?.createdBy || user
      };

      if (editingEntry) {
        await updateDoc(doc(db, 'assumptions', editingEntry.id), entryData);
        toast.success(t('entry_updated'));
      } else {
        await addDoc(collection(db, 'assumptions'), entryData);
        toast.success(t('entry_created'));
      }

      setView('list');
    } catch (err) {
      handleFirestoreError(err, editingEntry ? OperationType.UPDATE : OperationType.CREATE, 'assumptions');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(14);
    doc.text(t('assumption_log').toUpperCase(), pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`${t('project')}: ${selectedProject.name}`, 14, 30);

    autoTable(doc, {
      startY: 40,
      head: [[t('description'), t('type'), t('level'), t('owner'), t('status'), t('impact_level')]],
      body: entries.map(e => [
        e.description,
        t(e.type.toLowerCase()),
        t(e.level === 'High' ? 'high_level' : 'low_level'),
        e.ownerName,
        t(e.status.toLowerCase()),
        t(e.impactLevel.toLowerCase())
      ]),
      styles: { font: 'helvetica', fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`AssumptionLog_${selectedProject.code || selectedProject.id}.pdf`);
  };

  const filteredEntries = entries.filter(e => 
    e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getImpactColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'bg-rose-500 text-white';
      case 'High': return 'bg-orange-500 text-white';
      case 'Medium': return 'bg-amber-500 text-white';
      case 'Low': return 'bg-emerald-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  return (
    <StandardProcessPage
      page={page}
      embedded={embedded}
      viewMode={view === 'form' ? 'edit' : 'grid'}
      onViewModeChange={(mode) => setView(mode === 'edit' ? 'form' : 'list')}
      onSave={handleSave}
      onPrint={generatePDF}
      isSaving={isSaving}
    >
      <AnimatePresence mode="wait">
        {view === 'form' ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8 pb-20"
          >
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('description')}</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder={t('description_placeholder')}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('type')}</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  >
                    <option value="Assumption">{t('assumption')}</option>
                    <option value="Constraint">{t('constraint')}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('level')}</label>
                  <select 
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  >
                    <option value="High">{t('high_level')}</option>
                    <option value="Low">{t('low_level')}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('owner')}</label>
                  <select 
                    value={formData.ownerId}
                    onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  >
                    <option value="">{t('select_owner')}</option>
                    {team.map(u => <option key={u.uid} value={u.uid}>{u.name}</option>)}
                    {stakeholders.map(s => <option key={s.id} value={s.id}>{s.name} (Stakeholder)</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('status')}</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  >
                    <option value="Open">{t('open')}</option>
                    <option value="Closed">{t('closed')}</option>
                    <option value="Updated">{t('updated')}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('impact_level')}</label>
                  <select 
                    value={formData.impactLevel}
                    onChange={(e) => setFormData({ ...formData, impactLevel: e.target.value as any })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  >
                    <option value="Low">{t('low')}</option>
                    <option value="Medium">{t('medium')}</option>
                    <option value="High">{t('high')}</option>
                    <option value="Critical">{t('critical')}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('date_identified')}</label>
                  <input 
                    type="date"
                    value={formData.dateIdentified}
                    onChange={(e) => setFormData({ ...formData, dateIdentified: e.target.value })}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder={t('search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>
              <button 
                onClick={handleAdd}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                {t('add_entry')}
              </button>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('description')}</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('type')}</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('level')}</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('owner')}</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('status')}</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('impact')}</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center">
                          <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : filteredEntries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-slate-400 text-xs italic">
                          {t('no_entries_found')}
                        </td>
                      </tr>
                    ) : (
                      filteredEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => handleEdit(entry)}>
                          <td className="px-6 py-4 text-xs font-medium text-slate-900 max-w-xs truncate">{entry.description}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest",
                              entry.type === 'Assumption' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                            )}>
                              {t(entry.type.toLowerCase())}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">
                            {t(entry.level === 'High' ? 'high_level' : 'low_level')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3 text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-600">{entry.ownerName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest",
                              entry.status === 'Open' ? "bg-amber-50 text-amber-600" : 
                              entry.status === 'Closed' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-600"
                            )}>
                              {t(entry.status.toLowerCase())}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn("px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest", getImpactColor(entry.impactLevel))}>
                              {t(entry.impactLevel.toLowerCase())}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleEdit(entry); }}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
          </motion.div>
        )}
      </AnimatePresence>
    </StandardProcessPage>
  );
};
