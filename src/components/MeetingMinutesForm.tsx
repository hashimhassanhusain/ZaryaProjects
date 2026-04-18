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
  Briefcase
} from 'lucide-react';
import { Meeting, MeetingAgendaItem, MeetingTask, MeetingDecision, Project, User, Stakeholder, WBSLevel, Task } from '../types';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

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
    tasks: [],
    notes: '',
    status: 'Draft'
  });

  const [users, setUsers] = useState<User[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // PDF Preview & Drive states
  const [showPdfConfirm, setShowPdfConfirm] = useState(false);
  const [pdfPreviewBlob, setPdfPreviewBlob] = useState<Blob | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [pdfFileName, setPdfFileName] = useState('');
  const [pendingDrivePath, setPendingDrivePath] = useState('');
  const [newMeetingId, setNewMeetingId] = useState<string | null>(null);

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
    const newItem: MeetingDecision = { id: crypto.randomUUID(), decision: '', category: 'Scope', responsibleParty: '' };
    setFormData(prev => ({ ...prev, decisions: [...(prev.decisions || []), newItem] }));
  };

  const addTask = () => {
    const newItem: MeetingTask = { id: crypto.randomUUID(), description: '', assigneeId: '', dueDate: '', status: 'Open' };
    setFormData(prev => ({ ...prev, tasks: [...(prev.tasks || []), newItem] }));
  };

  const toggleAttendee = (id: string) => {
    const current = formData.attendeeIds || [];
    if (current.includes(id)) {
      setFormData(prev => ({ ...prev, attendeeIds: current.filter(a => a !== id) }));
    } else {
      setFormData(prev => ({ ...prev, attendeeIds: [...current, id] }));
    }
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

    (doc as any).autoTable({
      startY: 90,
      head: [['Attendance / الحضور']],
      body: attendeeNames.map(name => [name]),
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    });

    // Agenda Table
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Agenda Topic / موضوع الأجندة', 'Status']],
      body: formData.agenda?.map(a => [a.topic, a.isCompleted ? 'Completed' : 'Pending']) || [],
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    });

    // Decisions Table
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Decision / القرار', 'Category', 'Responsible']],
      body: formData.decisions?.map(d => [d.decision, d.category, d.responsibleParty]) || [],
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    });

    // Tasks Table
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Task / المهمة', 'Assignee', 'Due Date']],
      body: formData.tasks?.map(t => {
        const assignee = users.find(u => u.uid === t.assigneeId)?.name || 'Unassigned';
        return [t.description, assignee, t.dueDate];
      }) || [],
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Generated by Zarya Project Management System', pageWidth / 2, 285, { align: 'center' });

    const fileName = `${project.code}-ZRY-MEETING-${typeLabel.replace(/\s+/g, '_')}-${formData.date}.pdf`;
    const blob = doc.output('blob');
    const path = `SITE_OPERATIONS_04/04.4_MEETING_MINUTES`;

    return { blob, fileName, path };
  };

  const uploadToDrive = async () => {
    if (!pdfPreviewBlob) return;
    setIsUploadingToDrive(true);
    
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
      });
      reader.readAsDataURL(pdfPreviewBlob);
      const base64Data = await base64Promise;

      const response = await fetch('/api/drive/upload-by-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data,
          fileName: pdfFileName,
          path: pendingDrivePath,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload to Google Drive');
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

  const handleSave = async () => {
    // Logic to sync with Decision Log and Task Management
    const finalData = { ...formData, updatedAt: new Date().toISOString() };
    
    try {
      // 1. Sync Decisions to Decision Log
      for (const decision of formData.decisions || []) {
        if (!decision.decisionLogId && decision.decision) {
          try {
            const decRef = await addDoc(collection(db, 'decision_log'), {
              projectId: project.id,
              decision: decision.decision,
              category: decision.category,
              responsibleParty: decision.responsibleParty,
              date: formData.date,
              status: 'Approved',
              source: 'Meeting',
              sourceId: meeting?.id || 'new',
              createdAt: serverTimestamp()
            });
            decision.decisionLogId = decRef.id;
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, 'decision_log');
          }
        }
      }

      // 2. Sync Tasks to Task Management
      for (const task of formData.tasks || []) {
        if (!task.taskId && task.description && task.assigneeId) {
          try {
            const taskRef = await addDoc(collection(db, 'tasks'), {
              projectId: project.id,
              title: task.description,
              description: `Generated from meeting: ${formData.title}`,
              assigneeId: task.assigneeId,
              dueDate: task.dueDate,
              status: 'TO DO',
              priority: 'Medium',
              sourceType: 'meeting',
              sourceId: meeting?.id || 'new',
              wbsId: task.wbsId || '',
              createdAt: serverTimestamp()
            });
            task.taskId = taskRef.id;
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, 'tasks');
          }
        }
      }

      let meetingId = meeting?.id;
      if (!meetingId) {
        const docRef = await addDoc(collection(db, 'meetings'), {
          ...finalData,
          projectId: project.id,
          createdAt: serverTimestamp()
        });
        meetingId = docRef.id;
      } else {
        await updateDoc(doc(db, 'meetings', meetingId), {
          ...finalData,
          updatedAt: serverTimestamp()
        });
      }
      
      setNewMeetingId(meetingId);
      
      // Generate PDF for preview
      const pdf = generatePDFBlob();
      setPdfPreviewBlob(pdf.blob);
      setPdfFileName(pdf.fileName);
      setPendingDrivePath(pdf.path);
      const url = URL.createObjectURL(pdf.blob);
      setPdfPreviewUrl(url);
      setShowPdfConfirm(true);

      // We wait for modal close to call onSave
    } catch (err) {
      handleFirestoreError(err, meeting ? OperationType.UPDATE : OperationType.CREATE, 'meetings');
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
                <h1 className="text-3xl font-black tracking-tight">Interactive Meeting Minutes</h1>
                <p className="text-slate-400 text-sm font-medium">Where decisions turn into actions.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  const pdf = generatePDFBlob();
                  const url = URL.createObjectURL(pdf.blob);
                  window.open(url, '_blank');
                }}
                disabled={isExporting}
                className="p-3 bg-slate-800 border border-slate-700 rounded-2xl text-slate-300 hover:text-white hover:border-slate-600 transition-all shadow-sm"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button 
                onClick={onCancel}
                className="px-6 py-3 bg-slate-800 text-slate-300 rounded-2xl font-bold hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
              >
                <Save className="w-5 h-5" />
                Save & Sync
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-4 border-t border-slate-800">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Meeting Title</label>
              <input 
                type="text"
                value={formData.title}
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Weekly Technical Review"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date & Time</label>
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
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Location (Geo-Linked)</label>
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
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Meeting Type</label>
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
        <div className="lg:col-span-2 space-y-8">
          {/* Attendance Section */}
          <section className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Attendance / الحضور
              </h2>
              <span className="text-xs font-bold text-slate-400">{formData.attendeeIds?.length || 0} Present</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {users.map(user => (
                <button
                  key={user.uid}
                  onClick={() => toggleAttendee(user.uid)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-2xl border transition-all text-left",
                    formData.attendeeIds?.includes(user.uid)
                      ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                      : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                  )}
                >
                  <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{user.name}</div>
                    <div className="text-[10px] font-medium opacity-60 truncate">{user.role}</div>
                  </div>
                </button>
              ))}
              {stakeholders.map(s => (
                <button
                  key={s.id}
                  onClick={() => toggleAttendee(s.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-2xl border transition-all text-left",
                    formData.attendeeIds?.includes(s.id)
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm"
                      : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">
                    {s.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{s.name}</div>
                    <div className="text-[10px] font-medium opacity-60 truncate">{s.role}</div>
                  </div>
                </button>
              ))}
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

          {/* Decisions Section */}
          <section className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Decision Log Integration / سجل القرارات
              </h2>
              <button 
                onClick={addDecision}
                className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              {formData.decisions?.map((dec, idx) => (
                <div key={dec.id} className="p-6 rounded-2xl bg-slate-50/50 border border-slate-50 space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Decision</label>
                      <textarea 
                        value={dec.decision}
                        onChange={e => {
                          const newDecs = [...(formData.decisions || [])];
                          newDecs[idx].decision = e.target.value;
                          setFormData(prev => ({ ...prev, decisions: newDecs }));
                        }}
                        rows={2}
                        className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all resize-none"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        const newDecs = formData.decisions?.filter((_, i) => i !== idx);
                        setFormData(prev => ({ ...prev, decisions: newDecs }));
                      }}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-colors self-start"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                      <select 
                        value={dec.category}
                        onChange={e => {
                          const newDecs = [...(formData.decisions || [])];
                          newDecs[idx].category = e.target.value as any;
                          setFormData(prev => ({ ...prev, decisions: newDecs }));
                        }}
                        className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none"
                      >
                        <option value="Scope">Scope</option>
                        <option value="Schedule">Schedule</option>
                        <option value="Cost/Price">Cost/Price</option>
                        <option value="Quality">Quality</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsible</label>
                      <input 
                        type="text"
                        value={dec.responsibleParty}
                        onChange={e => {
                          const newDecs = [...(formData.decisions || [])];
                          newDecs[idx].responsibleParty = e.target.value;
                          setFormData(prev => ({ ...prev, decisions: newDecs }));
                        }}
                        className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Tasks & Logic Hub */}
        <div className="space-y-8">
          {/* Tasks Section */}
          <section className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                Task Distribution / المهام
              </h2>
              <button 
                onClick={addTask}
                className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-6">
              {formData.tasks?.map((task, idx) => (
                <div key={task.id} className="p-6 rounded-2xl bg-slate-50/50 border border-slate-50 space-y-4 relative group">
                  <button 
                    onClick={() => {
                      const newTasks = formData.tasks?.filter((_, i) => i !== idx);
                      setFormData(prev => ({ ...prev, tasks: newTasks }));
                    }}
                    className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Task Description</label>
                    <textarea 
                      value={task.description}
                      onChange={e => {
                        const newTasks = [...(formData.tasks || [])];
                        newTasks[idx].description = e.target.value;
                        setFormData(prev => ({ ...prev, tasks: newTasks }));
                      }}
                      rows={2}
                      className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assignee</label>
                    <select 
                      value={task.assigneeId}
                      onChange={e => {
                        const newTasks = [...(formData.tasks || [])];
                        newTasks[idx].assigneeId = e.target.value;
                        setFormData(prev => ({ ...prev, tasks: newTasks }));
                      }}
                      className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none"
                    >
                      <option value="">Select Assignee...</option>
                      {users.map(u => <option key={u.uid} value={u.uid}>{u.name}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Due Date</label>
                      <input 
                        type="date"
                        value={task.dueDate}
                        onChange={e => {
                          const newTasks = [...(formData.tasks || [])];
                          newTasks[idx].dueDate = e.target.value;
                          setFormData(prev => ({ ...prev, tasks: newTasks }));
                        }}
                        className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WBS Logic</label>
                      <select 
                        value={task.wbsId}
                        onChange={e => {
                          const newTasks = [...(formData.tasks || [])];
                          newTasks[idx].wbsId = e.target.value;
                          setFormData(prev => ({ ...prev, tasks: newTasks }));
                        }}
                        className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none"
                      >
                        <option value="">Select WBS Code...</option>
                        {wbsLevels.filter(w => w.type === 'Work Package').map(w => (
                          <option key={w.id} value={w.id}>{w.code} - {w.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Logic Hub Info */}
          <section className="p-8 bg-slate-900 text-white rounded-3xl shadow-xl space-y-6">
            <div className="flex items-center gap-3 text-blue-400">
              <Shield className="w-6 h-6" />
              <h3 className="text-sm font-black uppercase tracking-widest">The Logic Hub</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <div className="text-xs font-bold mb-1">Auto-Sync Enabled</div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Decisions and Tasks are automatically synced to their respective logs upon saving.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-xs font-bold mb-1">WBS Compliance</div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Linking tasks to WBS codes ensures all work stays within the approved project scope.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
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
              className="relative w-full max-w-5xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Meeting Minutes Generated</h3>
                    <p className="text-sm text-slate-500 font-medium">Preview and archive your document</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleShareLink}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Share Link
                  </button>
                  <button
                    onClick={() => {
                      setShowPdfConfirm(false);
                      onSave(formData);
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-slate-100 p-8 overflow-hidden relative">
                {pdfPreviewUrl ? (
                  <iframe 
                    src={pdfPreviewUrl} 
                    className="w-full h-full rounded-2xl border-none shadow-lg bg-white"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                    <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Generating Preview...</p>
                  </div>
                )}
              </div>

              <div className="p-8 bg-white border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-400 font-medium tracking-tight">File Name: </span>
                    <span className="text-slate-900 font-bold tracking-tight">{pdfFileName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      if (pdfPreviewUrl) {
                        const link = document.createElement('a');
                        link.href = pdfPreviewUrl;
                        link.download = pdfFileName;
                        link.click();
                      }
                    }}
                    className="px-8 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center gap-2"
                  >
                    Download
                  </button>
                  <button
                    onClick={uploadToDrive}
                    disabled={isUploadingToDrive}
                    className="px-10 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xl shadow-slate-200"
                  >
                    {isUploadingToDrive ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Check className="w-5 h-5 text-emerald-400" />
                    )}
                    Save to Drive
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
