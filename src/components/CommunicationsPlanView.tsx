import React, { useState, useEffect } from 'react';
import { Page, EntityConfig } from '../types';
import { StandardProcessPage, useStandardProcessPage } from './StandardProcessPage';
import { 
  MessageSquare, 
  Calendar, 
  Mail, 
  FileText, 
  Send, 
  Share2, 
  ClipboardList,
  Plus,
  Loader2,
  Download,
  Trash2
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { UniversalDataTable } from './common/UniversalDataTable';

interface CommunicationsPlanViewProps {
  page: Page;
}

interface CommConfig {
  id: string;
  topic: string;
  audience: string;
  frequency: string;
  method: string;
  owner: string;
  status: string;
  projectId: string;
}

export const CommunicationsPlanView: React.FC<CommunicationsPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t } = useLanguage();
  const context = useStandardProcessPage();
  const [comms, setComms] = useState<CommConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [editingComm, setEditingComm] = useState<CommConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [formData, setFormData] = useState<Partial<CommConfig>>({
    topic: '',
    audience: '',
    frequency: 'Weekly',
    method: 'Meeting',
    owner: '',
    status: 'Active'
  });

  useEffect(() => {
    if (!selectedProject?.id) return;

    const q = query(
      collection(db, 'communications_plan'),
      where('projectId', '==', selectedProject.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComms(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CommConfig)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'communications_plan');
    });

    return () => unsubscribe();
  }, [selectedProject?.id]);

  const handleSave = async () => {
    if (!selectedProject || !formData.topic) {
      toast.error("Please provide a topic");
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        ...formData,
        projectId: selectedProject.id,
        updatedAt: serverTimestamp()
      };

      if (editingComm?.id) {
        await updateDoc(doc(db, 'communications_plan', editingComm.id), data);
        toast.success("Plan updated");
      } else {
        const id = crypto.randomUUID();
        await setDoc(doc(db, 'communications_plan', id), {
          ...data,
          id,
          createdAt: serverTimestamp()
        });
        toast.success("Communication item added");
      }
      setViewMode('grid');
      setEditingComm(null);
    } catch (err) {
      handleFirestoreError(err, editingComm ? OperationType.UPDATE : OperationType.CREATE, 'communications_plan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this communication requirement?")) return;
    try {
      await deleteDoc(doc(db, 'communications_plan', id));
      toast.success("Item removed");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'communications_plan');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const comm = comms.find(c => c.id === id);
      const isArchived = comm?.status === 'Archived';
      await updateDoc(doc(db, 'communications_plan', id), {
        status: isArchived ? 'Active' : 'Archived',
        updatedAt: serverTimestamp()
      });
      toast.success(isArchived ? 'Restored' : 'Archived');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'communications_plan');
    }
  };

  const gridConfig: EntityConfig = {
    id: 'communications_plan' as any,
    label: page.title,
    icon: MessageSquare,
    collection: 'communications_plan',
    columns: [
      { key: 'topic', label: 'Topic / Requirement', type: 'string' },
      { key: 'audience', label: 'Audience', type: 'string' },
      { key: 'frequency', label: 'Frequency', type: 'badge' },
      { key: 'method', label: 'Method', type: 'string' },
      { key: 'owner', label: 'Responsibility', type: 'string' },
       { key: 'status', label: 'Status', type: 'badge' }
    ]
  };

  return (
    <StandardProcessPage
      page={page}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onSave={handleSave}
      isSaving={isSaving}
    >
      <AnimatePresence mode="wait">
        {viewMode === 'edit' ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-10 pb-32"
          >
            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Communication Topic</label>
                  <input 
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="e.g. Weekly Technical Sync"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Target Audience</label>
                  <input 
                    type="text"
                    value={formData.audience}
                    onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Frequency</label>
                  <select 
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Event-driven">Event-driven</option>
                    <option value="As needed">As needed</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Method / Channel</label>
                  <input 
                    type="text"
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    placeholder="e.g. MS Teams / Email"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Ownership / Responsibility</label>
                  <input 
                    type="text"
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col pt-4"
          >
            <UniversalDataTable 
              config={gridConfig}
              data={comms.filter(c => {
                const archived = c.status === 'Archived';
                return showArchived ? archived : !archived;
              })}
              onRowClick={(record) => {
                setEditingComm(record as CommConfig);
                setFormData(record as CommConfig);
                setViewMode('edit');
              }}
              onNewClick={() => {
                setEditingComm(null);
                setFormData({
                  topic: '',
                  audience: '',
                  frequency: 'Weekly',
                  method: 'Meeting',
                  owner: '',
                  status: 'Active'
                });
                setViewMode('edit');
              }}
              onDeleteRecord={handleDelete}
              onArchiveRecord={handleArchive}
              showArchived={showArchived}
              onToggleArchived={() => setShowArchived(!showArchived)}
              title={context?.pageHeader}
              favoriteControl={context?.favoriteControl}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </StandardProcessPage>
  );
};
