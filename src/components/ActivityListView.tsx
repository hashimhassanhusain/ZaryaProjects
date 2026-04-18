import React, { useState, useEffect } from 'react';
import { masterFormatData } from '../data/masterFormat';
import { Page, Activity, BOQItem, WBSLevel, PurchaseOrder, WorkPackage, User, Stakeholder } from '../types';
import { masterFormatDivisions } from '../data';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, setDoc, doc, query, where, deleteDoc, addDoc } from 'firebase/firestore';
import { 
  List, Plus, Save, Trash2, RefreshCw, CheckCircle2, 
  Clock, AlertCircle, Database, ChevronRight, ChevronDown,
  FileText, ShoppingCart, Loader2, Sparkles, ArrowRight,
  Edit2, Calendar, Link2, X, Filter, Layers, Box
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { useProject } from '../context/ProjectContext';
import { useCurrency } from '../context/CurrencyContext';
import { cn } from '../lib/utils';
import { ActivityAttributesModal } from './ActivityAttributesModal';
import { useLanguage } from '../context/LanguageContext';
import { AddWBSLevelModal } from './AddWBSLevelModal';

interface ActivityListViewProps {
  page: Page;
}

export const ActivityListView: React.FC<ActivityListViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const { formatAmount, currency: baseCurrency } = useCurrency();
  const { t, language, isRtl } = useLanguage();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);

  // Cascading Filter State
  const [selectedWbsId, setSelectedWbsId] = useState<string>('');
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('');
  const [selectedWorkPackageId, setSelectedWorkPackageId] = useState<string>('');
  const [isAddingWP, setIsAddingWP] = useState(false);

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
      query(collection(db, 'wbs'), where('projectId', '==', selectedProject.id), where('type', '==', 'Work Package')),
      (snapshot) => {
        setWorkPackages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)));
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
      toast.success(t('activities_generated_success'));
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
    const poId = `PO-${crypto.randomUUID().split('-')[0].toUpperCase()}`;
    
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
      
      toast.success(`${t('po_created_success')} ${poId}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'purchaseOrders');
    }
  };

  const handleDeleteActivity = async (id: string) => {
    toast((toastObj) => (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-bold text-slate-900">{t('confirm_delete_activity')}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(toastObj.id)}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
          >
            {t('cancel')}
          </button>
          <button
            onClick={async () => {
              toast.dismiss(toastObj.id);
              try {
                await deleteDoc(doc(db, 'activities', id));
                toast.success(t('activity_deleted_success'));
              } catch (err) {
                handleFirestoreError(err, OperationType.DELETE, 'activities');
              }
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
          >
            {t('delete')}
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  const handleSaveAttributes = async (updatedActivity: Activity) => {
    try {
      await setDoc(doc(db, 'activities', updatedActivity.id), updatedActivity);
      setEditingActivity(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'activities');
    }
  };

  const toggleSelectAll = (wpActivities: Activity[]) => {
    const wpIds = wpActivities.map(a => a.id);
    const allSelected = wpIds.every(id => selectedActivityIds.includes(id));
    
    if (allSelected) {
      setSelectedActivityIds(prev => prev.filter(id => !wpIds.includes(id)));
    } else {
      setSelectedActivityIds(prev => [...new Set([...prev, ...wpIds])]);
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedActivityIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedActivityIds.length === 0) return;

    toast((tObj) => (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-bold text-slate-900">
          {t('confirm_delete_selected_activities', { count: selectedActivityIds.length })}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(tObj.id)}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
          >
            {t('cancel')}
          </button>
          <button
            onClick={async () => {
              toast.dismiss(tObj.id);
              try {
                const promises = selectedActivityIds.map(id => deleteDoc(doc(db, 'activities', id)));
                await Promise.all(promises);
                setSelectedActivityIds([]);
                toast.success(t('activities_deleted_success'));
              } catch (err) {
                handleFirestoreError(err, OperationType.DELETE, 'activities');
              }
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
          >
            {t('delete_all')}
          </button>
        </div>
      </div>
    ), { duration: 5000 });
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
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <List className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">{t('project_activities')}</h3>
        </div>
        <div className="flex items-center gap-3">
          {selectedActivityIds.length > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-all shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              {t('delete_selected')} ({selectedActivityIds.length})
            </button>
          )}
          <button 
            onClick={generateFromBOQ}
            disabled={isGenerating || boqItems.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {t('generate_from_boq')}
          </button>
          <button 
            onClick={() => setShowAddActivity(true)}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            {t('add_activity')}
          </button>
        </div>
      </div>

      {/* Add Work Package Modal */}
      <AddWBSLevelModal 
        isOpen={isAddingWP}
        onClose={() => setIsAddingWP(false)}
        selectedProject={selectedProject}
        wbsLevels={wbsLevels}
        initialType="Work Package"
        initialDivisionId={selectedDivisionId || '01'}
        initialParentId={selectedWbsId}
        onSuccess={(id) => {
            setSelectedWorkPackageId(id);
        }}
      />

      <div className="space-y-6">
        {Object.keys(groupedActivities).length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-20 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <List className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{t('no_activities_found')}</h3>
              <p className="text-slate-500 mb-8">{t('no_activities_hint')}</p>
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
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">{t('work_package')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {selectedActivityIds.filter(id => groupedActivities[wp].some(a => a.id === id)).length > 0 && (
                    <button 
                      onClick={() => convertToPO(selectedActivityIds.filter(id => groupedActivities[wp].some(a => a.id === id)))}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all"
                    >
                      <ShoppingCart className="w-3 h-3" />
                      {t('convert_selected_to_po')} ({selectedActivityIds.filter(id => groupedActivities[wp].some(a => a.id === id)).length})
                    </button>
                  )}
                  <button 
                    onClick={() => convertToPO(groupedActivities[wp].filter(a => a.status === 'Planned').map(a => a.id))}
                    disabled={groupedActivities[wp].every(a => a.status !== 'Planned')}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
                  >
                    <ShoppingCart className="w-3 h-3" />
                    {t('convert_all_planned_to_po')}
                  </button>
                </div>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="px-6 py-3 w-10">
                      <input 
                        type="checkbox" 
                        checked={groupedActivities[wp].every(a => selectedActivityIds.includes(a.id))}
                        onChange={() => toggleSelectAll(groupedActivities[wp])}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3">{t('description')}</th>
                    <th className="px-6 py-3">{t('assignee')}</th>
                    <th className="px-6 py-3">{t('planned_dates')}</th>
                    <th className="px-6 py-3 text-right">{t('planned_cost')}</th>
                    <th className="px-6 py-3">{t('status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupedActivities[wp].map(act => {
                    const assignee = users.find(u => u.uid === act.assigneeId) || stakeholders.find(s => s.id === act.assigneeId);
                    const isSelected = selectedActivityIds.includes(act.id);
                    return (
                      <tr 
                        key={act.id} 
                        onClick={() => setEditingActivity(act)}
                        className={cn(
                          "hover:bg-blue-50/50 transition-colors group cursor-pointer",
                          isSelected && "bg-blue-50/50"
                        )}
                      >
                        <td className="px-6 py-4" onClick={(e) => toggleSelect(act.id, e)}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            readOnly
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-slate-900">{act.description}</div>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded uppercase">{act.activityType || t('task')}</span>
                            <span className="text-blue-600 font-medium">
                              {(() => {
                                const div = masterFormatDivisions.find(d => d.id === act.division);
                                return div ? `${div.id} - ${div.title}` : (act.division || '01 - General Requirements');
                              })()}
                            </span>
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
                              <span className="text-xs text-slate-400 italic">{t('unassigned')}</span>
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
        {showAddActivity && (
          <ActivityAttributesModal 
            activity={{
              id: crypto.randomUUID(),
              projectId: selectedProject?.id || '',
              wbsId: '',
              workPackage: '',
              description: '',
              unit: 'EA',
              quantity: 1,
              rate: 0,
              amount: 0,
              status: 'Planned'
            }}
            allActivities={activities}
            boqItems={boqItems}
            wbsLevels={wbsLevels}
            onClose={() => setShowAddActivity(false)}
            onSave={async (updatedActivity) => {
              try {
                await setDoc(doc(db, 'activities', updatedActivity.id), updatedActivity);
                setShowAddActivity(false);
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, 'activities');
              }
            }}
          />
        )}
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

