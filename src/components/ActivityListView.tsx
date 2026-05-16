import React, { useState, useEffect } from 'react';
import { 
  List, 
  Plus, 
  RefreshCw, 
  ShoppingCart, 
  Loader2, 
  Trash2,
  Package,
  ArrowRight,
  Database,
  History,
  Download,
  Filter
} from 'lucide-react';
import { Page, Activity, BOQItem, WBSLevel, PurchaseOrder, User, Stakeholder, EntityConfig } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, setDoc, doc, query, where, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { StandardProcessPage, useStandardProcessPage } from './StandardProcessPage';
import { UniversalDataTable } from './common/UniversalDataTable';
import { ActivityAttributesModal } from './ActivityAttributesModal';
import { rollupToParent } from '../services/rollupService';

interface ActivityListViewProps {
  page: Page;
}

export const ActivityListView: React.FC<ActivityListViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { t } = useLanguage();
  const context = useStandardProcessPage();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const actUnsubscribe = onSnapshot(
      query(collection(db, 'activities'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setActivities(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
        setLoading(false);
      }
    );

    const boqUnsubscribe = onSnapshot(
      query(collection(db, 'boq'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setBoqItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BOQItem)));
      }
    );

    const wbsUnsubscribe = onSnapshot(
      query(collection(db, 'wbs'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setWbsLevels(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WBSLevel)));
      }
    );

    return () => {
      actUnsubscribe();
      boqUnsubscribe();
      wbsUnsubscribe();
    };
  }, [selectedProject?.id]);

  const generateFromBOQ = async () => {
    if (!selectedProject || boqItems.length === 0) return;
    setIsGenerating(true);

    try {
      for (const item of boqItems) {
        const existing = activities.find(a => a.description === item.description && a.workPackage === item.workPackage);
        if (existing) continue;

        const activity: Activity = {
          id: crypto.randomUUID(),
          projectId: selectedProject.id,
          wbsId: item.wbsId || '',
          boqItemId: item.id,
          workPackage: item.workPackage,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
          division: item.division || '01',
          status: 'Not Started'
        };
        await setDoc(doc(db, 'activities', activity.id), activity);
        
        if (activity.divisionId || activity.wbsId) {
          await rollupToParent('workPackage', activity.divisionId || activity.wbsId!);
        }
      }
      toast.success(t('activities_generated_success'));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'activities');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      const actToDelete = activities.find(a => a.id === id);
      const parentIdToRollup = actToDelete?.divisionId || actToDelete?.wbsId;

      await deleteDoc(doc(db, 'activities', id));
      
      if (parentIdToRollup) {
        await rollupToParent('workPackage', parentIdToRollup);
      }

      toast.success(t('activity_deleted_success'));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'activities');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const activity = activities.find(a => a.id === id);
      const isRecordArchived = activity?.status === 'Archived';
      await updateDoc(doc(db, 'activities', id), {
        status: isRecordArchived ? 'Planned' : 'Archived',
        updatedAt: new Date().toISOString()
      });
      toast.success(isRecordArchived ? 'Activity restored' : 'Activity archived');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'activities');
    }
  };

  const gridConfig: EntityConfig = {
    id: 'activities' as any,
    label: page.title,
    icon: List,
    collection: 'activities',
    columns: [
      { key: 'description', label: 'Description', type: 'string' },
      { key: 'workPackage', label: 'Work Package', type: 'badge' },
      { key: 'amount', label: 'Cost', type: 'currency' },
      { key: 'status', label: 'Status', type: 'badge' },
      { key: 'startDate', label: 'Start', type: 'date' },
      { key: 'finishDate', label: 'Finish', type: 'date' }
    ]
  };

  const extraActions = (
    <div className="flex items-center gap-2">
      <button 
        onClick={generateFromBOQ}
        disabled={isGenerating || boqItems.length === 0}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
      >
        {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        {t('generate_from_boq')}
      </button>
    </div>
  );

  if (loading) return null;

  return (
    <StandardProcessPage
      page={page}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onSave={() => editingActivity && setEditingActivity(null)}
      isSaving={false}
      inputs={page.details?.inputs?.map(id => ({ id, title: id })) || []}
    >
      <div className="flex-1 flex flex-col">
        <UniversalDataTable 
          config={gridConfig}
          data={activities.filter(a => {
            const isArchived = a.status === 'Archived';
            return showArchived ? isArchived : !isArchived;
          })}
          onRowClick={(record) => {
            setEditingActivity(record as Activity);
          }}
          onNewClick={() => {
            setEditingActivity({
              id: crypto.randomUUID(),
              projectId: selectedProject?.id || '',
              wbsId: '',
              workPackage: '',
              description: '',
              unit: 'EA',
              quantity: 1,
              rate: 0,
              amount: 0,
              status: 'Planned'
            } as Activity);
          }}
          onDeleteRecord={handleDelete}
          onArchiveRecord={handleArchive}
          showArchived={showArchived}
          onToggleArchived={() => setShowArchived(!showArchived)}
          title={context?.pageHeader}
          favoriteControl={context?.favoriteControl}
          extraActions={extraActions}
        />
      </div>

      <AnimatePresence>
        {editingActivity && (
          <ActivityAttributesModal 
            activity={editingActivity}
            onClose={() => setEditingActivity(null)}
            onSave={async (updatedActivity) => {
              try {
                await setDoc(doc(db, 'activities', updatedActivity.id), updatedActivity);
                if (updatedActivity.divisionId || updatedActivity.wbsId) {
                  await rollupToParent('workPackage', updatedActivity.divisionId || updatedActivity.wbsId!);
                }
                setEditingActivity(null);
                toast.success(t('activity_saved_success'));
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, 'activities');
              }
            }}
            boqItems={boqItems}
            wbsLevels={wbsLevels}
            allActivities={activities}
          />
        )}
      </AnimatePresence>
    </StandardProcessPage>
  );
};
