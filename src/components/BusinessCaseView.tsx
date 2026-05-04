import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
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
  ArrowLeft,
  Target,
  DollarSign,
  TrendingUp,
  Briefcase,
  PieChart,
  ShieldCheck,
  Star,
  Layers
} from 'lucide-react';
import { Page, EntityConfig } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  collection, 
  updateDoc, 
  doc, 
  onSnapshot, 
  getDoc,
  query,
  where,
  orderBy,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { StandardProcessPage } from './StandardProcessPage';
import { UniversalDataTable } from './common/UniversalDataTable';

interface BusinessCaseViewProps {
  page: Page;
  embedded?: boolean;
}

interface CostBenefitItem {
  id: string;
  category: string;
  description: string;
  amount: number;
  type: 'Benefit' | 'Cost';
}

interface BusinessCaseData {
  projectTitle: string;
  executiveSummary: string;
  businessNeed: string;
  strategicAlignment: string;
  marketAnalysis: string;
  technicalFeasibility: string;
  optionsAppraisal: string;
  costBenefitAnalysis: CostBenefitItem[];
  riskAssessment: string;
  roi: number;
  npv: number;
  paybackPeriod: string;
  recommendation: string;
  version?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const BusinessCaseView: React.FC<BusinessCaseViewProps> = ({ page, embedded = false }) => {
  const { t, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  const { exchangeRate: currentExchangeRate } = useCurrency();
  
  const [viewMode, setViewMode] = useState<'grid' | 'edit'>('grid');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const [businessCase, setBusinessCase] = useState<BusinessCaseData>({
    projectTitle: '',
    executiveSummary: '',
    businessNeed: '',
    strategicAlignment: '',
    marketAnalysis: '',
    technicalFeasibility: '',
    optionsAppraisal: '',
    costBenefitAnalysis: [
      { id: '1', category: 'Operational', description: 'Efficiency Gain', amount: 0, type: 'Benefit' },
      { id: '2', category: 'Investment', description: 'Initial Capital', amount: 0, type: 'Cost' }
    ],
    riskAssessment: '',
    roi: 0,
    npv: 0,
    paybackPeriod: '',
    recommendation: ''
  });

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'business_cases'), 
      where('projectId', '==', selectedProject.id)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecords(data);
      if (data.length === 0 && !embedded) {
        setViewMode('edit');
      }
      setLoading(false);
    });

    return () => unsub();
  }, [selectedProject?.id]);

  useEffect(() => {
    if (selectedRecordId && viewMode === 'edit') {
      const record = records.find(r => r.id === selectedRecordId);
      if (record) setBusinessCase(record);
    } else if (!selectedRecordId && viewMode === 'edit') {
      setBusinessCase({
        projectTitle: selectedProject ? `${selectedProject.name} (${selectedProject.code})` : '',
        executiveSummary: '',
        businessNeed: '',
        strategicAlignment: '',
        marketAnalysis: '',
        technicalFeasibility: '',
        optionsAppraisal: '',
        costBenefitAnalysis: [
          { id: '1', category: 'Operational', description: 'Efficiency Gain', amount: 0, type: 'Benefit' },
          { id: '2', category: 'Investment', description: 'Initial Capital', amount: 0, type: 'Cost' }
        ],
        riskAssessment: '',
        roi: 0,
        npv: 0,
        paybackPeriod: '',
        recommendation: '',
        version: '1.0'
      });
    }
  }, [selectedRecordId, viewMode, records, selectedProject]);

  const handleSave = async () => {
    if (!selectedProject) return;
    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      
      const data = {
        ...businessCase,
        projectId: selectedProject.id,
        updatedAt: timestamp,
        updatedBy: user,
        version: !selectedRecordId ? (records.length + 1).toFixed(1) : businessCase.version || '1.0'
      };

      if (!selectedRecordId) {
        await addDoc(collection(db, 'business_cases'), {
          ...data,
          createdAt: timestamp
        });
        toast.success(t('business_case_created_success') || 'Business Case created');
      } else {
        await updateDoc(doc(db, 'business_cases', selectedRecordId), data);
        toast.success(t('business_case_updated_success') || 'Business Case updated');
      }
      setViewMode('grid');
      setSelectedRecordId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'business_cases');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirm_delete'))) return;
    try {
      await deleteDoc(doc(db, 'business_cases', id));
      toast.success(t('delete_success'));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'business_cases');
    }
  };

  const generatePDF = () => {
    if (!selectedProject) return;
    const docObj = new jsPDF('p', 'mm', 'a4');
    const margin = 20;
    const pageWidth = docObj.internal.pageSize.width;

    docObj.setFontSize(16);
    docObj.text('BUSINESS CASE', pageWidth / 2, 30, { align: 'center' });
    
    docObj.setFontSize(10);
    docObj.text(`Project: ${businessCase.projectTitle}`, margin, 45);
    
    let y = 55;
    const sections = [
      { title: 'Executive Summary', content: businessCase.executiveSummary },
      { title: 'Business Need', content: businessCase.businessNeed },
      { title: 'Strategic Alignment', content: businessCase.strategicAlignment },
      { title: 'ROI (%)', content: businessCase.roi.toString() },
      { title: 'Recommendation', content: businessCase.recommendation }
    ];

    sections.forEach(s => {
      docObj.setFont('helvetica', 'bold');
      docObj.text(s.title, margin, y);
      y += 5;
      docObj.setFont('helvetica', 'normal');
      const lines = docObj.splitTextToSize(s.content || '', pageWidth - 2 * margin);
      docObj.text(lines, margin, y);
      y += lines.length * 5 + 10;
      if (y > 270) { docObj.addPage(); y = 20; }
    });

    docObj.save(`BusinessCase-${businessCase.projectTitle.replace(/\s+/g, '_')}.pdf`);
  };

  const gridConfig: EntityConfig = {
    id: 'business_cases' as any,
    label: t('business_case'),
    icon: Target,
    collection: 'business_cases',
    columns: [
      { key: 'version', label: t('version'), type: 'badge' },
      { key: 'projectTitle', label: t('project_title'), type: 'string' },
      { key: 'roi', label: 'ROI %', type: 'number' },
      { key: 'updatedAt', label: t('updated_at'), type: 'date' },
      { key: 'updatedBy', label: t('updated_by'), type: 'string' }
    ]
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <StandardProcessPage
      page={{...page, title: viewMode === 'edit' ? t('edit_view') : page.title}}
      onSave={handleSave}
      onPrint={generatePDF}
      isSaving={isSaving}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    >
      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div key="grid" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
              <UniversalDataTable 
                config={gridConfig} 
                data={records} 
                onRowClick={(r) => { setSelectedRecordId(r.id); setViewMode('edit'); }}
                onNewClick={() => { setSelectedRecordId(null); setViewMode('edit'); }}
                onDeleteRecord={handleDelete}
              />
            </motion.div>
          ) : (
            <motion.div key="edit" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-6 pb-20">
               <div className="flex justify-end">
                  <button onClick={() => setViewMode('grid')} className="text-xs font-bold text-slate-500 flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg">
                    <ArrowLeft className="w-3 h-3" /> {t('back_to_list')}
                  </button>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
                     <div className="flex items-center gap-3 text-blue-600 mb-2">
                        <Target className="w-5 h-5" />
                        <h3 className="font-bold text-sm uppercase tracking-wider">{t('strategic_justification')}</h3>
                     </div>
                     
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('project_title')}</label>
                        <input 
                           type="text" 
                           value={businessCase.projectTitle}
                           onChange={(e) => setBusinessCase({...businessCase, projectTitle: e.target.value})}
                           className={cn("w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none", isRtl && "text-right")}
                        />
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('executive_summary')}</label>
                        <textarea 
                           value={businessCase.executiveSummary}
                           onChange={(e) => setBusinessCase({...businessCase, executiveSummary: e.target.value})}
                           className={cn("w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none min-h-[100px]", isRtl && "text-right")}
                        />
                     </div>
                  </div>

                  <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
                     <div className="flex items-center gap-3 text-indigo-400 mb-2">
                        <DollarSign className="w-5 h-5" />
                        <h3 className="font-bold text-sm uppercase tracking-wider text-white">Financial Indicators</h3>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Expected ROI (%)</label>
                           <input 
                              type="number" 
                              value={businessCase.roi}
                              onChange={(e) => setBusinessCase({...businessCase, roi: Number(e.target.value)})}
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-indigo-400 outline-none"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">NPV</label>
                           <input 
                              type="number" 
                              value={businessCase.npv}
                              onChange={(e) => setBusinessCase({...businessCase, npv: Number(e.target.value)})}
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-indigo-400 outline-none"
                           />
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Payback Period</label>
                        <input 
                           type="text" 
                           value={businessCase.paybackPeriod}
                           onChange={(e) => setBusinessCase({...businessCase, paybackPeriod: e.target.value})}
                           className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white outline-none"
                           placeholder="e.g. 18 Months"
                        />
                     </div>
                  </div>

                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                        <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">{t('business_need')}</h4>
                        <textarea 
                           value={businessCase.businessNeed}
                           onChange={(e) => setBusinessCase({...businessCase, businessNeed: e.target.value})}
                           className={cn("w-full h-32 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-600", isRtl && "text-right")}
                        />
                     </div>
                     <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                        <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">{t('market_analysis')}</h4>
                        <textarea 
                           value={businessCase.marketAnalysis}
                           onChange={(e) => setBusinessCase({...businessCase, marketAnalysis: e.target.value})}
                           className={cn("w-full h-32 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-600", isRtl && "text-right")}
                        />
                     </div>
                     <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                        <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">{t('recommendation')}</h4>
                        <textarea 
                           value={businessCase.recommendation}
                           onChange={(e) => setBusinessCase({...businessCase, recommendation: e.target.value})}
                           className={cn("w-full h-32 border-2 border-emerald-100 bg-emerald-50/20 rounded-xl p-3 text-xs font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all text-slate-700", isRtl && "text-right")}
                        />
                     </div>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StandardProcessPage>
  );
};
