import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Download, 
  Save, 
  X,
  Loader2,
  Filter,
  ChevronRight,
  Database,
  DollarSign,
  Briefcase,
  Package,
  Truck,
  History,
  ArrowLeft
} from 'lucide-react';
import { 
  ResourceRequirement, 
  ResourceVersion,
  WBSLevel, 
  Activity,
  BOQItem
} from '../../types';
import { db, auth, OperationType, handleFirestoreError } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  getDocs
} from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ResourceRequirementsTabProps {
  projectId: string;
}

export const ResourceRequirementsTab: React.FC<ResourceRequirementsTabProps> = ({ projectId }) => {
  const [requirements, setRequirements] = useState<ResourceRequirement[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [versions, setVersions] = useState<ResourceVersion[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<ResourceRequirement>>({
    resourceType: 'Labor',
    quantity: 0,
    rate: 0,
    amount: 0,
    status: 'Draft',
    optimisticDuration: 0,
    mostLikelyDuration: 0,
    pessimisticDuration: 0,
    estimatedDuration: 0
  });

  // WBS Picker State
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'resource_requirements'), where('projectId', '==', projectId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ResourceRequirement));
      const deDuped: ResourceRequirement[] = [];
      const seen = new Set<string>();
      data.forEach(d => {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          deDuped.push(d);
        }
      });
      setRequirements(deDuped);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'resource_requirements'));

    const wbsQ = query(collection(db, 'wbs'), where('projectId', '==', projectId));
    const unsubscribeWbs = onSnapshot(wbsQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WBSLevel));
      const deDuped: WBSLevel[] = [];
      const seen = new Set<string>();
      data.forEach(d => {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          deDuped.push(d);
        }
      });
      setWbsLevels(deDuped);
    });

    const actQ = query(collection(db, 'activities'), where('projectId', '==', projectId));
    const unsubscribeAct = onSnapshot(actQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
      const deDuped: Activity[] = [];
      const seen = new Set<string>();
      data.forEach(d => {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          deDuped.push(d);
        }
      });
      setActivities(deDuped);
    });

    const boqQ = query(collection(db, 'boq'), where('projectId', '==', projectId));
    const unsubscribeBoq = onSnapshot(boqQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BOQItem));
      const deDuped: BOQItem[] = [];
      const seen = new Set<string>();
      data.forEach(d => {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          deDuped.push(d);
        }
      });
      setBoqItems(deDuped);
    });

    const versionsQ = query(collection(db, 'resource_versions'), where('projectId', '==', projectId));
    const unsubscribeVersions = onSnapshot(versionsQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ResourceVersion));
      const deDuped: ResourceVersion[] = [];
      const seen = new Set<string>();
      data.forEach(d => {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          deDuped.push(d);
        }
      });
      setVersions(deDuped.sort((a, b) => b.version - a.version));
    });

    return () => {
      unsubscribe();
      unsubscribeWbs();
      unsubscribeAct();
      unsubscribeBoq();
      unsubscribeVersions();
    };
  }, [projectId]);

  const calculateEstimatedDuration = (o: number, m: number, p: number) => {
    return Number(((o + 4 * m + p) / 6).toFixed(2));
  };

  const handleSave = async () => {
    try {
      const estimatedDuration = calculateEstimatedDuration(
        formData.optimisticDuration || 0,
        formData.mostLikelyDuration || 0,
        formData.pessimisticDuration || 0
      );

      const data = {
        ...formData,
        projectId,
        wbsId: selectedFloor || selectedBuilding || selectedArea || selectedZone,
        amount: (formData.quantity || 0) * (formData.rate || 0),
        estimatedDuration,
        updatedAt: new Date().toISOString()
      };

      let docId = editingId;
      if (editingId) {
        await updateDoc(doc(db, 'resource_requirements', editingId), data);
      } else {
        const docRef = await addDoc(collection(db, 'resource_requirements'), data);
        docId = docRef.id;
      }

      // Create Version Snapshot
      const versionData = {
        requirementId: docId,
        projectId,
        data,
        version: Date.now(),
        userId: auth.currentUser?.uid || 'unknown',
        userName: auth.currentUser?.displayName || 'System',
        timestamp: new Date().toISOString()
      };
      await addDoc(collection(db, 'resource_versions'), versionData);

      setView('list');
      setEditingId(null);
      setFormData({ 
        resourceType: 'Labor', 
        quantity: 0, 
        rate: 0, 
        amount: 0, 
        status: 'Draft',
        optimisticDuration: 0,
        mostLikelyDuration: 0,
        pessimisticDuration: 0,
        estimatedDuration: 0
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'resource_requirements');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this requirement?')) return;
    try {
      await deleteDoc(doc(db, 'resource_requirements', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'resource_requirements');
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();
    
    // Header
    doc.setFontSize(20);
    doc.text('RESOURCE REQUIREMENTS', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Project: ${projectId} | Date: ${date}`, 105, 30, { align: 'center' });

    const tableData = requirements.map(req => [
      req.resourceName || '',
      req.resourceType || '',
      req.quantity || 0,
      req.unit || '',
      (req.rate || 0).toLocaleString(),
      (req.amount || 0).toLocaleString(),
      req.status || ''
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Resource', 'Type', 'Qty', 'Unit', 'Rate', 'Amount', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] }
    });

    doc.save(`${projectId}-RES-REQ-V1-${date.replace(/\//g, '-')}.pdf`);
  };

  const filteredRequirements = requirements.filter(req => 
    (req.resourceName || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const zones = wbsLevels.filter(l => l.type === 'Zone');
  const areas = wbsLevels.filter(l => l.type === 'Area' && l.parentId === selectedZone);
  const buildings = wbsLevels.filter(l => l.type === 'Building' && l.parentId === selectedArea);
  const floors = wbsLevels.filter(l => l.type === 'Floor' && l.parentId === selectedBuilding);

  const filteredActivities = activities.filter(a => a.wbsId === selectedFloor);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {view === 'list' ? (
        <>
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportPDF}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
              <button
                onClick={() => setView('form')}
                className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
              >
                <Plus className="w-4 h-4" />
                Add Requirement
              </button>
            </div>
          </div>

          {/* Requirements Table */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-bottom border-slate-200">
                  <th className="px-8 py-5 text-[10px] font-semibold text-brand uppercase tracking-widest text-left">Actions</th>
                  <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Resource</th>
                  <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Type</th>
                  <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">Qty</th>
                  <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">Rate</th>
                  <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                  <th className="px-8 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequirements.map((req) => (
                  <tr key={req.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center justify-start gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingId(req.id);
                            setFormData(req);
                            setView('form');
                          }}
                          className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-blue-600 transition-all shadow-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(req.id)}
                          className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-red-600 transition-all shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          req.resourceType === 'Labor' ? "bg-blue-50 text-blue-600" :
                          req.resourceType === 'Material' ? "bg-amber-50 text-amber-600" :
                          "bg-purple-50 text-purple-600"
                        )}>
                          {req.resourceType === 'Labor' ? <Briefcase className="w-4 h-4" /> :
                          req.resourceType === 'Material' ? <Package className="w-4 h-4" /> :
                          <Truck className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{req.resourceName}</div>
                          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                            {activities.find(a => a.id === req.activityId)?.description || 'No Activity'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                        req.resourceType === 'Labor' ? "bg-blue-50 text-blue-600" :
                        req.resourceType === 'Material' ? "bg-amber-50 text-amber-600" :
                        "bg-purple-50 text-purple-600"
                      )}>
                        {req.resourceType}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right font-mono text-xs font-bold text-slate-600">
                      {req.quantity} {req.unit}
                    </td>
                    <td className="px-8 py-5 text-right font-mono text-xs font-bold text-slate-600">
                      {(req.rate || 0).toLocaleString()}
                    </td>
                    <td className="px-8 py-5 text-right font-mono text-xs font-bold text-slate-900">
                      {(req.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                        req.status === 'Approved' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                      )}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setView('list')} className="p-2 hover:bg-white rounded-xl transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </button>
              <h2 className="text-xl font-semibold text-slate-900">
                {editingId ? 'Edit Requirement' : 'Add New Requirement'}
              </h2>
            </div>
            <button onClick={() => setView('list')} className="p-2 hover:bg-white rounded-xl transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="p-8 space-y-8 max-w-4xl mx-auto">
            {/* WBS Picker */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Zone</label>
                <select
                  value={selectedZone}
                  onChange={(e) => {
                    setSelectedZone(e.target.value);
                    setSelectedArea('');
                    setSelectedBuilding('');
                    setSelectedFloor('');
                  }}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all outline-none"
                >
                  <option value="">Select Zone</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.title}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Area</label>
                <select
                  value={selectedArea}
                  onChange={(e) => {
                    setSelectedArea(e.target.value);
                    setSelectedBuilding('');
                    setSelectedFloor('');
                  }}
                  disabled={!selectedZone}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all disabled:opacity-50 outline-none"
                >
                  <option value="">Select Area</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Building</label>
                <select
                  value={selectedBuilding}
                  onChange={(e) => {
                    setSelectedBuilding(e.target.value);
                    setSelectedFloor('');
                  }}
                  disabled={!selectedArea}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all disabled:opacity-50 outline-none"
                >
                  <option value="">Select Building</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Floor</label>
                <select
                  value={selectedFloor}
                  onChange={(e) => setSelectedFloor(e.target.value)}
                  disabled={!selectedBuilding}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all disabled:opacity-50 outline-none"
                >
                  <option value="">Select Floor</option>
                  {floors.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Activity</label>
              <select
                value={formData.activityId}
                onChange={(e) => setFormData({ ...formData, activityId: e.target.value })}
                disabled={!selectedFloor}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all disabled:opacity-50 outline-none"
              >
                <option value="">Select Activity</option>
                {filteredActivities.map(a => <option key={a.id} value={a.id}>{a.description}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Resource Name</label>
                <input
                  type="text"
                  value={formData.resourceName}
                  onChange={(e) => setFormData({ ...formData, resourceName: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all outline-none"
                  placeholder="Enter resource name..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Type</label>
                <select
                  value={formData.resourceType}
                  onChange={(e) => setFormData({ ...formData, resourceType: e.target.value as any })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all outline-none"
                >
                  <option value="Labor">Labor</option>
                  <option value="Material">Material</option>
                  <option value="Equipment">Equipment</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Unit</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all outline-none"
                  placeholder="e.g. M2, HR, KG"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Rate</label>
                <input
                  type="number"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: Number(e.target.value) })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Optimistic (tO)</label>
                <input
                  type="number"
                  value={formData.optimisticDuration}
                  onChange={(e) => setFormData({ ...formData, optimisticDuration: Number(e.target.value) })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Most Likely (tM)</label>
                <input
                  type="number"
                  value={formData.mostLikelyDuration}
                  onChange={(e) => setFormData({ ...formData, mostLikelyDuration: Number(e.target.value) })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Pessimistic (tP)</label>
                <input
                  type="number"
                  value={formData.pessimisticDuration}
                  onChange={(e) => setFormData({ ...formData, pessimisticDuration: Number(e.target.value) })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-blue-50 rounded-[2rem] flex items-center justify-between text-blue-900 border border-blue-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Beta Estimated Duration (tE)</span>
                  <span className="text-2xl font-black italic">{calculateEstimatedDuration(formData.optimisticDuration || 0, formData.mostLikelyDuration || 0, formData.pessimisticDuration || 0)} Days</span>
                </div>
              </div>

              <div className="p-6 bg-slate-900 rounded-[2rem] flex items-center justify-between text-white shadow-xl shadow-slate-200">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Total Calculated Amount</span>
                  <span className="text-2xl font-black italic text-blue-400">{((formData.quantity || 0) * (formData.rate || 0)).toLocaleString()} IQD</span>
                </div>
                <DollarSign className="w-8 h-8 text-blue-400 opacity-20" />
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest italic"
              >
                <History className="w-4 h-4" />
                {showHistory ? 'Hide Configuration History' : 'View Version History & Restore'}
              </button>

              {showHistory && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {versions.filter(v => v.requirementId === editingId).map((v) => (
                    <div key={v.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-lg transition-all">
                      <div className="space-y-1">
                        <div className="text-[10px] font-black text-slate-900 uppercase tracking-tighter italic">V{v.version}</div>
                        <div className="text-[10px] text-slate-500 font-bold">{v.userName} • {new Date(v.timestamp).toLocaleString()}</div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setFormData(v.data)}
                        className="px-4 py-2 bg-white text-blue-600 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-100 group-hover:border-blue-100 shadow-sm"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                  {versions.filter(v => v.requirementId === editingId).length === 0 && (
                    <div className="text-center py-8 text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em] col-span-2">No archive snapshots found for this entry</div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end gap-6 pt-10">
              <button
                type="button"
                onClick={() => setView('list')}
                className="px-8 py-4 text-slate-400 font-black uppercase tracking-widest text-xs hover:text-slate-600 transition-all italic hover:underline"
              >
                Discard Changes
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-12 py-5 bg-slate-900 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20 italic"
              >
                {editingId ? 'Confirm Record Update' : 'Initialize Requirement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
