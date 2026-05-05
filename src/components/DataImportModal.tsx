import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Upload, FileText, Check, AlertCircle, 
  ArrowRight, Loader2, Sparkles, Table as TableIcon,
  ChevronRight, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { GoogleGenAI, Type } from "@google/genai";
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface TargetColumn {
  key: string;
  label: string;
  required?: boolean;
  type?: 'string' | 'number' | 'date' | 'boolean';
  description?: string;
}

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (mappedData: any[]) => void;
  targetColumns: TargetColumn[];
  title: string;
  entityName: string;
}

export const DataImportModal: React.FC<DataImportModalProps> = ({ 
  isOpen, 
  onClose, 
  onImport, 
  targetColumns, 
  title,
  entityName
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({}); // Target Key -> File Header
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'csv') {
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields) {
            setHeaders(results.meta.fields);
            setRawRows(results.data);
            setStep('mapping');
            suggestMapping(results.meta.fields);
          }
        },
        error: (err) => {
          toast.error("Error parsing CSV: " + err.message);
        }
      });
    } else if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (data.length > 0) {
          const headerRow = data[0] as string[];
          const rows = XLSX.utils.sheet_to_json(ws);
          setHeaders(headerRow);
          setRawRows(rows);
          setStep('mapping');
          suggestMapping(headerRow);
        }
      };
      reader.readAsBinaryString(selectedFile);
    } else {
      toast.error("Unsupported file format. Please use CSV or Excel.");
    }
  };

  const suggestMapping = async (fileHeaders: string[]) => {
    setIsSuggesting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const model = "gemini-3-flash-preview";

      const prompt = `You are a data integration assistant.
      User is importing data for ${entityName}.
      
      Target Columns (the fields we need in our app):
      ${targetColumns.map(c => `- ${c.key} (${c.label}): ${c.description || ''}`).join('\n')}
      
      File Headers from the uploaded file:
      ${fileHeaders.join(', ')}
      
      Instructions:
      Match each Target Column to the most likely File Header. 
      If no clear match exists, return null for that column.
      Your output must be a valid JSON object where keys are Target Column IDs and values are File Headers.
      
      Try to be smart about synonyms (e.g., 'Qty' matches 'quantity', 'Rate' matches 'price', 'Desc' matches 'description').`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: targetColumns.reduce((acc, col) => {
              acc[col.key] = { type: Type.STRING };
              return acc;
            }, {} as any)
          }
        }
      });

      const suggestedMapping = JSON.parse(response.text || '{}');
      
      // Clean up suggested mapping to only include valid headers
      const validHeaders = new Set(fileHeaders);
      const cleanedMapping: Record<string, string> = {};
      Object.entries(suggestedMapping).forEach(([key, val]) => {
        if (typeof val === 'string' && validHeaders.has(val)) {
          cleanedMapping[key] = val;
        }
      });
      
      setMapping(prev => ({ ...prev, ...cleanedMapping }));
    } catch (err) {
      console.error("AI mapping failed:", err);
      // Fallback: simple exact match
      const fallbackMapping: Record<string, string> = {};
      targetColumns.forEach(col => {
        const match = fileHeaders.find(h => 
          h.toLowerCase() === col.label.toLowerCase() || 
          h.toLowerCase() === col.key.toLowerCase()
        );
        if (match) fallbackMapping[col.key] = match;
      });
      setMapping(prev => ({ ...prev, ...fallbackMapping }));
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleImport = () => {
    // Validate required fields
    const missing = targetColumns.filter(c => c.required && !mapping[c.key]);
    if (missing.length > 0) {
      toast.error(`Please map required fields: ${missing.map(m => m.label).join(', ')}`);
      return;
    }

    setIsProcessing(true);
    
    // Final data structure
    const mappedData = rawRows.map(row => {
      const item: any = {};
      targetColumns.forEach(col => {
        const fileHeader = mapping[col.key];
        if (fileHeader) {
          let val = row[fileHeader];
          
          // Type conversion
          if (col.type === 'number') {
            val = typeof val === 'string' ? parseFloat(val.replace(/[^0-9.-]/g, '')) : val;
            if (isNaN(val)) val = 0;
          } else if (col.type === 'date' && val) {
             try {
                const date = new Date(val);
                val = isNaN(date.getTime()) ? val : date.toISOString().split('T')[0];
             } catch {
                // Keep original
             }
          }
          
          item[col.key] = val;
        }
      });
      return item;
    });

    onImport(mappedData);
    setIsProcessing(false);
    onClose();
    reset();
  };

  const reset = () => {
    setFile(null);
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setStep('upload');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500">Intelligent column mapping powered by AI</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-all">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          {step === 'upload' ? (
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile) {
                  const fakeEvent = { target: { files: [droppedFile] } } as any;
                  handleFileChange(fakeEvent);
                }
              }}
              className="h-full min-h-[400px] border-2 border-dashed border-slate-200 rounded-3xl bg-white flex flex-col items-center justify-center p-12 text-center group hover:border-blue-400 hover:bg-blue-50/20 transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
              />
              <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-6 group-hover:scale-110 group-hover:bg-blue-100 group-hover:text-blue-600 transition-all">
                <FileText className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">Drop your file here</h4>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">
                Support CSV and Excel files. Our AI will automatically map your columns.
              </p>
              <button 
                className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-lg"
              >
                Browse Files
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Mapping Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">App Column</th>
                      <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-center">Mapping</th>
                      <th className="px-6 py-4 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Your File Header</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {targetColumns.map((col) => (
                      <tr key={col.key} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                              {col.label}
                              {col.required && <span className="text-rose-500 text-lg">*</span>}
                            </span>
                            {col.description && <span className="text-[10px] text-slate-400">{col.description}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className={cn(
                            "inline-flex items-center justify-center w-8 h-8 rounded-lg",
                            mapping[col.key] ? "bg-emerald-50 text-emerald-500" : "bg-slate-100 text-slate-300"
                          )}>
                            {mapping[col.key] ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="relative">
                            <select
                              value={mapping[col.key] || ''}
                              onChange={(e) => setMapping(prev => ({ ...prev, [col.key]: e.target.value }))}
                              className={cn(
                                "w-full pl-4 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium transition-all outline-none appearance-none",
                                mapping[col.key] 
                                  ? "border-emerald-200 focus:ring-4 focus:ring-emerald-500/10" 
                                  : "border-slate-200 focus:ring-4 focus:ring-blue-500/10"
                              )}
                            >
                              <option value="">Skip this column</option>
                              {headers.map(header => (
                                <option key={header} value={header}>{header}</option>
                              ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <TableIcon className="w-4 h-4 text-blue-500" />
                    Data Preview
                  </h5>
                  <span className="text-xs text-slate-400">{rawRows.length} rows found</span>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        {targetColumns.filter(c => mapping[c.key]).map(col => (
                          <th key={col.key} className="px-4 py-3 font-bold text-slate-500 truncate min-w-[120px]">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {rawRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx}>
                          {targetColumns.filter(c => mapping[c.key]).map(col => (
                            <td key={col.key} className="px-4 py-3 text-slate-600 truncate">
                              {row[mapping[col.key]]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rawRows.length > 5 && (
                    <div className="p-3 text-center text-slate-400 border-t border-slate-50 bg-slate-50/30">
                      Show more rows in the summary...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-4">
            {isSuggesting && (
              <div className="flex items-center gap-2 text-blue-600 animate-pulse">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">AI is Suggesting Mapping...</span>
              </div>
            )}
            {step === 'mapping' && !isSuggesting && (
                <button 
                  onClick={() => suggestMapping(headers)}
                  className="px-4 py-2 text-blue-600 font-bold text-xs hover:bg-blue-50 rounded-xl transition-all flex items-center gap-2"
                >
                    <Sparkles className="w-4 h-4" />
                    Re-run AI Suggestion
                </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 text-slate-600 font-bold text-sm hover:bg-slate-50 rounded-xl transition-all"
            >
              Cancel
            </button>
            {step === 'mapping' && (
              <button 
                onClick={handleImport}
                disabled={isProcessing}
                className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Import Data
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
