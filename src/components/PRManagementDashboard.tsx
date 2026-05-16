import { ExternalLink, Plus, Download, Trash2, X, Calendar, User, Sparkles, History, ArrowLeft, Archive, Trash, CheckCircle2, FileText, ListTodo, MessageSquare, Calculator, Gavel, Building2, Clock, Printer, Save, RefreshCw, UploadCloud, Check, ChevronRight, ListChecks, Edit2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { PurchaseRequest, TenderBidder, PRTask, BOQItem, Company } from '../types';
import { toast } from 'react-hot-toast';
import { updatePurchaseRequest, approvePurchaseRequest } from '../services/procurementService';
import { getSuppliers, getUsers } from '../services/masterDataService';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { TaskDetailPanel } from './TaskDetailPanel';
import { TaskCard } from './common/TaskCard';
import { ProcurementDocumentHub } from './ProcurementDocumentHub';
import { POConversionModal } from './POConversionModal';
import { Task, TaskStatus } from '../types';
import { cn } from '../lib/utils';
import { SearchableSelect } from './common/SearchableSelect';
import { motion, AnimatePresence } from 'motion/react';

interface PRManagementDashboardProps {
  pr: PurchaseRequest;
  onBack: () => void;
  onArchive: () => void;
  onConvertToPO: () => void;
  onDelete: () => void;
}

export const PRManagementDashboard: React.FC<PRManagementDashboardProps> = ({ pr: initialPr, onBack, onArchive, onConvertToPO, onDelete }) => {
  const [pr, setPr] = useState<PurchaseRequest>(initialPr);
  const [activeTab, setActiveTab] = useState<'Tender Log & Notes' | 'BOQ' | 'Tendering' | 'Tasks' | 'Documents'>('Tender Log & Notes');
  const [bidders, setBidders] = useState<TenderBidder[]>(initialPr.bidders || []);
  const [tasks, setTasks] = useState<any[]>([]);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [customStatuses, setCustomStatuses] = useState<string[]>(['TO DO', 'PLANNING', 'RFP', 'TENDERING', 'IN PROGRESS', 'AT RISK', 'UPDATE REQUIRED', 'COMPLETED']);

  const [suppliers, setSuppliers] = useState<{id:string, name:string}[]>([]);
  const [users, setUsers] = useState<{id:string, name:string}[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>(initialPr.boqItems || []);
  const [newTask, setNewTask] = useState<Partial<any>>({title: '', assigneeName: '', dueDate: '', priority: 'Medium', status: 'TO DO'});
  const [tenderLogEntries, setTenderLogEntries] = useState(initialPr.tenderLog || []);
  const [newNote, setNewNote] = useState('');
  const [logView, setLogView] = useState<'audit' | 'append'>('audit');

  // Real-time PR Listener
  useEffect(() => {
    if (!initialPr.id) return;
    const unsubscribe = onSnapshot(doc(db, 'purchase_requests', initialPr.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as PurchaseRequest;
        setPr(data);
        setBidders(data.bidders || []);
        setBoqItems(data.boqItems || []);
        setTenderLogEntries(data.tenderLog || []);
      }
    });
    return () => unsubscribe();
  }, [initialPr.id]);

  useEffect(() => {
    if (!pr.projectId) return;
    const projectRef = doc(db, 'projects', pr.projectId);
    const unsubscribe = onSnapshot(projectRef, (snapshot) => {
      const data = snapshot.data();
      if (data && data.taskStatuses) {
        setCustomStatuses(data.taskStatuses);
      }
    });
    return () => unsubscribe();
  }, [pr.projectId]);

  useEffect(() => {
    getSuppliers().then(setSuppliers);
    getUsers().then(setUsers);
  }, []);

  useEffect(() => {
    if (!pr.id) return;
    const q = query(collection(db, 'tasks'), where('parentReference', '==', pr.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [pr.id]);

  const saveUpdates = async (updates: Partial<PurchaseRequest>) => {
    await updatePurchaseRequest(pr.id!, updates);
    toast.success('Saved');
  };

  const updateBOQItem = (id: string, field: keyof BOQItem, value: any) => {
    const updatedBoq = boqItems.map(item => item.id === id ? { ...item, [field]: value } : item);
    setBoqItems(updatedBoq);
  };

  const updateBidder = (id: string, field: keyof TenderBidder, value: any) => {
    const updatedBidders = bidders.map(b => b.id === id ? { ...b, [field]: value } : b);
    setBidders(updatedBidders);
  };

  const updateBidderScore = (id: string, criteria: keyof Required<TenderBidder>['scoreCard'], value: number) => {
    const updated = bidders.map(b => {
      if (b.id === id) {
        return {
          ...b,
          scoreCard: {
             ...(b.scoreCard || { technical: 0, financial: 0, pastPerformance: 0, risk: 50 }),
             [criteria]: value
          }
        };
      }
      return b;
    });
    setBidders(updated);
  };

  const addTask = async () => {
    if (!newTask.title || !newTask.assigneeId) return;
    try {
        const assignee = users.find(u => u.id === newTask.assigneeId);
        await addDoc(collection(db, 'tasks'), {
            title: newTask.title,
            assigneeId: assignee?.id || '',
            assigneeName: assignee?.name || '',
            dueDate: newTask.dueDate,
            priority: newTask.priority,
            status: newTask.status || 'TO DO',
            projectId: pr.projectId,
            category: 'Procurement',
            workspaceId: 'w1', 
            isProcurement: true, 
            parentReference: pr.id,
            sourceType: 'pr',
            sourceId: pr.id,
            createdAt: serverTimestamp()
        });
        setNewTask({title: '', assigneeName: '', dueDate: '', priority: 'Medium', status: 'TO DO'});
        toast.success('Task added');
    } catch (error) {
        console.error(error);
    }
  };

  const updateTaskField = async (field: string, value: any) => {
    if (!editingTask) return;
    await updateDoc(doc(db, 'tasks', editingTask.id), { [field]: value });
    setEditingTask({ ...editingTask, [field]: value });
  };

  const TABS = [
    { id: 'Tender Log & Notes', icon: MessageSquare },
    { id: 'BOQ', icon: Calculator },
    { id: 'Tendering', icon: Gavel },
    { id: 'Tasks', icon: ListTodo },
    { id: 'Documents', icon: FileText },
  ] as const;

  const getTabStyle = (tabId: string, isActive: boolean) => {
    const activeClass = "bg-white text-slate-900 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t border-l border-r border-slate-200 z-10 font-bold h-[40px] mt-0";
    
    switch (tabId) {
      case 'Tender Log & Notes':
        return isActive ? activeClass : "bg-slate-200 text-slate-600 hover:bg-slate-100 border-t border-l border-r border-slate-300 font-semibold h-[36px] mt-[4px]";
      case 'BOQ':
        return isActive ? activeClass : "bg-slate-300 text-slate-600 hover:bg-slate-200 border-t border-l border-r border-slate-400 font-semibold h-[36px] mt-[4px]";
      case 'Tendering':
        return isActive ? activeClass : "bg-slate-400 text-[#ff6d00] hover:bg-slate-300 border-t border-l border-r border-slate-500 font-semibold h-[36px] mt-[4px]";
      case 'Tasks':
        return isActive ? activeClass : "bg-slate-500 text-white hover:bg-slate-400 border-t border-l border-r border-slate-600 font-semibold h-[36px] mt-[4px]";
      case 'Documents':
        return isActive ? activeClass : "bg-slate-100 text-slate-600 hover:bg-white border-t border-l border-r border-slate-200 font-semibold h-[36px] mt-[4px] shadow-inner";
      default:
        return isActive ? activeClass : "bg-slate-200 text-slate-600 hover:bg-slate-100 border border-slate-300 font-semibold h-[36px] mt-[4px]";
    }
  };

  return (
    <div className="min-h-full p-4 lg:p-8 w-full relative">
      <div className="min-h-full bg-paper w-full relative max-w-[1200px] mx-auto rounded-lg shadow-xl overflow-hidden pb-12">

      {/* Precision Compact Header */}
      <div className="bg-transparent border-b border-black/10 sticky top-0 z-40 pt-8 pb-0">
        <div className="max-w-7xl mx-auto px-10 flex items-start justify-between gap-4 mb-6">
          <div className="flex flex-col gap-6 w-full">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-slate-300 rounded overflow-hidden shadow-sm bg-white top-table-header">
               <div className="flex items-center gap-2 border-r border-b border-slate-300 p-3">
                 <span className="text-[11px] font-black text-[#ff8533] uppercase tracking-widest leading-none">REQUEST ID:</span>
                 <span className="text-sm font-black text-slate-900 tracking-tight uppercase leading-none">
                   {pr.id?.slice(-6).toUpperCase() || 'NEW'}
                 </span>
               </div>
               
               <div className="flex items-center gap-2 border-r border-b border-slate-300 p-3 col-span-3">
                 <span className="text-[11px] font-black text-[#ff8533] uppercase tracking-widest leading-none">DATE:</span>
                 <input 
                   type="date"
                   defaultValue={pr.date || new Date().toISOString().split('T')[0]}
                   onBlur={(e) => saveUpdates({ date: e.target.value })}
                   className="text-sm font-black text-slate-900 tracking-tight leading-none bg-blue-50/50 border-b border-blue-200 outline-none focus:bg-white focus:border-brand transition-all px-1"
                 />
               </div>
               
               <div className="flex items-center gap-2 border-r border-slate-300 p-3">
                 <span className="text-[11px] font-black text-[#ff8533] uppercase tracking-widest leading-none">PRIORITY:</span>
                 <select 
                   value={pr.priority || 'HIGH'}
                   onChange={(e) => saveUpdates({ priority: e.target.value as any })}
                   className="text-sm font-black text-slate-900 tracking-tight uppercase leading-none bg-blue-50/50 border-b border-blue-200 outline-none focus:bg-white focus:border-brand transition-all cursor-pointer"
                 >
                   <option value="Low">Low</option>
                   <option value="Medium">Medium</option>
                   <option value="High">High</option>
                   <option value="Critical">Critical</option>
                 </select>
               </div>
               
               <div className="flex items-center gap-2 border-r border-slate-300 p-3">
                 <span className="text-[11px] font-black text-[#ff8533] uppercase tracking-widest leading-none">STATUS:</span>
                 <select 
                   value={pr.status}
                   onChange={(e) => saveUpdates({ status: e.target.value as any })}
                   className="text-sm font-black text-slate-900 tracking-tight uppercase leading-none bg-blue-50/50 border-b border-blue-200 outline-none focus:bg-white focus:border-brand transition-all cursor-pointer"
                 >
                   <option value="Draft">Draft</option>
                   <option value="Pending">Pending</option>
                   <option value="Approved">Approved</option>
                   <option value="Rejected">Rejected</option>
                   <option value="Archived">Archived</option>
                   <option value="ConvertedToPO">ConvertedToPO</option>
                 </select>
               </div>
               
               <div className="flex items-center gap-2 border-slate-300 p-3 col-span-2">
                 <span className="text-[11px] font-black text-[#ff8533] uppercase tracking-widest leading-none">REQUISITION NAME:</span>
                 <input 
                   type="text"
                   defaultValue={pr.prName || ''}
                   onBlur={async (e) => {
                     const newName = e.target.value.trim();
                     if (newName && newName !== pr.prName) {
                       await saveUpdates({ prName: newName, description: newName });
                     }
                   }}
                   className="text-sm font-black text-slate-900 tracking-tight uppercase truncate leading-none bg-blue-50/50 border-b border-blue-200 outline-none focus:bg-white focus:border-brand transition-all w-full px-1"
                 />
               </div>
             </div>
          </div>
        </div>

        {/* Navigation Tabs - Folder Style */}
        <div className="max-w-7xl mx-auto px-6 flex gap-1 items-end h-[44px]">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                className={cn(
                  "flex items-center justify-center w-[160px] px-2 text-[10px] uppercase tracking-widest transition-all rounded-t-[10px]",
                  getTabStyle(tab.id, isActive)
                )}
              >
                <span>{tab.id === 'Tender Log & Notes' ? 'Log & Notes' : tab.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
           {activeTab === 'Tender Log & Notes' && (
             <motion.div 
               key="tender-log"
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               className="grid grid-cols-1 gap-6"
             >
               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col">
                 <div className="flex border-b border-slate-200 bg-slate-50/50">
                    <button 
                      onClick={() => setLogView('audit')}
                      className={cn(
                        "px-6 py-4 text-xs font-bold uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all",
                        logView === 'audit' ? "text-[#ff6d00] border-[#ff6d00] bg-white" : "text-slate-400 border-transparent hover:text-slate-600"
                      )}
                    >
                      <History className="w-4 h-4" />
                      Audit Trail
                    </button>
                    <button 
                      onClick={() => setLogView('append')}
                      className={cn(
                        "px-6 py-4 text-xs font-bold uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all",
                        logView === 'append' ? "text-[#ff6d00] border-[#ff6d00] bg-white" : "text-slate-400 border-transparent hover:text-slate-600"
                      )}
                    >
                      <Plus className="w-4 h-4" />
                      Add Note
                    </button>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                    <div className="lg:col-span-2 p-0 flex flex-col h-[500px]">
                       <div className="p-6 relative flex-1 overflow-y-auto no-scrollbar">
                         <div className="space-y-4 relative ml-2 border-l-2 border-slate-100 pl-6">
                           {tenderLogEntries.length === 0 ? (
                             <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                               <MessageSquare className="w-10 h-10 opacity-50" strokeWidth={1} />
                               <p className="font-bold uppercase tracking-widest text-[10px]">No logs yet</p>
                             </div>
                           ) : (
                             tenderLogEntries.map((log, i) => (
                               <div key={i} className="relative group">
                                 <div className="absolute -left-8 top-1.5 w-3 h-3 bg-white border-2 border-[#ff6d00] rounded-full shadow-sm z-10" />
                                 <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 group-hover:bg-white group-hover:shadow-md transition-all">
                                   <div className="flex justify-between items-start mb-1">
                                      <p className="text-[9px] font-bold text-[#ff6d00] uppercase tracking-widest flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" />
                                        Entry {i + 1}
                                      </p>
                                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                          onClick={() => {
                                            const updatedNote = window.prompt('Edit Note:', log);
                                            if (updatedNote !== null) {
                                              const updatedLog = [...tenderLogEntries];
                                              updatedLog[i] = updatedNote;
                                              setTenderLogEntries(updatedLog);
                                              saveUpdates({ tenderLog: updatedLog });
                                            }
                                          }}
                                          className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-blue-500 transition-colors"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button 
                                          onClick={() => {
                                            if (window.confirm('Delete this note?')) {
                                              const updatedLog = tenderLogEntries.filter((_, idx) => idx !== i);
                                              setTenderLogEntries(updatedLog);
                                              saveUpdates({ tenderLog: updatedLog });
                                            }
                                          }}
                                          className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                   </div>
                                   <p className="text-xs text-[#1A1C1E] leading-relaxed">{log}</p>
                                 </div>
                               </div>
                             )).reverse()
                           )}
                         </div>
                       </div>
                    </div>

                    <div className="p-6 bg-slate-50 relative flex flex-col">
                       <div className="flex-1 flex flex-col gap-3">
                         <div className="flex justify-between items-center bg-slate-100 p-2 rounded-xl mb-2">
                            <label className="text-[10px] font-black text-[#4A5568] uppercase tracking-widest pl-2">Protocol Entry</label>
                            <button 
                              onClick={async () => {
                                if (!newNote.trim()) return;
                                const timestamp = new Date().toLocaleString();
                                const note = `[${timestamp}] ${newNote}`;
                                const updatedLog = [...tenderLogEntries, note];
                                setTenderLogEntries(updatedLog);
                                setNewNote('');
                                await saveUpdates({ tenderLog: updatedLog });
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-[#ff6d00] text-white rounded-lg hover:bg-[#ff8533] transition-all shadow-md active:scale-95"
                            >
                              <Plus className="w-4 h-4" strokeWidth={3} />
                            </button>
                         </div>
                         <textarea 
                           value={newNote} 
                           onChange={e => setNewNote(e.target.value)} 
                           className="flex-1 p-4 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:ring-1 focus:ring-[#ff6d00] focus:border-[#ff6d00] transition-all outline-none resize-none shadow-inner"
                           placeholder="Describe updates, clarifications, or approvals..."
                         />
                       </div>
                    </div>
                 </div>
               </div>
             </motion.div>
           )}

          {activeTab === 'BOQ' && (
            <motion.div 
              key="boq-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
            >
              <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between bg-slate-50/50 gap-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-[#1A1C1E] uppercase tracking-tight flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-emerald-600" />
                    BOQ Line Items
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      const newItem: BOQItem = { id: Date.now().toString(), description: 'New Line Item', unit: 'EA', quantity: 1, rate: 0, amount: 0, division: '01', workPackage: '', location: '', completion: 0 };
                      const updated = [...boqItems, newItem];
                      setBoqItems(updated);
                      saveUpdates({ boqItems: updated });
                    }}
                    className="w-10 h-10 flex items-center justify-center bg-[#ff6d00] hover:bg-[#ff8533] text-white rounded-lg transition-colors shadow-md border border-orange-600/20"
                    title="Add Item"
                  >
                    <Plus className="w-5 h-5" strokeWidth={3} />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F8FAFC] border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold text-[#4A5568] uppercase tracking-widest w-1/2">Description</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-[#4A5568] uppercase tracking-widest">Unit</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-[#4A5568] uppercase tracking-widest">Qty</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-[#4A5568] uppercase tracking-widest">Rate</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-[#4A5568] uppercase tracking-widest text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {boqItems.map(item => (
                      <tr key={item.id} className="group hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-4 py-2">
                          <input 
                            value={item.description} 
                            onChange={e => updateBOQItem(item.id, 'description', e.target.value)} 
                            onBlur={() => saveUpdates({boqItems})}
                            className="w-full bg-transparent border-none focus:ring-0 text-xs font-semibold text-[#1A1C1E] focus:text-[#ff6d00]"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input 
                            value={item.unit} 
                            onChange={e => updateBOQItem(item.id, 'unit', e.target.value)} 
                            onBlur={() => saveUpdates({boqItems})}
                            className="w-16 bg-white border border-slate-200 rounded px-2 py-1 text-[10px] font-bold text-center text-[#4A5568] uppercase"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input 
                            type="number" 
                            value={item.quantity} 
                            onChange={e => updateBOQItem(item.id, 'quantity', Number(e.target.value))} 
                            onBlur={() => saveUpdates({boqItems})}
                            className="w-20 bg-transparent border-none focus:ring-0 text-xs font-semibold text-[#1A1C1E]"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input 
                            type="number" 
                            value={item.rate} 
                            onChange={e => updateBOQItem(item.id, 'rate', Number(e.target.value))} 
                            onBlur={() => saveUpdates({boqItems})}
                            className="w-24 bg-transparent border-none focus:ring-0 text-xs font-semibold text-emerald-600"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#1A1C1E] tabular-nums text-xs relative group/item">
                          <div className="flex items-center justify-end gap-3">
                            <span>{(item.quantity * item.rate * (pr.exchangeRate || 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            <button 
                              onClick={() => {
                                const updated = boqItems.filter(i => i.id !== item.id);
                                setBoqItems(updated);
                                saveUpdates({ boqItems: updated });
                              }}
                              className="p-1 hover:bg-red-50 rounded text-slate-300 hover:text-red-500 transition-opacity opacity-0 group-hover/item:opacity-100"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#F8FAFC] border-t border-slate-200">
                    <tr>
                      <td colSpan={4} className="px-4 py-4 px-10">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#4A5568]">Total Estimate</p>
                      </td>
                      <td className="px-4 py-4 text-right pr-10">
                        <div className="text-sm font-bold text-[#1A1C1E] tracking-tight tabular-nums">
                           {pr.currency} {boqItems.reduce((acc, curr) => acc + (curr.quantity * curr.rate * (pr.exchangeRate || 1)), 0).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'Tendering' && (
            <motion.div 
               key="tendering-tab"
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="space-y-6"
            >
               <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                     <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic flex items-center gap-3">
                           <Gavel className="w-6 h-6 text-[#ff6d00]" />
                           Bid Tabulation
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sourcing and Vendor Assessment</p>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="w-[300px]">
                           <SearchableSelect 
                              options={suppliers}
                              value={''}
                              onChange={(id, name) => {
                                 if (!id) return;
                                 const newBidder: TenderBidder = { id: Math.random().toString(36).substr(2, 9), companyName: name || 'Unknown', status: 'Invited', financialOffer: 0, technicalCompliance: '', pros: '', cons: '' };
                                 const updated = [...bidders, newBidder];
                                 setBidders(updated);
                                 saveUpdates({ bidders: updated });
                              }}
                              onAddClick={async () => {
                                 const name = window.prompt('Enter New Supplier Name:');
                                 if (name) {
                                   try {
                                     const docRef = await addDoc(collection(db, 'suppliers'), {
                                       name,
                                       status: 'Active',
                                       createdAt: serverTimestamp()
                                     });
                                     const newSuppliers = [...suppliers, { id: docRef.id, name }];
                                     setSuppliers(newSuppliers);
                                     toast.success('Supplier added');
                                   } catch (err) {
                                     console.error(err);
                                     toast.error('Failed to add supplier');
                                   }
                                 }
                              }}
                              placeholder="Invite Supplier..."
                           />
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {bidders.map((b) => (
                        <div key={b.id} className="border border-slate-200 rounded-2xl p-6 hover:shadow-xl transition-all group relative overflow-hidden bg-slate-50/30">
                           <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => {
                                 const updated = bidders.filter(bidder => bidder.id !== b.id);
                                 setBidders(updated);
                                 saveUpdates({ bidders: updated });
                              }} className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg">
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </div>

                           <div className="flex items-center gap-4 mb-6">
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm text-slate-400">
                                 <Building2 className="w-6 h-6" />
                              </div>
                              <div className="flex-1">
                                 <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{b.companyName || 'Draft Bidder'}</p>
                                 <select 
                                    value={b.status} 
                                    onChange={e => updateBidder(b.id, 'status', e.target.value as any)}
                                    className="text-[9px] font-black uppercase text-blue-600 outline-none bg-transparent cursor-pointer"
                                 >
                                    <option>Invited</option>
                                    <option>Offer Received</option>
                                    <option>Shortlisted</option>
                                    <option>Selected</option>
                                    <option>Rejected</option>
                                 </select>
                              </div>
                           </div>

                           <div className="space-y-4">
                              <div className="bg-white p-3 rounded-xl border border-slate-100">
                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Financial Offer</p>
                                 <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-900 italic">{pr.currency}</span>
                                    <input 
                                       type="number" 
                                       value={b.financialOffer} 
                                       onChange={e => updateBidder(b.id, 'financialOffer', Number(e.target.value))}
                                       onBlur={() => saveUpdates({bidders})}
                                       className="w-full bg-transparent text-sm font-black outline-none"
                                    />
                                 </div>
                              </div>
                              <div className="bg-white p-3 rounded-xl border border-slate-100">
                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tech Readiness</p>
                                 <input 
                                    value={b.technicalCompliance} 
                                    onChange={e => updateBidder(b.id, 'technicalCompliance', e.target.value)}
                                    onBlur={() => saveUpdates({bidders})}
                                    className="w-full bg-transparent text-xs font-bold outline-none"
                                    placeholder="Enter compliance note..."
                                 />
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'Tasks' && (
            <motion.div 
              key="tasks-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-10"
            >
              <div className="bg-white rounded-lg p-10 border border-slate-200 shadow-sm relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50/50 rounded-full -mr-48 -mt-48 blur-3xl pointer-events-none" />
                <div className="flex flex-col lg:flex-row gap-6 items-end relative z-10">
                  <div className="flex-1 w-full space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-5 flex items-center gap-2">
                       <ListChecks className="w-3.5 h-3.5" />
                       Task Protocol
                    </label>
                    <div className="relative">
                      <ListTodo className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 pointer-events-none" />
                      <input 
                        value={newTask.title} 
                        onChange={e => setNewTask({...newTask, title: e.target.value})} 
                        placeholder="Define next procurement milestone..." 
                        className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] pl-16 pr-6 py-5 text-sm font-black focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                      />
                    </div>
                  </div>
                  <div className="w-full lg:w-64 space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-5">Assignee</label>
                    <SearchableSelect 
                       options={users}
                       value={newTask.assigneeId || ''}
                       onChange={(id) => setNewTask({...newTask, assigneeId: id})}
                       onAddClick={async () => {
                         const name = window.prompt('Enter New User Name:');
                         if (name) {
                           try {
                             const docRef = await addDoc(collection(db, 'users'), {
                               name,
                               status: 'Active',
                               email: name.toLowerCase().replace(/\s+/g, '.') + '@example.com',
                               createdAt: serverTimestamp()
                             });
                             const newUsers = [...users, { id: docRef.id, name }];
                             setUsers(newUsers);
                             setNewTask({ ...newTask, assigneeId: docRef.id });
                             toast.success('User added and selected');
                           } catch (err) {
                             console.error(err);
                             toast.error('Failed to add user');
                           }
                         }
                       }}
                       placeholder="Responsible..."
                       className="rounded-[2rem]"
                    />
                  </div>
                  <div className="w-full lg:w-56 space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-5">Deadline</label>
                    <input 
                      type="date" 
                      value={newTask.dueDate} 
                      onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] px-6 py-5 text-sm font-black focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                    />
                  </div>
                  <button 
                    onClick={addTask} 
                    className="w-16 h-16 flex items-center justify-center bg-[#ff6d00] text-white rounded-[2rem] hover:bg-[#ff8533] active:scale-95 transition-all shadow-2xl shadow-[#ff6d00]/30 group"
                  >
                    <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" strokeWidth={3} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {tasks.map(t => (
                  <TaskCard 
                    key={t.id} 
                    task={t as Task} 
                    assignee={users.find(u => u.id === t.assigneeId)}
                    onClick={() => setEditingTask(t)}
                  />
                ))}
              </div>

              {editingTask && (
                <TaskDetailPanel
                  task={editingTask as Task}
                  onUpdate={updateTaskField}
                  onClose={() => setEditingTask(null)}
                  customStatuses={customStatuses}
                  translateStatus={(s) => s}
                  users={users.map(u => ({ uid: u.id, name: u.name, photoURL: '' } as any))}
                  suppliers={suppliers}
                />
              )}
            </motion.div>
          )}

          {activeTab === 'Documents' && (
            <motion.div 
              key="documents-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ProcurementDocumentHub pr={pr} bidders={bidders} suppliers={suppliers} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <AnimatePresence>
        {isPOModalOpen && (
          <POConversionModal 
            pr={pr} 
            selectedBidder={bidders.find(b => b.status === 'Selected') || null}
            suppliers={suppliers}
            onClose={() => setIsPOModalOpen(false)}
            onPOConverted={(poId) => {
               setIsPOModalOpen(false);
               onConvertToPO();
            }}
          />
        )}
      </AnimatePresence>
      </div>

      <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-50">
        <button 
          onClick={() => saveUpdates({}).then(() => toast.success('Updates synchronized'))}
          className="w-12 h-12 bg-[#ff6d00] text-white rounded-full flex items-center justify-center shadow-[0_4px_15px_rgba(255,109,0,0.4)] hover:scale-110 transition-transform"
          title="Save Changes"
        >
          <Save className="w-5 h-5" />
        </button>
        <button 
          onClick={onBack}
          className="w-12 h-12 bg-white text-slate-600 border border-slate-200 rounded-full flex items-center justify-center shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:scale-110 transition-transform"
          title="Return to Registry"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
