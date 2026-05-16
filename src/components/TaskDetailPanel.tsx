import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, User, History, Sparkles } from 'lucide-react';
import { Task, TaskStatus, User as UserType } from '../types';
import { cn, formatDate } from '../lib/utils';
import { handleFirestoreError, OperationType, db, auth } from '../firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { SearchableSelect } from './common/SearchableSelect';
import { toast } from 'react-hot-toast';

interface TaskDetailPanelProps {
  task: Task;
  onUpdate: (field: string, value: any) => Promise<void>;
  onClose: () => void;
  customStatuses: string[];
  translateStatus: (status: string) => string;
  users: UserType[];
  suppliers: {id: string, name: string}[];
}

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({ 
  task, 
  onUpdate, 
  onClose, 
  customStatuses, 
  translateStatus, 
  users,
  suppliers 
}) => {
  const [newNote, setNewNote] = useState('');

  const getAssignee = (uid?: string) => {
    if (!uid) return { name: 'Unassigned', photoURL: 'https://picsum.photos/seed/user/200/200' };
    return users.find(u => u.uid === uid) || { name: 'Unassigned', photoURL: 'https://picsum.photos/seed/user/200/200' };
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
        const note = {
          id: 'n' + Date.now(),
          userId: auth.currentUser?.uid || 'Unknown',
          text: newNote.trim(),
          timestamp: new Date().toLocaleString('en-US')
        };
        await updateDoc(doc(db, 'tasks', task.id), {
          notes: [...(task.notes || []), note]
        });
        setNewNote('');
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'tasks');
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl p-8 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-2 flex-1">
                <input 
                    value={task.title} 
                    onChange={(e) => onUpdate('title', e.target.value)} 
                    className="text-3xl font-bold text-slate-800 bg-transparent border-none focus:ring-0 w-full p-0 transition-all rounded-xl"
                />
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all">
              <X className="w-6 h-6 text-slate-500" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-8">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                <textarea 
                    value={task.description || ''} 
                    onChange={(e) => onUpdate('description', e.target.value)} 
                    rows={4} 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 resize-none" 
                />
              </div>
              
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Notes & Discussion</h4>
                  <span className="bg-slate-100 text-slate-500 text-[10px] px-3 py-1 rounded-full font-bold">{task.notes?.length || 0} Comments</span>
                </div>
                <div className="flex gap-4 items-start">
                    <textarea 
                       value={newNote}
                       onChange={(e) => setNewNote(e.target.value)}
                       placeholder="Add a progress update or internal note..."
                       className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 resize-none min-h-[100px]"
                    />
                    <button onClick={handleAddNote} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700">Post</button>
                </div>
              </section>
            </div>
            
            <aside className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-3xl space-y-4 border border-slate-100">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Status</label>
                        <select value={task.status} onChange={(e) => onUpdate('status', e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                            {customStatuses.map((c) => <option key={c} value={c}>{translateStatus(c)}</option>)}
                        </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assignee</label>
                      <select 
                        value={task.assigneeId || ''} 
                        onChange={(e) => onUpdate('assigneeId', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none"
                      >
                        <option value="">Unassigned</option>
                        {users.map(u => <option key={u.uid} value={u.uid}>{u.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Linked Vendor / Supplier</label>
                        <SearchableSelect 
                            options={suppliers}
                            value={task.supplierId || ''}
                            onChange={(id, name) => {
                                onUpdate('supplierId', id);
                                onUpdate('supplierName', name);
                            }}
                            onAddClick={async () => {
                              const name = window.prompt('Enter New Supplier Name:');
                              if (name) {
                                try {
                                  await addDoc(collection(db, 'suppliers'), {
                                    name,
                                    status: 'Active',
                                    createdAt: serverTimestamp()
                                  });
                                  toast.success('Supplier added. Please re-open the dropdown.');
                                } catch (err) {
                                  console.error(err);
                                  toast.error('Failed to add supplier');
                                }
                              }
                            }}
                            placeholder="Select Vendor..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority</label>
                        <select value={task.priority} onChange={(e) => onUpdate('priority', e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due Date</label>
                        <input type="date" value={task.dueDate || ''} onChange={(e) => onUpdate('dueDate', e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none"/>
                    </div>
                </div>
            </aside>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
