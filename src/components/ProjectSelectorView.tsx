import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/UserContext';
import { motion } from 'motion/react';
import { Building, FolderOpen, ChevronRight, LayoutDashboard, Database, Globe, ShieldCheck, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export const ProjectSelectorView: React.FC = () => {
  const { t, isRtl } = useLanguage();
  const { companies, projects, selectedProject, setSelectedProject, setSelectedCompanyId, selectedCompanyId, loading: projectLoading } = useProject();
  const { userProfile, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const loading = projectLoading || authLoading;

  // Filter accessible projects if not admin
  const accessibleProjects = isAdmin 
    ? projects 
    : projects.filter(p => userProfile?.accessibleProjects?.includes(p.id));

  // Determine available companies based on accessible projects
  const accessibleCompanyIds = Array.from(new Set(accessibleProjects.map(p => p.companyId)));
  const availableCompanies = companies.filter(c => accessibleCompanyIds.includes(c.id));

  // Auto-select first company if none selected (moved to useEffect)
  React.useEffect(() => {
    if (!loading && !selectedCompanyId && availableCompanies.length > 0) {
      setSelectedCompanyId(availableCompanies[0].id);
    }
  }, [loading, selectedCompanyId, availableCompanies, setSelectedCompanyId]);

  const activeProjects = accessibleProjects.filter(p => p.companyId === selectedCompanyId);

  // Auto-redirect if only one project is available
  React.useEffect(() => {
    if (!loading && accessibleProjects.length === 1 && !selectedProject) {
      const project = accessibleProjects[0];
      setSelectedProject(project);
      navigate(`/project/${project.id}`);
    }
  }, [loading, accessibleProjects, selectedProject, setSelectedProject, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0a0a0a]" dir={isRtl ? 'rtl' : 'ltr'}>
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-6">
          <div className="w-20 h-20 bg-ribbon rounded-[2rem] flex items-center justify-center shadow-2xl shadow-black/50 animate-pulse border border-white/5">
            <span className="text-brand font-black text-2xl italic tracking-tighter">PMIS</span>
          </div>
          <div className="flex items-center gap-3 text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em]">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />
            {t('analyzing_available_assets')}
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl w-full"
        >
        <div className="text-center mb-12 space-y-4">
          <div className="w-20 h-20 bg-ribbon rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-black/20 group transition-transform hover:scale-110 border border-white/5">
            <span className="text-brand font-black text-2xl tracking-tighter">PMIS</span>
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight uppercase italic">{t('welcome_back_zarya')}</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em]">{t('pmo_system_infrastructure')}</p>
          </div>
          <div className="h-1 w-20 bg-brand mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          {/* Company Selection Panel */}
          <div className="md:col-span-12 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('select_organization')}</h2>
              <span className="text-[10px] font-bold text-slate-300 italic">Step 01</span>
            </div>
            <div className="flex flex-wrap gap-4">
              {availableCompanies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => setSelectedCompanyId(company.id)}
                  className={cn(
                    "flex-1 min-w-[200px] p-6 rounded-[2rem] border transition-all text-left relative overflow-hidden group",
                    selectedCompanyId === company.id
                      ? "bg-slate-900 border-slate-900 shadow-2xl shadow-slate-900/40 text-white"
                      : "bg-white border-slate-200 text-slate-500 hover:border-brand/40 hover:shadow-xl"
                  )}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-brand/10 transition-colors" />
                  <Building className={cn("w-6 h-6 mb-4", selectedCompanyId === company.id ? "text-brand" : "text-slate-300")} />
                  <div className="text-lg font-black uppercase tracking-tight leading-tight mb-1">{company.name}</div>
                  <div className="text-[9px] font-bold uppercase tracking-widest opacity-60">
                    {projects.filter(p => p.companyId === company.id).length} Active Projects
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Project Selection Grid */}
          <div className="md:col-span-12 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('select_active_project')}</h2>
              <span className="text-[10px] font-bold text-slate-300 italic">Step 02</span>
            </div>
            
            {activeProjects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setSelectedProject(project);
                      navigate(`/project/${project.id}`);
                    }}
                    className="p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm hover:border-brand hover:shadow-2xl hover:shadow-brand/5 transition-all text-left flex flex-col justify-between h-[180px] group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity -mr-16 -mt-16 rounded-full blur-2xl" />
                    
                    <div className="flex justify-between items-start relative z-10">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:bg-brand/10 group-hover:border-brand/20 transition-all">
                        <FolderOpen className="w-6 h-6 text-slate-400 group-hover:text-brand" />
                      </div>
                      <span className="text-[10px] font-black italic text-slate-300 group-hover:text-brand/40 uppercase tracking-tighter">[{project.code}]</span>
                    </div>

                    <div className="relative z-10">
                      <h3 className="text-xl font-black text-slate-900 tracking-tighter group-hover:text-brand transition-colors uppercase leading-none mb-2">{project.name}</h3>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          < Globe className="w-2.5 h-2.5 text-slate-300" />
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Active</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          < ShieldCheck className="w-2.5 h-2.5 text-slate-300" />
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Secure</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-slate-100 text-slate-200 mb-6 font-black italic tracking-tighter text-2xl">?</div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">{t('no_projects_found')}</h3>
                <p className="text-[10px] text-slate-300 uppercase mt-2 font-bold">{t('contact_manager_for_access')}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
      )}

      {/* Background Decorative Elements */}
      <div className="fixed top-0 left-0 w-full h-full -z-10 opacity-[0.03] pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-brand rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-20 w-[600px] h-[600px] bg-ribbon rounded-full blur-[120px]" />
      </div>
    </div>
  );
};
