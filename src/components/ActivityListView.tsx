import React, { useState, useEffect } from 'react';
import { getParent } from '../data';
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

  // Group activities by Work Package
  const groupedActivities = activities.reduce((acc, act) => {
    const wp = act.workPackage || 'Unassigned';
    if (!acc[wp]) acc[wp] = [];
    acc[wp].push(act);
    return acc;
  }, {} as Record<string, Activity[]>);

  return (
    <div className="space-y-6">
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
                    <th className="px-6 py-3">Planned Dates</th>
                    <th className="px-6 py-3">Actual Dates</th>
                    <th className="px-6 py-3 text-right">Planned Cost</th>
                    <th className="px-6 py-3 text-right">Actual Cost</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupedActivities[wp].map(act => (
                    <tr key={act.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-900">{act.description}</div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded uppercase">{act.activityType || 'Task'}</span>
                          <span>{act.division || '01'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[11px] font-mono text-slate-600">
                          {act.startDate || 'TBD'}
                          <div className="text-slate-400">{act.finishDate || 'TBD'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[11px] font-mono text-emerald-600">
                          {act.actualStartDate || 'Not Started'}
                          {act.actualFinishDate && <div className="text-emerald-400">{act.actualFinishDate}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-slate-900 font-mono">
                        {formatAmount(act.amount, baseCurrency)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600 font-mono">
                        {formatAmount(act.actualAmount || 0, baseCurrency)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                          act.status === 'Converted to PO' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                        )}>
                          {act.status}
                        </span>
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
