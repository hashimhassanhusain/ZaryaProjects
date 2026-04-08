import React, { useState, useEffect } from 'react';
import { Page } from '../types';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  FileText, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Download,
  Printer,
  Edit2,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useProject } from '../context/ProjectContext';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { DetailView } from './DetailView';

interface LogManagementViewProps {
  page: Page;
}

interface LogEntry {
  id: string;
  data: Record<string, any>;
  createdAt: any;
  createdBy: string;
  status: string;
}

export const LogManagementView: React.FC<LogManagementViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingEntry, setEditingEntry] = useState<LogEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!selectedProject || !page.id) return;

    const q = query(
      collection(db, 'project_records'),
      where('projectId', '==', selectedProject.id),
      where('pageId', '==', page.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as LogEntry));
      setEntries(docs.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `project_records/${page.id}`);
    });

    return () => unsubscribe();
  }, [selectedProject?.id, page.id]);

  const handleAdd = () => {
    setEditingEntry(null);
    setView('form');
  };

  const handleEdit = (entry: LogEntry) => {
    setEditingEntry(entry);
    setView('form');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      await deleteDoc(doc(db, 'project_records', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `project_records/${id}`);
    }
  };

  const filteredEntries = entries.filter(entry => {
    const searchStr = searchQuery.toLowerCase();
    return Object.values(entry.data).some(val => 
      String(val).toLowerCase().includes(searchStr)
    );
  });

  if (view === 'form') {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setView('list')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold text-sm uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {page.title}
        </button>
        <DetailView page={page} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">{page.title}</h1>
          <p className="text-slate-500 max-w-2xl">{page.content}</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <Plus className="w-5 h-5" />
          Add {page.title.replace(' Management', '')}
        </button>
      </header>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${page.title.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-500 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all">
              <Filter className="w-4 h-4" />
            </button>
            <button className="p-2 text-slate-500 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">#</th>
                {page.formFields?.slice(0, 4).map(field => (
                  <th key={field} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{field}</th>
                ))}
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-slate-400 font-medium">Loading records...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-slate-50 rounded-full">
                        <FileText className="w-8 h-8 text-slate-200" />
                      </div>
                      <p className="text-sm text-slate-400 font-medium">No records found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, idx) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">{idx + 1}</td>
                    {page.formFields?.slice(0, 4).map(field => (
                      <td key={field} className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-700">{entry.data[field] || '-'}</span>
                      </td>
                    ))}
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        entry.status === 'Approved' ? "bg-green-100 text-green-700" :
                        entry.status === 'Pending' ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-700"
                      )}>
                        {entry.status || 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(entry)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(entry.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
