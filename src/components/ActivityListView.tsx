import React, { useState, useEffect } from 'react';
import { Page, Activity, BOQItem, WBSLevel, PurchaseOrder } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, setDoc, doc, query, where, deleteDoc } from 'firebase/firestore';
import { 
  List, Plus, Save, Trash2, RefreshCw, CheckCircle2, 
  Clock, AlertCircle, Database, ChevronRight, ChevronDown,
  FileText, ShoppingCart, Loader2, Sparkles, ArrowRight,
  Edit2, Calendar, Link2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../context/ProjectContext';
import { cn, formatCurrency } from '../lib/utils';

interface ActivityListViewProps {
  page: Page;
}

export const ActivityListView: React.FC<ActivityListViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

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
        setLoading(false);
      }
    );

    return () => {
      actUnsubscribe();
      boqUnsubscribe();
      wbsUnsubscribe();
    };
  }, [selectedProject]);

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
          workPackage: item.workPackage,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
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

  // Group activities by Work Package
  const groupedActivities = activities.reduce((acc, act) => {
    const wp = act.workPackage || 'Unassigned';
    if (!acc[wp]) acc[wp] = [];
    acc[wp].push(act);
    return acc;
  }, {} as Record<string, Activity[]>);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <div className="text-sm font-medium text-blue-600 mb-2 uppercase tracking-wider">Schedule Domain</div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{page.title}</h2>
          <p className="text-slate-500">Activities derived from BOQ and linked to Purchase Orders.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={generateFromBOQ}
            disabled={isGenerating || boqItems.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Generate from BOQ
          </button>
        </div>
      </header>

      <div className="space-y-6">
        {Object.keys(groupedActivities).length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-20 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <List className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Activities Yet</h3>
              <p className="text-slate-500 mb-8">Click "Generate from BOQ" to build your activity list based on the project's Bill of Quantities.</p>
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
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">WBS / BOQ</th>
                    <th className="px-6 py-3">Start Date</th>
                    <th className="px-6 py-3">Duration</th>
                    <th className="px-6 py-3">Finish Date</th>
                    <th className="px-6 py-3 text-right">Qty</th>
                    <th className="px-6 py-3">Unit</th>
                    <th className="px-6 py-3 text-right">Total</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupedActivities[wp].map(act => (
                    <tr key={act.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-900">{act.description}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                          act.activityType === 'Milestone' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
                        )}>
                          {act.activityType || 'Task'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[10px] text-slate-500 font-mono">
                          {act.wbsId && <div className="flex items-center gap-1"><Database className="w-3 h-3" /> {act.wbsId}</div>}
                          {act.boqItemId && <div className="flex items-center gap-1 mt-1"><Link2 className="w-3 h-3" /> {act.boqItemId}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{act.startDate || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{act.duration ? `${act.duration} days` : '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{act.finishDate || '-'}</td>
                      <td className="px-6 py-4 text-right text-sm text-slate-600 font-mono">{act.quantity}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{act.unit}</td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-slate-900 font-mono">{formatCurrency(act.amount)}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                          act.status === 'Converted to PO' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                        )}>
                          {act.status}
                        </span>
                        {act.poId && (
                          <div className="text-[10px] text-slate-400 mt-1 font-mono">{act.poId}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
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
                  ))}
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

interface ActivityAttributesModalProps {
  activity: Activity;
  onClose: () => void;
  onSave: (activity: Activity) => void;
  boqItems: BOQItem[];
  wbsLevels: WBSLevel[];
  allActivities: Activity[];
}

export const ActivityAttributesModal: React.FC<ActivityAttributesModalProps> = ({ 
  activity, onClose, onSave, boqItems, wbsLevels, allActivities 
}) => {
  const [formData, setFormData] = useState<Activity>({ ...activity });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let updatedData = { ...formData, [name]: name === 'duration' ? (value ? parseInt(value) : undefined) : value };

    // Automatic Date/Duration Calculation
    if (name === 'startDate' || name === 'duration' || name === 'finishDate') {
      const start = updatedData.startDate ? new Date(updatedData.startDate) : null;
      const finish = updatedData.finishDate ? new Date(updatedData.finishDate) : null;
      const dur = updatedData.duration;

      if (name === 'startDate' || name === 'duration') {
        if (start && dur) {
          const newFinish = new Date(start);
          newFinish.setDate(newFinish.getDate() + dur);
          updatedData.finishDate = newFinish.toISOString().split('T')[0];
        }
      } else if (name === 'finishDate') {
        if (start && finish) {
          const diffTime = Math.abs(finish.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          updatedData.duration = diffDays;
        }
      }
    }

    // BOQ Item as Parent Logic
    if (name === 'boqItemId' && value) {
      const selectedBOQ = boqItems.find(item => item.id === value);
      if (selectedBOQ) {
        // In this context, selecting a BOQ item makes it the "parent" or primary reference
        // We can also auto-fill some fields if they are empty
        if (!updatedData.description) updatedData.description = selectedBOQ.description;
        if (!updatedData.wbsId) updatedData.wbsId = selectedBOQ.wbsId || '';
      }
    }

    setFormData(updatedData);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Activity Attributes</h3>
            <p className="text-xs text-slate-500 mt-1">Configure detailed properties for this activity.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[80px]"
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <input 
                type="checkbox"
                id="isMilestone"
                checked={formData.activityType === 'Milestone'}
                onChange={(e) => {
                  const isMilestone = e.target.checked;
                  setFormData(prev => ({
                    ...prev,
                    activityType: isMilestone ? 'Milestone' : 'Task',
                    duration: isMilestone ? 0 : prev.duration
                  }));
                }}
                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isMilestone" className="text-sm font-bold text-slate-700 cursor-pointer">
                Milestone (Duration will be set to 0)
              </label>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">WBS Level</label>
              <select 
                name="wbsId"
                value={formData.wbsId}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="">Select WBS Level</option>
                {wbsLevels.map(wbs => (
                  <option key={wbs.id} value={wbs.id}>{wbs.code} - {wbs.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Linked BOQ Item</label>
              <select 
                name="boqItemId"
                value={formData.boqItemId || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="">Select BOQ Item</option>
                {boqItems.map(item => (
                  <option key={item.id} value={item.id}>{item.description} ({item.workPackage})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="date"
                  name="startDate"
                  value={formData.startDate || ''}
                  onChange={handleInputChange}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Duration (Days)</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="number"
                  name="duration"
                  value={formData.duration || ''}
                  onChange={handleInputChange}
                  placeholder="e.g. 5"
                  disabled={formData.activityType === 'Milestone'}
                  className={cn(
                    "w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all",
                    formData.activityType === 'Milestone' && "opacity-50 cursor-not-allowed bg-slate-100"
                  )}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Finish Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="date"
                  name="finishDate"
                  value={formData.finishDate || ''}
                  onChange={handleInputChange}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Predecessor (Parent)</label>
              <select 
                name="predecessorId"
                value={formData.predecessorId || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="">None</option>
                {allActivities.filter(a => a.id !== activity.id).map(a => (
                  <option key={a.id} value={a.id}>{a.description}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Successor (Child)</label>
              <select 
                name="successorId"
                value={formData.successorId || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="">None</option>
                {allActivities.filter(a => a.id !== activity.id).map(a => (
                  <option key={a.id} value={a.id}>{a.description}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
          <button 
            onClick={onClose}
            className="px-6 py-3 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-2xl transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(formData)}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
          >
            <Save className="w-4 h-4" />
            Save Attributes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
