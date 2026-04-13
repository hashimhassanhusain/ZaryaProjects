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
  Shield,
  FolderTree,
  MessageSquare,
  Settings,
  Info,
  Users,
  Gavel,
  FileSearch,
  HardDrive
} from 'lucide-react';
import { Page, Project, PageVersion } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where,
  getDocs,
  serverTimestamp,
  setDoc,
  orderBy,
  getDoc
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface GovernancePoliciesViewProps {
  page: Page;
}

interface RevisionEntry {
  id: string;
  version: string;
  date: string;
  description: string;
  by: string;
}

interface GovernanceRole {
  id: string;
  name: string;
  title: string;
  responsibilities: string;
  permissionLevel: 'Financial/Technical Approver' | 'Field/Schedule Supervisor' | 'Standard User';
}

interface PolicyData {
  projectTitle: string;
  revisionHistory: RevisionEntry[];
  governanceRoles: GovernanceRole[];
  communicationProtocols: string;
  archivingNamingProtocol: string;
  folderStructure: string;
  technicalStandards: string;
  procurementStandards: string;
  disciplinaryCode: string;
}

export const GovernancePoliciesView: React.FC<GovernancePoliciesViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [policies, setPolicies] = useState<PolicyData>({
    projectTitle: `${selectedProject?.code || ''} - ${selectedProject?.name || ''}`,
    revisionHistory: [
      { id: '1', version: 'V01.0', date: '2026-01-08', description: 'الإصدار الأول المعتمد', by: 'هاشم حسن' }
    ],
    governanceRoles: [
      { id: '1', name: 'هاشم حسن', title: 'Co-Leader (Technical/Financial)', responsibilities: 'المسؤول عن المسائل التصميمية، المكتب الفني، الأرشفة، العقود والمشتريات.', permissionLevel: 'Financial/Technical Approver' },
      { id: '2', name: 'دانا صالح', title: 'Co-Leader (Field/Schedule)', responsibilities: 'المسؤول عن التنفيذ الميداني، إدارة الجدول الزمني، حل التعارضات الميدانية.', permissionLevel: 'Field/Schedule Supervisor' }
    ],
    communicationProtocols: 'الاجتماع الأسبوعي: الخميس الساعة 2:00 ظهراً لكامل الفريق الهندسي. الرسمية: البريد الإلكتروني والكتب الموقعة هي الوسائل الرسمية الوحيدة.',
    archivingNamingProtocol: `[${selectedProject?.code || 'PCODE'}]-[DIVxx]-[Type]-[RefNo]-[Desc]-[Ver]-[Date]`,
    folderStructure: '00-Transmittals, 01-Management, 02-Planning_Controls, 03-Technical, 04-Procurement, 05-Handover',
    technicalStandards: 'MasterFormat 16 Divisions Standard for all technical specifications and BOQ coding.',
    procurementStandards: 'All POs must be categorized by Division and approved by Hashim Hassan.',
    disciplinaryCode: 'الشفافية: إخفاء المشاكل أو الحوادث عن قيادة المشروع يعتبر مخالفة جسيمة تستوجب المساءلة.'
  });

  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPrompt, setShowPrompt] = useState<{ type: string; message: string; onConfirm: () => void } | null>(null);
  const [activeTab, setActiveTab] = useState<'governance' | 'communication' | 'archiving' | 'standards'>('governance');

  useEffect(() => {
    if (!selectedProject) return;

    const unsub = onSnapshot(doc(db, 'projects', selectedProject.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Project;
        if (data.policyData) {
          setPolicies(data.policyData as unknown as PolicyData);
        }
        if (data.policyHistory) {
          setVersions(data.policyHistory);
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [selectedProject?.id]);

  const handleSave = async (isNewVersion: boolean = false) => {
    if (!selectedProject) return;
    setIsSaving(true);

    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const updateData: any = {
        policyData: policies,
        updatedAt: timestamp,
        updatedBy: user
      };

      if (isNewVersion) {
        const nextVersionNum = (versions[0]?.version || 0) + 1;
        const newVersion: PageVersion = {
          version: nextVersionNum,
          date: timestamp,
          author: user,
          data: policies as any
        };
        updateData.policyHistory = [newVersion, ...versions];
      }

      await updateDoc(doc(db, 'projects', selectedProject.id), updateData);

      // Smart Linking: Update Permissions based on Roles
      for (const role of policies.governanceRoles) {
        // In a real app, we would update the user's permission level in the 'users' collection
        console.log(`Linking ${role.name} to permission level: ${role.permissionLevel}`);
      }

      // Prompt for restricted modules
      const affected = ['Schedule', 'Procurement', 'Reports'];
      setShowPrompt({
        type: affected.join(' & '),
        message: `This policy update impacts the ${affected.join(', ')}. Do you want to propose a link?`,
        onConfirm: () => {
          console.log('Policy linking proposed for:', affected);
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
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('PROJECT POLICIES & PROCEDURES', pageWidth / 2, 35, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`(دليل سياسات وإجراءات إدارة المشاريع)`, pageWidth / 2, 42, { align: 'center' });
      doc.setFontSize(8);
      doc.text(`Page ${pageNum}`, pageWidth - margin, 10, { align: 'right' });
    };

    // Page 1
    renderHeader(1);
    doc.setFontSize(9);
    doc.text(`Project: ${policies.projectTitle}`, margin, 50);
    
    autoTable(doc, {
      startY: 55,
      head: [['Revision History (سجل التعديلات)']],
      body: [],
      theme: 'plain',
      headStyles: { fillColor: [48, 48, 48], textColor: [255, 255, 255] }
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY,
      head: [['Version', 'Date', 'Description', 'By']],
      body: policies.revisionHistory.map(r => [r.version, r.date, r.description, r.by]),
      theme: 'grid',
      styles: { fontSize: 8 }
    });

    let y = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('1. Governance & Roles (الحوكمة وتوزيع المسؤوليات)', margin, y);
    y += 5;
    
    autoTable(doc, {
      startY: y,
      head: [['Name', 'Title', 'Responsibilities']],
      body: policies.governanceRoles.map(r => [r.name, r.title, r.responsibilities]),
      theme: 'grid',
      styles: { fontSize: 8 }
    });

    // Page 2
    doc.addPage();
    renderHeader(2);
    y = 50;
    doc.setFont('helvetica', 'bold');
    doc.text('2. Communication & Reporting (التواصل والاجتماعات)', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const commLines = doc.splitTextToSize(policies.communicationProtocols, pageWidth - 2 * margin);
    doc.text(commLines, margin, y);
    y += commLines.length * 5 + 10;

    doc.setFont('helvetica', 'bold');
    doc.text('3. Document Control & Archiving (إدارة المعلومات والأرشفة)', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(`Naming Protocol: ${policies.archivingNamingProtocol}`, margin, y);
    y += 10;
    doc.text(`Folder Structure: ${policies.folderStructure}`, margin, y);
    y += 15;

    doc.setFont('helvetica', 'bold');
    doc.text('4. Technical & Procurement Standards', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(`Technical: ${policies.technicalStandards}`, margin, y);
    y += 10;
    doc.text(`Procurement: ${policies.procurementStandards}`, margin, y);

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = (versions[0]?.version || 1.0).toFixed(1);
    doc.save(`${selectedProject.code}-ZRY-MGT-MAN-POL-${dateStr}-V${vStr}.pdf`);
  };

  const addRevision = () => {
    setPolicies({
      ...policies,
      revisionHistory: [
        ...policies.revisionHistory,
        { id: Date.now().toString(), version: `V0${policies.revisionHistory.length + 1}.0`, date: new Date().toISOString().split('T')[0], description: '', by: auth.currentUser?.displayName || '' }
      ]
    });
  };

  const addRole = () => {
    setPolicies({
      ...policies,
      governanceRoles: [
        ...policies.governanceRoles,
        { id: Date.now().toString(), name: '', title: '', responsibilities: '', permissionLevel: 'Standard User' }
      ]
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-slate-200">
            <Gavel className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{page.title}</h1>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">REF: {page.id}</span>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">Constitution v{(versions[0]?.version || 1.0).toFixed(1)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
          >
            <History className="w-4 h-4" />
            History
          </button>
          <button 
            onClick={generatePDF}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
          >
            <Download className="w-4 h-4" />
            Export Manual
          </button>
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl">
            <button 
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="px-4 py-2 text-white font-bold text-xs hover:bg-white/10 rounded-lg transition-all"
            >
              New Version
            </button>
            <button 
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Overwrite
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Nav */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-4 shadow-sm">
            <button 
              onClick={() => setActiveTab('governance')}
              className={cn(
                "w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all",
                activeTab === 'governance' ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <Users className="w-4 h-4" />
              Governance & Roles
            </button>
            <button 
              onClick={() => setActiveTab('communication')}
              className={cn(
                "w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all mt-2",
                activeTab === 'communication' ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <MessageSquare className="w-4 h-4" />
              Communication
            </button>
            <button 
              onClick={() => setActiveTab('archiving')}
              className={cn(
                "w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all mt-2",
                activeTab === 'archiving' ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <FolderTree className="w-4 h-4" />
              Archiving & Naming
            </button>
            <button 
              onClick={() => setActiveTab('standards')}
              className={cn(
                "w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all mt-2",
                activeTab === 'standards' ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <Shield className="w-4 h-4" />
              Standards & Code
            </button>
          </div>

          <div className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-200">
            <Info className="w-8 h-8 mb-4 opacity-50" />
            <h4 className="font-bold mb-2">Zarya FNC Standard</h4>
            <p className="text-xs text-blue-100 leading-relaxed">
              Files must be named using the Zarya FNC standard before uploading to maintain data integrity across the master folder structure.
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="lg:col-span-3">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden min-h-[600px]">
            <div className="p-10 space-y-12">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Project Title</label>
                <input 
                  type="text"
                  value={policies.projectTitle}
                  onChange={(e) => setPolicies({ ...policies, projectTitle: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  placeholder="Enter Project Code and Name (e.g., P16314 - Villa 2)"
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-10"
                >
                  {activeTab === 'governance' && (
                    <div className="space-y-10">
                      <section className="space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Revision History</h3>
                          <button onClick={addRevision} className="p-1 hover:bg-slate-100 rounded-md text-blue-600 transition-all">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-4">
                          {policies.revisionHistory.map((rev, idx) => (
                            <div key={rev.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl">
                              <input 
                                type="text" 
                                value={rev.version} 
                                readOnly 
                                className="bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-black text-blue-600"
                              />
                              <input 
                                type="date" 
                                value={rev.date} 
                                onChange={(e) => {
                                  const newHist = [...policies.revisionHistory];
                                  newHist[idx].date = e.target.value;
                                  setPolicies({ ...policies, revisionHistory: newHist });
                                }}
                                className="bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-medium"
                              />
                              <input 
                                type="text" 
                                placeholder="Revision Description..."
                                value={rev.description} 
                                onChange={(e) => {
                                  const newHist = [...policies.revisionHistory];
                                  newHist[idx].description = e.target.value;
                                  setPolicies({ ...policies, revisionHistory: newHist });
                                }}
                                className="bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-medium md:col-span-1"
                              />
                              <input 
                                type="text" 
                                value={rev.by} 
                                onChange={(e) => {
                                  const newHist = [...policies.revisionHistory];
                                  newHist[idx].by = e.target.value;
                                  setPolicies({ ...policies, revisionHistory: newHist });
                                }}
                                className="bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-medium"
                              />
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Governance Roles</h3>
                          <button onClick={addRole} className="p-1 hover:bg-slate-100 rounded-md text-blue-600 transition-all">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-6">
                          {policies.governanceRoles.map((role, idx) => (
                            <div key={role.id} className="p-6 bg-slate-50 rounded-[2rem] space-y-4 border border-slate-100 group relative">
                              <button 
                                onClick={() => {
                                  const newRoles = policies.governanceRoles.filter(r => r.id !== role.id);
                                  setPolicies({ ...policies, governanceRoles: newRoles });
                                }}
                                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</label>
                                  <input 
                                    type="text" 
                                    value={role.name}
                                    onChange={(e) => {
                                      const newRoles = [...policies.governanceRoles];
                                      newRoles[idx].name = e.target.value;
                                      setPolicies({ ...policies, governanceRoles: newRoles });
                                    }}
                                    className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Title</label>
                                  <input 
                                    type="text" 
                                    value={role.title}
                                    onChange={(e) => {
                                      const newRoles = [...policies.governanceRoles];
                                      newRoles[idx].title = e.target.value;
                                      setPolicies({ ...policies, governanceRoles: newRoles });
                                    }}
                                    className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsibilities</label>
                                <textarea 
                                  value={role.responsibilities}
                                  onChange={(e) => {
                                    const newRoles = [...policies.governanceRoles];
                                    newRoles[idx].responsibilities = e.target.value;
                                    setPolicies({ ...policies, governanceRoles: newRoles });
                                  }}
                                  className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium resize-none"
                                  rows={2}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Permission Level</label>
                                <select 
                                  value={role.permissionLevel}
                                  onChange={(e) => {
                                    const newRoles = [...policies.governanceRoles];
                                    newRoles[idx].permissionLevel = e.target.value as any;
                                    setPolicies({ ...policies, governanceRoles: newRoles });
                                  }}
                                  className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest text-blue-600 outline-none"
                                >
                                  <option value="Financial/Technical Approver">Financial/Technical Approver</option>
                                  <option value="Field/Schedule Supervisor">Field/Schedule Supervisor</option>
                                  <option value="Standard User">Standard User</option>
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  )}

                  {activeTab === 'communication' && (
                    <div className="space-y-8">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Communication & Reporting Protocols</label>
                        <textarea 
                          value={policies.communicationProtocols}
                          onChange={(e) => setPolicies({ ...policies, communicationProtocols: e.target.value })}
                          rows={10}
                          className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none leading-relaxed"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'archiving' && (
                    <div className="space-y-10">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Naming Protocol (Zarya FNC)</label>
                        <input 
                          type="text"
                          value={policies.archivingNamingProtocol}
                          onChange={(e) => setPolicies({ ...policies, archivingNamingProtocol: e.target.value })}
                          className="w-full px-6 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-sm font-mono text-blue-400 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Master Folder Structure</label>
                        <textarea 
                          value={policies.folderStructure}
                          onChange={(e) => setPolicies({ ...policies, folderStructure: e.target.value })}
                          rows={8}
                          className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none leading-relaxed"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'standards' && (
                    <div className="space-y-10">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Technical Standards (MasterFormat 16 Divisions)</label>
                        <textarea 
                          value={policies.technicalStandards}
                          onChange={(e) => setPolicies({ ...policies, technicalStandards: e.target.value })}
                          rows={4}
                          className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Procurement Standards</label>
                        <textarea 
                          value={policies.procurementStandards}
                          onChange={(e) => setPolicies({ ...policies, procurementStandards: e.target.value })}
                          rows={4}
                          className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Disciplinary Code & Ethics</label>
                        <textarea 
                          value={policies.disciplinaryCode}
                          onChange={(e) => setPolicies({ ...policies, disciplinaryCode: e.target.value })}
                          rows={4}
                          className="w-full px-8 py-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-medium outline-none resize-none"
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>

      {/* History List */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <History className="w-6 h-6 text-blue-400" />
            Policy Revision History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Version</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Author</th>
                <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {versions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-white/20 font-bold uppercase tracking-widest">No history recorded.</td>
                </tr>
              ) : (
                versions.map((v) => (
                  <tr key={v.version} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-blue-400 font-black">v{v.version.toFixed(1)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-white/60">
                      {new Date(v.date).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold">
                      {v.author}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setPolicies(v.data as unknown as PolicyData)}
                        className="text-xs font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest"
                      >
                        Restore
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
    </div>
  );
};
