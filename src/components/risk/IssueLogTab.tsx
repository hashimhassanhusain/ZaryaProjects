import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Download, 
  Save, 
  Loader2, 
  AlertTriangle,
  FileText,
  CheckCircle2,
  Clock,
  X,
  ArrowRight,
  MessageSquare
} from 'lucide-react';
import { ProjectIssue } from '../../types';
import { db, OperationType, handleFirestoreError, auth } from '../../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface IssueLogTabProps {
  issues: ProjectIssue[];
  projectId: string;
}

export const IssueLogTab: React.FC<IssueLogTabProps> = ({ issues, projectId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingIssue, setEditingIssue] = useState<ProjectIssue | null>(null);

  const [formData, setFormData] = useState<Partial<ProjectIssue>>({
    category: '',
    issue: '',
    impact: '',
    urgency: 'Medium',
    responsibleParty: '',
    actions: '',
    status: 'Open',
    dueDate: '',
    comments: ''
  });

  const handleAdd = () => {
    setEditingIssue(null);
    setFormData({
      category: '',
      issue: '',
      impact: '',
      urgency: 'Medium',
      responsibleParty: '',
      actions: '',
      status: 'Open',
      dueDate: '',
      comments: ''
    });
    setView('form');
  };

  const handleEdit = (issue: ProjectIssue) => {
    setEditingIssue(issue);
    setFormData(issue);
    setView('form');
  };

  const handleSave = async () => {
    if (!projectId || !formData.issue) return;
    
    // Knowledge Loop: Mandatory Lesson Learned if Closing
    if (formData.status === 'Closed' && !formData.finalLessonLearned) {
      alert('Please provide a Final Lesson Learned before closing this issue.');
      return;
    }

    setIsSaving(true);
    try {
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      const timestamp = new Date().toISOString();
      
      const issueData = {
        ...formData,
        projectId,
        updatedAt: timestamp,
        updatedBy: user,
        createdAt: editingIssue?.createdAt || timestamp,
        createdBy: editingIssue?.createdBy || user,
        closedDate: formData.status === 'Closed' ? timestamp : editingIssue?.closedDate || null
      };

      if (editingIssue) {
        await updateDoc(doc(db, 'issues', editingIssue.id), issueData);
      } else {
        await addDoc(collection(db, 'issues'), issueData);
      }

      // Auto-transfer to Lessons Learned Log if Closed
      if (formData.status === 'Closed' && formData.finalLessonLearned) {
        await addDoc(collection(db, 'lessons_learned'), {
          projectId,
          category: formData.category,
          description: `[Issue Resolution] ${formData.issue}`,
          recommendation: formData.finalLessonLearned,
          impact: formData.impact,
          owner: user,
          status: 'Captured',
          createdAt: timestamp,
          createdBy: user
        });
      }

      setView('list');
    } catch (err) {
      handleFirestoreError(err, editingIssue ? OperationType.UPDATE : OperationType.CREATE, 'issues');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;

    doc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('ISSUE LOG', pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Project ID: ${projectId}`, 15, 45);
    doc.text(`Date Prepared: ${new Date().toLocaleDateString()}`, pageWidth - 15, 45, { align: 'right' });

    autoTable(doc, {
      startY: 55,
      head: [['ID', 'Category', 'Issue', 'Impact', 'Urgency', 'Responsible', 'Status', 'Due Date']],
      body: issues.map((i, idx) => [
        `ISS-${(idx + 1).toString().padStart(3, '0')}`,
        i.category,
        i.issue,
        i.impact,
        i.urgency,
        i.responsibleParty,
        i.status,
        i.dueDate
      ]),
      theme: 'grid',
      headStyles: { fillColor: [0, 82, 136], fontSize: 8 },
      bodyStyles: { fontSize: 8 }
    });

    doc.save(`${projectId}-ISSUE-LOG-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const filteredIssues = issues.filter(i => {
    const issueText = (i.issue || (i as any).description || '').toLowerCase();
    const categoryText = (i.category || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return issueText.includes(query) || categoryText.includes(query);
  });

  if (view === 'form') {
    return (
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{editingIssue ? 'Edit Issue' : 'Log New Issue'}</h3>
          </div>
          <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
              <input 
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                placeholder="e.g. Technical, Supply Chain..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Urgency</label>
              <select 
                value={formData.urgency}
                onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Issue Description</label>
            <textarea 
              value={formData.issue}
              onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
              placeholder="Describe the problem..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Impact on Objectives</label>
              <textarea 
                value={formData.impact}
                onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
                placeholder="How does this affect scope, time, or cost?"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Actions Taken / Required</label>
              <textarea 
                value={formData.actions}
                onChange={(e) => setFormData({ ...formData, actions: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsible Party</label>
              <input 
                type="text"
                value={formData.responsibleParty}
                onChange={(e) => setFormData({ ...formData, responsibleParty: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Due Date</label>
              <input 
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
            </div>
          </div>

          {formData.status === 'Closed' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2 p-6 bg-emerald-50 rounded-2xl border border-emerald-100"
            >
              <label className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">
                <MessageSquare className="w-3 h-3" />
                Final Lesson Learned (Mandatory)
              </label>
              <textarea 
                value={formData.finalLessonLearned || ''}
                onChange={(e) => setFormData({ ...formData, finalLessonLearned: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                placeholder="What did we learn from this issue? This will be auto-transferred to the Lessons Learned Log."
              />
            </motion.div>
          )}

          <div className="flex justify-end gap-3 pt-6">
            <button 
              onClick={() => setView('list')}
              className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-2.5 bg-amber-600 text-white font-bold text-sm rounded-xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Issue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search issues..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={generatePDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button 
            onClick={handleAdd}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-all shadow-lg shadow-amber-200"
          >
            <Plus className="w-5 h-5" />
            Log Issue
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Issue</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Urgency</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsible</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Due Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-slate-400 font-medium italic">
                    No issues logged.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue, idx) => (
                  <tr key={issue.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                        ISS-{(idx + 1).toString().padStart(3, '0')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900 font-bold line-clamp-1">{issue.issue || (issue as any).description}</p>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{issue.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                        (issue.urgency === 'Critical' || issue.urgency === 'Urgent' || (issue as any).priority === 'Critical') ? "bg-red-100 text-red-700" :
                        (issue.urgency === 'High' || (issue as any).priority === 'High') ? "bg-orange-100 text-orange-700" :
                        (issue.urgency === 'Medium' || (issue as any).priority === 'Medium') ? "bg-amber-100 text-amber-700" :
                        "bg-blue-100 text-blue-700"
                      )}>
                        {issue.urgency || (issue as any).priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600">{issue.responsibleParty || (issue as any).ownerId}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                        issue.status === 'Closed' ? "bg-emerald-100 text-emerald-700" :
                        issue.status === 'Resolved' ? "bg-blue-100 text-blue-700" :
                        issue.status === 'In Progress' ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-700"
                      )}>
                        {issue.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600">{issue.dueDate || (issue as any).dateIdentified || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(issue)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
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
