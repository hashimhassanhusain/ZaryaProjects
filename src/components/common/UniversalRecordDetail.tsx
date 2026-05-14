import React, { useState } from 'react';
import { 
  Save, 
  Copy, 
  Trash2, 
  X, 
  ArrowLeft,
  FileDown,
  ExternalLink,
  ChevronRight,
  Database,
  Cloud,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { EntityConfig } from '../../types';

import { useLanguage } from '../../context/LanguageContext';
import { useStandardProcessPage } from '../StandardProcessPage';
import { DriveUploadButton } from './DriveUploadButton';
import { toast } from 'react-hot-toast';

interface UniversalRecordDetailProps {
  config: EntityConfig;
  initialData?: any;
  onSave: (data: any) => void;
  onSaveAsNew: (data: any) => void;
  onCancel: () => void;
  onUploadToDrive?: (data: any) => void; // Keeping for legacy or other needs
  onPreviewPDF?: (data: any) => void;
  inputs?: { id: string; title: string; status?: string }[];
}

export const UniversalRecordDetail: React.FC<UniversalRecordDetailProps> = ({
  config,
  initialData = {},
  onSave,
  onSaveAsNew,
  onCancel,
  onUploadToDrive,
  onPreviewPDF,
  inputs = []
}) => {
  const { isRtl } = useLanguage();
  const pageContext = useStandardProcessPage();
  const [formData, setFormData] = useState<any>(initialData || {});
  const [activeSection, setActiveSection] = useState(config.sections?.[0]?.id || 'general');

  // Register actions with parent
  React.useEffect(() => {
    if (pageContext) {
      pageContext.registerSaveAction(() => onSave(formData));
      pageContext.registerUploadAction((fileId) => {
        const drivePathValue = getDrivePath();
        setFormData((prev: any) => ({ ...prev, driveFileId: fileId, drivePath: drivePathValue }));
        toast.success('File linked to record successfully');
        // Auto-save the link
        onSave({ ...formData, driveFileId: fileId, drivePath: drivePathValue });
      });
    }
  }, [formData, onSave, pageContext]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  // Determine drive path based on config and focus area numbers
  const getDrivePath = () => {
    // Standard mapping: FocusArea/Domain
    // projectLogs often have id like '3.1.2'
    const idParts = (config.id || "").split('.');
    if (idParts.length >= 2) {
       const focusAreaNum = idParts[0];
       const domainNum = idParts[1];
       
       const focusAreaMap: Record<string, string> = {
        '1': '1.0_Initiating',
        '2': '2.0_Planning',
        '3': '3.0_Executing',
        '4': '4.0_Monitoring_and_Controlling',
        '5': '5.0_Closing'
      };
      
      const domainMap: Record<string, string> = {
        '1': 'Governance_Domain',
        '2': 'Scope_Domain',
        '3': 'Schedule_Domain',
        '4': 'Finance_Domain',
        '5': 'Stakeholders_Domain',
        '6': 'Resources_Domain',
        '7': 'Risk_Domain'
      };

      const focus = focusAreaMap[focusAreaNum];
      const domain = domainMap[domainNum];

      if (focus && domain) {
        return `Business_Initiation_and_Governance_1/${focus}/${focusAreaNum}.${domainNum}_${domain}`;
      }
    }

    // Default Fallbacks
    if (config.collection === 'purchase_orders') return '6_Financials_and_Procurements/FINANCIAL/Purchase_Orders';
    if (config.collection === 'contracts') return '6_Financials_and_Procurements/LEGAL/Agreements';
    
    return '01_PROJECT_MANAGEMENT_FORMS';
  };

  // Generate a consistent file name for this specific record
  const getSmartFileName = () => {
     const titleField = config.columns.find(c => c.key.toLowerCase().includes('name') || c.key.toLowerCase().includes('title'))?.key || 'id';
     const baseName = formData[titleField] || formData.id || 'Record';
     const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
     return `${config.label}_${baseName}_${dateStr}`.replace(/\s+/g, '_');
  };

  return (
    <div className="flex bg-app-bg dark:bg-slate-950 min-h-0 flex-1">
      {/* ... (rest of left/center) ... */}
      <aside className="w-1/4 border-r border-slate-100 dark:border-white/5 p-8 space-y-6 hidden lg:block overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-black uppercase text-slate-950 dark:text-slate-400 tracking-[0.2em]">Source Context</h3>
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        </div>
        
        <div className="space-y-4">
          {inputs.map((input, idx) => (
            <div key={`${input.id}-${idx}`} className="p-5 bg-white dark:bg-surface border border-slate-100 dark:border-white/5 rounded-[2rem] shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest">{input.id}</span>
                <Database className="w-3.5 h-3.5 text-slate-200 dark:text-slate-700 group-hover:text-blue-400 transition-colors" />
              </div>
              <h4 className="text-[12px] font-bold text-slate-950 dark:text-slate-200 leading-snug">{input.title}</h4>
              <div className="mt-3 flex items-center gap-2">
                 <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                 <span className="text-[9px] font-bold text-slate-900 dark:text-slate-400 uppercase tracking-widest">Baseline v1.2</span>
              </div>
            </div>
          ))}
          {inputs.length === 0 && (
            <div className="p-8 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[2rem] text-center">
              <FileText className="w-8 h-8 text-slate-100 dark:text-slate-800 mx-auto mb-3" />
              <p className="text-[10px] font-bold text-slate-900 dark:text-slate-500 uppercase tracking-widest leading-relaxed">No reference inputs connected to this record type</p>
            </div>
          )}
        </div>

        <div className="pt-8 border-t border-slate-100 dark:border-white/5">
           <div className="p-6 bg-slate-900 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all" />
              <h4 className="text-white text-[11px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10 text-white">
                 <Cloud className="w-3.5 h-3.5 text-blue-400" />
                 Live Archive
              </h4>
              <p className="text-white/40 text-[9px] font-bold leading-relaxed relative z-10">
                All modifications are synchronized in real-time with the Enterprise Project Repository.
              </p>
           </div>
        </div>
      </aside>

      {/* CENTER: PRIMARY EDITING WORKSPACE */}
      <main className="flex-1 overflow-y-auto bg-white dark:bg-app-bg">
        <div className="max-w-4xl mx-auto p-12 lg:p-20 space-y-16 pb-40">
           {/* Section Headers if multiple */}
           {config.sections && config.sections.length > 1 && (
             <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-white/5 overflow-x-auto no-scrollbar">
                {config.sections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex-1 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                      activeSection === section.id 
                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-100 dark:border-white/5 ring-1 ring-slate-900/5" 
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    {section.title}
                  </button>
                ))}
             </div>
           )}

           <div className="grid grid-cols-1 gap-12">
             {config.columns.map(col => {
               // Hide if not in active section (if sections exist)
               if (config.sections && !config.sections.find(s => s.id === activeSection)?.fields.includes(col.key)) return null;

               return (
                 <div key={col.key} className="space-y-4 group">
                   <div className="flex items-center justify-between px-2">
                     <label className="text-[10px] font-black text-slate-800 dark:text-slate-400 uppercase tracking-[0.2em] block group-focus-within:text-blue-600 transition-colors">
                       {col.label}
                     </label>
                     <div className="w-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 group-focus-within:bg-blue-400 transition-colors" />
                   </div>
                   <div className="relative">
                      {renderInputField(col, formData[col.key], (val) => handleChange(col.key, val))}
                   </div>
                 </div>
               );
             })}
           </div>
        </div>
      </main>

      {/* NO INDIVIDUAL FAB HERE - SHARED WITH StandardProcessPage */}
    </div>
  );
};

const renderInputField = (col: any, value: any, onChange: (val: any) => void) => {
  const commonClasses = "w-full bg-slate-50 border border-slate-100 p-5 text-lg font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none rounded-2xl transition-all shadow-inner placeholder:text-slate-200";

  switch (col.type) {
    case 'number':
    case 'currency':
      return (
        <input 
          type="number" 
          className={commonClasses}
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      );
    case 'date':
      return (
        <input 
          type="date" 
          className={commonClasses}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'status':
      return (
        <select 
          className={commonClasses}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="Draft">Draft</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Closed">Closed</option>
        </select>
      );
    default:
      return (
        <input 
          type="text" 
          className={commonClasses}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${col.label}...`}
        />
      );
  }
};
