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
import { motion, AnimatePresence } from 'framer-motion';
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
}

export const UniversalRecordDetail: React.FC<UniversalRecordDetailProps> = ({
  config,
  initialData = {},
  onSave,
  onSaveAsNew,
  onCancel,
  onUploadToDrive,
  onPreviewPDF
}) => {
  const [formData, setFormData] = useState<any>(initialData);
  const [activeSection, setActiveSection] = useState(config.sections?.[0]?.id || 'general');

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Detail Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
        <div className="flex items-center gap-4">
          <button 
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <config.icon className="w-5 h-5 text-blue-600" />
              {formData.id ? `Edit ${config.label.slice(0, -1)}` : `New ${config.label.slice(0, -1)}`}
            </h2>
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              <span>{config.collection}</span>
              <ChevronRight className="w-3 h-3" />
              <span>{formData.id || 'Draft'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Sidebar (Sections Tooltip/Nav) */}
        {config.sections && config.sections.length > 1 && (
          <div className="w-64 border-r border-slate-100 p-4 space-y-1">
            {config.sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all",
                  activeSection === section.id 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                    : "text-slate-500 hover:bg-slate-50"
                )}
              >
                {section.title}
                <ChevronRight className={cn("w-4 h-4 opacity-50", activeSection === section.id ? "rotate-90" : "")} />
              </button>
            ))}
          </div>
        )}

        {/* Form Body */}
        <div className="flex-1 overflow-auto p-12 pb-32">
          <div className="max-w-4xl mx-auto space-y-8">
            {config.columns.map(col => {
              // Hide if not in active section (if sections exist)
              if (config.sections && !config.sections.find(s => s.id === activeSection)?.fields.includes(col.key)) return null;

              return (
                <div key={col.key} className="space-y-2 group">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block group-focus-within:text-blue-600 transition-colors">
                    {col.label}
                  </label>
                  {renderInputField(col, formData[col.key], (val) => handleChange(col.key, val))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Action Buttons (FABs) - Bottom Right */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3 items-end z-50">
        <AnimatePresence>
          <div className="flex flex-row-reverse items-center gap-3">
            {/* Main Action Group */}
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-2 p-2 bg-white border border-slate-100 shadow-2xl rounded-2xl ring-1 ring-slate-900/5 group"
            >
              <button 
                onClick={onCancel}
                className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                title="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-px h-6 bg-slate-100" />
              
              {onUploadToDrive && (
                <button 
                  onClick={() => onUploadToDrive(formData)}
                  className="p-3 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                  title="Upload to Google Drive"
                >
                  <Cloud className="w-5 h-5" />
                </button>
              )}

              {onPreviewPDF && (
                <button 
                  onClick={() => onPreviewPDF(formData)}
                  className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  title="Print as PDF"
                >
                  <FileText className="w-5 h-5" />
                </button>
              )}

              <div className="w-px h-6 bg-slate-100" />

              <button 
                onClick={() => onSaveAsNew(formData)}
                className="p-3 text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                title="Save as New"
              >
                <Copy className="w-5 h-5" />
              </button>

              <button 
                onClick={() => onSave(formData)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-105 transition-all"
              >
                <Save className="w-5 h-5" />
                Save Changes
              </button>
            </motion.div>
          </div>
        </AnimatePresence>
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
