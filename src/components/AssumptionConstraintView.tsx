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
  Loader2,
  FileText
} from 'lucide-react';
import { Page, AssumptionEntry, Stakeholder, User as UserType, EntityConfig } from '../types';
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
import { generateStandardPDF } from '../lib/pdfService';
import { StandardProcessPage, useStandardProcessPage } from './StandardProcessPage';
import { UniversalDataTable } from './common/UniversalDataTable';

interface AssumptionConstraintViewProps {
  page: Page;
  embedded?: boolean;
}

export const AssumptionConstraintView: React.FC<AssumptionConstraintViewProps> = ({ page, embedded = false }) => {
  const { selectedProject } = useProject();
  const { t, isRtl, language } = useLanguage();
  const [entries, setEntries] = useState<AssumptionEntry[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [team, setTeam] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [editingEntry, setEditingEntry] = useState<AssumptionEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

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

  const isArchivedState = (formData as any).status === 'Archived';

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

    const unsubEntries = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssumptionEntry)));
      setLoading(false);
    });

    const unsubStakeholders = onSnapshot(sq, (snapshot) => {
      setStakeholders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stakeholder)));
    });

    const unsubTeam = onSnapshot(collection(db, 'users'), (snapshot) => {
      setTeam(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserType)));
    });

    return () => {
      unsubEntries();
      unsubStakeholders();
      unsubTeam();
    };
  }, [selectedProject?.id]);

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

      setViewMode('grid');
    } catch (err) {
      handleFirestoreError(err, editingEntry ? OperationType.UPDATE : OperationType.CREATE, 'assumptions');
    } finally {
      setIsSaving(false);
    }
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

  const handleArchive = async (id: string) => {
    try {
      const entry = entries.find(e => e.id === id);
      const isRecordArchived = entry?.status === 'Archived';
      await updateDoc(doc(db, 'assumptions', id), {
        status: isRecordArchived ? 'Open' : 'Archived',
        updatedAt: new Date().toISOString()
      });
      toast.success(isRecordArchived ? 'Entry restored' : 'Entry archived');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'assumptions');
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    
    const columns = [t('description'), t('type'), t('level'), t('owner'), t('status'), t('impact_level')];
    const rows = entries.map(e => [
      e.description,
      t(e.type.toLowerCase()),
      t(e.level === 'High' ? 'high_level' : 'low_level'),
      e.ownerName,
      t(e.status.toLowerCase()),
      t(e.impactLevel.toLowerCase())
    ]);

    generateStandardPDF({
      page,
      project: selectedProject,
      data: entries,
      columns,
      rows
    });
  };

  const gridConfig: EntityConfig = {
    id: 'assumptions',
    label: t('assumption_log'),
    icon: FileText,
    collection: 'assumptions',
    columns: [
      { key: 'description', label: t('description'), type: 'string' },
      { key: 'type', label: t('type'), type: 'status' },
      { key: 'level', label: t('level'), type: 'string' },
      { key: 'ownerName', label: t('owner'), type: 'string' },
      { key: 'status', label: t('status'), type: 'status' },
      { key: 'impactLevel', label: t('impact'), type: 'status' },
    ]
  };

  return (
    <StandardProcessPage
      page={page}
      embedded={embedded}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onSave={handleSave}
      onPrint={generatePDF}
      isSaving={isSaving}
      inputs={[
        { id: '1.1.1', title: 'Project Charter' },
        { id: '1.2.1', title: 'Stakeholder Register' }
      ]}
    >
      <AnimatePresence mode="wait">
        {viewMode === 'edit' ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8 pb-20"
          >
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm relative">
              {isArchivedState && (
                <div className="absolute top-0 left-0 right-0 bg-amber-500/10 border-b border-amber-500/20 py-4 px-8 flex items-center gap-3 z-10 font-bold uppercase text-[10px] text-amber-600 tracking-widest leading-none rounded-t-[2rem]">
                   <ShieldAlert className="w-4 h-4" /> ARCHIVED ENTRY Snapshot
                </div>
              )}
              <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", isArchivedState && "pt-12")}>
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('description')}</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={isArchivedState}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                    placeholder={t('description_placeholder')}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('type')}</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    disabled={isArchivedState}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none disabled:opacity-50"
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
                    disabled={isArchivedState}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none disabled:opacity-50"
                  >
                    <option value="Open">{t('open')}</option>
                    <option value="Closed">{t('closed')}</option>
                    <option value="Updated">{t('updated')}</option>
                    <option value="Archived">{t('archived') || 'Archived'}</option>
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
            <UniversalDataTable 
              config={gridConfig}
              data={entries.filter(e => {
                const isArchived = e.status === 'Archived';
                return showArchived ? isArchived : !isArchived;
              })}
              onRowClick={(record) => {
                setEditingEntry(record);
                setFormData({ ...record });
                setViewMode('edit');
              }}
              onNewClick={() => {
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
                setViewMode('edit');
              }}
              onDeleteRecord={handleDelete}
              onArchiveRecord={handleArchive}
              showArchived={showArchived}
              onToggleArchived={() => setShowArchived(!showArchived)}
              title={useStandardProcessPage()?.pageHeader}
              favoriteControl={useStandardProcessPage()?.favoriteControl}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </StandardProcessPage>
  );
};
