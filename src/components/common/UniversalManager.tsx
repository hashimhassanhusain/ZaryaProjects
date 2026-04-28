import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useProject } from '../../context/ProjectContext';
import { EntityType } from '../../types';
import { ENTITY_REGISTRY } from '../../data/entityRegistry';
import { UniversalDataTable } from './UniversalDataTable';
import { UniversalRecordDetail } from './UniversalRecordDetail';
import { toast } from 'react-hot-toast';

import { rollupToParent, RollupLevel } from '../../services/rollupService';

interface UniversalManagerProps {
  entityType: EntityType;
}

export const UniversalManager: React.FC<UniversalManagerProps> = ({ entityType }) => {
  const { selectedProject } = useProject();
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [data, setData] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const config = ENTITY_REGISTRY[entityType];

  useEffect(() => {
    if (!selectedProject || !config) return;

    setLoading(true);
    const q = query(
      collection(db, config.collection),
      where('projectId', '==', selectedProject.id),
      // If it's a log entry, filter by sub-type
      ...(config.collection === 'projectLogs' ? [where('type', '==', config.id)] : [])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setData(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [entityType, selectedProject?.id]);

  const handleSave = async (recordData: any) => {
    if (!selectedProject) return;

    try {
      const finalData = {
        ...recordData,
        projectId: selectedProject.id,
        updatedAt: serverTimestamp(),
        // Add type for generic log entries
        ...(config.collection === 'projectLogs' ? { type: config.id } : {})
      };

      let docId = recordData.id;
      if (recordData.id) {
        await updateDoc(doc(db, config.collection, recordData.id), finalData);
        toast.success(`${config.label} updated successfully`);
      } else {
        const docRef = await addDoc(collection(db, config.collection), {
          ...finalData,
          createdAt: serverTimestamp()
        });
        docId = docRef.id;
        toast.success(`New ${config.label} created`);
      }

      // --- Trigger Rollup ---
      if (config.collection === 'purchaseOrders' && finalData.activityId) {
        await rollupToParent('po', finalData.activityId);
      } else if (config.collection === 'activities' && (finalData.divisionId || finalData.wbsId)) {
        await rollupToParent('workPackage', finalData.divisionId || finalData.wbsId);
      } else if (config.collection === 'wbs' && finalData.parentId) {
        await rollupToParent('division', finalData.parentId);
      }

      setView('list');
    } catch (error) {
      console.error('Error saving record:', error);
      toast.error('Failed to save record');
    }
  };

  const handleSaveAsNew = async (recordData: any) => {
    const { id, ...newData } = recordData;
    await handleSave(newData);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      const recordToDelete = data.find(r => r.id === id);
      await deleteDoc(doc(db, config.collection, id));
      toast.success('Record deleted');

      // --- Trigger Rollup After Delete ---
      if (recordToDelete) {
        if (config.collection === 'purchaseOrders' && recordToDelete.activityId) {
          await rollupToParent('po', recordToDelete.activityId);
        } else if (config.collection === 'activities' && (recordToDelete.divisionId || recordToDelete.wbsId)) {
          await rollupToParent('workPackage', recordToDelete.divisionId || recordToDelete.wbsId);
        } else if (config.collection === 'wbs' && recordToDelete.parentId) {
          await rollupToParent('division', recordToDelete.parentId);
        }
      }
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  if (!config) return <div className="p-8 text-rose-500">Configuration missing for {entityType}</div>;

  return (
    <div className="h-full">
      {view === 'list' ? (
        <UniversalDataTable 
          config={config}
          data={data}
          onRowClick={(record) => {
            setSelectedRecord(record);
            setView('detail');
          }}
          onNewClick={() => {
            setSelectedRecord({});
            setView('detail');
          }}
          onDeleteRecord={handleDelete}
        />
      ) : (
        <UniversalRecordDetail 
          config={config}
          initialData={selectedRecord}
          onSave={handleSave}
          onSaveAsNew={handleSaveAsNew}
          onCancel={() => setView('list')}
          onUploadToDrive={(data) => toast('Integration with Drive Coming Soon', { icon: '☁️' })}
          onPreviewPDF={(data) => toast('PDF Preview Triggered', { icon: '📄' })}
        />
      )}
    </div>
  );
};
