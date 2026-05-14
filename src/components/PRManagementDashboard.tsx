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
  const [logView, setLogView] = useState<'audit' | 'append'>('audit');

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
    <div className="min-h-screen bg-white">
      {/* Precision Compact Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    PR #{pr.id?.slice(-6).toUpperCase()}
                  </span>
                  <h2 className="text-sm font-bold text-slate-900 truncate max-w-md">{pr.prName}</h2>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                   <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase">
                     <User className="w-3 h-3" />
                     {pr.status}
                   </div>
                   <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase">
                     <Calendar className="w-3 h-3" />
                     {new Date().toLocaleDateString()}
                   </div>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-2">
            {pr.status === 'Approved' && (
              <button 
                onClick={() => setIsPOModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-700 shadow-lg shadow-emerald-500/10 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Convert
              </button>
            )}
            
            {pr.status !== 'Approved' && pr.status !== 'Archived' && (
               <button 
                onClick={async () => { await approvePurchaseRequest(pr.id!, 'admin', 'current-user'); toast.success('PR Approved') }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 shadow-lg shadow-blue-500/10 transition-all focus:ring-2 focus:ring-blue-500/50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve
              </button>
            )}

            <div className="flex items-center gap-1 pl-2 border-l border-slate-200 ml-2">
              <button 
                onClick={onArchive}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                title="Archive"
              >
                <Archive className="w-4 h-4" />
              </button>
              <button 
                onClick={onDelete}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Delete"
              >
                <Trash className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Super Compact */}
        <div className="max-w-7xl mx-auto px-6 flex gap-6">
          {TABS.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)} 
              className={cn(
                "flex items-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
                activeTab === tab.id ? "text-[#FF5F00] border-[#FF5F00]" : "text-slate-400 border-transparent hover:text-slate-700"
              )}
            >
              <tab.icon className="w-3 h-3" />
              <span>{tab.id}</span>
            </button>
          ))}
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
                        logView === 'audit' ? "text-[#FF5F00] border-[#FF5F00] bg-white" : "text-slate-400 border-transparent hover:text-slate-600"
                      )}
                    >
                      <History className="w-4 h-4" />
                      Transaction Audit Trail
                    </button>
                    <button 
                      onClick={() => setLogView('append')}
                      className={cn(
                        "px-6 py-4 text-xs font-bold uppercase tracking-widest flex items-center gap-2 border-b-2 transition-all",
                        logView === 'append' ? "text-[#FF5F00] border-[#FF5F00] bg-white" : "text-slate-400 border-transparent hover:text-slate-600"
                      )}
                    >
                      <Plus className="w-4 h-4" />
                      Append Protocol
                    </button>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                    {/* Log View */}
                    <div className="lg:col-span-2 p-0 flex flex-col h-[500px]">
                       <div className="p-6 relative flex-1 overflow-y-auto no-scrollbar">
                         <div className="space-y-4 relative ml-2 border-l-2 border-slate-100 pl-6">
                           {tenderLogEntries.length === 0 ? (
                             <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                               <MessageSquare className="w-10 h-10 opacity-50" strokeWidth={1} />
                               <p className="font-bold uppercase tracking-widest text-[10px]">Lifecycle empty</p>
                             </div>
                           ) : (
                             tenderLogEntries.map((log, i) => (
                               <div key={i} className="relative group">
                                 <div className="absolute -left-8 top-1.5 w-3 h-3 bg-white border-2 border-[#FF5F00] rounded-full shadow-sm z-10" />
                                 <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 group-hover:bg-white group-hover:shadow-md transition-all">
                                   <div className="flex justify-between items-start mb-1">
                                      <p className="text-[9px] font-bold text-[#FF5F00] uppercase tracking-widest flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" />
                                        Entry {i + 1}
                                      </p>
                                   </div>
                                   <p className="text-xs text-[#1A1C1E] leading-relaxed">{log}</p>
                                 </div>
                               </div>
                             )).reverse()
                           )}
                         </div>
                       </div>
                    </div>

                    {/* Quick Append Panel */}
                    <div className="p-6 bg-slate-50 relative flex flex-col">
                       <div className="flex-1 flex flex-col gap-3">
                         <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-[#4A5568] uppercase tracking-widest">Protocol Injection</label>
                         </div>
                         <textarea 
                           value={newNote} 
                           onChange={e => setNewNote(e.target.value)} 
                           className="flex-1 p-4 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:ring-1 focus:ring-[#FF5F00] focus:border-[#FF5F00] transition-all outline-none resize-none shadow-inner"
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
                         className="w-full mt-4 py-4 bg-[#1A1C1E] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-[#FF5F00] transition-all shadow-xl shadow-black/10 active:scale-95"
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
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
            >
              <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between bg-slate-50/50 gap-4">
                <div>
                  <h3 className="text-lg font-bold text-[#1A1C1E] uppercase tracking-tight">Procurement Line-Items</h3>
                  <p className="text-[10px] font-bold text-[#4A5568] uppercase tracking-widest mt-1">Definition of Work Packages for Suppliers</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <select 
                      value={pr.currency || 'IQD'} 
                      onChange={e => saveUpdates({ currency: e.target.value as 'IQD' | 'USD' })}
                      className="text-[11px] font-bold uppercase text-[#1A1C1E] outline-none pr-2 cursor-pointer bg-transparent"
                    >
                      <option value="IQD">IQD</option>
                      <option value="USD">USD</option>
                    </select>
                    <div className="w-px h-3 bg-slate-200 mx-1" />
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rate</span>
                       <input 
                        type="number" 
                        defaultValue={pr.exchangeRate || 1} 
                        onBlur={e => saveUpdates({ exchangeRate: Number(e.target.value) })}
                        className="w-16 bg-slate-50 px-2 py-1 rounded text-[11px] font-bold text-[#1A1C1E] outline-none border border-slate-200 focus:border-[#FF5F00] transition-colors text-center"
                       />
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const newItem: BOQItem = { id: Date.now().toString(), description: 'New Line Item', unit: 'EA', quantity: 1, rate: 0, amount: 0, division: '01', workPackage: '', location: '', completion: 0 };
                      const updated = [...boqItems, newItem];
                      setBoqItems(updated);
                      saveUpdates({ boqItems: updated });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1A1C1E] hover:bg-[#FF5F00] text-white rounded-lg font-bold uppercase tracking-widest text-[10px] transition-colors shadow-sm group"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Item
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
                            className="w-full bg-transparent border-none focus:ring-0 text-xs font-semibold text-[#1A1C1E] focus:text-[#FF5F00]"
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
                        <td className="px-4 py-3 text-right font-bold text-[#1A1C1E] tabular-nums text-xs">
                          {(item.quantity * item.rate * (pr.exchangeRate || 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#F8FAFC] border-t border-slate-200">
                    <tr>
                      <td colSpan={4} className="px-4 py-4">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-slate-200/50 rounded flex items-center justify-center">
                             <Calculator className="w-4 h-4 text-[#4A5568]" />
                           </div>
                           <div>
                             <p className="text-[10px] font-bold uppercase tracking-widest text-[#4A5568]">Total Estimate</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
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
