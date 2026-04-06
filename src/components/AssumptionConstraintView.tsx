import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  User, 
  Calendar,
  AlertCircle,
  X,
  Save,
  Loader2
} from 'lucide-react';
import { Page, AssumptionConstraintEntry, Task, User as UserType } from '../types';
import { users, currentUser } from '../data';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where,
  Timestamp
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface AssumptionConstraintViewProps {
  page: Page;
}

export const AssumptionConstraintView: React.FC<AssumptionConstraintViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [entries, setEntries] = useState<AssumptionConstraintEntry[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AssumptionConstraintEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<Partial<AssumptionConstraintEntry>>({
    category: 'Assumption',
    description: '',
    responsiblePartyId: currentUser.uid,
    dueDate: new Date().toISOString().split('T')[0],
    actions: '',
    status: 'Pending',
    comments: ''
  });

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'assumption_constraints'),
      where('projectId', '==', selectedProject.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AssumptionConstraintEntry[];
      setEntries(data);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'assumption_constraints');
    });

    return () => unsubscribe();
  }, [selectedProject?.id]);

  const handleSave = async () => {
    if (!selectedProject || !formData.description) return;

    setIsLoading(true);
    try {
      const entryData = {
        ...formData,
        projectId: selectedProject.id,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'Unknown'
      };

      let entryId = editingEntry?.id;

      if (editingEntry) {
        await updateDoc(doc(db, 'assumption_constraints', editingEntry.id), entryData);
      } else {
        const docRef = await addDoc(collection(db, 'assumption_constraints'), entryData);
        entryId = docRef.id;
      }

      // Sync to Tasks
      if (formData.actions && formData.responsiblePartyId) {
        const taskTitle = `[Assumption & Constraint] ${formData.category}: ${formData.description.substring(0, 50)}...`;
        const taskDescription = `Action required for Assumption/Constraint: ${formData.description}\n\nActions: ${formData.actions}\n\nComments: ${formData.comments || 'None'}`;
        
        const taskData = {
          title: taskTitle,
          description: taskDescription,
          status: formData.status === 'Completed' ? 'Completed' : 'Todo',
          assigneeId: formData.responsiblePartyId,
          workspaceId: 'w1', // Default workspace
          startDate: new Date().toISOString().split('T')[0],
          endDate: formData.dueDate,
          priority: 'Medium',
          sourceType: 'assumption_constraint',
          sourceId: entryId,
          projectId: selectedProject.id,
          createdAt: new Date().toISOString()
        };

        if (editingEntry?.taskId) {
          await updateDoc(doc(db, 'tasks', editingEntry.taskId), taskData);
        } else {
          const taskRef = await addDoc(collection(db, 'tasks'), taskData);
          if (entryId) {
            await updateDoc(doc(db, 'assumption_constraints', entryId), { taskId: taskRef.id });
          }
        }
      }

      setIsAdding(false);
      setEditingEntry(null);
      setFormData({
        category: 'Assumption',
        description: '',
        responsiblePartyId: currentUser.uid,
        dueDate: new Date().toISOString().split('T')[0],
        actions: '',
        status: 'Pending',
        comments: ''
      });
    } catch (error) {
      handleFirestoreError(error, editingEntry ? OperationType.UPDATE : OperationType.CREATE, 'assumption_constraints');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, taskId?: string) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    try {
      await deleteDoc(doc(db, 'assumption_constraints', id));
      if (taskId) {
        await deleteDoc(doc(db, 'tasks', taskId));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'assumption_constraints');
    }
  };

  const filteredEntries = entries.filter(e => 
    e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">{page.title}</h2>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">REF: {page.id}</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setEditingEntry(null);
            setFormData({
              category: 'Assumption',
              description: '',
              responsiblePartyId: currentUser.uid,
              dueDate: new Date().toISOString().split('T')[0],
              actions: '',
              status: 'Pending',
              comments: ''
            });
            setIsAdding(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          Add New Entry
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search log..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Responsible</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      entry.category === 'Assumption' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                    )}>
                      {entry.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="font-medium text-slate-900">{entry.description}</div>
                    {entry.actions && (
                      <div className="text-[11px] text-slate-400 mt-1 italic">Action: {entry.actions}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                        <User className="w-3 h-3 text-slate-400" />
                      </div>
                      <span>{users.find(u => u.uid === entry.responsiblePartyId)?.name || 'Unassigned'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400 font-mono text-[11px]">
                    {entry.dueDate}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      entry.status === 'Completed' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                    )}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingEntry(entry);
                          setFormData(entry);
                          setIsAdding(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(entry.id, entry.taskId)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    No entries found. Click "Add New Entry" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-xl">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {editingEntry ? 'Edit Entry' : 'Add New Entry'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Assumption and Constraint Log</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Category</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="Assumption">Assumption</option>
                      <option value="Constraint">Constraint</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Status</label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Describe the assumption or constraint..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Responsible Party</label>
                    <select 
                      value={formData.responsiblePartyId}
                      onChange={(e) => setFormData({ ...formData, responsiblePartyId: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      {users.map(u => (
                        <option key={u.uid} value={u.uid}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Due Date</label>
                    <input 
                      type="date" 
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Actions Required</label>
                  <textarea 
                    value={formData.actions}
                    onChange={(e) => setFormData({ ...formData, actions: e.target.value })}
                    rows={2}
                    placeholder="What actions need to be taken? (This will create a task)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  />
                  <p className="mt-2 text-[10px] text-slate-400 italic flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Entering actions will automatically create/update a task for the responsible party.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Comments</label>
                  <textarea 
                    value={formData.comments}
                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 flex justify-end gap-3">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-2.5 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isLoading || !formData.description}
                  className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingEntry ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
