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

interface UniversalRecordDetailProps {
  config: EntityConfig;
  initialData?: any;
  onSave: (data: any) => void;
  onSaveAsNew: (data: any) => void;
  onCancel: () => void;
  onUploadToDrive?: (data: any) => void;
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
  const [formData, setFormData] = useState<any>(initialData || {});
  const [activeSection, setActiveSection] = useState(config.sections?.[0]?.id || 'general');

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex bg-[#fcfcfc] min-h-0 flex-1">
      {/* LEFT: INPUT CARDS HUB (PMIS Context) */}
      <aside className="w-1/4 border-r border-slate-100 p-8 space-y-6 hidden lg:block overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Source Context</h3>
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        </div>
        
        <div className="space-y-4">
          {inputs.map((input, idx) => (
            <div key={`${input.id}-${idx}`} className="p-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-widest">{input.id}</span>
                <Database className="w-3.5 h-3.5 text-slate-200 group-hover:text-blue-400 transition-colors" />
              </div>
              <h4 className="text-[12px] font-bold text-slate-800 leading-snug">{input.title}</h4>
              <div className="mt-3 flex items-center gap-2">
                 <div className="w-1 h-1 rounded-full bg-slate-300" />
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Baseline v1.2</span>
              </div>
            </div>
          ))}
          {inputs.length === 0 && (
            <div className="p-8 border-2 border-dashed border-slate-100 rounded-[2rem] text-center">
              <FileText className="w-8 h-8 text-slate-100 mx-auto mb-3" />
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed">No reference inputs connected to this record type</p>
            </div>
          )}
        </div>

        <div className="pt-8 border-t border-slate-100">
           <div className="p-6 bg-slate-900 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all" />
              <h4 className="text-white text-[11px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
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
      <main className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-4xl mx-auto p-12 lg:p-20 space-y-16 pb-40">
           {/* Section Headers if multiple */}
           {config.sections && config.sections.length > 1 && (
             <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 overflow-x-auto no-scrollbar">
                {config.sections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex-1 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                      activeSection === section.id 
                        ? "bg-white text-blue-600 shadow-sm border border-slate-100 ring-1 ring-slate-900/5" 
                        : "text-slate-400 hover:text-slate-600"
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
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block group-focus-within:text-blue-600 transition-colors">
                       {col.label}
                     </label>
                     <div className="w-1.5 h-1.5 rounded-full bg-slate-100 group-focus-within:bg-blue-400 transition-colors" />
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

      {/* ACTION FAB (Unified with StandardProcessPage) */}
      <div className="fixed bottom-10 right-10 flex flex-col gap-3 items-end z-50">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col gap-3"
          >
            <button 
              onClick={() => onSave(formData)}
              className="flex items-center gap-4 px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-blue-500/30 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all"
            >
              <Save className="w-5 h-5" />
              Commit Updates
            </button>
            <div className="flex items-center gap-3">
              <button 
                onClick={onCancel}
                className="flex items-center gap-3 px-6 py-4 bg-white text-slate-500 rounded-[2rem] font-black text-[10px] uppercase tracking-widest border border-slate-100 shadow-xl hover:bg-slate-50 transition-all"
              >
                <X className="w-4 h-4" />
                Disconnect
              </button>
              {onPreviewPDF && (
                <button 
                  onClick={() => onPreviewPDF(formData)}
                  className="p-5 bg-slate-900 text-blue-400 rounded-full shadow-2xl hover:scale-110 transition-all border border-slate-800"
                >
                  <FileText className="w-5 h-5" />
                </button>
              )}
            </div>
          </motion.div>
      </div>
    </div>
  );
};

const renderInputField = (col: any, value: any, onChange: (val: any) => void) => {
  const commonClasses = "w-full bg-slate-50 border border-slate-100 p-4 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none rounded-2xl transition-all";

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
