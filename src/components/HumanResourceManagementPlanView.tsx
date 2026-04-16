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
  UserPlus,
  Target,
  Layers,
  MessageSquare,
  HelpCircle,
  ClipboardList,
  BarChart3,
  GitBranch,
  Box,
  Briefcase,
  Network,
  Award,
  Stethoscope,
  Scale
} from 'lucide-react';
import { Page, Project, PageVersion, Stakeholder } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  updateDoc, 
  doc, 
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface HumanResourceManagementPlanViewProps {
  page: Page;
}

interface HRRole {
  id: string;
  role: string;
  responsibility: string;
  authority: string;
  name?: string;
}

interface HRMPData {
  projectTitle: string;
  datePrepared: string;
  // Page 1
  roles: HRRole[];
  orgStructurePlaceholder: string;
  // Page 2
  staffAcquisition: string;
  staffRelease: string;
  resourceCalendars: string;
  trainingRequirements: string;
  rewardsRecognition: string;
  policyCompliance: string;
  safety: string;
}

export const HumanResourceManagementPlanView: React.FC<HumanResourceManagementPlanViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [hrmp, setHrmp] = useState<HRMPData>({
    projectTitle: '',
    datePrepared: new Date().toISOString().split('T')[0],
    roles: [
      { id: '1', role: 'Senior Civil Engineer', responsibility: 'Technical oversight of civil works', authority: 'Approval of material submittals up to MasterFormat 16 Divisions: 04 - Masonry', name: '' },
      { id: '2', role: 'Project Manager', responsibility: 'Overall project delivery', authority: 'Budget approval up to $50k', name: '' },
      { id: '3', role: 'HSE Officer', responsibility: 'Safety compliance and audits', authority: 'Stop-work authority for safety violations', name: 'Ivan' }
    ],
    orgStructurePlaceholder: 'Visual Organizational Chart Placeholder',
    staffAcquisition: '',
    staffRelease: '',
    resourceCalendars: 'Saturday - Thursday, 08:00 AM - 05:00 PM',
    trainingRequirements: '',
    rewardsRecognition: '',
    policyCompliance: '',
    safety: 'Linked to HSE Officer (Ivan) roles and requirements defined in the Manual.'
  });

  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPrompt, setShowPrompt] = useState<{ type: string; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (!selectedProject) return;

    const unsub = onSnapshot(doc(db, 'projects', selectedProject.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Project;
        if (data.hrmpData) {
          setHrmp(data.hrmpData as unknown as HRMPData);
        } else {
          // Auto-fill project title if no data exists yet
          setHrmp(prev => ({
            ...prev,
            projectTitle: prev.projectTitle || `${selectedProject.name} (${selectedProject.code})`
          }));
        }
        if (data.hrmpHistory) {
          setVersions(data.hrmpHistory);
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [selectedProject?.id, selectedProject?.name, selectedProject?.code]);

  const handleAddRole = () => {
    const newRole: HRRole = {
      id: crypto.randomUUID(),
      role: '',
      responsibility: '',
      authority: '',
      name: ''
    };
    setHrmp({ ...hrmp, roles: [...hrmp.roles, newRole] });
  };

  const handleRemoveRole = (id: string) => {
    setHrmp({ ...hrmp, roles: hrmp.roles.filter(r => r.id !== id) });
  };

  const handleRoleChange = (id: string, field: keyof HRRole, value: string) => {
    setHrmp({
      ...hrmp,
      roles: hrmp.roles.map(r => r.id === id ? { ...r, [field]: value } : r)
    });
  };

  const syncStakeholders = async () => {
    if (!selectedProject) return;
    
    try {
      for (const role of hrmp.roles) {
        if (role.name) {
          const stakeholder: Partial<Stakeholder> = {
            projectId: selectedProject.id,
            name: role.name,
            position: role.role,
            role: role.role,
            classification: 'Internal',
            influence: 'Medium',
            interest: 'High',
            engagementLevel: 'Green',
            category: 'Project Team'
          };
          await addDoc(collection(db, 'stakeholders'), {
            ...stakeholder,
            createdAt: serverTimestamp()
          });
        }
      }
    } catch (err) {
      console.error('Error syncing stakeholders:', err);
    }
  };

  const handleSave = async (isNewVersion: boolean = false) => {
    if (!selectedProject) return;
    setIsSaving(true);

    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const updateData: any = {
        hrmpData: hrmp,
        updatedAt: timestamp,
        updatedBy: user
      };

      if (isNewVersion) {
        const nextVersion = (versions[0]?.version || 0) + 1;
        const newVersion: PageVersion = {
          version: nextVersion,
          date: timestamp,
          author: user,
          data: hrmp as any
        };
        updateData.hrmpHistory = [newVersion, ...versions];
      }

      await updateDoc(doc(db, 'projects', selectedProject.id), updateData);
      
      // Sync stakeholders
      await syncStakeholders();

      // Restriction Policy Prompt for Schedule
      setShowPrompt({
        type: 'Schedule',
        message: "Resource availability has changed. Propose a link to the Project Schedule?",
        onConfirm: () => {
          console.log('HRMP update confirmed for Schedule linking');
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

    const renderHeader = (pageNum: number) => {
      doc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('HUMAN RESOURCE MANAGEMENT PLAN', pageWidth / 2, 35, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`Page ${pageNum} of 2`, pageWidth - margin, 10, { align: 'right' });
    };

    // Page 1
    renderHeader(1);
    doc.setFontSize(10);
    doc.text(`Project Title: ${hrmp.projectTitle}`, margin, 45);
    doc.text(`Date Prepared: ${hrmp.datePrepared}`, pageWidth - margin - 60, 45);

    doc.setFont('helvetica', 'bold');
    doc.text('Roles, Responsibilities, and Authority', margin, 55);
    
    const tableData = hrmp.roles.map((r, i) => [
      `${i + 1}. ${r.role}${r.name ? ` (${r.name})` : ''}`,
      `${i + 1}. ${r.responsibility}`,
      `${i + 1}. ${r.authority}`
    ]);

    autoTable(doc, {
      startY: 60,
      head: [['Role', 'Responsibility', 'Authority']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 60 },
        2: { cellWidth: 60 }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFont('helvetica', 'bold');
    doc.text('Project Organizational Structure', margin, finalY + 10);
    doc.rect(margin, finalY + 15, pageWidth - 2 * margin, 80);
    doc.setFont('helvetica', 'normal');
    doc.text('[Organizational Chart Visual Placeholder]', pageWidth / 2, finalY + 55, { align: 'center' });

    // Page 2
    doc.addPage();
    renderHeader(2);
    
    let y = 45;
    doc.setFont('helvetica', 'bold');
    doc.text('Staffing Management Plan', margin, y);
    y += 5;
    
    // Acquisition & Release
    doc.text('Staff Acquisition', margin, y + 5);
    doc.text('Staff Release', margin + (pageWidth - 2 * margin) / 2, y + 5);
    doc.rect(margin, y + 8, (pageWidth - 2 * margin) / 2, 30);
    doc.rect(margin + (pageWidth - 2 * margin) / 2, y + 8, (pageWidth - 2 * margin) / 2, 30);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(hrmp.staffAcquisition, (pageWidth - 2 * margin) / 2 - 4), margin + 2, y + 13);
    doc.text(doc.splitTextToSize(hrmp.staffRelease, (pageWidth - 2 * margin) / 2 - 4), margin + (pageWidth - 2 * margin) / 2 + 2, y + 13);
    
    y += 45;
    const sections = [
      { title: 'Resource Calendars', content: hrmp.resourceCalendars },
      { title: 'Training Requirements', content: hrmp.trainingRequirements },
      { title: 'Rewards and Recognition', content: hrmp.rewardsRecognition },
      { title: 'Regulations, Standards, and Policy Compliance', content: hrmp.policyCompliance },
      { title: 'Safety', content: hrmp.safety }
    ];

    sections.forEach(section => {
      doc.setFont('helvetica', 'bold');
      doc.text(section.title, margin, y);
      y += 5;
      const lines = doc.splitTextToSize(section.content || '', pageWidth - 2 * margin);
      doc.rect(margin, y, pageWidth - 2 * margin, Math.max(20, lines.length * 5 + 5));
      doc.setFont('helvetica', 'normal');
      doc.text(lines, margin + 2, y + 5);
      y += Math.max(20, lines.length * 5 + 5) + 8;
    });

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    const fileName = `${selectedProject.code}-GOV-PLN-HR-V${vStr}-${dateStr}.pdf`;
    doc.save(fileName);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Human Resource Management Plan</h2>
            <p className="text-xs text-slate-500 font-medium">Managing project roles, responsibilities, and staffing</p>
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
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Title</label>
          {isEditing ? (
            <input 
              type="text"
              value={hrmp.projectTitle}
              onChange={(e) => setHrmp({ ...hrmp, projectTitle: e.target.value })}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
              placeholder="Enter Project Title..."
            />
          ) : (
            <div className="px-1 py-1 text-lg font-bold text-slate-900">
              {hrmp.projectTitle || '---'}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date Prepared</label>
          {isEditing ? (
            <input 
              type="date"
              value={hrmp.datePrepared}
              onChange={(e) => setHrmp({ ...hrmp, datePrepared: e.target.value })}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
          ) : (
            <div className="px-1 py-1 text-sm font-medium text-slate-600">
              {hrmp.datePrepared || '---'}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-12">
        {/* Roles and Responsibilities */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Roles, Responsibilities, and Authority</label>
              <div className="group relative">
                <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                  Authority levels defined here govern digital signatures in Change Requests and POs.
                </div>
              </div>
            </div>
            {isEditing && (
              <button 
                onClick={handleAddRole}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
              >
                <Plus className="w-3 h-3" />
                Add Role
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-slate-100 shadow-sm bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role & Name</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsibility</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Authority</th>
                  {isEditing && <th className="px-6 py-4 w-16"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {hrmp.roles.map((role) => (
                  <tr key={role.id} className="group hover:bg-slate-50/30 transition-all">
                    <td className="px-6 py-4 space-y-2">
                      {isEditing ? (
                        <>
                          <input 
                            type="text"
                            value={role.role}
                            onChange={(e) => handleRoleChange(role.id, 'role', e.target.value)}
                            className="w-full bg-transparent border-none text-sm font-bold text-slate-900 outline-none placeholder:text-slate-300"
                            placeholder="Role Title..."
                          />
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <UserPlus className="w-3 h-3 text-blue-400" />
                            <input 
                              type="text"
                              value={role.name}
                              onChange={(e) => handleRoleChange(role.id, 'name', e.target.value)}
                              className="bg-transparent border-none outline-none placeholder:text-slate-300 w-full"
                              placeholder="Assign Name (Populates Stakeholders)..."
                            />
                          </div>
                        </>
                      ) : (
                        <div>
                          <div className="text-sm font-bold text-slate-900">{role.role || '---'}</div>
                          {role.name && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                              <User className="w-3 h-3" />
                              {role.name}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <textarea 
                          value={role.responsibility}
                          onChange={(e) => handleRoleChange(role.id, 'responsibility', e.target.value)}
                          className="w-full bg-transparent border-none text-sm text-slate-600 outline-none placeholder:text-slate-300 resize-none"
                          rows={2}
                          placeholder="Define responsibilities..."
                        />
                      ) : (
                        <div className="text-sm text-slate-600 whitespace-pre-wrap">{role.responsibility || '---'}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <textarea 
                          value={role.authority}
                          onChange={(e) => handleRoleChange(role.id, 'authority', e.target.value)}
                          className="w-full bg-transparent border-none text-sm text-slate-600 outline-none placeholder:text-slate-300 resize-none"
                          rows={2}
                          placeholder="Define authority levels..."
                        />
                      ) : (
                        <div className="text-sm text-slate-600 whitespace-pre-wrap">{role.authority || '---'}</div>
                      )}
                    </td>
                    {isEditing && (
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleRemoveRole(role.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {hrmp.roles.length === 0 && (
                  <tr>
                    <td colSpan={isEditing ? 4 : 3} className="px-6 py-12 text-center text-sm text-slate-400 italic">No roles defined.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Organizational Structure */}
        <section className="space-y-4">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Organizational Structure</label>
          <div className="w-full aspect-[21/9] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-slate-400 group hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
              <Network className="w-8 h-8 text-slate-300 group-hover:text-blue-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-500 group-hover:text-blue-600 transition-colors">Visual Organizational Chart</p>
              <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-widest">
                {isEditing ? 'Click to upload or generate structure' : 'Organizational Chart Visual Placeholder'}
              </p>
            </div>
          </div>
        </section>

        {/* Staffing Management Plan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="space-y-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Staff Acquisition</label>
            {isEditing ? (
              <textarea 
                value={hrmp.staffAcquisition}
                onChange={(e) => setHrmp({ ...hrmp, staffAcquisition: e.target.value })}
                rows={4}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder="Define staff acquisition process..."
              />
            ) : (
              <div className="px-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {hrmp.staffAcquisition || '---'}
              </div>
            )}
          </section>
          <section className="space-y-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Staff Release</label>
            {isEditing ? (
              <textarea 
                value={hrmp.staffRelease}
                onChange={(e) => setHrmp({ ...hrmp, staffRelease: e.target.value })}
                rows={4}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder="Define staff release criteria..."
              />
            ) : (
              <div className="px-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {hrmp.staffRelease || '---'}
              </div>
            )}
          </section>
        </div>

        {[
          { label: 'Resource Calendars', key: 'resourceCalendars', placeholder: 'Example: Saturday - Thursday, 08:00 AM - 05:00 PM' },
          { label: 'Training Requirements', key: 'trainingRequirements', placeholder: 'Define training needs for the project team...' },
          { label: 'Rewards and Recognition', key: 'rewardsRecognition', placeholder: 'Define team rewards and recognition program...' },
          { label: 'Regulations, Standards, and Policy Compliance', key: 'policyCompliance', placeholder: 'Define compliance requirements...' }
        ].map((section) => (
          <section key={section.key} className="space-y-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{section.label}</label>
            {isEditing ? (
              <textarea 
                value={(hrmp as any)[section.key]}
                onChange={(e) => setHrmp({ ...hrmp, [section.key]: e.target.value })}
                rows={3}
                className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
                placeholder={section.placeholder}
              />
            ) : (
              <div className="px-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {(hrmp as any)[section.key] || '---'}
              </div>
            )}
          </section>
        ))}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Safety</label>
            <div className="flex items-center gap-2 text-[10px] text-red-600 font-bold bg-red-50 px-2 py-1 rounded">
              <Stethoscope className="w-3 h-3" />
              Linked to HSE Officer (Ivan)
            </div>
          </div>
          {isEditing ? (
            <textarea 
              value={hrmp.safety}
              onChange={(e) => setHrmp({ ...hrmp, safety: e.target.value })}
              rows={3}
              className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none leading-relaxed"
              placeholder="Define safety requirements and roles..."
            />
          ) : (
            <div className="px-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {hrmp.safety || '---'}
            </div>
          )}
        </section>
      </div>

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

      {/* Version History */}
      <section className="space-y-6">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Revision History</h3>
        <div className="overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Version</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Author</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {versions.length > 0 ? versions.map((v) => (
                <tr key={v.version}>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">V{v.version.toFixed(1)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{new Date(v.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{v.author}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">HR Management Plan Update</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-400 italic">No revision history found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
