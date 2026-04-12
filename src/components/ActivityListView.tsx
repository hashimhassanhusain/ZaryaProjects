import React, { useState, useEffect } from 'react';
import { masterFormatData } from '../data/masterFormat';
import { Page, Activity, BOQItem, WBSLevel, PurchaseOrder, WorkPackage, User, Stakeholder } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, setDoc, doc, query, where, deleteDoc, addDoc } from 'firebase/firestore';
import { 
  List, Plus, Save, Trash2, RefreshCw, CheckCircle2, 
  Clock, AlertCircle, Database, ChevronRight, ChevronDown,
  FileText, ShoppingCart, Loader2, Sparkles, ArrowRight,
  Edit2, Calendar, Link2, X, Filter, Layers, Box
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { cn } from '../lib/utils';
import { ActivityAttributesModal } from './ActivityAttributesModal';

interface ActivityListViewProps {
  page: Page;
}

export const ActivityListView: React.FC<ActivityListViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { formatAmount, currency: baseCurrency } = useCurrency();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // Cascading Filter State
  const [selectedWbsId, setSelectedWbsId] = useState<string>('');
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('');
  const [selectedWorkPackageId, setSelectedWorkPackageId] = useState<string>('');
  const [isAddingWP, setIsAddingWP] = useState(false);
  const [newWPCode, setNewWPCode] = useState('');
  const [newWPTitle, setNewWPTitle] = useState('');

  useEffect(() => {
    if (!selectedProject) return;

    const actUnsubscribe = onSnapshot(
      query(collection(db, 'activities'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setActivities(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
      }
    );

    const boqUnsubscribe = onSnapshot(
      query(collection(db, 'boq'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setBoqItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BOQItem)));
      }
    );

    const wbsUnsubscribe = onSnapshot(
      query(collection(db, 'wbs'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setWbsLevels(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WBSLevel)));
      }
    );

    const wpUnsubscribe = onSnapshot(
      query(collection(db, 'work_packages'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setWorkPackages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WorkPackage)));
        setLoading(false);
      }
    );

    const uUnsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        setUsers(snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as User)));
      }
    );

    const sUnsubscribe = onSnapshot(
      query(collection(db, 'stakeholders'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setStakeholders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Stakeholder)));
      }
    );

    return () => {
      actUnsubscribe();
      boqUnsubscribe();
      wbsUnsubscribe();
      wpUnsubscribe();
      uUnsubscribe();
      sUnsubscribe();
    };
  }, [selectedProject]);

  const handleAddWorkPackage = async () => {
    if (!selectedProject || !selectedWbsId || !selectedDivisionId || !newWPTitle.trim() || !newWPCode.trim()) return;
    
    try {
      const wp: Partial<WorkPackage> = {
        projectId: selectedProject.id,
        wbsId: selectedWbsId,
        divisionId: selectedDivisionId,
        code: newWPCode.trim(),
        title: newWPTitle.trim(),
        status: 'Active',
        updatedAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'work_packages'), wp);
      setSelectedWorkPackageId(docRef.id);
      setNewWPTitle('');
      setNewWPCode('');
      setIsAddingWP(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'work_packages');
    }
  };

  const generateFromBOQ = async () => {
    if (!selectedProject || boqItems.length === 0) return;
    setIsGenerating(true);

    try {
      for (const item of boqItems) {
        // Check if activity already exists for this BOQ item
        const existing = activities.find(a => a.description === item.description && a.workPackage === item.workPackage);
        if (existing) continue;

        const activity: Activity = {
          id: crypto.randomUUID(),
          projectId: selectedProject.id,
          wbsId: item.wbsId || '',
          boqItemId: item.id,
          workPackage: item.workPackage,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
          division: item.division || '01',
          status: 'Planned'
        };
        await setDoc(doc(db, 'activities', activity.id), activity);
      }
      alert('Activities generated from BOQ successfully.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'activities');
    } finally {
      setIsGenerating(false);
    }
  };

  const convertToPO = async (activityIds: string[]) => {
    if (!selectedProject || activityIds.length === 0) return;
    
    const selectedActivities = activities.filter(a => activityIds.includes(a.id));
    if (selectedActivities.length === 0) return;

    // Group by work package
    const wp = selectedActivities[0].workPackage;
    const poId = `PO-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const newPO: PurchaseOrder = {
      id: poId,
      projectId: selectedProject.id,
      supplier: 'TBD',
      date: new Date().toISOString().split('T')[0],
      status: 'Draft',
      amount: selectedActivities.reduce((sum, a) => sum + a.amount, 0),
      workPackageId: wp,
      lineItems: selectedActivities.map(a => ({
        id: crypto.randomUUID(),
        description: a.description,
        quantity: a.quantity,
        unit: a.unit,
        rate: a.rate,
        amount: a.amount,
        status: 'Pending'
      }))
    };

    try {
      await setDoc(doc(db, 'purchaseOrders', poId), newPO);
      
      // Update activities status
      for (const a of selectedActivities) {
        await setDoc(doc(db, 'activities', a.id), {
          ...a,
          status: 'Converted to PO',
          poId: poId
        });
      }
      
      alert(`Purchase Order ${poId} created successfully.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'purchaseOrders');
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;
    try {
      await deleteDoc(doc(db, 'activities', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'activities');
    }
  };

  const handleSaveAttributes = async (updatedActivity: Activity) => {
    try {
      await setDoc(doc(db, 'activities', updatedActivity.id), updatedActivity);
      setEditingActivity(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'activities');
    }
  };

  if (loading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;

  // Filtered Data
  const filteredWPs = workPackages.filter(wp => 
    (!selectedWbsId || wp.wbsId === selectedWbsId) && 
    (!selectedDivisionId || wp.divisionId === selectedDivisionId)
  );

  const selectedWP = workPackages.find(wp => wp.id === selectedWorkPackageId);
  
  const filteredActivities = activities.filter(act => {
    if (selectedWorkPackageId) {
      return act.workPackage === selectedWP?.title;
    }
    if (selectedDivisionId) {
      return act.division === selectedDivisionId;
    }
    if (selectedWbsId) {
      return act.wbsId === selectedWbsId;
    }
    return true;
  });

  // Group activities by Work Package for the final display
  const groupedActivities = filteredActivities.reduce((acc, act) => {
    const wp = act.workPackage || 'Unassigned';
    if (!acc[wp]) acc[wp] = [];
    acc[wp].push(act);
    return acc;
  }, {} as Record<string, Activity[]>);

  return (
    <div className="space-y-6">
      {/* Cascading Filters */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Filter className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-900">Hierarchical Activity Filter</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Level 1: WBS */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3 h-3" /> Level 1: WBS
            </label>
            <select 
              value={selectedWbsId}
              onChange={(e) => {
                setSelectedWbsId(e.target.value);
                setSelectedDivisionId('');
                setSelectedWorkPackageId('');
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              <option value="">Select WBS Level...</option>
              {wbsLevels.sort((a, b) => a.level - b.level).map(wbs => (
                <option key={wbs.id} value={wbs.id}>
                  {wbs.code} - {wbs.title} ({wbs.type})
                </option>
              ))}
            </select>
          </div>

          {/* Level 2: MasterFormat Division */}
          <div className={cn("space-y-2 transition-all", !selectedWbsId && "opacity-50 pointer-events-none")}>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Database className="w-3 h-3" /> Level 2: MasterFormat 16 Div
            </label>
            <select 
              value={selectedDivisionId}
              onChange={(e) => {
                setSelectedDivisionId(e.target.value);
                setSelectedWorkPackageId('');
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              <option value="">Select Division...</option>
              {masterFormatData.map(div => (
                <option key={div.number} value={div.number}>{div.number} - {div.title}</option>
              ))}
            </select>
          </div>

          {/* Level 3: Work Package */}
          <div className={cn("space-y-2 transition-all", (!selectedDivisionId || !selectedWbsId) && "opacity-50 pointer-events-none")}>
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Box className="w-3 h-3" /> Level 3: Work Package
              </label>
              <button 
                onClick={() => setIsAddingWP(true)}
                className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <Plus className="w-2.5 h-2.5" /> New WP
              </button>
            </div>
            <select 
              value={selectedWorkPackageId}
              onChange={(e) => setSelectedWorkPackageId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              <option value="">Select Work Package...</option>
              {filteredWPs.map(wp => (
                <option key={wp.id} value={wp.id}>{wp.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Add Work Package Modal */}
      <AnimatePresence>
        {isAddingWP && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-6">Add New Work Package</h3>
              <div className="space-y-4">
                <div className="space-y-4">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">MasterFormat Suggestions (Level 2)</label>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-100">
                    {selectedDivisionId ? (
                      masterFormatData.find(d => d.number === selectedDivisionId)?.items.map(item => (
                        <button
                          key={item.code}
                          onClick={() => {
                            setNewWPCode(item.code);
                            setNewWPTitle(item.title);
                          }}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg text-left transition-all",
                            newWPCode === item.code ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-blue-50"
                          )}
                        >
                          <span className="text-xs font-bold">{item.title}</span>
                          <span className="font-mono text-[10px] opacity-60">{item.code}</span>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-4 text-slate-400 text-xs italic">
                        Please select a division first.
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Code</label>
                    <input 
                      type="text"
                      value={newWPCode}
                      onChange={(e) => setNewWPCode(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="00000"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Title</label>
                    <input 
                      type="text"
                      value={newWPTitle}
                      onChange={(e) => setNewWPTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Foundation Concrete Works"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-8">
                  <button onClick={() => setIsAddingWP(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">Cancel</button>
                  <button 
                    onClick={handleAddWorkPackage}
                    disabled={!newWPTitle.trim() || !newWPCode.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    Create Package
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex justify-end">
        <button 
          onClick={generateFromBOQ}
          disabled={isGenerating || boqItems.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Generate from BOQ
        </button>
      </div>

      <div className="space-y-6">
        {Object.keys(groupedActivities).length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-20 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <List className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Activities Found</h3>
              <p className="text-slate-500 mb-8">Adjust your filters or click "Generate from BOQ" to build your activity list.</p>
            </div>
          </div>
        ) : (
          Object.keys(groupedActivities).map(wp => (
            <div key={wp} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{wp}</h4>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">Work Package</p>
                  </div>
                </div>
                <button 
                  onClick={() => convertToPO(groupedActivities[wp].filter(a => a.status === 'Planned').map(a => a.id))}
                  disabled={groupedActivities[wp].every(a => a.status !== 'Planned')}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  <ShoppingCart className="w-3 h-3" />
                  Convert to PO
                </button>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3">Assignee</th>
                    <th className="px-6 py-3">Planned Dates</th>
                    <th className="px-6 py-3 text-right">Planned Cost</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupedActivities[wp].map(act => {
                    const assignee = users.find(u => u.uid === act.assigneeId) || stakeholders.find(s => s.id === act.assigneeId);
                    return (
                      <tr 
                        key={act.id} 
                        onClick={() => setEditingActivity(act)}
                        className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-slate-900">{act.description}</div>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded uppercase">{act.activityType || 'Task'}</span>
                            <span>{act.division || '01'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {assignee ? (
                              <>
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                                  {assignee.name[0]}
                                </div>
                                <span className="text-xs text-slate-600">{assignee.name}</span>
                              </>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Unassigned</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[11px] font-mono text-slate-600">
                            {act.startDate || 'TBD'}
                            <div className="text-slate-400">{act.finishDate || 'TBD'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-900 font-mono">
                          {formatAmount(act.amount, baseCurrency)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                            act.status === 'Converted to PO' ? "bg-emerald-100 text-emerald-700" : 
                            act.status === 'Completed' ? "bg-slate-100 text-slate-700" :
                            "bg-blue-100 text-blue-700"
                          )}>
                            {act.status}
                          </span>
                        </td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center gap-2">
                            <button 
                              onClick={() => setEditingActivity(act)}
                              className="p-2 text-slate-300 hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteActivity(act.id)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
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
          ))
        )}
      </div>

      <AnimatePresence>
        {editingActivity && (
          <ActivityAttributesModal 
            activity={editingActivity}
            onClose={() => setEditingActivity(null)}
            onSave={handleSaveAttributes}
            boqItems={boqItems}
            wbsLevels={wbsLevels}
            allActivities={activities}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

