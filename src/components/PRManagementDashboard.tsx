import { ExternalLink, Plus, Download, Trash2, X, Calendar, User, Sparkles, History, ArrowLeft, Archive, Trash, CheckCircle2, FileText, ListTodo, MessageSquare, Calculator, Gavel, Building2, Clock } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { PurchaseRequest, TenderBidder, PRTask, BOQItem } from '../types';
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

export const PRManagementDashboard: React.FC<PRManagementDashboardProps> = ({ pr, onBack, onArchive, onConvertToPO, onDelete }) => {
  const [activeTab, setActiveTab] = useState<'Tender Log & Notes' | 'BOQ' | 'Tendering' | 'Tasks' | 'Documents'>('Tender Log & Notes');
  const [bidders, setBidders] = useState<TenderBidder[]>(pr.bidders || []);
  const [tasks, setTasks] = useState<any[]>([]);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [customStatuses, setCustomStatuses] = useState<string[]>(['TO DO', 'PLANNING', 'RFP', 'TENDERING', 'IN PROGRESS', 'AT RISK', 'UPDATE REQUIRED', 'COMPLETED']);

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

  const [suppliers, setSuppliers] = useState<{id:string, name:string}[]>([]);
  const [users, setUsers] = useState<{id:string, name:string}[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>(pr.boqItems || []);
  const [newTask, setNewTask] = useState<Partial<any>>({title: '', assigneeName: '', dueDate: '', priority: 'Medium', status: 'TO DO'});
  const [tenderLogEntries, setTenderLogEntries] = useState(pr.tenderLog || []);
  const [newNote, setNewNote] = useState('');

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

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Precision Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <button 
                onClick={onBack}
                className="w-12 h-12 flex items-center justify-center bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all active:scale-95 group"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-slate-900 italic uppercase tracking-tight">{pr.prName}</h2>
                  <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
                    ID: {pr.id?.slice(-8).toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                    <User className="w-3.5 h-3.5" />
                    PR Manager
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    PR Date: {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {pr.status === 'Approved' && (
                <button 
                  onClick={() => setIsPOModalOpen(true)}
                  className="flex items-center gap-3 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Convert to PO
                </button>
              )}
              
              {pr.status !== 'Approved' && pr.status !== 'Archived' ? (
                 <button 
                  onClick={async () => { await approvePurchaseRequest(pr.id!, 'admin', 'current-user'); toast.success('PR Approved') }}
                  className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve PR
                </button>
              ) : null}

              {pr.status === 'Archived' ? (
                <button 
                  onClick={onDelete}
                  className="flex items-center gap-3 px-5 py-3 bg-white border border-red-100 text-red-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-50 transition-all active:scale-95"
                >
                  <Trash className="w-4 h-4" />
                  Delete
                </button>
              ) : (
                <button 
                  onClick={onArchive}
                  className="flex items-center gap-3 px-5 py-3 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all active:scale-95"
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1 p-1 bg-slate-100/50 rounded-3xl mt-8 w-fit border border-slate-100 items-center">
            {TABS.map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)} 
                className={cn(
                  "flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] transition-all duration-300",
                  activeTab === tab.id ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.id}</span>
              </button>
            ))}
          </div>
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
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-50 pointer-events-none" />
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8 flex items-center gap-3 italic">
                    <History className="w-6 h-6 text-blue-600" />
                    Transaction Audit Trail
                  </h3>
                  
                  <div className="space-y-6 relative ml-3 border-l-2 border-slate-100 pl-8">
                    {tenderLogEntries.length === 0 ? (
                      <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                        <MessageSquare className="w-16 h-16 opacity-50" strokeWidth={1} />
                        <p className="font-black uppercase tracking-[0.2em] text-xs">Lifecycle empty</p>
                      </div>
                    ) : (
                      tenderLogEntries.map((log, i) => (
                        <div key={i} className="relative group">
                          <div className="absolute -left-10 top-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full shadow-sm z-10 group-hover:scale-125 transition-transform" />
                          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 group-hover:bg-white group-hover:shadow-xl transition-all">
                            <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <Clock className="w-3 h-3" />
                              Entry ID: {i + 1}
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed font-semibold italic">{log}</p>
                          </div>
                        </div>
                      )).reverse()
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1 space-y-8">
                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm relative overflow-hidden backdrop-blur-xl">
                   <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6">Append Protocol</h3>
                   <div className="space-y-6">
                     <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Note Payload</label>
                       <textarea 
                         value={newNote} 
                         onChange={e => setNewNote(e.target.value)} 
                         className="w-full h-48 p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
                         placeholder="Describe technical clarification, meeting points, or internal approval comments..."
                       />
                     </div>
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
                       className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all active:scale-95 shadow-[0_20px_40px_-10px_rgba(59,130,246,0.3)]"
                     >
                       Commit Entry
                     </button>
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
              className="bg-white rounded-[3.5rem] border border-slate-200 overflow-hidden shadow-2xl shadow-slate-200/50"
            >
              <div className="p-10 border-b border-slate-100 flex flex-wrap items-center justify-between bg-slate-50/50 gap-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">Procurement Line-Items & Specifications</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Definition of Work Packages for Suppliers</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                    <select 
                      value={pr.currency || 'IQD'} 
                      onChange={e => saveUpdates({ currency: e.target.value as 'IQD' | 'USD' })}
                      className="text-[11px] font-black uppercase text-blue-600 outline-none pr-4 cursor-pointer"
                    >
                      <option value="IQD">IQD Basis</option>
                      <option value="USD">USD Global</option>
                    </select>
                    <div className="w-px h-4 bg-slate-100 mx-2" />
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Ex. Rate</span>
                       <input 
                        type="number" 
                        defaultValue={pr.exchangeRate || 1} 
                        onBlur={e => saveUpdates({ exchangeRate: Number(e.target.value) })}
                        className="w-16 bg-slate-50 px-2 py-1 rounded text-[11px] font-black text-slate-900 outline-none border border-slate-100 focus:border-blue-500 transition-all text-center"
                       />
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const newItem: BOQItem = { id: Date.now().toString(), description: 'New Line Item Entry', unit: 'EA', quantity: 1, rate: 0, amount: 0, division: '01', workPackage: '', location: '', completion: 0 };
                      const updated = [...boqItems, newItem];
                      setBoqItems(updated);
                      saveUpdates({ boqItems: updated });
                    }}
                    className="flex items-center gap-3 px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-500/20 group"
                  >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" strokeWidth={3} />
                    Add Supply Line
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest w-1/2">Description / MasterFormat Spec</th>
                      <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Unit</th>
                      <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                      <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Unit Rate</th>
                      <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Extended Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {boqItems.map(item => (
                      <tr key={item.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                        <td className="px-10 py-6">
                          <input 
                            value={item.description} 
                            onChange={e => updateBOQItem(item.id, 'description', e.target.value)} 
                            onBlur={() => saveUpdates({boqItems})}
                            className="w-full bg-transparent border-none focus:ring-0 text-sm font-black text-slate-800 focus:text-blue-600 transition-colors"
                          />
                        </td>
                        <td className="px-8 py-6">
                          <input 
                            value={item.unit} 
                            onChange={e => updateBOQItem(item.id, 'unit', e.target.value)} 
                            onBlur={() => saveUpdates({boqItems})}
                            className="w-20 bg-slate-100/50 border border-slate-100 rounded-xl px-3 py-2 text-[11px] font-black text-center text-slate-600 uppercase"
                          />
                        </td>
                        <td className="px-8 py-6">
                          <input 
                            type="number" 
                            value={item.quantity} 
                            onChange={e => updateBOQItem(item.id, 'quantity', Number(e.target.value))} 
                            onBlur={() => saveUpdates({boqItems})}
                            className="w-24 bg-transparent border-none focus:ring-0 text-sm font-black text-slate-900"
                          />
                        </td>
                        <td className="px-8 py-6">
                          <input 
                            type="number" 
                            value={item.rate} 
                            onChange={e => updateBOQItem(item.id, 'rate', Number(e.target.value))} 
                            onBlur={() => saveUpdates({boqItems})}
                            className="w-32 bg-transparent border-none focus:ring-0 text-sm font-black text-emerald-600"
                          />
                        </td>
                        <td className="px-10 py-6 text-right font-black text-slate-900 tabular-nums text-base tracking-tight">
                          {(item.quantity * item.rate * (pr.exchangeRate || 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900 text-white relative">
                    <tr>
                      <td colSpan={5} className="p-0 relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-10 py-10">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                             <Calculator className="w-6 h-6 text-blue-400" />
                           </div>
                           <div>
                             <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-400">Total Net Estimate</p>
                             <p className="text-[10px] font-bold text-slate-500 mt-0.5">Calculated based on technical specifications</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-10 py-10 text-right">
                         <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Valuation</p>
                         <p className="text-4xl font-black tracking-tighter">
                          <span className="text-blue-500 mr-2">{pr.currency || 'IQD'}</span>
                          {boqItems.reduce((acc, curr) => acc + (curr.quantity * curr.rate * (pr.exchangeRate || 1)), 0).toLocaleString()}
                        </p>
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
              className="space-y-8"
            >
              <div className="bg-white rounded-[3rem] p-12 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-50 rounded-full -mr-48 -mt-48 opacity-40 blur-3xl pointer-events-none" />
                <div className="flex flex-wrap items-center justify-between mb-12 gap-6 relative z-10">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic flex items-center gap-4">
                       <Gavel className="w-8 h-8 text-blue-600" />
                       Bid Tabulation & Vendor Lifecycle
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 ml-12">Comparative Assessment for Sourcing Excellence</p>
                  </div>
                  <button 
                    onClick={() => {
                      const newBidder: TenderBidder = { id: Date.now().toString(), companyName: '', status: 'Invited', financialOffer: 0, technicalCompliance: '', pros: '', cons: '' };
                      setBidders([...bidders, newBidder]);
                      saveUpdates({ bidders: [...bidders, newBidder] });
                    }}
                    className="flex items-center gap-4 px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-blue-700 active:scale-95 transition-all shadow-2xl shadow-blue-500/20"
                  >
                    <Plus className="w-5 h-5" strokeWidth={3} />
                    Invite Tenderer
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                  {bidders.map(b => (
                    <div key={b.id} className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 transition-all group border-b-4 border-b-transparent hover:border-b-blue-600">
                       <div className="flex items-center justify-between mb-8">
                         <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center border border-slate-100 shadow-sm text-slate-400 group-hover:text-blue-600 group-hover:scale-110 transition-all duration-300">
                           <Building2 className="w-7 h-7" />
                         </div>
                         <div className="relative">
                           <select 
                              value={b.status} 
                              onChange={e => updateBidder(b.id, 'status', e.target.value as any)} 
                              onBlur={() => saveUpdates({bidders})}
                              className={cn(
                                "appearance-none pl-4 pr-10 py-2 rounded-full text-[10px] font-black uppercase tracking-widest outline-none border transition-all cursor-pointer",
                                b.status === 'Selected' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                                b.status === 'Rejected' ? "bg-red-50 text-red-600 border-red-100" :
                                "bg-white text-slate-500 border-slate-200"
                              )}
                           >
                             <option>Invited</option>
                             <option>Offer Received</option>
                             <option>Shortlisted</option>
                             <option>Selected</option>
                             <option>Rejected</option>
                           </select>
                           <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                             <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                           </div>
                         </div>
                       </div>

                       <div className="space-y-6">
                         <div className="space-y-2">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                             <span className="w-4 h-px bg-slate-200" /> Official Identity
                           </p>
                           <SearchableSelect 
                              options={suppliers}
                              value={b.companyName}
                              valueIsName={true}
                              onChange={(val) => {
                                updateBidder(b.id, 'companyName', val);
                                saveUpdates({bidders: bidders.map(bidder => bidder.id === b.id ? { ...bidder, companyName: val } : bidder)});
                              }}
                              placeholder="Select Pre-Qualified Vendor"
                              className="text-lg text-blue-600"
                           />
                         </div>

                         <div className="space-y-4 pt-4 border-t border-slate-100">
                           <div className="flex items-center justify-between">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                               <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                               Source Selection Criteria
                             </p>
                             <div className="px-3 py-1 bg-slate-900 text-white rounded-xl text-[10px] font-black tracking-widest shadow-sm">
                               Score: {((b.scoreCard?.technical || 0) * 0.4 + (b.scoreCard?.financial || 0) * 0.3 + (b.scoreCard?.pastPerformance || 0) * 0.2 + (b.scoreCard?.risk || 0) * 0.1).toFixed(1)}/100
                             </div>
                           </div>
                           
                           <div className="space-y-3">
                              {/* Financial */}
                              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3 hover:border-blue-200 transition-colors">
                                <div className="flex justify-between items-end">
                                  <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Financial Offer (30%)</p>
                                    <div className="flex items-center gap-1 font-black text-slate-900">
                                      <span className="text-xs text-blue-600">{pr.currency || 'IQD'}</span>
                                      <input 
                                       type="number" 
                                       value={b.financialOffer} 
                                       onChange={e => updateBidder(b.id, 'financialOffer', Number(e.target.value))} 
                                       onBlur={() => saveUpdates({bidders})}
                                       className="w-32 bg-transparent text-sm outline-none"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-400">Score:</span>
                                    <input type="number" max="100" min="0" value={b.scoreCard?.financial || 0} onChange={e => {updateBidderScore(b.id, 'financial', Number(e.target.value)); saveUpdates({bidders})}} className="w-12 bg-slate-50 border border-slate-100 rounded text-center text-xs font-bold py-1 outline-none text-blue-600" />
                                  </div>
                                </div>
                                <input type="range" min="0" max="100" value={b.scoreCard?.financial || 0} onChange={e => updateBidderScore(b.id, 'financial', Number(e.target.value))} onBlur={() => saveUpdates({bidders})} className="w-full accent-blue-600" />
                              </div>
                              
                              {/* Technical */}
                              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3 hover:border-emerald-200 transition-colors">
                                <div className="flex justify-between items-end">
                                  <div className="space-y-1 w-full mr-4">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Technical Approach (40%)</p>
                                    <input value={b.technicalCompliance} onChange={e => updateBidder(b.id, 'technicalCompliance', e.target.value)} onBlur={() => saveUpdates({bidders})} className="w-full bg-transparent text-xs font-bold text-slate-600 outline-none" placeholder="Brief technical evaluation note..." />
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] font-bold text-slate-400">Score:</span>
                                    <input type="number" max="100" min="0" value={b.scoreCard?.technical || 0} onChange={e => {updateBidderScore(b.id, 'technical', Number(e.target.value)); saveUpdates({bidders})}} className="w-12 bg-slate-50 border border-slate-100 rounded text-center text-xs font-bold py-1 outline-none text-emerald-600" />
                                  </div>
                                </div>
                                <input type="range" min="0" max="100" value={b.scoreCard?.technical || 0} onChange={e => updateBidderScore(b.id, 'technical', Number(e.target.value))} onBlur={() => saveUpdates({bidders})} className="w-full accent-emerald-500" />
                              </div>

                              {/* Past Performance & Risk */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3 hover:border-indigo-200 transition-colors">
                                  <div className="flex justify-between items-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Past Perf. (20%)</p>
                                    <p className="text-xs font-black text-indigo-500">{b.scoreCard?.pastPerformance || 0}</p>
                                  </div>
                                  <input type="range" min="0" max="100" value={b.scoreCard?.pastPerformance || 0} onChange={e => updateBidderScore(b.id, 'pastPerformance', Number(e.target.value))} onBlur={() => saveUpdates({bidders})} className="w-full accent-indigo-500" />
                                </div>
                                
                                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3 hover:border-orange-200 transition-colors">
                                  <div className="flex justify-between items-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Risk/Sustain (10%)</p>
                                    <p className="text-xs font-black text-orange-500">{b.scoreCard?.risk || 0}</p>
                                  </div>
                                  <input type="range" min="0" max="100" value={b.scoreCard?.risk || 0} onChange={e => updateBidderScore(b.id, 'risk', Number(e.target.value))} onBlur={() => saveUpdates({bidders})} className="w-full accent-orange-500" />
                                </div>
                              </div>
                           </div>
                         </div>

                         <div className="flex gap-4 pt-4 border-t border-slate-100">
                            <div className="flex-1 space-y-1">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2">Pros</p>
                              <input 
                                value={b.pros || ''} 
                                onChange={e => updateBidder(b.id, 'pros', e.target.value)} 
                                onBlur={() => saveUpdates({bidders})}
                                className="w-full bg-transparent text-[11px] font-bold text-emerald-600 outline-none px-2"
                                placeholder="Value adds..."
                              />
                            </div>
                            <div className="w-px bg-slate-100" />
                            <div className="flex-1 space-y-1">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2">Cons</p>
                              <input 
                                value={b.cons || ''} 
                                onChange={e => updateBidder(b.id, 'cons', e.target.value)} 
                                onBlur={() => saveUpdates({bidders})}
                                className="w-full bg-transparent text-[11px] font-bold text-red-500 outline-none px-2"
                                placeholder="Key risks..."
                              />
                            </div>
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
              <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50/50 rounded-full -mr-48 -mt-48 blur-3xl pointer-events-none" />
                <div className="flex flex-col lg:flex-row gap-6 items-end relative z-10">
                  <div className="flex-1 w-full space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-5">Tender Lifecycle Protocol</label>
                    <div className="relative">
                      <ListTodo className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 pointer-events-none" />
                      <input 
                        value={newTask.title} 
                        onChange={e => setNewTask({...newTask, title: e.target.value})} 
                        placeholder="Define next procurement milestone or task..." 
                        className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] pl-16 pr-6 py-5 text-sm font-black focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                      />
                    </div>
                  </div>
                  <div className="w-full lg:w-64 space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-5">Assignee</label>
                    <select 
                      value={newTask.assigneeId || ''} 
                      onChange={e => setNewTask({...newTask, assigneeId: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] px-6 py-5 text-xs font-black uppercase focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                    >
                      <option value="">Responsible...</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
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
                    className="w-16 h-16 flex items-center justify-center bg-blue-600 text-white rounded-[2rem] hover:bg-blue-700 active:scale-95 transition-all shadow-2xl shadow-blue-500/30 group"
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
               onConvertToPO(); // call parent's callback to close PR dashboard and maybe open PO
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
