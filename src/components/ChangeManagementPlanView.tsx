import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Download, 
  History, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText,
  Printer,
  Loader2,
  X,
  ArrowLeft,
  ChevronRight,
  User,
  Calendar,
  Zap,
  Users,
  ShieldCheck,
  Settings,
  Info,
  Search,
  UserPlus
} from 'lucide-react';
import { Page, Project, PageVersion } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  updateDoc, 
  doc, 
  onSnapshot, 
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ChangeManagementPlanViewProps {
  page: Page;
}

interface CCBMember {
  id: string;
  name: string;
  role: string;
  responsibility: string;
  authority: 'High' | 'Medium' | 'Low';
}

interface CMPData {
  projectTitle: string;
  datePrepared: string;
  approach: string;
  definitions: {
    schedule: string;
    budget: string;
    scope: string;
    documents: string;
  };
  ccbMembers: CCBMember[];
  process: {
    submittal: string;
    tracking: string;
    review: string;
    disposition: string;
  };
}

export const ChangeManagementPlanView: React.FC<ChangeManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [cmp, setCmp] = useState<CMPData>({
    projectTitle: '',
    datePrepared: new Date().toISOString().split('T')[0],
    approach: '',
    definitions: {
      schedule: 'Example: Any delay affecting the Critical Path by more than 5 days',
      budget: 'Example: Any increase exceeding 10,000,000 IQD',
      scope: '',
      documents: ''
    },
    ccbMembers: [
      { id: '1', name: 'Hashim Hassan', role: 'Technical Manager', responsibility: 'Technical Approval', authority: 'High' }
    ],
    process: {
      submittal: '',
      tracking: '',
      review: '',
      disposition: ''
    }
  });

  // Auto-fill project title
  useEffect(() => {
    if (selectedProject && !cmp.projectTitle) {
      setCmp(prev => ({
        ...prev,
        projectTitle: prev.projectTitle || `${selectedProject.name} (${selectedProject.code})`
      }));
    }
  }, [selectedProject, cmp.projectTitle]);

  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPrompt, setShowPrompt] = useState<{ type: string; message: string; onConfirm: () => void } | null>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const unsub = onSnapshot(doc(db, 'projects', selectedProject.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Project;
        if (data.cmpData) {
          setCmp(data.cmpData as unknown as CMPData);
        } else {
          // Auto-fill project title if no data exists yet
          setCmp(prev => ({
            ...prev,
            projectTitle: `${selectedProject.name} (${selectedProject.code})`
          }));
        }
        if (data.cmpHistory) {
          setVersions(data.cmpHistory);
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [selectedProject?.id, selectedProject?.name, selectedProject?.code]);

  const handleSave = async (isNewVersion: boolean = false) => {
    if (!selectedProject) return;
    setIsSaving(true);

    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const updateData: any = {
        cmpData: cmp,
        updatedAt: timestamp,
        updatedBy: user
      };

      if (isNewVersion) {
        const nextVersion = (versions[0]?.version || 0) + 1;
        const newVersion: PageVersion = {
          version: nextVersion,
          date: timestamp,
          author: user,
          data: cmp as any
        };
        updateData.cmpHistory = [newVersion, ...versions];
      }

      await updateDoc(doc(db, 'projects', selectedProject.id), updateData);

      // Restriction Policy Prompt
      const affected = ['Schedule', 'PO', 'Reports'];
      setShowPrompt({
        type: affected.join(' & '),
        message: `This threshold/policy update impacts the ${affected.join(', ')}. Confirm link?`,
        onConfirm: () => {
          console.log('CMP linking confirmed for:', affected);
          setShowPrompt(null);
        }
      });

    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'projects');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;

    const renderHeader = () => {
      doc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('CHANGE MANAGEMENT PLAN', pageWidth / 2, 35, { align: 'center' });
    };

    renderHeader();
    doc.setFontSize(10);
    doc.text(`Project Title: ${cmp.projectTitle}`, margin, 45);
    doc.text(`Date Prepared: ${cmp.datePrepared}`, pageWidth - margin - 50, 45);

    doc.setFont('helvetica', 'bold');
    doc.text('Change Management Approach:', margin, 55);
    doc.setFont('helvetica', 'normal');
    const approachLines = doc.splitTextToSize(cmp.approach || '', pageWidth - 2 * margin);
    doc.text(approachLines, margin, 60);

    let y = 60 + (approachLines.length * 5) + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Definitions of Change:', margin, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      body: [
        ['Schedule change:', cmp.definitions.schedule],
        ['Budget change:', cmp.definitions.budget],
        ['Scope change:', cmp.definitions.scope],
        ['Project document changes:', cmp.definitions.documents]
      ],
      theme: 'grid',
      styles: { fontSize: 8 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fillColor: [245, 245, 245] } }
    });

    y = ((doc as any).lastAutoTable?.finalY ?? 150) + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Change Control Board:', margin, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [['Name', 'Role', 'Responsibility', 'Authority']],
      body: cmp.ccbMembers.map(m => [m.name, m.role, m.responsibility, m.authority]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [48, 48, 48] }
    });

    y = ((doc as any).lastAutoTable?.finalY ?? 150) + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Change Control Process:', margin, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      body: [
        ['Change request submittal', cmp.process.submittal],
        ['Change request tracking', cmp.process.tracking],
        ['Change request review', cmp.process.review],
        ['Change request disposition', cmp.process.disposition]
      ],
      theme: 'grid',
      styles: { fontSize: 8 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fillColor: [245, 245, 245] } }
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    doc.save(`${selectedProject.code}-ZRY-MGT-PLN-CHG-${dateStr}-V${vStr}.pdf`);
  };

  const addMember = () => {
    setCmp({
      ...cmp,
      ccbMembers: [
        ...cmp.ccbMembers,
        { id: Date.now().toString(), name: '', role: '', responsibility: '', authority: 'Medium' }
      ]
    });
  };

  const removeMember = (id: string) => {
    setCmp({
      ...cmp,
      ccbMembers: cmp.ccbMembers.filter(m => m.id !== id)
    });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Change Management Plan</h2>
            <p className="text-xs text-slate-500 font-medium">Control and governance of project changes</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all",
              isEditing 
                ? "bg-amber-100 text-amber-700 border border-amber-200" 
                : "bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100"
            )}
          >
            {isEditing ? <CheckCircle2 className="w-3 h-3" /> : <Settings className="w-3 h-3" />}
            {isEditing ? 'Finish Editing' : 'Edit Plan'}
          </button>
          <button 
            onClick={generatePDF}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-50 transition-all"
          >
            <Download className="w-3 h-3" />
            Download PDF
          </button>
          <button 
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-all"
          >
            Save New Version
          </button>
          <button 
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
          >
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Overwrite
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Project Title</label>
          {isEditing ? (
            <input 
              type="text"
              value={cmp.projectTitle}
              onChange={(e) => setCmp({ ...cmp, projectTitle: e.target.value })}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
              placeholder="Enter Project Title..."
            />
          ) : (
            <div className="px-1 py-1 text-lg font-bold text-slate-900">
              {cmp.projectTitle || '---'}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Date Prepared</label>
          {isEditing ? (
            <input 
              type="date"
              value={cmp.datePrepared}
              onChange={(e) => setCmp({ ...cmp, datePrepared: e.target.value })}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
          ) : (
            <div className="px-1 py-1 text-sm font-medium text-slate-600">
              {cmp.datePrepared || '---'}
            </div>
          )}
        </div>
      </div>

      {/* Approach */}
      <section className="space-y-4">
        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Change Management Approach</label>
        {isEditing ? (
          <textarea 
            value={cmp.approach}
            onChange={(e) => setCmp({ ...cmp, approach: e.target.value })}
            rows={4}
            className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
            placeholder="Define the overall strategy for managing changes..."
          />
        ) : (
          <div className="px-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {cmp.approach || '---'}
          </div>
        )}
      </section>

      {/* Definitions of Change */}
      <section className="space-y-6">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Definitions of Change (Thresholds)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: 'Schedule Change', key: 'schedule' },
            { label: 'Budget Change', key: 'budget' },
            { label: 'Scope Change', key: 'scope' },
            { label: 'Project Document Changes', key: 'documents' }
          ].map((def) => (
            <div key={def.key} className="space-y-2">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{def.label}</label>
              {isEditing ? (
                <input 
                  type="text"
                  value={(cmp.definitions as any)[def.key]}
                  onChange={(e) => setCmp({ ...cmp, definitions: { ...cmp.definitions, [def.key]: e.target.value } })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none"
                  placeholder={`Define ${def.label} threshold...`}
                />
              ) : (
                <div className="px-1 text-sm text-slate-600">
                  {(cmp.definitions as any)[def.key] || '---'}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CCB */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-[0.2em]">Change Control Board (CCB)</h3>
          {isEditing && (
            <button onClick={addMember} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-[10px] hover:bg-blue-100 transition-all">
              <UserPlus className="w-3 h-3" />
              Add Member
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Name</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Responsibility</th>
                <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Authority</th>
                {isEditing && <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {cmp.ccbMembers.map((member, idx) => (
                <tr key={member.id} className="group">
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <input 
                        type="text"
                        value={member.name}
                        onChange={(e) => {
                          const newMembers = [...cmp.ccbMembers];
                          newMembers[idx].name = e.target.value;
                          setCmp({ ...cmp, ccbMembers: newMembers });
                        }}
                        className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold"
                      />
                    ) : (
                      <span className="text-sm font-bold text-slate-900">{member.name || '---'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <input 
                        type="text"
                        placeholder="Example: Technical Manager"
                        value={member.role}
                        onChange={(e) => {
                          const newMembers = [...cmp.ccbMembers];
                          newMembers[idx].role = e.target.value;
                          setCmp({ ...cmp, ccbMembers: newMembers });
                        }}
                        className="w-full bg-transparent border-none focus:ring-0 text-sm"
                      />
                    ) : (
                      <span className="text-sm text-slate-600">{member.role || '---'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <input 
                        type="text"
                        value={member.responsibility}
                        onChange={(e) => {
                          const newMembers = [...cmp.ccbMembers];
                          newMembers[idx].responsibility = e.target.value;
                          setCmp({ ...cmp, ccbMembers: newMembers });
                        }}
                        className="w-full bg-transparent border-none focus:ring-0 text-sm"
                      />
                    ) : (
                      <span className="text-sm text-slate-600">{member.responsibility || '---'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <select 
                        value={member.authority}
                        onChange={(e) => {
                          const newMembers = [...cmp.ccbMembers];
                          newMembers[idx].authority = e.target.value as any;
                          setCmp({ ...cmp, ccbMembers: newMembers });
                        }}
                        className="bg-transparent border-none focus:ring-0 text-xs font-semibold uppercase tracking-widest text-blue-600"
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    ) : (
                      <span className={cn(
                        "text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded",
                        member.authority === 'High' ? "bg-red-50 text-red-600" :
                        member.authority === 'Medium' ? "bg-amber-50 text-amber-600" :
                        "bg-blue-50 text-blue-600"
                      )}>
                        {member.authority}
                      </span>
                    )}
                  </td>
                  {isEditing && (
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => removeMember(member.id)} className="p-2 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {cmp.ccbMembers.length === 0 && (
                <tr>
                  <td colSpan={isEditing ? 5 : 4} className="px-6 py-12 text-center text-sm text-slate-400 italic">No CCB members defined.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-slate-400 font-medium italic ml-1">
          Note: Names added here will be granted 'Approver' rights in Change Requests.
        </p>
      </section>

      {/* Process */}
      <section className="space-y-6">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Change Control Process</h3>
        <div className="space-y-4">
          {[
            { label: 'Submittal', key: 'submittal' },
            { label: 'Tracking', key: 'tracking' },
            { label: 'Review', key: 'review' },
            { label: 'Disposition', key: 'disposition' }
          ].map((row) => (
            <div key={row.key} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-3">{row.label}</label>
              {isEditing ? (
                <textarea 
                  value={(cmp.process as any)[row.key]}
                  onChange={(e) => setCmp({ ...cmp, process: { ...cmp.process, [row.key]: e.target.value } })}
                  className="md:col-span-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none"
                  rows={2}
                />
              ) : (
                <div className="md:col-span-3 px-1 py-3 text-sm text-slate-700 leading-relaxed">
                  {(cmp.process as any)[row.key] || '---'}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Restricted Data Linking Prompt */}
      <AnimatePresence>
        {showPrompt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Restricted Data Link</h3>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                {showPrompt.message}
              </p>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowPrompt(null)}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  No
                </button>
                <button 
                  onClick={showPrompt.onConfirm}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  Yes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
