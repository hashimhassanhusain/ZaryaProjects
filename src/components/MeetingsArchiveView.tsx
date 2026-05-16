import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  AlertCircle
} from 'lucide-react';
import { Meeting, Project, EntityConfig } from '../types';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useLanguage } from '../context/LanguageContext';
import { UniversalDataTable } from './common/UniversalDataTable';
import { toast } from 'react-hot-toast';
import { handleFirestoreError, OperationType } from '../firebase';

interface MeetingsArchiveViewProps {
  project: Project | null;
  onNewMeeting: () => void;
  onViewMeeting: (meeting: Meeting) => void;
}

export const MeetingsArchiveView: React.FC<MeetingsArchiveViewProps> = ({ project, onNewMeeting, onViewMeeting }) => {
  const { t } = useLanguage();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!project || !project.id) return;

    const q = query(
      collection(db, 'meetings'),
      where('projectId', '==', project.id),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Meeting)));
    });

    return () => unsubscribe();
  }, [project?.id]);

  const handleArchiveMeeting = async (meeting: Meeting) => {
    try {
      const isArchived = (meeting as any).archived || false;
      await updateDoc(doc(db, 'meetings', meeting.id), {
        archived: !isArchived,
        updatedAt: serverTimestamp()
      });
      toast.success(!isArchived ? 'Meeting archived' : 'Meeting restored');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'meetings');
    }
  };

  const filteredMeetings = meetings.filter(m => {
    const isArchived = (m as any).archived || false;
    return showArchived ? isArchived : !isArchived;
  });

  const gridConfig: EntityConfig = {
    id: 'meetings',
    label: t('meetings'),
    icon: Calendar,
    collection: 'meetings',
    columns: [
      { key: 'title', label: t('title'), type: 'string' },
      { key: 'date', label: t('date'), type: 'date' },
      { key: 'time', label: t('time'), type: 'string' },
      { key: 'type', label: t('type'), type: 'badge' },
      { key: 'location', label: t('location'), type: 'string' },
      { key: 'status', label: t('status'), type: 'badge' }
    ]
  };

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
        <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-900">{t('select_project_first')}</h3>
        <p className="text-slate-500">{t('select_project_hint')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <UniversalDataTable 
        config={gridConfig}
        data={filteredMeetings}
        onRowClick={(record) => onViewMeeting(record as Meeting)}
        onNewClick={onNewMeeting}
        onDeleteRecord={async (id) => {
          try {
            await deleteDoc(doc(db, 'meetings', id));
            toast.success('Meeting deleted');
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, 'meetings');
          }
        }}
        onArchiveRecord={handleArchiveMeeting}
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived(!showArchived)}
      />
    </div>
  );
};
