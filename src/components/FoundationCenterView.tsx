import React, { useState, useEffect } from 'react';
import { 
  Database, 
  FileText, 
  Handshake, 
  Shield, 
  Library, 
  Upload, 
  BarChart, 
  Globe, 
  Search, 
  Link as LinkIcon,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ChevronRight,
  TrendingUp,
  LayoutGrid,
  History,
  Printer,
  ExternalLink,
  Download,
  Clock,
  Sparkles,
  Zap,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';
import { Page, PageVersion } from '../types';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { useLocation, Link } from 'react-router-dom';
import { db, auth, storage, OperationType, handleFirestoreError } from '../firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { cn, stripNumericPrefix } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { DataImportModal } from './DataImportModal';
import { GoogleGenAI } from "@google/genai";

interface FoundationCenterViewProps {
  page: Page;
  embedded?: boolean;
  initialTab?: 'eefs' | 'opas' | 'business' | 'agreements' | 'history';
}

export const FoundationCenterView: React.FC<FoundationCenterViewProps> = ({ page, embedded = false, initialTab }) => {
  const { t, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'eefs' | 'opas' | 'business' | 'agreements' | 'history'>(
    initialTab || (location.state as any)?.activeTab || (embedded ? 'eefs' : 'business')
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const state = location.state as any;
    if (state?.activeTab) {
      setActiveTab(state.activeTab);
    }
  }, [location.state]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedProject) return;
      setLoading(true);
      try {
        const docRef = doc(db, 'projectFoundations', selectedProject.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setData(docSnap.data());
        } else {
          // Default structure
          const defaultData = {
            projectId: selectedProject.id,
            version: '1.0',
            businessDocuments: {
              feasibilityStudy: '',
              roi: 0,
              feasibilityPdfUrl: '',
              benefitsPlan: '',
              benefitMetrics: '',
              benefitDuration: ''
            },
            agreements: [],
            eefs: {
              internal: { infrastructure: false, software: false, culture: false, customItems: [] },
              external: { legal: false, government: false, market: false, customItems: [] }
            },
            opas: {
              customPolicies: [],
              importedTemplates: [],
              lessonsLearnedIds: []
            },
            updatedAt: new Date().toISOString()
          };
          setData(defaultData);
        }

        // Fetch versions history
        const vQuery = query(
          collection(db, 'foundation_versions'),
          where('projectId', '==', selectedProject.id),
          orderBy('timestamp', 'desc')
        );
        
        const unsub = onSnapshot(vQuery, (snap) => {
          setVersions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => unsub();

      } catch (err) {
        console.error('Error fetching foundation data:', err);
        toast.error('Failed to load project foundation data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedProject]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string, agreementId?: string) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;

    setUploadingField(agreementId ? `agreement-${agreementId}` : field);
    const loadingToast = toast.loading('Uploading document...');

    try {
      const storagePath = `foundation/${selectedProject.id}/${Date.now()}_${file.name}`;
      console.log('Attempting Foundation Upload to:', storagePath);
      
      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageRef, file).catch(err => {
        console.error('Foundation Storage Upload Error:', err);
        if (err.code === 'storage/retry-limit-exceeded') {
          throw new Error('Connection to Firebase Storage timed out. This often happens on restricted networks or VPNs. Please try a different network.');
        }
        throw err;
      });
      
      const url = await getDownloadURL(snapshot.ref);

      if (agreementId) {
        updateAgreement(agreementId, 'pdfUrl', url);
        updateAgreement(agreementId, 'fileName', file.name);
      } else {
        updateBusinessDocs(field, url);
        updateBusinessDocs(`${field}Name`, file.name);
      }

      toast.success('Document uploaded and linked successfully', { id: loadingToast });
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Failed to upload document', { id: loadingToast });
    } finally {
      setUploadingField(null);
    }
  };

  const handleSmartImport = async () => {
    if (!selectedProject) return;
    setIsAnalyzing(true);
    const loadingToast = toast.loading('AI is analyzing project context for EEFs...');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

      const prompt = `Based on a typical project in the construction industry, 
      identify potential Enterprise Environmental Factors (EEFs) that might apply. 
      The project is often related to infrastructure and engineering.
      
      Return a JSON object in this exact format:
      {
        "internal": { "infrastructure": boolean, "software": boolean, "culture": boolean, "custom": string },
        "external": { "legal": boolean, "government": boolean, "market": boolean, "custom": string }
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      const text = response.text || '';
      const extractedEEFs = JSON.parse(text.replace(/```json|```/g, ''));

      setData((prev: any) => ({
        ...prev,
        eefs: extractedEEFs
      }));

      toast.success('AI successfully suggested EEF constraints based on project profile', { id: loadingToast });
    } catch (err) {
      console.error('Smart AI analysis failed:', err);
      toast.error('AI analysis failed. Please enter manually.', { id: loadingToast });
      
      // Fallback: Just enable some defaults
      updateEEF('internal', 'infrastructure', true);
      updateEEF('external', 'legal', true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!selectedProject || !data) return;
    setSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      const currentVersion = parseFloat(data.version || '1.0');
      const nextVersion = (currentVersion + 0.1).toFixed(1);

      const updatedData = { 
        ...data, 
        version: nextVersion,
        updatedAt: timestamp,
        updatedBy: user
      };

      const docRef = doc(db, 'projectFoundations', selectedProject.id);
      await setDoc(docRef, updatedData);

      // Save to versions collection
      await addDoc(collection(db, 'foundation_versions'), {
        projectId: selectedProject.id,
        version: nextVersion,
        timestamp,
        userName: user,
        data: updatedData,
        changeSummary: `Master Data Updated to V${nextVersion}`
      });

      setData(updatedData);
      toast.success(t('save_success'));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'projectFoundations');
    } finally {
      setSaving(false);
    }
  };

  const updateBusinessDocs = (field: string, value: any) => {
    setData((prev: any) => ({
      ...prev,
      businessDocuments: { ...prev.businessDocuments, [field]: value }
    }));
  };

  const addAgreement = () => {
    const newAgreement = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'Contract',
      milestones: '',
      penalties: '',
      initialScope: '',
      pdfUrl: '',
      createdAt: new Date().toISOString()
    };
    setData((prev: any) => ({
      ...prev,
      agreements: [...(prev.agreements || []), newAgreement]
    }));
  };

  const updateAgreement = (id: string, field: string, value: any) => {
    setData((prev: any) => ({
      ...prev,
      agreements: prev.agreements.map((a: any) => a.id === id ? { ...a, [field]: value } : a)
    }));
  };

  const removeAgreement = (id: string) => {
    setData((prev: any) => ({
      ...prev,
      agreements: prev.agreements.filter((a: any) => a.id !== id)
    }));
  };

  const updateEEF = (group: 'internal' | 'external', field: string, value: any) => {
    setData((prev: any) => ({
      ...prev,
      eefs: {
        ...prev.eefs,
        [group]: { ...prev.eefs[group], [field]: value }
      }
    }));
  };

  const addEEFItem = (category: 'internal' | 'external') => {
    const currentItems = data.eefs[category].customItems || [];
    updateEEF(category, 'customItems', [...currentItems, { id: Date.now().toString(), title: '' }]);
  };

  const removeEEFItem = (category: 'internal' | 'external', id: string) => {
    const currentItems = data.eefs[category].customItems || [];
    updateEEF(category, 'customItems', currentItems.filter((i: any) => i.id !== id));
  };

  const updateEEFItem = (category: 'internal' | 'external', id: string, value: string) => {
    const currentItems = data.eefs[category].customItems || [];
    updateEEF(category, 'customItems', currentItems.map((i: any) => i.id === id ? { ...i, title: value } : i));
  };

  const updateOPA = (field: string, value: any) => {
    setData((prev: any) => ({
      ...prev,
      opas: { ...prev.opas, [field]: value }
    }));
  };

  const addOPAItem = () => {
    const currentItems = data.opas.customPolicies || [];
    updateOPA('customPolicies', [...currentItems, { id: Date.now().toString(), title: '', type: 'policy' }]);
  };

  const removeOPAItem = (id: string) => {
    const currentItems = data.opas.customPolicies || [];
    updateOPA('customPolicies', currentItems.filter((i: any) => i.id !== id));
  };

  const updateOPAItem = (id: string, value: string) => {
    const currentItems = data.opas.customPolicies || [];
    updateOPA('customPolicies', currentItems.map((i: any) => i.id === id ? { ...i, title: value } : i));
  };

  const restoreVersion = (versionData: any) => {
    if (window.confirm('Are you sure you want to restore this version? Current changes will be overwritten.')) {
      setData(versionData);
      setActiveTab('business');
      toast.success('Version loaded in editor. Click Save to finalize.');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className={cn("max-w-7xl mx-auto space-y-8 pb-32 px-4", isRtl && "rtl", embedded && "max-w-full pb-10 px-0")}>
       {/* Header */}
        {!embedded && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm">
            <div className={cn("space-y-1", isRtl && "text-right")}>
              <h2 className="text-xl font-black text-slate-900 tracking-tight italic uppercase">
                {stripNumericPrefix(page.title)}
              </h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">
                {activeTab === 'history' ? t('history') : (activeTab === 'business' ? t('business_docs') : (activeTab === 'eefs' ? t('eefs') : t(activeTab)))}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {activeTab === 'agreements' && (
                <button 
                  onClick={addAgreement}
                  className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-[1.5rem] font-bold uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
                >
                   <Plus className="w-4 h-4" />
                   {t('add_agreement')}
                </button>
              )}
              <button 
                onClick={() => window.print()}
                className="p-4 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
              >
                  <Printer className="w-5 h-5" />
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-bold uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all shadow-xl disabled:opacity-50"
              >
                  {saving ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  {t('save_master_data')}
              </button>
            </div>
          </div>
        )}

       {/* Tabs Navigation */}
       <div className={cn("flex flex-wrap items-center justify-between gap-1 p-1 bg-[#101217] rounded-t-lg", isRtl && "flex-row-reverse")}>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'eefs', label: 'EEFs', icon: Shield },
              { id: 'opas', label: 'OPAs', icon: Library },
              { id: 'business', label: t('business_docs'), icon: FileText },
              { id: 'agreements', label: t('agreements'), icon: Handshake },
              { id: 'history', label: t('history'), icon: History }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-3 px-6 py-4 rounded-t-md text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border-t border-x",
                  activeTab === tab.id 
                    ? "bg-slate-600 text-[#ff6d00] border-slate-600 shadow-lg z-10" 
                    : "text-slate-400 border-transparent hover:bg-white/5 hover:text-white"
                )}
              >
                 <tab.icon className="w-4 h-4" />
                 {tab.label}
              </button>
            ))}
          </div>
       </div>

       {/* Tab Content */}
       <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-paper rounded-b-lg border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col"
          >
             {activeTab === 'business' && (
               <div className="p-6 md:p-12 space-y-12">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                     {/* Feasibility Study */}
                     <div className="space-y-6">
                        <div className={cn("flex items-center gap-3", isRtl && "flex-row-reverse")}>
                           <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                              <TrendingUp className="w-5 h-5" />
                           </div>
                           <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">{t('feasibility_study_title')}</h3>
                        </div>
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <label className={cn("text-[10px] font-black text-slate-400 uppercase tracking-widest block", isRtl && "text-right")}>{t('business_justification') || 'Strategic Justification'}</label>
                              <textarea 
                                value={data?.businessDocuments?.feasibilityStudy}
                                onChange={(e) => updateBusinessDocs('feasibilityStudy', e.target.value)}
                                className={cn("w-full h-40 bg-slate-50 border border-slate-100 rounded-3xl p-6 text-sm font-medium focus:ring-2 focus:ring-blue-500/10 outline-none resize-none transition-all", isRtl && "text-right")}
                                placeholder="Enter strategic justification and economic analysis..."
                              />
                           </div>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                 <label className={cn("text-[10px] font-black text-slate-400 uppercase tracking-widest block", isRtl && "text-right")}>{t('expected_roi')}</label>
                                 <div className="relative">
                                    <input 
                                      type="number"
                                      value={data?.businessDocuments?.roi}
                                      onChange={(e) => updateBusinessDocs('roi', parseFloat(e.target.value))}
                                      className={cn("w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-6 text-xl font-black text-blue-600 outline-none", isRtl && "text-right pl-6 pr-12")}
                                    />
                                    <span className={cn("absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold", isRtl && "left-auto right-4")}>%</span>
                                 </div>
                              </div>
                              <div className="space-y-2">
                                 <label className={cn("text-[10px] font-black text-slate-400 uppercase tracking-widest block", isRtl && "text-right")}>Feasibility Document</label>
                                 <div className="flex gap-2">
                                   <div className="flex-1 relative">
                                     <input 
                                       type="file" 
                                       id="feasibility-upload"
                                       className="hidden" 
                                       accept=".pdf"
                                       onChange={(e) => handleFileUpload(e, 'feasibilityPdfUrl')}
                                     />
                                     <button 
                                       onClick={() => document.getElementById('feasibility-upload')?.click()}
                                       disabled={uploadingField === 'feasibilityPdfUrl'}
                                       className="w-full h-14 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-3 hover:border-blue-400 hover:bg-blue-50 transition-all group disabled:opacity-50"
                                     >
                                        {uploadingField === 'feasibilityPdfUrl' ? (
                                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <Upload className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                                        )}
                                        <span className="text-[10px] font-black text-slate-500 group-hover:text-blue-600 tracking-widest uppercase">
                                          {data?.businessDocuments?.feasibilityPdfUrlName || 'Upload PDF'}
                                        </span>
                                     </button>
                                   </div>
                                   {data?.businessDocuments?.feasibilityPdfUrl && (
                                     <button 
                                       onClick={() => window.open(data.businessDocuments.feasibilityPdfUrl, '_blank')}
                                       className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-blue-600 transition-all"
                                     >
                                        <ExternalLink className="w-5 h-5" />
                                     </button>
                                   )}
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Benefits Management Plan */}
                     <div className="space-y-6">
                        <div className={cn("flex items-center gap-3", isRtl && "flex-row-reverse")}>
                           <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                              <CheckCircle2 className="w-5 h-5" />
                           </div>
                           <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">{t('benefits_plan_title')}</h3>
                        </div>
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <label className={cn("text-[10px] font-black text-slate-400 uppercase tracking-widest block", isRtl && "text-right")}>{t('strategic_benefits')}</label>
                              <textarea 
                                value={data?.businessDocuments?.benefitsPlan}
                                onChange={(e) => updateBusinessDocs('benefitsPlan', e.target.value)}
                                className={cn("w-full h-32 bg-slate-50 border border-slate-100 rounded-3xl p-6 text-sm font-medium focus:ring-2 focus:ring-blue-500/10 outline-none resize-none transition-all", isRtl && "text-right")}
                                placeholder="Describe the expected benefits and how they align with corporate goals..."
                              />
                           </div>
                           <div className="space-y-2">
                              <label className={cn("text-[10px] font-black text-slate-400 uppercase tracking-widest block", isRtl && "text-right")}>{t('benefit_metrics')}</label>
                              <input 
                                value={data?.businessDocuments?.benefitMetrics}
                                onChange={(e) => updateBusinessDocs('benefitMetrics', e.target.value)}
                                className={cn("w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold placeholder:opacity-30", isRtl && "text-right")}
                                placeholder="KPIs for success (e.g., Reduction in costs, Delivery time...)"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className={cn("text-[10px] font-black text-slate-400 uppercase tracking-widest block", isRtl && "text-right")}>{t('realization_period')}</label>
                              <select 
                                value={data?.businessDocuments?.benefitDuration}
                                onChange={(e) => updateBusinessDocs('benefitDuration', e.target.value)}
                                className={cn("w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold appearance-none bg-[url('https://api.iconify.design/lucide:chevron-down.svg')] bg-[length:1.2em] bg-[right_1.5rem_center] bg-no-repeat", isRtl && "text-right bg-[left_1.5rem_center]")}
                              >
                                 <option value="">Select Period</option>
                                 <option value="Short Term (< 1yr)">Short Term (&lt; 1yr)</option>
                                 <option value="Medium Term (1-3yrs)">Medium Term (1-3yrs)</option>
                                 <option value="Long Term (> 3yrs)">Long Term (&gt; 3yrs)</option>
                              </select>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
             )}

             {activeTab === 'agreements' && (
               <div className="p-6 md:p-12 space-y-8">
                  <div className={cn("flex items-center justify-between", isRtl && "flex-row-reverse")}>
                     <h3 className="text-xl font-black text-slate-900 tracking-tight italic uppercase">{t('contractual_obligations')}</h3>
                     <button 
                       onClick={addAgreement}
                       className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                     >
                        <Plus className="w-4 h-4" />
                        {t('add_agreement')}
                     </button>
                  </div>

                  <div className="space-y-4">
                     {(!data?.agreements || data.agreements.length === 0) ? (
                       <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                          <Handshake className="w-12 h-12 text-slate-300 mb-4" />
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">{t('no_agreements_added')}</p>
                       </div>
                     ) : (
                       data.agreements.map((agreement: any, idx: number) => (
                         <div key={agreement.id} className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-6 md:p-8 space-y-6 relative group/card shadow-sm hover:shadow-md transition-all">
                            <div className={cn("absolute top-8 right-8 flex items-center gap-2", isRtl && "right-auto left-8")}>
                               <button 
                                 onClick={() => removeAgreement(agreement.id)}
                                 className="p-3 bg-white text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm border border-slate-100"
                               >
                                  <Trash2 className="w-4 h-4" />
                               </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pr-12">
                               <div className="space-y-2">
                                  <label className={cn("text-[10px] font-black text-slate-400 uppercase tracking-widest block", isRtl && "text-right")}>Type</label>
                                  <select 
                                    value={agreement.type}
                                    onChange={(e) => updateAgreement(agreement.id, 'type', e.target.value)}
                                    className={cn("w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold", isRtl && "text-right")}
                                  >
                                     <option value="Contract">Contract</option>
                                     <option value="MOU">MOU</option>
                                     <option value="SLA">SLA</option>
                                     <option value="Purchase Order">Purchase Order</option>
                                  </select>
                               </div>
                               <div className="md:col-span-2 space-y-2">
                                  <label className={cn("text-[10px] font-black text-slate-400 uppercase tracking-widest block", isRtl && "text-right")}>Initial Scope</label>
                                  <input 
                                    value={agreement.initialScope}
                                    onChange={(e) => updateAgreement(agreement.id, 'initialScope', e.target.value)}
                                    className={cn("w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold", isRtl && "text-right")}
                                    placeholder="Brief description of the agreed scope..."
                                  />
                               </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                               <div className="space-y-2 text-sm">
                                  <label className={cn("text-[10px] font-black text-slate-400 uppercase tracking-widest block", isRtl && "text-right")}>Mandatory Milestones</label>
                                  <textarea 
                                    value={agreement.milestones}
                                    onChange={(e) => updateAgreement(agreement.id, 'milestones', e.target.value)}
                                    className={cn("w-full h-32 bg-white border border-slate-200 rounded-2xl p-6 font-bold outline-none resize-none transition-all focus:ring-2 focus:ring-blue-500/10", isRtl && "text-right")}
                                    placeholder="List key dates and deliverable deadlines..."
                                  />
                               </div>
                               <div className="space-y-2">
                                  <label className={cn("text-[10px] font-black text-slate-400 uppercase tracking-widest block", isRtl && "text-right")}>Terms & Penalties</label>
                                  <textarea 
                                    value={agreement.penalties}
                                    onChange={(e) => updateAgreement(agreement.id, 'penalties', e.target.value)}
                                    className={cn("w-full h-32 bg-white border border-slate-200 rounded-2xl p-6 font-bold outline-none resize-none transition-all focus:ring-2 focus:ring-blue-500/10", isRtl && "text-right")}
                                    placeholder="Describe any delay penalties, liquidated damages, or special conditions..."
                                  />
                               </div>
                            </div>

                            <div className="pt-4 border-t border-slate-200/50 flex flex-wrap gap-4">
                                <div 
                                  onClick={() => document.getElementById(`upload-${agreement.id}`)?.click()}
                                  className="p-4 bg-white rounded-2xl border border-slate-200 flex items-center gap-3 shrink-0 text-left cursor-pointer hover:border-blue-400 transition-all"
                                >
                                   <input 
                                     type="file" 
                                     id={`upload-${agreement.id}`} 
                                     className="hidden" 
                                     accept=".pdf"
                                     onChange={(e) => handleFileUpload(e, 'pdfUrl', agreement.id)}
                                   />
                                   <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                      {uploadingField === `agreement-${agreement.id}` ? (
                                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <Upload className="w-4 h-4" />
                                      )}
                                   </div>
                                   <div className={cn(isRtl && "text-right")}>
                                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Legal Document</div>
                                      <div className="text-[10px] font-black text-slate-900 uppercase truncate max-w-[150px]">
                                        {agreement.fileName || 'Click to Upload PDF'}
                                      </div>
                                   </div>
                                </div>
                                {agreement.pdfUrl && (
                                  <button 
                                    onClick={() => window.open(agreement.pdfUrl, '_blank')}
                                    className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-blue-600 transition-all"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </button>
                                )}
                            </div>
                         </div>
                       ))
                     )}
                  </div>
               </div>
             )}

             {activeTab === 'eefs' && (
               <div className="p-6 md:p-12 space-y-12">
                  <header className={cn("flex flex-col md:flex-row md:items-center justify-between gap-6", isRtl && "flex-row-reverse")}>
                     <div className={cn("space-y-2", isRtl && "text-right")}>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">EEFs</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest opacity-60">Enterprise Environmental Factors</p>
                     </div>
                     <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setIsImportModalOpen(true)}
                          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                        >
                           <Library className="w-4 h-4" />
                           Import Catalog
                        </button>
                        <button 
                          onClick={handleSmartImport}
                          disabled={isAnalyzing}
                          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                        >
                           {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
                           Smart Extract
                        </button>
                     </div>
                  </header>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                     {/* Internal Factors */}
                     <div className="p-6 md:p-10 bg-slate-50 rounded-[2rem] md:rounded-[3rem] border border-slate-100 space-y-8 text-left">
                        <div className={cn("flex items-center gap-3", isRtl && "flex-row-reverse")}>
                           <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shrink-0">
                              <LayoutGrid className="w-5 h-5" />
                           </div>
                           <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">{t('internal_factors')}</h4>
                        </div>
                        <div className="grid grid-cols-1 space-y-4">
                           {[
                             { id: 'infrastructure', label: 'Infrastructure Availability', desc: 'Is site facilities/equiment ready?' },
                             { id: 'software', label: 'Software Integration', desc: 'Are corporate tools available?' },
                             { id: 'culture', label: 'Organizational Culture', desc: 'Is the team aligned with company values?' }
                           ].map(f => (
                             <label key={f.id} className={cn("flex items-start gap-4 p-5 bg-white rounded-2xl border border-slate-100 cursor-pointer hover:border-blue-400 transition-all select-none shadow-sm", isRtl && "flex-row-reverse text-right")}>
                                <input 
                                  type="checkbox"
                                  checked={data?.eefs?.internal[f.id]}
                                  onChange={(e) => updateEEF('internal', f.id, e.target.checked)}
                                  className="mt-1 w-5 h-5 rounded-lg border-2 border-slate-200 checked:bg-blue-600 checked:border-blue-600 transition-all shrink-0 cursor-pointer"
                                />
                                <div>
                                   <div className="text-xs font-black text-slate-900 uppercase tracking-wider">{f.label}</div>
                                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 italic">{f.desc}</p>
                                </div>
                             </label>
                           ))}
                           <div className="pt-4 space-y-4">
                              <div className="flex items-center justify-between">
                                 <label className={cn("text-[10px] font-black text-slate-400 uppercase tracking-widest block", isRtl && "text-right")}>Other Internal Factors</label>
                                 <button 
                                   onClick={() => addEEFItem('internal')}
                                   className="text-[9px] font-black text-blue-600 uppercase hover:underline"
                                 >
                                   + Add Factor
                                 </button>
                              </div>
                              <div className="space-y-3">
                                 {(data?.eefs?.internal?.customItems || []).map((item: any) => (
                                   <div key={item.id} className="flex gap-2 group">
                                     <input
                                       value={item.title}
                                       onChange={(e) => updateEEFItem('internal', item.id, e.target.value)}
                                       placeholder="e.g. IT Security Policy"
                                       className={cn("flex-1 h-12 bg-white border border-slate-200 rounded-xl px-4 text-[11px] font-black uppercase tracking-tight focus:ring-2 focus:ring-blue-500/20", isRtl && "text-right")}
                                     />
                                     <button 
                                       onClick={() => removeEEFItem('internal', item.id)}
                                       className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm"
                                     >
                                       <Trash2 className="w-4 h-4" />
                                     </button>
                                   </div>
                                 ))}
                                 {(!data?.eefs?.internal?.customItems || data.eefs.internal.customItems.length === 0) && (
                                   <div className="p-4 bg-white/50 rounded-2xl border border-dashed border-slate-100 text-center">
                                      <p className="text-[10px] font-bold text-slate-300 uppercase italic">No specific internal factors recorded</p>
                                   </div>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* External Factors */}
                     <div className="p-6 md:p-10 bg-blue-900 rounded-[2rem] md:rounded-[3rem] text-white space-y-8 shadow-2xl relative overflow-hidden text-left">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                        <div className={cn("flex items-center gap-3 relative z-10", isRtl && "flex-row-reverse")}>
                           <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                              <Globe className="w-5 h-5" />
                           </div>
                           <h4 className="text-sm font-black uppercase tracking-[0.2em] text-blue-300">{t('external_factors')}</h4>
                        </div>
                        <div className="grid grid-cols-1 space-y-4 relative z-10">
                           {[
                             { id: 'legal', label: 'Legal Restrictions', desc: 'Zoning laws, permits, local regulations' },
                             { id: 'government', label: 'Government Standards', desc: 'OHS, Safety, Environmental requirements' },
                             { id: 'market', label: 'Market Conditions', desc: 'Material prices, labor availability, inflation' }
                           ].map(f => (
                             <label key={f.id} className={cn("flex items-start gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-all select-none shadow-sm", isRtl && "flex-row-reverse text-right")}>
                                <div className="mt-1 relative">
                                  <input 
                                    type="checkbox"
                                    checked={data?.eefs?.external[f.id]}
                                    onChange={(e) => updateEEF('external', f.id, e.target.checked)}
                                    className="w-5 h-5 rounded-lg border-2 border-white/20 bg-transparent checked:bg-blue-400 checked:border-blue-400 transition-all appearance-none cursor-pointer"
                                  />
                                  {data?.eefs?.external[f.id] && (
                                    <CheckCircle2 className="absolute inset-0 w-3.5 h-3.5 m-auto text-white" />
                                  )}
                                </div>
                                <div>
                                   <div className="text-xs font-black uppercase tracking-wider">{f.label}</div>
                                   <p className="text-[10px] text-blue-300/50 font-bold uppercase tracking-widest mt-1 italic">{f.desc}</p>
                                </div>
                             </label>
                           ))}
                           <div className="pt-4 space-y-4">
                              <div className="flex items-center justify-between">
                                 <label className={cn("text-[10px] font-black text-blue-300/50 uppercase tracking-widest block", isRtl && "text-right")}>Dynamic Market/Legal Constraints</label>
                                 <button 
                                   onClick={() => addEEFItem('external')}
                                   className="text-[9px] font-black text-blue-300 uppercase hover:text-white transition-colors"
                                 >
                                   + New Entry
                                 </button>
                              </div>
                              <div className="space-y-3">
                                 {(data?.eefs?.external?.customItems || []).map((item: any) => (
                                   <div key={item.id} className="flex gap-2 group">
                                     <input
                                       value={item.title}
                                       onChange={(e) => updateEEFItem('external', item.id, e.target.value)}
                                       placeholder="e.g. Dollar Rate, Safety Law 2024"
                                       className={cn("flex-1 h-12 bg-white/10 border border-white/20 rounded-xl px-4 text-[11px] font-black text-white uppercase tracking-tight focus:bg-white/20 outline-none", isRtl && "text-right")}
                                     />
                                     <button 
                                       onClick={() => removeEEFItem('external', item.id)}
                                       className="w-12 h-12 bg-white/5 text-blue-300 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all shadow-lg"
                                     >
                                       <Trash2 className="w-4 h-4" />
                                     </button>
                                   </div>
                                 ))}
                                 {(!data?.eefs?.external?.customItems || data.eefs.external.customItems.length === 0) && (
                                   <div className="p-4 bg-white/5 rounded-2xl border border-dashed border-white/10 text-center">
                                      <p className="text-[10px] font-bold text-blue-300/50 uppercase italic">Add items like exchange rates or new laws</p>
                                   </div>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
             )}

             {activeTab === 'opas' && (
               <div className="p-6 md:p-12 space-y-12">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                     {/* Templates & OPA Search */}
                     <div className="lg:col-span-7 space-y-8 text-left">
                        <div className={cn("flex items-center justify-between", isRtl && "flex-row-reverse")}>
                           <h4 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">{t('templates_library')}</h4>
                           <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest">Enterprise OPAs</span>
                        </div>
                        
                        <div className="relative group">
                           <Search className={cn("absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors", isRtl && "left-auto right-6")} />
                           <input 
                             placeholder="Search project templates, guidelines, or SOPs..."
                             className={cn("w-full bg-slate-50 border border-slate-100 rounded-[2rem] py-6 pl-16 pr-8 text-sm font-bold focus:ring-2 focus:ring-blue-500/10 outline-none transition-all shadow-sm", isRtl && "pl-8 pr-16 text-right")}
                           />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           {[
                             { id: '1', title: 'Risk Register Template', category: 'Risk Management' },
                             { id: '2', title: 'Quality Control SOP', category: 'Quality' },
                             { id: '3', title: 'Procurement Master Template', category: 'Commercial' },
                             { id: '4', title: 'Site Inspection Form', category: 'Operations' }
                           ].map(temp => (
                             <div key={temp.id} className="p-6 bg-white border border-slate-100 rounded-3xl hover:shadow-xl hover:shadow-slate-500/5 transition-all cursor-pointer group hover:border-blue-400">
                                <div className={cn("flex items-start justify-between mb-4", isRtl && "flex-row-reverse")}>
                                   <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 shrink-0">
                                      <FileCheck className="w-5 h-5" />
                                   </div>
                                   <Plus className={cn("w-4 h-4 text-slate-200 group-hover:text-blue-600", isRtl && "rotate-45")} />
                                </div>
                                <div className={cn("text-xs font-black text-slate-900 uppercase tracking-tight", isRtl && "text-right")}>{temp.title}</div>
                                <div className={cn("text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1", isRtl && "text-right")}>{temp.category}</div>
                             </div>
                           ))}
                        </div>

                        <div className="pt-8 mt-8 border-t border-slate-100 space-y-6">
                           <div className={cn("flex items-center justify-between", isRtl && "flex-row-reverse")}>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                                  <ShieldCheck className="w-4 h-4" />
                                </div>
                                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Custom Protocols & OPAs</h4>
                              </div>
                              <button 
                                onClick={addOPAItem}
                                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg"
                              >
                                + Add Asset
                              </button>
                           </div>
                           <div className="space-y-3 pb-8">
                              {(data?.opas?.customPolicies || []).map((policy: any) => (
                                <div key={policy.id} className="flex gap-2 group">
                                  <input
                                    value={policy.title}
                                    onChange={(e) => updateOPAItem(policy.id, e.target.value)}
                                    placeholder="e.g. Safety Audit, Building Permit SOP..."
                                    className={cn("flex-1 h-12 bg-white border border-slate-200 rounded-xl px-4 text-[11px] font-black uppercase focus:ring-2 focus:ring-orange-500/20", isRtl && "text-right")}
                                  />
                                  <button onClick={() => removeOPAItem(policy.id)} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                              {(!data?.opas?.customPolicies || data.opas.customPolicies.length === 0) && (
                                <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-100 text-center">
                                  <p className="text-[10px] font-bold text-slate-300 uppercase italic">No custom protocols recorded</p>
                                </div>
                              )}
                           </div>
                        </div>
                     </div>

                     {/* Knowledge Base */}
                     <div className="lg:col-span-5 p-6 md:p-10 bg-slate-900 rounded-[2rem] md:rounded-[3rem] text-white space-y-8 relative overflow-hidden h-fit text-left">
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -ml-32 -mb-32" />
                        <div className={cn("flex items-center gap-3 relative z-10", isRtl && "flex-row-reverse")}>
                           <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white shrink-0">
                              <Library className="w-5 h-5" />
                           </div>
                           <h4 className="text-sm font-black uppercase tracking-[0.2em] text-blue-400">{t('knowledge_base')}</h4>
                        </div>
                        
                        <div className="space-y-6 relative z-10">
                           <p className={cn("text-xs text-slate-400 font-medium leading-relaxed italic", isRtl && "text-right")}>
                              "Leverage historical data from similar projects to anticipate risks and optimize delivery."
                           </p>
                           <div className="space-y-4">
                              <div className="p-5 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group">
                                 <div className={cn("text-[10px] font-black uppercase tracking-widest text-blue-300 mb-2", isRtl && "text-right")}>Project Villa-2024</div>
                                 <div className={cn("text-xs font-bold leading-relaxed line-clamp-2", isRtl && "text-right")}>"Initial site survey for soil testing was delayed due to permit issues and lack of proper coordination."</div>
                                 <div className={cn("mt-4 flex items-center gap-2 text-indigo-400 opacity-0 group-hover:opacity-100 transition-all", isRtl && "flex-row-reverse")}>
                                    <span className="text-[8px] font-black uppercase tracking-widest">Connect Variable</span>
                                    <ChevronRight className={cn("w-3 h-3", isRtl && "rotate-180")} />
                                 </div>
                              </div>
                              <div className="p-5 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group">
                                 <div className={cn("text-[10px] font-black uppercase tracking-widest text-blue-300 mb-2", isRtl && "text-right")}>Project Road-Exp-A</div>
                                 <div className={cn("text-xs font-bold leading-relaxed line-clamp-2", isRtl && "text-right")}>"External market inflation led to a 15% increase in steel prices. Hedging was required."</div>
                                 <div className={cn("mt-4 flex items-center gap-2 text-indigo-400 opacity-0 group-hover:opacity-100 transition-all", isRtl && "flex-row-reverse")}>
                                    <span className="text-[8px] font-black uppercase tracking-widest">Connect Variable</span>
                                    <ChevronRight className={cn("w-3 h-3", isRtl && "rotate-180")} />
                                 </div>
                              </div>
                           </div>
                        </div>

                        <button className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all relative z-10 shadow-lg shadow-blue-500/20">
                           Deep search database
                        </button>
                     </div>
                  </div>
               </div>
             )}

             {activeTab === 'history' && (
               <div className="p-6 md:p-12 space-y-8 text-left">
                  <header className={cn("space-y-2", isRtl && "text-right")}>
                     <h3 className="text-xl font-black text-slate-900 tracking-tight italic uppercase">{t('foundation_versions')}</h3>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic leading-relaxed max-w-lg">
                       Historical record of project foundational data changes. Each version represents a snapped baseline of master variables.
                     </p>
                  </header>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {versions.length === 0 ? (
                      <div className="col-span-full py-20 flex flex-col items-center justify-center bg-slate-50 rounded-[2.5rem] border border-slate-100 border-dashed">
                        <History className="w-10 h-10 text-slate-200 mb-4" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic">{t('no_history_recorded')}</p>
                      </div>
                    ) : (
                      versions.map((v, idx) => (
                        <div key={v.id} className="p-6 bg-white border border-slate-200 rounded-[2rem] hover:shadow-xl hover:shadow-slate-500/5 transition-all group relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-50 transition-all" />
                           
                           <div className={cn("flex items-start justify-between relative z-10 mb-6", isRtl && "flex-row-reverse")}>
                              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-lg">
                                 v{v.version}
                              </div>
                              <button 
                                onClick={() => restoreVersion(v.data)}
                                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                              >
                                 Restore
                              </button>
                           </div>

                           <div className={cn("space-y-4 relative z-10", isRtl && "text-right")}>
                              <div>
                                 <div className="text-[10px] font-black text-slate-900 uppercase tracking-tight line-clamp-1">{v.changeSummary}</div>
                                 <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{v.userName}</div>
                              </div>
                              
                              <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 border-t border-slate-100 pt-4">
                                 <div className="flex items-center gap-2">
                                    <Clock className="w-3 h-3" />
                                    {new Date(v.timestamp).toLocaleDateString()}
                                 </div>
                                 <button className="flex items-center gap-1.5 text-blue-500 hover:text-blue-700 transition-all">
                                    <Printer className="w-3 h-3" />
                                    {t('print')}
                                 </button>
                              </div>
                           </div>
                        </div>
                      ))
                    )}
                  </div>
               </div>
             )}
          </motion.div>
       </AnimatePresence>

       <DataImportModal 
         isOpen={isImportModalOpen}
         onClose={() => setIsImportModalOpen(false)}
         onImport={(items) => {
           // Process imported items into EEFs
           if (items.length > 0) {
             setData((prev: any) => ({
               ...prev,
               eefs: {
                 ...prev.eefs,
                 internal: {
                   ...prev.eefs.internal,
                   custom: items.map(i => i.title || i.name || i.description).filter(Boolean).join(', ')
                 }
               }
             }));
             toast.success('EEF data imported from file');
           }
         }}
         title="Import Environmental Factors"
         entityName="EEFs"
         targetColumns={[
           { key: 'title', label: 'Title', required: true, description: 'The name of the constraint/factor' },
           { key: 'description', label: 'Description', description: 'Brief explanation' },
           { key: 'category', label: 'Category', description: 'Internal or External' }
         ]}
       />
    </div>
  );
};
