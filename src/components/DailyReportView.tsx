import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Users, 
  CloudSun, 
  HardHat, 
  Truck, 
  AlertCircle,
  Download,
  Printer,
  ChevronRight,
  Clock,
  MoreVertical,
  Filter,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { useProject } from '../context/ProjectContext';
import { Page } from '../types';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

interface DailyReportViewProps {
  page: Page;
}

interface DailyReport {
  id: string;
  date: string;
  author: string;
  weather: string;
  manpowerTotal: number;
  equipmentTotal: number;
  incidentSummary?: string;
  status: 'Draft' | 'Submitted' | 'Approved';
  progressSummary: string;
}

export const DailyReportView: React.FC<DailyReportViewProps> = ({ page }) => {
  const { t, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'daily_reports'),
      where('projectId', '==', selectedProject.id),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as DailyReport));
      setReports(docs);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'daily_reports');
    });

    return () => unsubscribe();
  }, [selectedProject?.id]);

  const filteredReports = reports.filter(r => 
    (r.date || '').includes(searchQuery) || 
    (r.progressSummary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.author || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className={cn("text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2", isRtl && "flex-row-reverse")}>
            <FileText className="w-6 h-6 text-blue-600" />
            {t('daily_reports')}
          </h2>
          <p className={cn("text-slate-500 mt-1 font-medium", isRtl && "text-right")}>
            {t('manage_daily_progress_logs')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder={t('search_reports')}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 transition-all outline-none w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">
            <Plus className="w-4 h-4" />
            {t('new_report')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-white border border-slate-100 rounded-3xl p-6 hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-900">{report.date}</span>
              </div>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                report.status === 'Approved' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
              )}>
                {t(report.status.toLowerCase())}
              </span>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-slate-600 line-clamp-2 min-h-[2.5rem]">
                {report.progressSummary}
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2 text-slate-500">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">{report.manpowerTotal} {t('staff')}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Truck className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">{report.equipmentTotal} {t('units')}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-semibold text-slate-500 uppercase">
                  {report.author.charAt(0)}
                </div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{report.author}</span>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400">
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400">
                  <Printer className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
