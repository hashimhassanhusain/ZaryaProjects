import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Search, 
  Building2, 
  LayoutDashboard, 
  ChevronRight, 
  FolderPlus,
  Building,
  MapPin,
  Clock,
  Star,
  Plus
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { toSlug, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const ProjectSelectionView: React.FC = () => {
  const { t } = useLanguage();
  const { projects, companies, setSelectedProject } = useProject();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleProjectSelect = (project: any) => {
    const company = companies.find(c => c.id === project.companyId);
    const companySlug = company?.slug || toSlug(company?.name || 'unknown');
    const projectSlug = project.slug || toSlug(project.name);
    
    setSelectedProject(project);
    navigate(`/${companySlug}/${projectSlug}/governance/gov`);
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10 space-y-10">
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <span className="text-white font-black text-xl italic">P</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">PMISPro</h1>
          </div>
          <p className="text-slate-500 font-medium">{t('select_project_to_begin')}</p>
        </div>

        <Link 
          to="/admin/projects/new"
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all group lg:scale-110 origin-right"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          {t('initialize_project')}
        </Link>
      </header>

      <div className="max-w-7xl mx-auto">
        <div className="relative mb-10 group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text"
            placeholder={t('search_projects_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-16 pr-8 py-5 bg-white border border-slate-200 rounded-[2.5rem] text-lg font-medium text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-300 shadow-sm transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project, idx) => {
              const company = companies.find(c => c.id === project.companyId);
              return (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleProjectSelect(project)}
                  className="group relative bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-200 transition-all cursor-pointer overflow-hidden border-b-4 hover:border-b-blue-600"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                        <span className="text-2xl font-black text-slate-400 group-hover:text-blue-600">
                          {project.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-full uppercase tracking-widest mb-1 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {project.code}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 leading-tight line-clamp-1">{project.name}</h3>
                      </div>
                    </div>

                    <div className="space-y-4 flex-1">
                      <div className="flex items-center gap-3 text-slate-500">
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-xs font-bold truncate tracking-tight">{company?.name || 'Internal'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-500 text-xs">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate">{project.location || 'Location Not Set'}</span>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full animate-pulse",
                          project.status === 'active' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300"
                        )} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {project.status === 'active' ? 'Live Operational' : 'Archived'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Star className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center border-2 border-dashed border-slate-200">
              <Search className="w-10 h-10 text-slate-300" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-600">{t('no_projects_found')}</h3>
              <p className="text-slate-400 mt-2">{t('try_different_search')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
