import { ExternalLink, Plus, Download, Trash2, X, Calendar, User, Sparkles, History } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { PurchaseRequest, TenderBidder, PRTask, BOQItem } from '../types';
import { toast } from 'react-hot-toast';
import { updatePurchaseRequest, approvePurchaseRequest } from '../services/procurementService';
import { getSuppliers, getUsers } from '../services/masterDataService';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { TaskDetailPanel } from './TaskDetailPanel';
import { Task, TaskStatus } from '../types';

interface PRManagementDashboardProps {
  pr: PurchaseRequest;
  onBack: () => void;
  onArchive: () => void;
  onConvertToPO: () => void;
  onDelete: () => void;
}

export const PRManagementDashboard: React.FC<PRManagementDashboardProps> = ({ pr, onBack, onArchive, onConvertToPO, onDelete }) => {
  const [activeTab, setActiveTab] = useState<'Tender Log & Notes' | 'BOQ' | 'Tendering' | 'Tasks' | 'Documents'>('Tender Log & Notes');
  const [files, setFiles] = useState<any[]>([]);
  const [bidders, setBidders] = useState<TenderBidder[]>(pr.bidders || []);
  const [tasks, setTasks] = useState<any[]>([]);
  const [editingTask, setEditingTask] = useState<any | null>(null);
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

  const updateTaskStatus = async (taskId: string, status: string) => {
    await updateDoc(doc(db, 'tasks', taskId), { status });
  };

  const updateTaskField = async (field: string, value: any) => {
    if (!editingTask) return;
    await updateDoc(doc(db, 'tasks', editingTask.id), { [field]: value });
    setEditingTask({ ...editingTask, [field]: value });
  };
  const [suppliers, setSuppliers] = useState<{id:string, name:string}[]>([]);
  const [users, setUsers] = useState<{id:string, name:string}[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>(pr.boqItems || []);
  const [newTask, setNewTask] = useState<Partial<any>>({title: '', assigneeName: '', dueDate: '', priority: 'Medium', status: 'TO DO'});
  const [tenderLogEntries, setTenderLogEntries] = useState(pr.tenderLog || []);
  const [newNote, setNewNote] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileMetadata, setFileMetadata] = useState({ name: '', type: 'Drawings' });

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

  useEffect(() => {
    if (pr.driveFolderId) {
      fetch(`/api/pr/list-files/${pr.driveFolderId}`)
        .then(res => res.json())
        .then(data => setFiles(data.files || []))
        .catch(err => console.error(err));
    }
  }, [pr.driveFolderId]);

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

  const addTask = async () => {
    if (!newTask.title || !newTask.assigneeName) return;
    try {
        const assignee = users.find(u => u.name === newTask.assigneeName);
        await addDoc(collection(db, 'tasks'), {
            title: newTask.title,
            assigneeId: assignee?.id || '',
            dueDate: newTask.dueDate,
            priority: newTask.priority,
            status: newTask.status || 'TO DO',
            projectId: pr.projectId,
            category: 'Procurement',
            workspaceId: 'w1', 
            isProcurement: true, 
            parentReference: pr.id,
            createdAt: serverTimestamp()
        });
        setNewTask({title: '', assigneeName: '', dueDate: '', priority: 'Medium', status: 'TO DO'});
    } catch (error) {
        console.error(error);
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', minHeight: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={onBack} style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc' }}>&larr; Back</button>
        <h2>{pr.prName} <span style={{fontSize: '12px', color: '#666'}}>({pr.id?.slice(-6)})</span></h2>
        
        <div style={{ display: 'flex', gap: '10px' }}>
            {pr.status === 'Approved' && (
                <button onClick={onConvertToPO} style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', borderRadius: '4px', border: 'none' }}>Convert to PO</button>
            )}
            
            {pr.status !== 'Approved' && pr.status !== 'Archived' ? (
                 <button onClick={async () => { await approvePurchaseRequest(pr.id!, 'admin', 'current-user'); toast.success('Approved') }} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '4px', border: 'none' }}>Approve</button>
            ) : null}

            {pr.status === 'Archived' ? (
                <button onClick={onDelete} style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', borderRadius: '4px', border: 'none' }}>Permanent Delete</button>
            ) : (
                <button onClick={onArchive} style={{ padding: '8px 16px', backgroundColor: '#f59e0b', color: 'white', borderRadius: '4px', border: 'none' }}>Archive</button>
            )}
        </div>
      </div>

      <div style={{ borderBottom: '1px solid #ddd', marginBottom: '20px', display: 'flex', gap: '10px' }}>
        {(['Tender Log & Notes', 'BOQ', 'Tendering', 'Tasks', 'Documents'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '10px 20px', backgroundColor: activeTab === tab ? '#3b82f6' : 'transparent', color: activeTab === tab ? 'white' : 'black', border: 'none', cursor: 'pointer' }}>{tab}</button>
        ))}
      </div>

      {activeTab === 'Tender Log & Notes' && (
        <div>
          <h3>Tender Log & Notes (Append-Only)</h3>
          <div style={{ marginBottom: '10px' }}>
             <textarea value={newNote} onChange={e => setNewNote(e.target.value)} style={{width: '100%', height: '60px'}} placeholder="Add a note..."/>
             <button onClick={async () => {
                 const timestamp = new Date().toLocaleString();
                 const note = `[${timestamp}] [User] ${newNote}`;
                 const updatedLog = [...tenderLogEntries, note];
                 setTenderLogEntries(updatedLog);
                 setNewNote('');
                 await saveUpdates({ tenderLog: updatedLog });
             }}>Add Note</button>
          </div>
          <ul>{tenderLogEntries.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </div>
      )}

      {activeTab === 'BOQ' && (
        <div>
            <h3>Bill of Quantities</h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '10px' }}>Currency</label>
                <select value={pr.currency || 'IQD'} onChange={e => saveUpdates({ currency: e.target.value as 'IQD' | 'USD' })}>
                  <option value="IQD">IQD</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '10px' }}>Ex. Rate</label>
                <input type="number" defaultValue={pr.exchangeRate || 1} onBlur={e => saveUpdates({ exchangeRate: Number(e.target.value) })} style={{ width: '60px' }} />
              </div>
            </div>
            <table style={{ width: '100%' }}>
                <thead><tr><th>Description</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
                <tbody>
                    {boqItems.map(item => <tr key={item.id}>
                        <td><input value={item.description} onChange={e => updateBOQItem(item.id, 'description', e.target.value)} onBlur={() => saveUpdates({boqItems})} /></td>
                        <td><input value={item.unit} onChange={e => updateBOQItem(item.id, 'unit', e.target.value)} onBlur={() => saveUpdates({boqItems})} /></td>
                        <td><input type="number" value={item.quantity} onChange={e => updateBOQItem(item.id, 'quantity', Number(e.target.value))} onBlur={() => saveUpdates({boqItems})} /></td>
                        <td><input type="number" value={item.rate} onChange={e => updateBOQItem(item.id, 'rate', Number(e.target.value))} onBlur={() => saveUpdates({boqItems})} /></td>
                        <td>{(item.quantity * item.rate * (pr.exchangeRate || 1)).toFixed(2)}</td>
                    </tr>)}
                </tbody>
            </table>
            <button onClick={() => {
                const newItem: BOQItem = { id: Date.now().toString(), description: 'New Item', unit: 'EA', quantity: 1, rate: 0, amount: 0, division: '01', workPackage: '', location: '', completion: 0 };
                setBoqItems([...boqItems, newItem]);
                saveUpdates({ boqItems: [...boqItems, newItem] });
            }}>+ Add Line</button>
        </div>
      )}

      {activeTab === 'Tendering' && (
        <div>
          <h3>Potential Bidders</h3>
          <button onClick={() => {
              const newBidder: TenderBidder = { id: Date.now().toString(), companyName: 'New Bidder', status: 'Invited', financialOffer: 0, technicalCompliance: '', pros: '', cons: '' };
              setBidders([...bidders, newBidder]);
              saveUpdates({ bidders: [...bidders, newBidder] });
          }}>+ Add Bidder</button>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
                <th>Company</th><th>Technical Compliance</th><th>Financial Offer</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bidders.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td>
                    <select value={b.companyName} onChange={e => updateBidder(b.id, 'companyName', e.target.value)} onBlur={() => saveUpdates({bidders})}>
                        <option value="">Select Vendor</option>
                        {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </td>
                  <td><input value={b.technicalCompliance} onChange={e => updateBidder(b.id, 'technicalCompliance', e.target.value)} onBlur={() => saveUpdates({bidders})} /></td>
                  <td><input type="number" value={b.financialOffer} onChange={e => updateBidder(b.id, 'financialOffer', Number(e.target.value))} onBlur={() => saveUpdates({bidders})} /></td>
                  <td><select value={b.status} onChange={e => updateBidder(b.id, 'status', e.target.value)} onBlur={() => saveUpdates({bidders})}><option>Invited</option><option>Offer Received</option><option>Selected</option></select></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Tasks' && (
        <div>
          <h3>PR Task Manager</h3>
          <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
            <input value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} placeholder="Task name..." />
            <select value={newTask.assigneeName} onChange={e => setNewTask({...newTask, assigneeName: e.target.value})}>
                <option value="">Select Assignee</option>
                {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
            <input type="date" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
            <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as any})}>
                <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
            </select>
            <button onClick={addTask} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}>Add Task</button>
          </div>
          <table style={{width: '100%'}}>
            <thead><tr><th>Title</th><th>Assignee</th><th>Due Date</th><th>Priority</th><th>Status</th></tr></thead>
            <tbody>
                {tasks.map(t => (
                        <tr key={t.id} onClick={() => setEditingTask(t)} style={{cursor: 'pointer'}}>
                        <td style={{textDecoration: 'underline'}}>{t.title}</td>
                        <td>{users.find(u => u.id === t.assigneeId)?.name || t.assigneeName || 'Unassigned'}</td>
                        <td>{t.dueDate}</td>
                        <td>{t.priority}</td>
                        <td>
                            <select value={t.status} onClick={(e) => e.stopPropagation()} onChange={async (e) => {
                                await updateTaskStatus(t.id, e.target.value);
                            }}>
                                {customStatuses.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </td>
                    </tr>
                ))}
            </tbody>
          </table>

          {editingTask && (
            <TaskDetailPanel
              task={editingTask}
              onUpdate={updateTaskField}
              onClose={() => setEditingTask(null)}
              customStatuses={customStatuses}
              translateStatus={(s) => s}
              users={users.map(u => ({ uid: u.id, name: u.name, photoURL: '' } as any))}
            />
          )}
        </div>
      )}

      {activeTab === 'Documents' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-800">Document Hub</h3>
            <div className="flex gap-3">
              <a href={pr.driveFolderUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200">
                <ExternalLink className="w-4 h-4" />
                Open Drive Folder
              </a>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 shadow-xl shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" />
                Upload Digital Asset
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Modified</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {files.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-semibold text-slate-700">
                      <a href={f.webViewLink} target="_blank" rel="noreferrer" className="hover:text-blue-600">{f.name}</a>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{f.mimeType}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(f.modifiedTime).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Download className="w-4 h-4"/></button>
                        <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {isUploadModalOpen && (
              <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                  <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-lg w-full space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-bold text-slate-800">Upload Document</h3>
                        <button onClick={() => setIsUploadModalOpen(false)}><X className="w-6 h-6 text-slate-500" /></button>
                      </div>
                      <input type="file" onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                              setSelectedFile(e.target.files[0]);
                          }
                      }} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                      <input value={fileMetadata.name} onChange={e => setFileMetadata({...fileMetadata, name: e.target.value})} placeholder="Document Name" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm" />
                      <select value={fileMetadata.type} onChange={e => setFileMetadata({...fileMetadata, type: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold">
                          <option value="Drawings">Drawings</option>
                          <option value="Specifications">Specifications</option>
                          <option value="Offer">Offers</option>
                          <option value="BOQ">BOQ</option>
                          <option value="SOW">SOW</option>
                          <option value="Other">Other</option>
                      </select>
                      <button onClick={() => {
                          alert(`Uploading ${fileMetadata.name} (Type: ${fileMetadata.type})... (Feature active)`);
                          setIsUploadModalOpen(false);
                      }} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700">Confirm Upload</button>
                  </div>
              </div>
          )}
        </div>
      )}
    </div>
  );
};
