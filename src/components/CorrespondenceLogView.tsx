import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  Plus, 
  Trash2, 
  FileText,
  Printer,
  Loader2,
  ArrowLeft,
  Briefcase,
  History,
  Search,
  PlusCircle,
  FilePlus,
  Send,
  Inbox,
  Clock,
  User,
  ExternalLink,
  Save
} from 'lucide-react';
import { Page, EntityConfig } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  collection, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query,
  where,
  addDoc,
  deleteDoc,
  orderBy
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { StandardProcessPage } from './StandardProcessPage';
import { UniversalDataTable } from './common/UniversalDataTable';
import { DriveUploadButton } from './common/DriveUploadButton';

interface CorrespondenceLogViewProps {
  page: Page;
}

interface CorrespondenceEntry {
  id: string;
  refNumber: string;
  type: 'Incoming' | 'Outgoing';
  subject: string;
  sender: string;
  recipient: string;
  date: string;
  status: 'Open' | 'Closed' | 'Pending Response';
  priority: 'High' | 'Medium' | 'Low';
  description: string;
  attachments?: string[];
  version: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export const CorrespondenceLogView: React.FC<CorrespondenceLogViewProps> = ({ page }) => {
  const { t, language, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [records, setRecords] = useState<CorrespondenceEntry[]>([]);
  const [versions, setVersions] = useState<any[]>([]);

  const [formData, setFormData] = useState<Partial<CorrespondenceEntry>>({
    refNumber: '',
    type: 'Incoming',
    subject: '',
    sender: '',
    recipient: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Open',
    priority: 'Medium',
    description: '',
    version: '1.0'
  });

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'correspondence_log'), 
      where('projectId', '==', selectedProject.id),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CorrespondenceEntry));
      setRecords(data);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'correspondence_log');
    });

    return () => unsub();
  }, [selectedProject?.id]);

  useEffect(() => {
    if (selectedRecordId && viewMode === 'edit') {
      const record = records.find(r => r.id === selectedRecordId);
      if (record) {
        setFormData(record);
        
        // Fetch versions
        const vQuery = query(
          collection(db, 'correspondence_log_versions'),
          where('reportEntryId', '==', selectedRecordId),
          orderBy('version', 'desc')
        );
        const unsubVersions = onSnapshot(vQuery, (snap) => {
          setVersions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsubVersions();
      }
    } else if (!selectedRecordId && viewMode === 'edit') {
      const nextRef = `COR-${(records.length + 1).toString().padStart(3, '0')}`;
      setFormData({
        refNumber: nextRef,
        type: 'Incoming',
        subject: '',
        sender: '',
        recipient: '',
        date: new Date().toISOString().split('T')[0],
        status: 'Open',
        priority: 'Medium',
        description: '',
        version: '1.0'
      });
      setVersions([]);
    }
  }, [selectedRecordId, viewMode, records]);

  const handleArchive = async (record: CorrespondenceEntry) => {
    try {
      const isArchived = (record as any).archived || false;
      await updateDoc(doc(db, 'correspondence_log', record.id), {
        archived: !isArchived,
        updatedAt: new Date().toISOString()
      });
      toast.success(!isArchived ? 'Record archived' : 'Record restored');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'correspondence_log');
    }
  };

  const filteredRecords = records.filter(r => {
    const isArchived = (r as any).archived || false;
    return showArchived ? isArchived : !isArchived;
  });

  const handleSave = async (isNew: boolean = false) => {
    if (!selectedProject) return;
    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      const nextVersion = isNew ? (parseFloat(formData.version || '1.0') + 0.1).toFixed(1) : (formData.version || '1.0');
      
      const entryData = {
        ...formData,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: nextVersion,
        createdAt: formData.createdAt || timestamp
      };

      let docRef;
      if (!selectedRecordId) {
        docRef = await addDoc(collection(db, 'correspondence_log'), {
          ...entryData,
          createdAt: timestamp
        });
      } else {
        docRef = doc(db, 'correspondence_log', selectedRecordId);
        await updateDoc(docRef, entryData);
      }

      // Save versioning snapshot
      await addDoc(collection(db, 'correspondence_log_versions'), {
        reportEntryId: selectedRecordId || docRef.id,
        version: nextVersion,
        timestamp,
        userId: auth.currentUser?.uid || 'system',
        userName: user,
        data: entryData,
        changeSummary: isNew ? 'Created New Revision' : 'Updated Data'
      });

      toast.success(isNew ? 'New revision created' : 'Correspondence updated');
      setViewMode('grid');
      setSelectedRecordId(null);
    } catch (err) {
      handleFirestoreError(err, selectedRecordId ? OperationType.UPDATE : OperationType.CREATE, 'correspondence_log');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      await deleteDoc(doc(db, 'correspondence_log', id));
      toast.success('Record deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'correspondence_log');
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const docObj = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = docObj.internal.pageSize.width;

    docObj.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
    
    docObj.setFontSize(14);
    docObj.setFont('helvetica', 'bold');
    docObj.text('OFFICIAL CORRESPONDENCE LOG', pageWidth / 2, 35, { align: 'center' });
    
    autoTable(docObj, {
      startY: 45,
      body: [
        ['Project:', selectedProject.name, 'Ref Number:', formData.refNumber || 'N/A'],
        ['Subject:', formData.subject || 'N/A', 'Date:', formData.date || 'N/A'],
        ['Sender:', formData.sender || 'N/A', 'Recipient:', formData.recipient || 'N/A'],
        ['Priority:', formData.priority || 'Medium', 'Status:', formData.status || 'Open']
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30 }, 2: { fontStyle: 'bold', cellWidth: 30 } }
    });

    docObj.setFont('helvetica', 'bold');
    docObj.text('Description / Contents:', margin, (docObj as any).lastAutoTable.finalY + 10);
    docObj.setFont('helvetica', 'normal');
    docObj.setFontSize(9);
    const splitDesc = docObj.splitTextToSize(formData.description || '', pageWidth - 2 * margin);
    docObj.text(splitDesc, margin, (docObj as any).lastAutoTable.finalY + 15);

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    docObj.save(`${selectedProject.code}-CORRESPONDENCE-${formData.refNumber}-${dateStr}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const gridConfig: EntityConfig = {
    id: 'correspondence_log',
    label: t('official_correspondence_log'),
    icon: FilePlus,
    collection: 'correspondence_log',
    columns: [
      { key: 'refNumber', label: 'Ref #', type: 'badge' },
      { key: 'type', label: 'Type', type: 'badge' },
      { key: 'subject', label: 'Subject', type: 'string' },
      { key: 'sender', label: 'Sender', type: 'string' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'badge' },
      { key: 'updatedBy', label: 'Last Updated By', type: 'string' }
    ]
  };

  const driveActions = (
    <div className="flex items-center gap-2">
      <DriveUploadButton 
        drivePath="0_Transmittals_and_Audit_Trail/0.1_Incoming_Transmittals/0.1.1_Emails" 
        label="Emails" 
      />
      <DriveUploadButton 
        drivePath="0_Transmittals_and_Audit_Trail/0.2_Outgoing_Transmittals/0.2.1_RFIs" 
        label="RFIs" 
      />
      <DriveUploadButton 
        drivePath="0_Transmittals_and_Audit_Trail/0.2_Outgoing_Transmittals/0.2.2_Submittals" 
        label="Submittals" 
      />
    </div>
  );

  return (
    <StandardProcessPage
      page={page}
      onSave={() => handleSave(false)}
      onPrint={generatePDF}
      isSaving={isSaving}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      actions={driveActions}
    >
      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="min-h-[400px] flex flex-col"
            >
              <UniversalDataTable 
                config={gridConfig}
                data={filteredRecords}
                onRowClick={(record) => {
                  setSelectedRecordId(record.id);
                  setViewMode('edit');
                }}
                onNewClick={() => {
                  setSelectedRecordId(null);
                  setViewMode('edit');
                }}
                onDeleteRecord={handleDelete}
                onArchiveRecord={handleArchive}
                showArchived={showArchived}
                onToggleArchived={() => setShowArchived(!showArchived)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="edit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex justify-end pr-2">
                 <button 
                   onClick={() => setViewMode('grid')}
                   className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 text-neutral-600 rounded-xl text-[10px] font-bold hover:bg-neutral-200 transition-all uppercase tracking-wider shadow-sm"
                 >
                   <ArrowLeft className="w-3.5 h-3.5" />
                   {t('back_to_list')}
                 </button>
              </div>

              {/* Correspondence Canvas */}
              <section className="bg-white rounded-[3rem] border border-neutral-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center shadow-lg shadow-neutral-900/20">
                      <FilePlus className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Correspondence Details</h2>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Official Record Management</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex bg-white rounded-xl border border-neutral-200 p-1 shadow-sm">
                      <button 
                        onClick={() => setFormData({ ...formData, type: 'Incoming' })}
                        className={cn(
                          "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                          formData.type === 'Incoming' ? "bg-neutral-900 text-white shadow-md shadow-neutral-200" : "text-neutral-400 hover:text-neutral-600"
                        )}
                      >
                        <Inbox className="w-3 h-3" />
                        Incoming
                      </button>
                      <button 
                        onClick={() => setFormData({ ...formData, type: 'Outgoing' })}
                        className={cn(
                          "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                          formData.type === 'Outgoing' ? "bg-neutral-900 text-white shadow-md shadow-neutral-200" : "text-neutral-400 hover:text-neutral-600"
                        )}
                      >
                        <Send className="w-3 h-3" />
                        Outgoing
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-10 space-y-10">
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                      <div className="lg:col-span-1 space-y-8">
                         <div className="space-y-4">
                            <div className="flex items-center gap-2 text-neutral-900 mb-2 border-b border-neutral-100 pb-3">
                              <History className="w-4 h-4 text-blue-600" />
                              <h3 className="text-[10px] font-black uppercase tracking-widest">Reference Data</h3>
                            </div>
                            <div className="space-y-4">
                               <div className="space-y-1.5">
                                  <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Reference Number</label>
                                  <input 
                                    type="text"
                                    value={formData.refNumber}
                                    onChange={(e) => setFormData({ ...formData, refNumber: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-neutral-500/5 transition-all"
                                  />
                               </div>
                               <div className="space-y-1.5">
                                  <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Correspondence Date</label>
                                  <input 
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-neutral-500/5 transition-all"
                                  />
                               </div>
                            </div>
                         </div>

                         <div className="space-y-4 pt-4">
                            <div className="flex items-center gap-2 text-neutral-900 mb-2 border-b border-neutral-100 pb-3">
                              <PlusCircle className="w-4 h-4 text-emerald-600" />
                              <h3 className="text-[10px] font-black uppercase tracking-widest">Status & Priority</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-1.5">
                                  <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Priority</label>
                                  <select 
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                                    className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none shadow-sm"
                                  >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                  </select>
                               </div>
                               <div className="space-y-1.5">
                                  <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Status</label>
                                  <select 
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                    className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none shadow-sm"
                                  >
                                    <option value="Open">Open</option>
                                    <option value="Pending Response">Pending Response</option>
                                    <option value="Closed">Closed</option>
                                  </select>
                               </div>
                            </div>
                         </div>
                      </div>

                      <div className="lg:col-span-2 space-y-8">
                         <div className="space-y-4">
                            <div className="flex items-center gap-2 text-neutral-900 mb-2 border-b border-neutral-100 pb-3">
                              <User className="w-4 h-4 text-blue-600" />
                              <h3 className="text-[10px] font-black uppercase tracking-widest">Parties involved</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                               <div className="space-y-1.5">
                                  <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Sender</label>
                                  <input 
                                    type="text"
                                    placeholder="Entity / Name"
                                    value={formData.sender}
                                    onChange={(e) => setFormData({ ...formData, sender: e.target.value })}
                                    className="w-full px-6 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-neutral-500/5 transition-all shadow-sm"
                                  />
                               </div>
                               <div className="space-y-1.5">
                                  <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Recipient</label>
                                  <input 
                                    type="text"
                                    placeholder="Entity / Name"
                                    value={formData.recipient}
                                    onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                                    className="w-full px-6 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-neutral-500/5 transition-all shadow-sm"
                                  />
                               </div>
                            </div>
                         </div>

                         <div className="space-y-6 pt-4">
                            <div className="space-y-1.5">
                               <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Subject</label>
                               <input 
                                 type="text"
                                 placeholder="Core topic of correspondence..."
                                 value={formData.subject}
                                 onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                 className="w-full px-6 py-5 bg-white border border-neutral-200 rounded-[2rem] text-lg font-black tracking-tight outline-none focus:ring-8 focus:ring-blue-500/5 transition-all shadow-sm"
                               />
                            </div>
                            <div className="space-y-1.5">
                               <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Description / Key Notes</label>
                               <textarea 
                                 rows={6}
                                 placeholder="Detail the contents or required actions..."
                                 value={formData.description}
                                 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                 className="w-full px-8 py-8 bg-neutral-50 border border-neutral-100 rounded-[2.5rem] text-sm font-medium leading-relaxed outline-none focus:ring-8 focus:ring-neutral-500/5 transition-all shadow-inner"
                               />
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* History Stack */}
                {versions.length > 0 && (
                  <div className="p-8 border-t border-neutral-100 bg-neutral-50/30">
                     <div className="flex items-center gap-2 mb-6">
                        <History className="w-4 h-4 text-neutral-400" />
                        <h3 className="text-[10px] font-bold text-neutral-900 uppercase tracking-widest">Snapshot History</h3>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {versions.map(v => (
                          <div 
                            key={v.id} 
                            onClick={() => setFormData(v.data as CorrespondenceEntry)}
                            className="p-5 bg-white border border-neutral-200 rounded-3xl hover:border-blue-500 transition-all cursor-pointer group flex items-start gap-4 shadow-sm hover:shadow-md"
                          >
                             <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all font-black text-xs">
                                v{v.version}
                             </div>
                             <div className="min-w-0">
                                <div className="text-[10px] font-black text-neutral-900 uppercase tracking-tight truncate">{v.changeSummary}</div>
                                <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest mt-1">{v.userName} • {new Date(v.timestamp).toLocaleDateString()}</div>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
                )}

                <div className="bg-neutral-900 p-8 flex items-center justify-between border-t border-neutral-800">
                   <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Version Control</span>
                        <span className="text-xl font-black text-white italic tracking-tighter">v{formData.version}</span>
                      </div>
                      <div className="w-px h-10 bg-neutral-800" />
                      <div className="flex gap-4">
                         <div className="px-5 py-2 bg-white/5 rounded-xl border border-white/10 flex flex-col">
                            <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">Type</span>
                            <span className="text-xs font-bold text-white">{formData.type}</span>
                         </div>
                         <div className="px-5 py-2 bg-white/5 rounded-xl border border-white/10 flex flex-col">
                            <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">Status</span>
                            <span className="text-xs font-bold text-emerald-400">{formData.status}</span>
                         </div>
                      </div>
                   </div>
                   <div className="flex gap-4">
                      {selectedRecordId && (
                        <button 
                          onClick={() => handleSave(true)}
                          className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all border border-white/10"
                        >
                          Save New Rev
                        </button>
                      )}
                      <button 
                        onClick={() => handleSave(false)}
                        className="px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-2xl shadow-blue-500/20 flex items-center gap-2"
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {selectedRecordId ? 'Update Record' : 'Log Correspondence'}
                      </button>
                   </div>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StandardProcessPage>
  );
};
