import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Page, EntityConfig } from '../types';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  FileText, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Download,
  Printer,
  Edit2,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { DetailView } from './DetailView';
import { StandardProcessPage, useStandardProcessPage } from './StandardProcessPage';
import { UniversalDataTable } from './common/UniversalDataTable';

interface LogManagementViewProps {
  page: Page;
}

interface LogEntry {
  id: string;
  data: Record<string, any>;
  createdAt: any;
  createdBy: string;
  status: string;
}

export const LogManagementView: React.FC<LogManagementViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t } = useLanguage();
  const context = useStandardProcessPage();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingEntry, setEditingEntry] = useState<LogEntry | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!selectedProject || !page.id) return;

    const q = query(
      collection(db, 'project_records'),
      where('projectId', '==', selectedProject.id),
      where('pageId', '==', page.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as LogEntry));
      setEntries(docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `project_records/${page.id}`);
    });

    return () => unsubscribe();
  }, [selectedProject?.id, page.id]);

  const handleAdd = () => {
    setEditingEntry(null);
    setView('form');
  };

  const handleEdit = (entry: LogEntry) => {
    setEditingEntry(entry);
    setView('form');
  };

  const handleDelete = async (id: string) => {
    toast((toastRef) => (
      <div className="flex flex-col gap-4 text-slate-900">
        <p className="text-sm font-bold">Are you sure you want to delete this record?</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(toastRef.id)}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(toastRef.id);
              try {
                await deleteDoc(doc(db, 'project_records', id));
                toast.success('Record deleted successfully');
              } catch (err) {
                handleFirestoreError(err, OperationType.DELETE, `project_records/${id}`);
              }
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
          >
            Delete
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  const handleArchive = async (id: string) => {
    try {
      const entry = entries.find(e => e.id === id);
      const isArchived = (entry as any)?.archived || false;
      await updateDoc(doc(db, 'project_records', id), {
        archived: !isArchived,
        updatedAt: new Date().toISOString()
      });
      toast.success(!isArchived ? 'Record archived' : 'Record restored');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `project_records/${id}`);
    }
  };

  const gridConfig: EntityConfig = {
    id: page.id as any,
    label: page.title,
    icon: FileText,
    collection: 'project_records',
    columns: (page.formFields || []).map(f => ({
      key: f,
      label: f,
      type: 'string'
    }))
  };

  const flattenedData = entries
    .filter(entry => {
      const isArchived = (entry as any).archived || false;
      return showArchived ? isArchived : !isArchived;
    })
    .map(entry => ({
      id: entry.id,
      status: entry.status,
      archived: (entry as any).archived || false,
      ...entry.data
    }));

  return (
    <StandardProcessPage
      page={page}
      viewMode={view === 'form' ? 'edit' : 'grid'}
      onViewModeChange={(mode) => setView(mode === 'edit' ? 'form' : 'list')}
      onSave={() => {}} // DetailView handles save
    >
      <AnimatePresence mode="wait">
        {view === 'form' ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <DetailView page={page} />
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
              data={flattenedData}
              onRowClick={(row) => handleEdit(entries.find(e => e.id === row.id)!)}
              onNewClick={handleAdd}
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
