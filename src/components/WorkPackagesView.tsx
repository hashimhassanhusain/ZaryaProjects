import React, { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { WBSLevel } from '../types';
import { masterFormatData } from '../data/masterFormat';
import { masterFormatSections } from '../constants/masterFormat';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Save, 
  Filter,
  ChevronRight,
  Layers,
  Grid3X3,
  Building2,
  List
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../context/ProjectContext';
import { toast } from 'react-hot-toast';
import { deriveStatus, rollupToParent } from '../services/rollupService';
import { Activity } from '../types';

export const WorkPackagesView: React.FC = () => {
  const { selectedProject } = useProject();
  const projectId = selectedProject?.id || '';
  const [workPackages, setWorkPackages] = useState<WBSLevel[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('All');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; title: string } | null>(null);
  const [isManualTitle, setIsManualTitle] = useState(false);

  const [formData, setFormData] = useState<Partial<WBSLevel>>({
    title: '',
    code: '',
    divisionCode: '',
    projectId: projectId,
    status: 'Not Started',
    type: 'Work Package'
  });

  useEffect(() => {
    if (!projectId) return;

    const q = query(
      collection(db, 'wbs'), 
      where('projectId', '==', projectId),
      where('type', '==', 'Work Package')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WBSLevel));
      setWorkPackages(data);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'wbs'));

    const qAct = query(
      collection(db, 'activities'),
      where('projectId', '==', projectId)
    );

    const unsubAct = onSnapshot(qAct, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity)));
    });

    return () => {
      unsubscribe();
      unsubAct();
    };
  }, [projectId]);

  const handleSave = async () => {
    if (!formData.title || !formData.divisionCode || !formData.code) {
      toast.error('Please fill in all required fields (Cost Account, Code, and Title)');
      return;
    }

    try {
      const data = {
        ...formData,
        projectId,
        type: 'Work Package',
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'wbs', editingId), data);
      } else {
        const docRef = await addDoc(collection(db, 'wbs'), data);
        (data as any).id = docRef.id;
      }

      // Trigger rollup to parent
      if (data.parentId) {
        await rollupToParent('division', data.parentId);
      }

      setIsAdding(false);
      setEditingId(null);
      setIsManualTitle(false);
      setFormData({ title: '', code: '', divisionCode: '', projectId, status: 'Not Started', type: 'Work Package' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'wbs');
    }
  };

  const handleDelete = async (id: string) => {
    const wp = workPackages.find(p => p.id === id);
    if (!wp) return;
    setDeleteConfirmation({ id, title: wp.title });
  };

  const executeDelete = async (id: string) => {
    try {
      const wpToDelete = workPackages.find(wp => wp.id === id);
      const parentIdToRollup = wpToDelete?.parentId;

      await deleteDoc(doc(db, 'wbs', id));

      if (parentIdToRollup) {
        await rollupToParent('division', parentIdToRollup);
      }

      setDeleteConfirmation(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'wbs');
    }
  };

  const filteredPackages = workPackages.filter(wp => {
    const matchesSearch = wp.title.toLowerCase().includes(searchTerm.toLowerCase()) || wp.code.includes(searchTerm);
    const matchesDivision = selectedDivision === 'All' || wp.divisionCode === selectedDivision;
    return matchesSearch && matchesDivision;
  });

  const handleMFSelect = (item: any) => {
    setFormData({
      ...formData,
      code: item.code,
      title: item.title
    });
    setIsManualTitle(false);
  };

  return (
    <div className="w-full">
      <div className="space-y-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          <span className="hover:text-slate-600 cursor-pointer transition-colors">Admin Settings</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-900">Work Packages (MasterFormat Level 2)</span>
        </nav>

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl shadow-slate-200">
                <Grid3X3 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl font-semibold text-slate-900 tracking-tight">Work Packages</h1>
            </div>
            <p className="text-slate-500 font-medium max-w-2xl ml-1">
              Manage project work packages based on CSI MasterFormat Level 2.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ title: '', code: '', divisionCode: '', projectId, status: 'Not Started', type: 'Work Package' });
              setIsAdding(true);
            }}
            className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <Plus className="w-4 h-4" />
            Add Work Package
          </button>
        </header>

        {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600">
              <Filter className="w-4 h-4" />
              <select 
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="bg-transparent focus:outline-none"
              >
                <option value="All">All Cost Accounts</option>
                {masterFormatData.map(div => (
                  <option key={div.number} value={div.number}>{div.number} - {div.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Code</th>
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Title</th>
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Cost Account</th>
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPackages.map((wp) => {
                const division = masterFormatData.find(d => d.number === wp.divisionCode);
                return (
                  <tr key={wp.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {wp.code}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-slate-900 transition-all">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{wp.title}</div>
                          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Level 2 Item</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-semibold uppercase tracking-wider">
                          {wp.divisionCode}
                        </span>
                        <span className="text-sm font-medium text-slate-500">{division?.title}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                        (() => {
                          const wpActivities = activities.filter(a => a.divisionId === wp.id || a.wbsId === wp.id);
                          const progress = wp.progress || (wpActivities.length > 0 ? wpActivities.reduce((sum, a) => sum + (a.percentComplete || 0), 0) / wpActivities.length : 0);
                          const actualStart = wp.actualStart || wpActivities.find(a => a.actualStartDate)?.actualStartDate;
                          const actualFinish = wp.actualFinish || (wpActivities.length > 0 && wpActivities.every(a => a.actualFinishDate) ? wpActivities[0].actualFinishDate : null);
                          const derived = deriveStatus(progress, actualStart, actualFinish);
                          return derived === 'Completed' ? "bg-emerald-50 text-emerald-600" : 
                                 derived === 'In Progress' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500";
                        })()
                      )}>
                        {(() => {
                           const wpActivities = activities.filter(a => a.divisionId === wp.id || a.wbsId === wp.id);
                           const progress = wp.progress || (wpActivities.length > 0 ? wpActivities.reduce((sum, a) => sum + (a.percentComplete || 0), 0) / wpActivities.length : 0);
                           const actualStart = wp.actualStart || wpActivities.find(a => a.actualStartDate)?.actualStartDate;
                           const actualFinish = wp.actualFinish || (wpActivities.length > 0 && wpActivities.every(a => a.actualFinishDate) ? wpActivities[0].actualFinishDate : null);
                           return deriveStatus(progress, actualStart, actualFinish);
                        })()}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => {
                            setEditingId(wp.id);
                            setFormData(wp);
                            setIsAdding(true);
                            const isStandard = masterFormatSections.some(s => s.title === wp.title);
                            setIsManualTitle(!isStandard);
                          }}
                          className="p-2.5 hover:bg-white rounded-xl text-slate-400 hover:text-blue-600 transition-all shadow-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(wp.id)}
                          className="p-2.5 hover:bg-white rounded-xl text-slate-400 hover:text-red-600 transition-all shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">
                  {editingId ? 'Edit Work Package' : 'Add New Work Package'}
                </h2>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Cost Account (Level 1)</label>
                    <select
                      value={formData.divisionCode}
                      onChange={(e) => setFormData({ ...formData, divisionCode: e.target.value, code: '', title: '' })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                    >
                      <option value="">Select Cost Account</option>
                      {masterFormatData.map(div => (
                        <option key={div.number} value={div.number}>{div.number} - {div.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">MasterFormat 16 Cost Accounts Suggestions</label>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    {formData.divisionCode ? (
                      masterFormatData.find(d => d.number === formData.divisionCode)?.items.map(item => (
                        <button
                          key={item.code}
                          onClick={() => handleMFSelect(item)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl text-left transition-all",
                            formData.code === item.code ? "bg-blue-600 text-white shadow-lg" : "bg-white text-slate-600 hover:bg-blue-50"
                          )}
                        >
                          <span className="text-sm font-bold">{item.title}</span>
                          <span className="font-mono text-xs opacity-60">{item.code}</span>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-400 text-sm italic">
                        Please select a cost account first to see suggestions.
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Code</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="00000"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all font-mono"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Title</label>
                    {!isManualTitle ? (
                      <select
                        value={masterFormatSections.some(s => s.title === formData.title) ? formData.title : ''}
                        onChange={(e) => {
                          if (e.target.value === 'manual') {
                            setIsManualTitle(true);
                          } else {
                            setFormData({ ...formData, title: e.target.value });
                          }
                        }}
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                      >
                        <option value="">Select Title...</option>
                        {masterFormatSections
                          .filter(s => s.divisionId === formData.divisionCode)
                          .map(section => (
                            <option key={section.id} value={section.title}>{section.id} - {section.title}</option>
                          ))
                        }
                        <option value="manual" className="text-blue-600 font-bold">+ Other (Manual Entry)</option>
                      </select>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Work Package Title"
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all pr-12"
                          autoFocus
                        />
                        <button 
                          onClick={() => setIsManualTitle(false)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
                          title="Back to list"
                        >
                          <List className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Description (Optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all resize-none"
                    placeholder="Enter work package details..."
                  />
                </div>
              </div>

              <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setIsManualTitle(false);
                  }}
                  className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  Save Work Package
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmation && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2 text-center">Confirm Deletion</h3>
              <p className="text-slate-500 text-center mb-8">
                Are you sure you want to delete <span className="font-bold text-slate-900">"{deleteConfirmation.title}"</span>?
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmation(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => executeDelete(deleteConfirmation.id)}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
