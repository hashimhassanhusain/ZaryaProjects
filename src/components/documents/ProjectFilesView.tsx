import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Folder, 
  Search, 
  Upload, 
  Filter, 
  MoreVertical,
  Download,
  Calendar,
  ShieldCheck,
  FileCode,
  FileSignature,
  FileCheck,
  Briefcase,
  History,
  Trash2,
  ExternalLink,
  ChevronRight,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../../context/ProjectContext';
import { useLanguage } from '../../context/LanguageContext';
import { ProjectFileService } from '../../services/documentService';
import { ProjectFile } from '../../types/projectDocuments';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

export const ProjectFilesView: React.FC = () => {
  const { t, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDomain, setActiveDomain] = useState<string>('All');
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    if (selectedProject) {
      loadFiles();
    }
  }, [selectedProject]);

  const loadFiles = async () => {
    if (!selectedProject) return;
    setLoading(true);
    const data = await ProjectFileService.getAllByProject(selectedProject.id);
    setFiles(data);
    setLoading(false);
  };

  const domains = ['Governance', 'Scope', 'Schedule', 'Finance', 'Quality', 'Resources', 'Delivery', 'Risk'];
  const docTypes: Record<string, any> = {
    'BusinessCase': { icon: Briefcase, color: 'text-blue-500 bg-blue-50' },
    'Agreement': { icon: FileSignature, color: 'text-indigo-500 bg-indigo-50' },
    'ScopeStatement': { icon: FileCode, color: 'text-amber-500 bg-amber-50' },
    'SOW': { icon: FileText, color: 'text-slate-500 bg-slate-50' },
    'Requirements': { icon: FileCheck, color: 'text-emerald-500 bg-emerald-50' },
    'Other': { icon: FileText, color: 'text-slate-400 bg-slate-50' }
  };

  const filteredFiles = files.filter(f => {
    const matchesSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         f.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDomain = activeDomain === 'All' || f.domain === activeDomain;
    return matchesSearch && matchesDomain;
  });

  return (
    <div className="space-y-6">
      {/* Repository Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Artifacts', value: files.length, icon: Folder, color: 'blue' },
          { label: 'Baseline Documents', value: files.filter(f => f.isBaseline).length, icon: ShieldCheck, color: 'emerald' },
          { label: 'Recently Updated', value: files.filter(f => {
             const updated = f.updatedAt instanceof Date ? f.updatedAt : new Date();
             return (new Date().getTime() - updated.getTime()) < 86400000 * 7;
          }).length, icon: History, color: 'indigo' },
          { label: 'Documents Pending', value: 0, icon: Clock, color: 'amber' }
        ].map(stat => (
          <div key={stat.label} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", `bg-${stat.color}-50 text-${stat.color}-500`)}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t(stat.label.toLowerCase().replace(/ /g, '_'))}</div>
               <div className="text-xl font-black text-slate-900">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Repository Explorer */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col lg:flex-row min-h-[600px]">
        {/* Sidebar Filters */}
        <div className="w-full lg:w-72 bg-slate-50/50 border-r border-slate-100 p-8 space-y-8">
           <div>
             <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">{t('asset_domains')}</h3>
             <nav className="space-y-1">
                <button 
                  onClick={() => setActiveDomain('All')}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all",
                    activeDomain === 'All' ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" : "text-slate-500 hover:bg-white hover:text-slate-900"
                  )}
                >
                  <Folder className="w-4 h-4" />
                  {t('all_artifacts')}
                </button>
                {domains.map(dom => (
                  <button 
                    key={dom}
                    onClick={() => setActiveDomain(dom)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all",
                      activeDomain === dom ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" : "text-slate-500 hover:bg-white hover:text-slate-900"
                    )}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    {t(dom.toLowerCase())}
                  </button>
                ))}
             </nav>
           </div>

           <div className="p-6 bg-blue-600 rounded-3xl text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12" />
             <FileText className="w-8 h-8 mb-4 opacity-50" />
             <h4 className="text-sm font-bold mb-1">{t('need_storage_help')}</h4>
             <p className="text-[10px] font-bold text-white/60 mb-4">{t('baseline_control_notice')}</p>
             <button className="w-full py-2.5 bg-white text-blue-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-50 transition-all">
                {t('contact_admin')}
             </button>
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 flex flex-col gap-6">
           {/* Top Actions */}
           <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder={t('search_documents_and_assets')}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button 
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl text-xs font-bold hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 whitespace-nowrap"
              >
                <Upload className="w-4 h-4" />
                {t('upload_new_artifact')}
              </button>
           </div>

           {/* Grid Layout */}
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredFiles.map((file) => {
                  const Config = docTypes[file.documentType] || docTypes.Other;
                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={file.id}
                      className="group bg-white p-6 rounded-[2.5rem] border border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all text-left flex flex-col justify-between"
                    >
                       <div className="flex justify-between items-start mb-6">
                          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner", Config.color)}>
                            <Config.icon className="w-6 h-6" />
                          </div>
                          <div className="flex gap-1">
                             {file.isBaseline && (
                               <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg" title={t('baseline')}>
                                 <ShieldCheck className="w-3.5 h-3.5" />
                               </div>
                             )}
                             <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                               <MoreVertical className="w-3.5 h-3.5" />
                             </button>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t(file.documentType.toLowerCase())}</div>
                            <h3 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{file.title}</h3>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                             <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-md text-[9px] font-bold uppercase tracking-widest">{file.version}</span>
                             <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[9px] font-bold uppercase tracking-widest">{file.domain}</span>
                          </div>

                          <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                               <Calendar className="w-3.5 h-3.5" />
                               {format(new Date(), 'MMM dd, yyyy')}
                             </div>
                             <div className="flex items-center gap-2">
                                <button className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all">
                                   <Download className="w-4 h-4" />
                                </button>
                                <button className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all">
                                   <ExternalLink className="w-4 h-4" />
                                </button>
                             </div>
                          </div>
                       </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              
              {/* Empty State */}
              {filteredFiles.length === 0 && !loading && (
                <div className="col-span-full py-32 flex flex-col items-center justify-center text-center opacity-20">
                   <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                      <FileText className="w-10 h-10" />
                   </div>
                   <h3 className="text-xl font-bold uppercase tracking-widest mb-2">{t('repository_empty')}</h3>
                   <p className="text-sm font-medium">{t('start_uploading_compliance_documents')}</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
