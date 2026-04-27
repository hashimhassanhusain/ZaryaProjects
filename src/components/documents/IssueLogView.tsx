import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  MoreHorizontal, 
  Plus, 
  Search, 
  User as UserIcon,
  Filter,
  Calendar,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../../context/ProjectContext';
import { useLanguage } from '../../context/LanguageContext';
import { IssueService } from '../../services/documentService';
import { IssueLog } from '../../types/projectDocuments';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

export const IssueLogView: React.FC = () => {
  const { t, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  const [issues, setIssues] = useState<IssueLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Open' | 'Closed'>('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [newIssue, setNewIssue] = useState<Partial<IssueLog>>({
    title: '',
    description: '',
    priority: 'Medium',
    status: 'Open',
    assignedTo: '',
    dueDate: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    if (selectedProject) {
      loadIssues();
    }
  }, [selectedProject]);

  const loadIssues = async () => {
    if (!selectedProject) return;
    setLoading(true);
    const data = await IssueService.getAllByProject(selectedProject.id);
    setIssues(data);
    setLoading(false);
  };

  const handleAddIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newIssue.title) return;

    await IssueService.create({
      projectId: selectedProject.id,
      title: newIssue.title,
      description: newIssue.description || '',
      priority: newIssue.priority as any,
      status: newIssue.status as any,
      assignedTo: newIssue.assignedTo || '',
      dueDate: newIssue.dueDate || ''
    } as any);

    setShowAddModal(false);
    setNewIssue({
      title: '',
      description: '',
      priority: 'Medium',
      status: 'Open',
      assignedTo: '',
      dueDate: format(new Date(), 'yyyy-MM-dd')
    });
    loadIssues();
  };

  const toggleStatus = async (issue: IssueLog) => {
    const newStatus = issue.status === 'Open' ? 'Closed' : 'Open';
    await IssueService.update(issue.id, { status: newStatus });
    loadIssues();
  };

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = issue.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         issue.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'All' || issue.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: issues.length,
    open: issues.filter(i => i.status === 'Open').length,
    high: issues.filter(i => i.priority === 'High' && i.status === 'Open').length
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('total_issues')}</div>
          <div className="text-2xl font-black text-slate-900">{stats.total}</div>
        </div>
        <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100 shadow-sm">
          <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">{t('open_issues')}</div>
          <div className="text-2xl font-black text-amber-700">{stats.open}</div>
        </div>
        <div className="bg-rose-50 p-5 rounded-3xl border border-rose-100 shadow-sm">
          <div className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1">{t('critical_priority')}</div>
          <div className="text-2xl font-black text-rose-700">{stats.high}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder={t('search_issues')}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['All', 'Open', 'Closed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                  filterStatus === s ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {t(s.toLowerCase())}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            {t('new_issue')}
          </button>
        </div>
      </div>

      {/* Issues Table/List */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-bottom border-slate-50 bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('issue_details')}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('priority')}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('status')}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('assigned_to')}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('due_date')}</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {filteredIssues.map((issue) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={issue.id} 
                    className="hover:bg-slate-50/30 transition-colors group"
                  >
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {issue.title}
                        </div>
                        <div className="text-xs text-slate-400 line-clamp-1">{issue.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        issue.priority === 'High' ? "bg-rose-50 text-rose-600" :
                        issue.priority === 'Medium' ? "bg-amber-50 text-amber-600" :
                        "bg-blue-50 text-blue-600"
                      )}>
                        {t(issue.priority.toLowerCase())}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <button 
                        onClick={() => toggleStatus(issue)}
                        className={cn(
                          "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors",
                          issue.status === 'Open' ? "text-amber-500 hover:text-amber-600" : "text-emerald-500 hover:text-emerald-600"
                        )}
                      >
                        {issue.status === 'Open' ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {t(issue.status.toLowerCase())}
                      </button>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                          {issue.assignedTo?.substring(0, 2).toUpperCase() || '??'}
                        </div>
                        <span className="text-xs font-medium text-slate-600">{issue.assignedTo || t('unassigned')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {issue.dueDate}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filteredIssues.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <AlertCircle className="w-12 h-12" />
                      <div className="text-sm font-bold uppercase tracking-[0.2em]">{t('no_issues_found')}</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Issue Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-8 overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
            
            <div className="flex items-center gap-3 mb-8 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('log_new_issue')}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('structured_register_input')}</p>
              </div>
            </div>

            <form onSubmit={handleAddIssue} className="space-y-6 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{t('title')}</label>
                <input 
                  autoFocus
                  required
                  type="text"
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-blue-500/20"
                  placeholder={t('issue_title_placeholder')}
                  value={newIssue.title}
                  onChange={e => setNewIssue({...newIssue, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{t('priority')}</label>
                  <select 
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 appearance-none"
                    value={newIssue.priority}
                    onChange={e => setNewIssue({...newIssue, priority: e.target.value as any})}
                  >
                    <option value="High">{t('high')}</option>
                    <option value="Medium">{t('medium')}</option>
                    <option value="Low">{t('low')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{t('due_date')}</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-blue-500/20"
                    value={newIssue.dueDate}
                    onChange={e => setNewIssue({...newIssue, dueDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{t('description')}</label>
                <textarea 
                  rows={3}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 resize-none"
                  placeholder={t('issue_desc_placeholder')}
                  value={newIssue.description}
                  onChange={e => setNewIssue({...newIssue, description: e.target.value})}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
                >
                  {t('save_issue')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
