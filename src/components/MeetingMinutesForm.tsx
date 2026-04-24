import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Save,
  Printer,
  ChevronRight,
  Search,
  MessageSquare,
  RefreshCw,
  Target,
  ArrowRight,
  ExternalLink,
  Check,
  X,
  FileText,
  Shield,
  Briefcase,
  Cloud,
  Download,
  HardDrive
} from 'lucide-react';
import { Meeting, MeetingAgendaItem, MeetingTask, MeetingDecision, Project, User, Stakeholder, WBSLevel, Task } from '../types';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MeetingMinutesFormProps {
  project: Project;
  meeting?: Meeting;
  onSave: (data: Partial<Meeting>) => void;
  onCancel: () => void;
}

export const MeetingMinutesForm: React.FC<MeetingMinutesFormProps> = ({ project, meeting, onSave, onCancel }) => {
  const { t, isRtl, language } = useLanguage();
  const [formData, setFormData] = useState<Partial<Meeting>>(meeting || {
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    location: '',
    type: 'General',
    attendeeIds: [],
    agenda: [],
    decisions: [],
    notes: '',
    status: 'Draft'
  });

  const [users, setUsers] = useState<User[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [internalSearch, setInternalSearch] = useState('');
  const [externalSearch, setExternalSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // PDF Preview & Drive states
  const [showPdfConfirm, setShowPdfConfirm] = useState(false);
  const [pdfPreviewBlob, setPdfPreviewBlob] = useState<Blob | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('');
  const [pendingDrivePath, setPendingDrivePath] = useState('');
  const [newMeetingId, setNewMeetingId] = useState<string | null>(null);

  const [showInternalDropdown, setShowInternalDropdown] = useState(false);
  const [showExternalDropdown, setShowExternalDropdown] = useState(false);

  useEffect(() => {
    const uUnsubscribe = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as User)));
    });

    const sUnsubscribe = onSnapshot(
      query(collection(db, 'stakeholders'), where('projectId', '==', project.id)),
      (snap) => {
        setStakeholders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Stakeholder)));
      }
    );

    const wUnsubscribe = onSnapshot(
      query(collection(db, 'wbs'), where('projectId', '==', project.id)),
      (snap) => {
        setWbsLevels(snap.docs.map(d => ({ id: d.id, ...d.data() } as WBSLevel)));
      }
    );

    return () => {
      uUnsubscribe();
      sUnsubscribe();
      wUnsubscribe();
    };
  }, [project.id]);

  const addAgendaItem = () => {
    const newItem: MeetingAgendaItem = { id: crypto.randomUUID(), topic: '', isCompleted: false };
    setFormData(prev => ({ ...prev, agenda: [...(prev.agenda || []), newItem] }));
  };

  const addDecision = () => {
    const newItem: MeetingDecision = { id: crypto.randomUUID(), decision: '', category: 'Civil', responsibleParty: '', dueDate: '' };
    setFormData(prev => ({ ...prev, decisions: [...(prev.decisions || []), newItem] }));
  };

  const toggleAttendee = (id: string) => {
    setFormData(prev => {
      const current = Array.from(new Set(prev.attendeeIds || []));
      const next = current.includes(id) 
        ? current.filter(a => a !== id)
        : [...current, id];
      return { ...prev, attendeeIds: next };
    });
  };

  const generatePDFBlob = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('ZARYA', 20, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const typeLabel = (formData.type || 'General').toUpperCase();
    doc.text(`MEETING MINUTES | ${typeLabel}`, pageWidth - 20, 25, { align: 'right' });
    
    // Project Info
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.text(formData.title || 'Untitled Meeting', 20, 55);
    
    doc.setFontSize(10);
    doc.text(`Project: ${project.name} (${project.code})`, 20, 65);
    doc.text(`Date: ${formData.date} | Time: ${formData.time}`, 20, 72);
    doc.text(`Location: ${formData.location}`, 20, 79);
    
    // Attendance Table
    const attendeeNames = formData.attendeeIds?.map(id => {
      const u = users.find(u => u.uid === id);
      const s = stakeholders.find(s => s.id === id);
      return u ? u.name : (s ? s.name : 'Unknown');
    }) || [];

    autoTable(doc, {
      startY: 90,
      head: [['Attendance / الحضور']],
      body: attendeeNames.map(name => [name]),
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    });

    // Agenda Table
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Agenda Topic / موضوع الأجندة', 'Status']],
      body: formData.agenda?.map(a => [a.topic, a.isCompleted ? 'Completed' : 'Pending']) || [],
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    });

    // Decisions & Action Items Table
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Decision & Action Item / القرار والمهمة', 'Category', 'Responsible', 'Due Date']],
      body: formData.decisions?.map(d => [d.decision, d.category, d.responsibleParty, d.dueDate || '-']) || [],
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 80 } }
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Generated by Zarya Project Management System', pageWidth / 2, 285, { align: 'center' });

    const fileName = `${project.code}-ZRY-MEETING-${typeLabel.replace(/\s+/g, '_')}-${formData.date}.pdf`;
    const blob = doc.output('blob');
    
    // Determine path based on meeting type matching server.ts structure
    let path = 'MEETINGS_LOG_05/05.2_Internal_Technical_Meetings';
    if (formData.type?.toLowerCase().includes('client')) {
      path = 'MEETINGS_LOG_05/05.1_Client_Meetings';
    } else if (formData.type?.toLowerCase().includes('subcon')) {
      path = 'MEETINGS_LOG_05/05.3_Subcontractor_Meetings';
    }

    return { blob, fileName, path };
  };

  const uploadToDrive = async () => {
    if (!pdfPreviewBlob || !project.driveFolderId) {
      if (!project.driveFolderId) toast.error('Project Drive Folder not found. Please initialize the project first.');
      return;
    }
    setIsUploadingToDrive(true);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', pdfPreviewBlob, pdfFileName);
      formDataToSend.append('projectRootId', project.driveFolderId);
      formDataToSend.append('path', pendingDrivePath);

      const response = await fetch('/api/drive/upload-by-path', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.message || 'Failed to upload to Google Drive');
      }

      toast.success('Meeting Minutes archived to Google Drive!');
      setShowPdfConfirm(false);
    } catch (err: any) {
      console.error('Error uploading PDF:', err);
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const handleShareLink = () => {
    const link = `${window.location.origin}/page/2.6.22?meetingId=${newMeetingId || meeting?.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Meeting link copied to clipboard!');
  };

  const handleSave = async (asNew: boolean = false) => {
    // Logic to sync with Decision Log and Task Management
    const finalData = { 
      ...formData, 
      updatedAt: new Date().toISOString() 
    };
    
    // Clean data for Firestore
    const sanitizedData = JSON.parse(JSON.stringify(finalData));
    
    try {
      // 1. Sync Decisions to Decision Log & System Tasks
      for (const decision of sanitizedData.decisions || []) {
        if (decision.decision && !decision.decisionLogId) {
          try {
            // A. Add to Decision Log
            const decRef = await addDoc(collection(db, 'decision_log'), {
              projectId: project.id,
              decision: decision.decision,
              category: decision.category,
              responsibleParty: decision.responsibleParty,
              date: sanitizedData.date,
              dueDate: decision.dueDate || '',
              status: 'Approved',
              source: 'Meeting',
              sourceId: meeting?.id || 'new',
              createdAt: serverTimestamp()
            });
            decision.decisionLogId = decRef.id;

            // B. Add to Tasks if there's a responsible party and due date
            // Try to find if responsibleParty is a Zarya User to get UID
            const assignedUser = users.find(u => u.name === decision.responsibleParty);
            if (assignedUser && decision.dueDate) {
              await addDoc(collection(db, 'tasks'), {
                projectId: project.id,
                title: decision.decision,
                description: `Created from meeting: ${sanitizedData.title}. Category: ${decision.category}`,
                assigneeId: assignedUser.uid,
                dueDate: decision.dueDate,
                status: 'TO DO',
                priority: 'Medium',
                sourceType: 'decision',
                sourceId: decRef.id,
                createdAt: serverTimestamp()
              });
            }
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, 'decision_log');
          }
        }
      }

      let meetingId = asNew ? null : meeting?.id;
      if (!meetingId) {
        const docRef = await addDoc(collection(db, 'meetings'), {
          ...sanitizedData,
          projectId: project.id,
          createdAt: serverTimestamp()
        });
        meetingId = docRef.id;
      } else {
        await updateDoc(doc(db, 'meetings', meetingId), {
          ...sanitizedData,
          updatedAt: serverTimestamp()
        });
      }
      
      setNewMeetingId(meetingId);
      setFormData(sanitizedData); // Sync local state
      
      // Generate PDF for preview
      const pdf = generatePDFBlob();
      setPdfPreviewBlob(pdf.blob);
      setPdfFileName(pdf.fileName);
      setPendingDrivePath(pdf.path);
      const url = URL.createObjectURL(pdf.blob);
      setPdfPreviewUrl(url);
      setShowPdfConfirm(true);

      toast.success(asNew ? 'Meeting saved as new report!' : 'Meeting report updated!');
    } catch (err) {
      handleFirestoreError(err, (meeting && !asNew) ? OperationType.UPDATE : OperationType.CREATE, 'meetings');
    }
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Header Area */}
      <header className="relative py-12 px-8 overflow-hidden rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full -mr-48 -mt-48 blur-3xl" />
        <div className="relative z-10 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Interactive Meeting Minutes</h1>
                <p className="text-slate-400 text-sm font-medium">Where decisions turn into actions.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-4 border-t border-slate-800">
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Meeting Title</label>
              <input 
                type="text"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Weekly Technical Review"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Date & Time</label>
              <div className="flex gap-2">
                <input 
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                />
                <input 
                  type="time"
                  value={formData.time}
                  onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  className="w-24 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Location (Geo-Linked)</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. Site Office - Villa 2"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Meeting Type</label>
              <select 
                value={formData.type}
                onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-blue-500/20 outline-none transition-all appearance-none"
              >
                <option value="General">General</option>
                <option value="Risk Management">Risk Management</option>
                <option value="Technical Review">Technical Review</option>
                <option value="Owner Meeting">Owner Meeting</option>
                <option value="Kick-off">Kick-off</option>
                <option value="Progress">Progress</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Agenda & Attendance */}
        <div className="lg:col-span-1 space-y-8">
          {/* Attendance Section */}
          <section className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Attendance / الحضور
              </h2>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-semibold uppercase tracking-widest">{formData.attendeeIds?.length || 0} Present</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Internal / Zarya Employees */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Zarya Employees / موظفي زريا</h3>
                </div>
                
                <div className="relative">
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl min-h-[50px] cursor-pointer hover:border-blue-300 transition-all"
                       onClick={() => setShowInternalDropdown(!showInternalDropdown)}>
                    {Array.from(new Set((formData.attendeeIds || []) as string[])).filter(id => users.find(u => u.uid === id)).map(id => {
                      const u = users.find(u => u.uid === id);
                      if (!u) return null;
                      return (
                        <div key={`internal-${id}`} className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold">
                          {u.name}
                          <button onClick={(e) => { e.stopPropagation(); toggleAttendee(id); }} className="hover:text-blue-900">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                    {(!formData.attendeeIds || formData.attendeeIds.filter(id => users.find(u => u.uid === id)).length === 0) && (
                      <span className="text-xs text-slate-400 mt-1">Select employees...</span>
                    )}
                  </div>
                  
                  <AnimatePresence>
                    {showInternalDropdown && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute z-50 top-full inset-x-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl p-2 max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar"
                      >
                        <div className="sticky top-0 bg-white pb-2 mb-2 border-b border-slate-50">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                              type="text"
                              placeholder="Search employees..."
                              value={internalSearch}
                              onChange={(e) => setInternalSearch(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          {users
                            .filter(u => u.name.toLowerCase().includes(internalSearch.toLowerCase()) || u.role.toLowerCase().includes(internalSearch.toLowerCase()))
                            .map(user => {
                              const isSelected = formData.attendeeIds?.includes(user.uid);
                              return (
                                <button
                                  key={user.uid}
                                  onClick={(e) => { e.stopPropagation(); toggleAttendee(user.uid); }}
                                  className={cn(
                                    "w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left",
                                    isSelected ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-700"
                                  )}
                                >
                                  <div className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                    isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-200"
                                  )}>
                                    {isSelected && <Check className="w-2.5 h-2.5" />}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold truncate">{user.name}</div>
                                    <div className="text-[10px] opacity-70 uppercase tracking-tighter">{user.role}</div>
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* External / Stakeholders */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Stakeholders / الستيك هولدر</h3>
                </div>

                <div className="relative">
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl min-h-[50px] cursor-pointer hover:border-emerald-300 transition-all"
                       onClick={() => setShowExternalDropdown(!showExternalDropdown)}>
                    {Array.from(new Set((formData.attendeeIds || []) as string[])).filter(id => stakeholders.find(s => s.id === id)).map(id => {
                      const s = stakeholders.find(s => s.id === id);
                      if (!s) return null;
                      return (
                        <div key={`external-${id}`} className="flex items-center gap-1.5 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold">
                          {s.name}
                          <button onClick={(e) => { e.stopPropagation(); toggleAttendee(id); }} className="hover:text-emerald-900">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                    {(!formData.attendeeIds || formData.attendeeIds.filter(id => stakeholders.find(s => s.id === id)).length === 0) && (
                      <span className="text-xs text-slate-400 mt-1">Select stakeholders...</span>
                    )}
                  </div>
                  
                  <AnimatePresence>
                    {showExternalDropdown && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute z-50 top-full inset-x-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl p-2 max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar"
                      >
                        <div className="sticky top-0 bg-white pb-2 mb-2 border-b border-slate-50">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                              type="text"
                              placeholder="Search stakeholders..."
                              value={externalSearch}
                              onChange={(e) => setExternalSearch(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/10"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          {stakeholders
                            .filter(s => s.name.toLowerCase().includes(externalSearch.toLowerCase()) || (s.position || s.role || '').toLowerCase().includes(externalSearch.toLowerCase()))
                            .map(s => {
                              const isSelected = formData.attendeeIds?.includes(s.id);
                              return (
                                <button
                                  key={s.id}
                                  onClick={(e) => { e.stopPropagation(); toggleAttendee(s.id); }}
                                  className={cn(
                                    "w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left",
                                    isSelected ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-50 text-slate-700"
                                  )}
                                >
                                  <div className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                    isSelected ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-200"
                                  )}>
                                    {isSelected && <Check className="w-2.5 h-2.5" />}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold truncate">{s.name}</div>
                                    <div className="text-[10px] opacity-70 uppercase tracking-tighter text-emerald-600">{s.position || s.role}</div>
                                  </div>
                                </button>
                              );
                            })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </section>

          {/* Agenda Section */}
          <section className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Interactive Agenda / الأجندة
              </h2>
              <button 
                onClick={addAgendaItem}
                className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {formData.agenda?.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-50 group">
                  <button 
                    onClick={() => {
                      const newAgenda = [...(formData.agenda || [])];
                      newAgenda[idx].isCompleted = !newAgenda[idx].isCompleted;
                      setFormData(prev => ({ ...prev, agenda: newAgenda }));
                    }}
                    className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                      item.isCompleted ? "bg-emerald-500 text-white" : "bg-white border border-slate-200 text-slate-200"
                    )}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <input 
                    type="text"
                    value={item.topic}
                    onChange={e => {
                      const newAgenda = [...(formData.agenda || [])];
                      newAgenda[idx].topic = e.target.value;
                      setFormData(prev => ({ ...prev, agenda: newAgenda }));
                    }}
                    placeholder="Enter agenda topic..."
                    className={cn(
                      "flex-1 bg-transparent border-none text-sm font-bold focus:ring-0 outline-none transition-all",
                      item.isCompleted ? "text-emerald-600 line-through opacity-60" : "text-slate-700"
                    )}
                  />
                  <button 
                    onClick={() => {
                      const newAgenda = formData.agenda?.filter((_, i) => i !== idx);
                      setFormData(prev => ({ ...prev, agenda: newAgenda }));
                    }}
                    className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {(!formData.agenda || formData.agenda.length === 0) && (
                <div className="py-8 text-center text-slate-400 text-xs font-medium italic">
                  No agenda topics added yet.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Decisions & Action Items */}
        <div className="lg:col-span-2 space-y-8">
          {/* Decisions Section (Active Action Items) */}
          <section className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Decisions & Action Items / سجل القرارات والمهام
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Direct sync to Project Decisions & Tasks</p>
                </div>
              </div>
              <button 
                onClick={addDecision}
                className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {formData.decisions?.map((dec, idx) => (
                <div key={dec.id} className="p-6 rounded-2xl bg-slate-50/50 border border-slate-50 space-y-4 relative group">
                  <button 
                    onClick={() => {
                      const newDecs = formData.decisions?.filter((_, i) => i !== idx);
                      setFormData(prev => ({ ...prev, decisions: newDecs }));
                    }}
                    className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Decision / Action Item</label>
                    <textarea 
                      value={dec.decision}
                      onChange={e => {
                        const newDecs = [...(formData.decisions || [])];
                        newDecs[idx].decision = e.target.value;
                        setFormData(prev => ({ ...prev, decisions: newDecs }));
                      }}
                      rows={2}
                      className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all resize-none"
                      placeholder="What was decided and what needs to be done?"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Category</label>
                      <select 
                        value={dec.category}
                        onChange={e => {
                          const newDecs = [...(formData.decisions || [])];
                          newDecs[idx].category = e.target.value as any;
                          setFormData(prev => ({ ...prev, decisions: newDecs }));
                        }}
                        className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none"
                      >
                        <option value="Civil">{language === 'ar' ? 'مدني' : 'Civil'}</option>
                        <option value="Technical Office">{language === 'ar' ? 'المكتب الفني' : 'Technical Office'}</option>
                        <option value="Mechanical">{language === 'ar' ? 'ميكانيك' : 'Mechanical'}</option>
                        <option value="Electrical">{language === 'ar' ? 'كهرباء' : 'Electrical'}</option>
                        <option value="Administrative">{language === 'ar' ? 'إداري' : 'Administrative'}</option>
                        <option value="Other">{language === 'ar' ? 'أخرى' : 'Other'}</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Responsible / المسؤول</label>
                      <select 
                        value={dec.responsibleParty}
                        onChange={e => {
                          const newDecs = [...(formData.decisions || [])];
                          newDecs[idx].responsibleParty = e.target.value;
                          setFormData(prev => ({ ...prev, decisions: newDecs }));
                        }}
                        className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none"
                      >
                        <option value="">Select Responsible...</option>
                        <optgroup label="Zarya Employees / موظفي زريا">
                          {users.map(u => <option key={u.uid} value={u.name}>{u.name} ({u.role})</option>)}
                        </optgroup>
                        <optgroup label="Other Stakeholders / الستيك هولدر">
                          {stakeholders.map(s => <option key={s.id} value={s.name}>{s.name} ({s.position || s.role})</option>)}
                        </optgroup>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                        {language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}
                      </label>
                      <input 
                        type="date"
                        value={dec.dueDate || ''}
                        onChange={e => {
                          const newDecs = [...(formData.decisions || [])];
                          newDecs[idx].dueDate = e.target.value;
                          setFormData(prev => ({ ...prev, decisions: newDecs }));
                        }}
                        className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {(!formData.decisions || formData.decisions.length === 0) && (
                <div className="py-12 text-center text-slate-400 text-xs font-medium italic border-2 border-dashed border-slate-100 rounded-3xl">
                  No decisions or action items recorded yet.
                </div>
              )}
            </div>
          </section>

          {/* Logic Hub Info */}
          <section className="p-8 bg-slate-900 text-white rounded-3xl shadow-xl space-y-6">
            <div className="flex items-center gap-3 text-blue-400">
              <Shield className="w-6 h-6" />
              <h3 className="text-sm font-semibold uppercase tracking-widest">The Logic Hub</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <div className="text-xs font-bold mb-1">Dual Sync-Action</div>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                    Every entry here is automatically archived in the Decision Log and assigned as a Task to the responsible party in Task Management.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-xs font-bold mb-1">Task Accountability</div>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                    Due dates are enforced across the platform, notifying responsible parties of their commitments.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Sticky Floating Actions */}
      <div className={cn(
        "fixed bottom-8 z-[60] flex items-center gap-4 bg-white/80 backdrop-blur-md p-4 rounded-[2rem] shadow-2xl border border-slate-200 transition-all duration-500",
        isRtl ? "left-8" : "right-8"
      )}>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm"
        >
          <X className="w-5 h-5 text-slate-400" />
          {isRtl ? 'تجاهل' : 'Discard'}
        </button>
        
        <button
          onClick={() => {
            const pdf = generatePDFBlob();
            const url = URL.createObjectURL(pdf.blob);
            window.open(url, '_blank');
          }}
          className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all shadow-sm"
        >
          <Printer className="w-5 h-5 text-slate-400" />
          {isRtl ? 'عرض الطباعة' : 'Print Preview'}
        </button>

        <button
          onClick={() => handleSave(true)}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-bold hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm"
        >
          <Plus className="w-5 h-5" />
          {isRtl ? 'حفظ كجديد' : 'Save as New'}
        </button>

        <button
          onClick={() => handleSave(false)}
          className="flex items-center gap-2 px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-xl shadow-blue-400/20"
        >
          <Save className="w-5 h-5" />
          {meeting ? (isRtl ? 'تحديث المحضر' : 'Update Report') : (isRtl ? 'حفظ المحضر' : 'Save Report')}
        </button>
      </div>

      {/* PDF Modal */}
      <AnimatePresence>
        {showPdfConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowPdfConfirm(false);
                onSave(formData);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-5xl bg-slate-50 rounded-[32px] shadow-2xl overflow-hidden flex flex-col h-[85vh]"
            >
              {/* Refined Header matching reference image */}
              <div className="p-8 bg-blue-600 text-white relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight leading-none mb-1">
                      {isRtl ? 'تم حفظ التقرير بنجاح' : 'Report Saved Successfully'}
                    </h3>
                    <p className="text-blue-100 text-sm font-medium italic">
                      {isRtl ? 'تم تحديث قاعدة البيانات. التالي: أرشفة المستند.' : 'Database updated. Next: Document Archiving.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowPdfConfirm(false);
                    onSave(formData);
                  }}
                  className="p-2 hover:bg-white/10 rounded-full transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 flex overflow-hidden">
                {/* Left Side: PDF Preview */}
                <div className="flex-1 p-8 flex flex-col">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500">
                      <HardDrive className="w-4 h-4" />
                      <span className="text-[10px] font-semibold uppercase tracking-widest">PDF Preview</span>
                    </div>
                    <button 
                      onClick={handleShareLink}
                      className="text-blue-600 text-[10px] font-semibold uppercase tracking-widest hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {isRtl ? 'فتح في نافذة جديدة' : 'Open in New Tab'}
                    </button>
                  </div>
                  <div className="flex-1 bg-white rounded-2xl shadow-xl shadow-slate-200 overflow-hidden relative">
                    {pdfPreviewUrl ? (
                      <iframe 
                        src={pdfPreviewUrl} 
                        className="w-full h-full border-none"
                        title="PDF Preview"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Generating Preview...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Options matching reference image */}
                <div className="w-[380px] border-l border-slate-200 bg-white p-10 flex flex-col justify-center space-y-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-blue-600">
                      <Cloud className="w-5 h-5 fill-blue-50" />
                      <h4 className="text-base font-semibold tracking-tight">Save to Cloud</h4>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed font-medium">
                      Upload this PDF report directly to the project's site operations folder in Google Drive.
                    </p>
                    <button
                      onClick={uploadToDrive}
                      disabled={isUploadingToDrive}
                      className="w-full h-16 bg-blue-600 text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 group"
                    >
                      {isUploadingToDrive ? (
                        <RefreshCw className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          <HardDrive className="w-6 h-6 group-hover:scale-110 transition-transform" />
                          <span>Save to Drive</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-100"></div>
                    </div>
                    <span className="relative px-4 bg-white text-[10px] font-semibold text-slate-300 uppercase tracking-[0.2em]">OR</span>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={() => {
                        if (pdfPreviewUrl) {
                          const link = document.createElement('a');
                          link.href = pdfPreviewUrl;
                          link.download = pdfFileName;
                          link.click();
                        }
                      }}
                      className="w-full h-14 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                    >
                      <Download className="w-5 h-5 text-slate-400" />
                      <span>Download Locally</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowPdfConfirm(false);
                        onSave(formData);
                      }}
                      className="w-full h-14 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                    >
                      Close & Return to List
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
