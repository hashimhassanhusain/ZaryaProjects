import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { 
  Save, 
  Download, 
  History, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Settings,
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
  Gavel,
  Briefcase,
  Users
} from 'lucide-react';
import { Page, Project, PageVersion, EntityConfig } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  collection, 
  updateDoc, 
  doc, 
  onSnapshot, 
  getDoc,
  query,
  where,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { cn, stripNumericPrefix } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { StandardProcessPage } from './StandardProcessPage';
import { UniversalDataTable } from './common/UniversalDataTable';

interface GovernancePoliciesViewProps {
  page: Page;
  embedded?: boolean;
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
  governanceRoles: GovernanceRole[];
  communicationProtocols: string;
  archivingNamingProtocol: string;
  folderStructure: string;
  technicalStandards: string;
  procurementStandards: string;
  disciplinaryCode: string;
  version?: string;
}

export const GovernancePoliciesView: React.FC<GovernancePoliciesViewProps> = ({ page, embedded = false }) => {
  const { t, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const [policies, setPolicies] = useState<PolicyData>({
    projectTitle: '',
    governanceRoles: [
      { id: '1', name: '', title: '', responsibilities: '', permissionLevel: 'Standard User' }
    ],
    communicationProtocols: '',
    archivingNamingProtocol: '',
    folderStructure: '',
    technicalStandards: '',
    procurementStandards: '',
    disciplinaryCode: ''
  });

  const [policyRecords, setPolicyRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'projectPolicies'), 
      where('projectId', '==', selectedProject.id)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPolicyRecords(data);
      setLoading(false);
    });

    return () => unsub();
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!selectedRecordId && viewMode === 'edit') {
      setPolicies({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
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
    } else if (selectedRecordId && viewMode === 'edit') {
       const record = policyRecords.find(r => r.id === selectedRecordId);
       if (record) setPolicies(record);
    }
  }, [selectedRecordId, viewMode, policyRecords, selectedProject]);

  const handleSave = async (isNew: boolean = false) => {
    if (!selectedProject) return;
    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      const policyData = {
        ...policies,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: isNew || !selectedRecordId ? (policyRecords.length + 1).toFixed(1) : policies.version || '1.0'
      };

      if (!selectedRecordId) {
        await addDoc(collection(db, 'projectPolicies'), {
          ...policyData,
          createdAt: timestamp
        });
        toast.success(t('policy_created_success') || 'Policy created successfully');
      } else {
        await updateDoc(doc(db, 'projectPolicies', selectedRecordId), policyData);
        toast.success(t('policy_updated_success') || 'Policy updated successfully');
      }
      setViewMode('grid');
      setSelectedRecordId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'projectPolicies');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      await deleteDoc(doc(db, 'projectPolicies', id));
      toast.success(t('policy_deleted_success') || 'Policy deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'projectPolicies');
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const docObj = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = docObj.internal.pageSize.width;

    const renderHeader = (pageNum: number) => {
      docObj.setFontSize(14);
      docObj.setFont('helvetica', 'bold');
      docObj.text('PROJECT POLICIES & PROCEDURES', pageWidth / 2, 35, { align: 'center' });
      docObj.setFontSize(10);
      docObj.text(`(دليل سياسات وإجراءات إدارة المشاريع)`, pageWidth / 2, 42, { align: 'center' });
      docObj.setFontSize(8);
      docObj.text(`Page ${pageNum}`, pageWidth - margin, 10, { align: 'right' });
    };

    renderHeader(1);
    docObj.setFontSize(9);
    docObj.text(`Project: ${policies.projectTitle}`, margin, 50);
    
    let y = 60;
    docObj.setFont('helvetica', 'bold');
    docObj.text('1. Governance & Roles (الحوكمة وتوزيع المسؤوليات)', margin, y);
    y += 5;
    
    autoTable(docObj, {
      startY: y,
      head: [['Name', 'Title', 'Responsibilities']],
      body: policies.governanceRoles.map(r => [r.name, r.title, r.responsibilities]),
      theme: 'grid',
      styles: { fontSize: 8 }
    });

    docObj.addPage();
    renderHeader(2);
    y = 50;
    docObj.setFont('helvetica', 'bold');
    docObj.text('2. Communication & Reporting (التواصل والاجتماعات)', margin, y);
    y += 5;
    docObj.setFont('helvetica', 'normal');
    const commLines = docObj.splitTextToSize(policies.communicationProtocols, pageWidth - 2 * margin);
    docObj.text(commLines, margin, y);
    y += commLines.length * 5 + 10;

    docObj.setFont('helvetica', 'bold');
    docObj.text('3. Document Control & Archiving (إدارة المعلومات والأرشفة)', margin, y);
    y += 5;
    docObj.setFont('helvetica', 'normal');
    docObj.text(`Naming Protocol: ${policies.archivingNamingProtocol}`, margin, y);
    y += 10;
    docObj.text(`Folder Structure: ${policies.folderStructure}`, margin, y);
    y += 15;

    docObj.setFont('helvetica', 'bold');
    docObj.text('4. Technical & Procurement Standards', margin, y);
    y += 5;
    docObj.setFont('helvetica', 'normal');
    docObj.text(`Technical: ${policies.technicalStandards}`, margin, y);
    y += 10;
    docObj.text(`Procurement: ${policies.procurementStandards}`, margin, y);

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const vStr = policies.version || '1.0';
    docObj.save(`${selectedProject.code}-ZRY-MGT-MAN-POL-${dateStr}-V${vStr}.pdf`);
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

  const removeRole = (id: string) => {
    setPolicies({
      ...policies,
      governanceRoles: policies.governanceRoles.filter(r => r.id !== id)
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const gridConfig: EntityConfig = {
    id: 'projectPolicies' as any,
    label: t('project_policies'),
    icon: Shield,
    collection: 'projectPolicies',
    columns: [
      { key: 'version', label: t('version'), type: 'badge' },
      { key: 'projectTitle', label: t('project_title'), type: 'string' },
      { key: 'updatedAt', label: t('updated_at'), type: 'date' },
      { key: 'updatedBy', label: t('updated_by'), type: 'string' }
    ]
  };

  return (
    <StandardProcessPage
      page={{
        ...page,
        title: viewMode === 'edit' ? t('edit_view') : page.title
      }}
      embedded={embedded}
      onSave={() => handleSave(false)}
      onPrint={generatePDF}
      isSaving={isSaving}
      inputs={[
        { id: '1.1.1', title: 'Project Charter' },
        { id: 'business-case', title: 'Business Case' },
        { id: 'agreements', title: 'Agreements' }
      ]}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
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
                data={policyRecords}
                onRowClick={(record) => {
                  setSelectedRecordId(record.id);
                  setViewMode('edit');
                }}
                onNewClick={() => {
                  setSelectedRecordId(null);
                  setViewMode('edit');
                }}
                onDeleteRecord={handleDelete}
              />
            </motion.div>
          ) : (
            <motion.div
              key="edit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 pb-10"
            >
              <div className="flex justify-end pr-2">
                 <button 
                   onClick={() => setViewMode('grid')}
                   className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-bold hover:bg-slate-200 transition-all uppercase tracking-wider"
                 >
                   <ArrowLeft className="w-3 h-3" />
                   {t('back_to_list')}
                 </button>
              </div>

              <section className="space-y-4">
                 <div className="flex items-center justify-between px-2">
                    <div className={cn("space-y-0.5", isRtl && "text-right")}>
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight uppercase">{t('project_canvas_hub')}</h2>
                      <p className={cn("text-[9px] text-slate-400 font-medium tracking-wide border-l-2 border-blue-500/50 pl-2", isRtl && "border-l-0 border-r-2 pr-2")}>{t('interactive_workspace')}</p>
                    </div>
                 </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                   <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                      <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                         <Briefcase className="w-4.5 h-4.5" />
                      </div>
                      <div className="space-y-1">
                         <label className={cn("text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] block", isRtl && "text-right")}>Project Identification</label>
                         <input 
                           type="text"
                           value={policies.projectTitle}
                           onChange={(e) => setPolicies({ ...policies, projectTitle: e.target.value })}
                           className={cn("w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all", isRtl && "text-right")}
                           placeholder="Project Name & Code"
                         />
                      </div>
                   </div>

                   <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                      <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                         <Gavel className="w-4.5 h-4.5" />
                      </div>
                      <div className="space-y-1">
                         <label className={cn("text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] block", isRtl && "text-right")}>Archiving Naming Protocol</label>
                         <input 
                           type="text"
                           value={policies.archivingNamingProtocol}
                           onChange={(e) => setPolicies({ ...policies, archivingNamingProtocol: e.target.value })}
                           className={cn("w-full px-3 py-2 bg-slate-900 text-blue-400 border border-slate-800 rounded-lg text-xs font-mono outline-none focus:ring-4 focus:ring-blue-500/10 transition-all", isRtl && "text-right")}
                           placeholder="[CODE]-[DIV]-[TYPE]..."
                         />
                      </div>
                   </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200">
                  <div className={cn("flex items-center justify-between mb-4", isRtl && "flex-row-reverse")}>
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-blue-500" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Governance Roles</h3>
                    </div>
                    <button onClick={addRole} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg font-bold uppercase tracking-widest text-[8px] hover:bg-slate-800 transition-all">
                      <Plus className="w-3 h-3" />
                      Add Role
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {policies.governanceRoles.map((role, idx) => (
                      <div key={`${role.id}-${idx}`} className="p-4 bg-slate-50 rounded-xl border border-slate-100 relative group flex flex-col md:flex-row gap-3">
                        <button 
                          onClick={() => removeRole(role.id)}
                          className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input 
                            placeholder="Name"
                            value={role.name}
                            onChange={(e) => {
                              const newRoles = [...policies.governanceRoles];
                              newRoles[idx].name = e.target.value;
                              setPolicies({...policies, governanceRoles: newRoles});
                            }}
                            className={cn("px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none", isRtl && "text-right")}
                          />
                          <input 
                            placeholder="Title"
                            value={role.title}
                            onChange={(e) => {
                              const newRoles = [...policies.governanceRoles];
                              newRoles[idx].title = e.target.value;
                              setPolicies({...policies, governanceRoles: newRoles});
                            }}
                            className={cn("px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none", isRtl && "text-right")}
                          />
                          <textarea 
                            placeholder="Responsibilities"
                            value={role.responsibilities}
                            onChange={(e) => {
                              const newRoles = [...policies.governanceRoles];
                              newRoles[idx].responsibilities = e.target.value;
                              setPolicies({...policies, governanceRoles: newRoles});
                            }}
                            rows={1}
                            className={cn("md:col-span-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none", isRtl && "text-right")}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-3">
                    <h3 className={cn("text-[11px] font-bold text-slate-900 uppercase tracking-widest", isRtl && "text-right")}>Communication Protocols</h3>
                    <textarea 
                      value={policies.communicationProtocols}
                      onChange={(e) => setPolicies({...policies, communicationProtocols: e.target.value})}
                      className={cn("w-full h-24 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-medium outline-none", isRtl && "text-right")}
                      placeholder="Meeting schedules, official channels..."
                    />
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-3">
                    <h3 className={cn("text-[11px] font-bold text-slate-900 uppercase tracking-widest", isRtl && "text-right")}>Technical Standards</h3>
                    <textarea 
                      value={policies.technicalStandards}
                      onChange={(e) => setPolicies({...policies, technicalStandards: e.target.value})}
                      className={cn("w-full h-24 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-medium outline-none", isRtl && "text-right")}
                      placeholder="MasterFormat coding, specs..."
                    />
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-3">
                    <h3 className={cn("text-[11px] font-bold text-slate-900 uppercase tracking-widest", isRtl && "text-right")}>Folder Structure</h3>
                    <textarea 
                      value={policies.folderStructure}
                      onChange={(e) => setPolicies({...policies, folderStructure: e.target.value})}
                      className={cn("w-full h-24 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-medium outline-none", isRtl && "text-right")}
                      placeholder="Define top-level folders..."
                    />
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-3">
                    <h3 className={cn("text-[11px] font-bold text-slate-900 uppercase tracking-widest", isRtl && "text-right")}>Disciplinary Code</h3>
                    <textarea 
                      value={policies.disciplinaryCode}
                      onChange={(e) => setPolicies({...policies, disciplinaryCode: e.target.value})}
                      className={cn("w-full h-24 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-medium outline-none", isRtl && "text-right")}
                      placeholder="Rules of engagement, ethics..."
                    />
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
