import React, { useState, useEffect } from 'react';
import { WBSLevel, BOQItem, WorkPackage } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, setDoc, doc, query, where, deleteDoc, addDoc } from 'firebase/firestore';
import { 
  LayoutGrid, List, Plus, Trash2, Info, Loader2, 
  ChevronRight, ChevronDown,
  Search, Filter, Download, FileText, Sparkles, Upload,
  Package, Edit2, X, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../context/ProjectContext';
import { cn, formatCurrency } from '../lib/utils';
import { GoogleGenAI, Type } from "@google/genai";
import { masterFormatDivisions } from '../data';

export const WBSView: React.FC = () => {
  const { selectedProject } = useProject();
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddWbs, setShowAddWbs] = useState(false);
  const [newWbs, setNewWbs] = useState({ title: '', type: 'Zone' as any, parentId: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'packages'>('hierarchy');
  const [editingWbs, setEditingWbs] = useState<WBSLevel | null>(null);
  
  // Work Package states
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [editingPackage, setEditingPackage] = useState<WorkPackage | null>(null);
  const [newPackage, setNewPackage] = useState<Partial<WorkPackage>>({
    title: '',
    description: '',
    divisionId: '01',
    wbsId: '',
    status: 'Active'
  });

  const getPrefix = (type: string) => {
    switch (type) {
      case 'Zone': return 'Z';
      case 'Area': return 'A';
      case 'Building': return 'B';
      case 'Floor': return 'F';
      default: return 'O';
    }
  };

  const generateCode = (type: string, parentId?: string, existingLevels: WBSLevel[] = []) => {
    const prefix = getPrefix(type);
    const parent = existingLevels.find(l => l.id === parentId);
    const siblings = existingLevels.filter(l => l.parentId === parentId && l.type === type);
    const nextNum = siblings.length + 1;
    
    if (parent) {
      return `${parent.code}-${prefix}${nextNum}`;
    }
    return `${prefix}${nextNum}`;
  };

  const handleAiGenerateWbs = async (file: File) => {
    if (!selectedProject) return;
    setIsGenerating(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const base64Data = await base64Promise;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: `Analyze this project document and generate a comprehensive Work Breakdown Structure (WBS) for the project: ${selectedProject.name}. 
              The WBS should be hierarchical (Zone -> Area -> Building -> Floor). 
              Return the WBS as a JSON array of objects with: title, type (Zone, Area, Building, Floor, or Other), and parentTitle (if applicable).` },
              { inlineData: { data: base64Data, mimeType: file.type } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['Zone', 'Area', 'Building', 'Floor', 'Other'] },
                parentTitle: { type: Type.STRING }
              },
              required: ['title', 'type']
            }
          }
        }
      });

      const generatedWbs = JSON.parse(response.text || '[]');
      
      // Map to store created IDs by title to handle hierarchy
      const titleToId: Record<string, string> = {};
      const currentLevels = [...wbsLevels];

      for (const item of generatedWbs) {
        const id = crypto.randomUUID();
        const parentId = item.parentTitle ? titleToId[item.parentTitle] : undefined;
        const code = generateCode(item.type, parentId, currentLevels);
        
        const level: any = {
          id,
          projectId: selectedProject.id,
          title: item.title,
          type: item.type,
          code,
          status: 'Not Started',
          level: parentId ? (currentLevels.find(l => l.id === parentId)?.level || 0) + 1 : 1
        };

        if (parentId) {
          level.parentId = parentId;
        }

        await setDoc(doc(db, 'wbs', id), level);
        titleToId[item.title] = id;
        currentLevels.push(level as WBSLevel);
      }
    } catch (err) {
      console.error("AI WBS Generation failed:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!selectedProject) return;

    const wbsUnsubscribe = onSnapshot(
      query(collection(db, 'wbs'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setWbsLevels(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WBSLevel)));
        setLoading(false);
      }
    );

    const boqUnsubscribe = onSnapshot(
      query(collection(db, 'boq'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setBoqItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BOQItem)));
      }
    );

    const wpUnsubscribe = onSnapshot(
      query(collection(db, 'work_packages'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setWorkPackages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WorkPackage)));
      }
    );

    return () => {
      wbsUnsubscribe();
      boqUnsubscribe();
      wpUnsubscribe();
    };
  }, [selectedProject]);

  const handleAddWorkPackage = async () => {
    if (!selectedProject || !newPackage.title) return;
    try {
      const id = crypto.randomUUID();
      const division = masterFormatDivisions.find(d => d.id === newPackage.divisionId);
      const wbs = wbsLevels.find(l => l.id === newPackage.wbsId);
      
      const wp: WorkPackage = {
        id,
        projectId: selectedProject.id,
        wbsId: newPackage.wbsId || '',
        divisionId: newPackage.divisionId || '01',
        title: newPackage.title,
        description: newPackage.description || '',
        status: 'Active',
        code: `${division?.id || '00'}-${wbs?.code || 'GEN'}-${workPackages.length + 1}`,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'work_packages', id), wp);
      setShowAddPackage(false);
      setNewPackage({ title: '', description: '', divisionId: '01', wbsId: '', status: 'Active' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'work_packages');
    }
  };

  const handleUpdateWorkPackage = async (id: string, updates: Partial<WorkPackage>) => {
    try {
      const wp = workPackages.find(p => p.id === id);
      if (!wp) return;
      await setDoc(doc(db, 'work_packages', id), { ...wp, ...updates, updatedAt: new Date().toISOString() });
      setEditingPackage(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'work_packages');
    }
  };

  const handleDeleteWorkPackage = async (id: string) => {
    if (!confirm('Are you sure you want to delete this work package?')) return;
    try {
      await deleteDoc(doc(db, 'work_packages', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'work_packages');
    }
  };

  const handleAddWbs = async () => {
    if (!selectedProject || !newWbs.title) return;
    try {
      const parent = wbsLevels.find(l => l.id === newWbs.parentId);
      const code = generateCode(newWbs.type, newWbs.parentId || undefined, wbsLevels);
      
      const level: any = {
        id: crypto.randomUUID(),
        projectId: selectedProject.id,
        title: newWbs.title,
        type: newWbs.type,
        code,
        status: 'Not Started',
        level: parent ? parent.level + 1 : 1
      };

      if (newWbs.parentId) {
        level.parentId = newWbs.parentId;
      }

      await setDoc(doc(db, 'wbs', level.id), level);
      setShowAddWbs(false);
      setNewWbs({ title: '', type: 'Zone', parentId: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'wbs');
    }
  };

  const handleDeleteWbs = async (id: string) => {
    if (!confirm('Are you sure you want to delete this WBS level and all its sub-levels?')) return;
    try {
      await deleteDoc(doc(db, 'wbs', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'wbs');
    }
  };

  const renderWbsTree = (parentId?: string, depth = 0) => {
    const levels = wbsLevels.filter(l => l.parentId === parentId);
    return (
      <div className={cn("space-y-3", depth > 0 && "ml-8 border-l-2 border-slate-100 pl-6")}>
        {levels.map(level => {
          const items = boqItems.filter(i => i.wbsId === level.id);
          const totalValue = items.reduce((sum, i) => sum + i.amount, 0);
          
          return (
            <div key={level.id} className="space-y-3">
              <div 
                onClick={() => setEditingWbs(level)}
                className="group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm",
                    level.type === 'Zone' ? "bg-purple-100 text-purple-600" :
                    level.type === 'Area' ? "bg-blue-100 text-blue-600" :
                    level.type === 'Building' ? "bg-emerald-100 text-emerald-600" :
                    "bg-amber-100 text-amber-600"
                  )}>
                    {level.type[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-widest">{level.code}</span>
                      <div className="text-base font-bold text-slate-900">{level.title}</div>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{level.type}</div>
                      <span className="text-slate-200">|</span>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{formatCurrency(totalValue)}</div>
                      <span className="text-slate-200">|</span>
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-wider",
                        level.status === 'Completed' ? "text-emerald-600" :
                        level.status === 'In Progress' ? "text-blue-600" :
                        level.status === 'Delayed' ? "text-red-600" :
                        "text-slate-400"
                      )}>
                        {level.status || 'Not Started'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                    {items.length} Items
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWbs(level.id);
                    }}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {renderWbsTree(level.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  if (!selectedProject) return null;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Work Breakdown Structure</h2>
          </div>
          <p className="text-slate-500">Unified WBS Hierarchy and Dictionary for project scope management.</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('hierarchy')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'hierarchy' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            Hierarchy
          </button>
          <button 
            onClick={() => setActiveTab('packages')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'packages' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Package className="w-4 h-4" />
            Work Packages
          </button>
        </div>
      </header>

      {activeTab === 'hierarchy' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-9 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Project Hierarchy</h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-100 transition-all cursor-pointer border border-blue-100">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGenerating ? 'Generating...' : 'AI Generate WBS'}
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={(e) => e.target.files?.[0] && handleAiGenerateWbs(e.target.files[0])}
                  disabled={isGenerating}
                />
              </label>
              <button 
                onClick={() => setShowAddWbs(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                Add Level
              </button>
            </div>
          </div>
          
          <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl p-8 min-h-[400px]">
            {wbsLevels.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                  <LayoutGrid className="w-8 h-8 text-slate-200" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-1">No Hierarchy Defined</h4>
                <p className="text-sm text-slate-400 max-w-xs">Start by adding major project zones or sectors to build your WBS.</p>
              </div>
            ) : renderWbsTree()}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">WBS Components</h4>
            <div className="space-y-4">
              {[
                { type: 'Zone', desc: 'Major project sectors (e.g. North, South)', color: 'bg-purple-100 text-purple-600' },
                { type: 'Area', desc: 'Specific site locations (e.g. Villa 1, Block A)', color: 'bg-blue-100 text-blue-600' },
                { type: 'Building', desc: 'Individual structures or units', color: 'bg-emerald-100 text-emerald-600' },
                { type: 'Floor', desc: 'Vertical levels or specific elevations', color: 'bg-amber-100 text-amber-600' }
              ].map(t => (
                <div key={t.type} className="flex gap-4 p-4 rounded-2xl border border-slate-50 bg-slate-50/30">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0", t.color)}>
                    {t.type[0]}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{t.type}</div>
                    <div className="text-xs text-slate-500 leading-relaxed">{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-600/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Info className="w-5 h-5" />
              </div>
              <h4 className="font-bold">WBS Best Practices</h4>
            </div>
            <ul className="space-y-3 text-sm text-blue-100">
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-300 mt-1.5 shrink-0" />
                Decompose work until it reaches a manageable "Work Package" level.
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-300 mt-1.5 shrink-0" />
                Ensure every BOQ item is linked to a terminal WBS node.
              </li>
            </ul>
          </div>
        </div>
      </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Work Packages</h3>
              <p className="text-slate-500">Manage detailed work packages linked to WBS levels and MasterFormat divisions.</p>
            </div>
            <button 
              onClick={() => setShowAddPackage(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              Add Work Package
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Division</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">WBS Level</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workPackages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="w-8 h-8 text-slate-200" />
                        <p className="text-slate-400 text-sm">No work packages defined yet.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  workPackages.map(wp => (
                    <tr key={wp.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{wp.code}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-900">{wp.title}</div>
                        <div className="text-xs text-slate-500 line-clamp-1">{wp.description}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-medium text-slate-600">
                          {masterFormatDivisions.find(d => d.id === wp.divisionId)?.title || wp.divisionId}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-medium text-slate-600">
                          {wbsLevels.find(l => l.id === wp.wbsId)?.title || 'General'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                          wp.status === 'Active' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                        )}>
                          {wp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => setEditingPackage(wp)}
                            className="p-2 text-slate-400 hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteWorkPackage(wp.id)}
                            className="p-2 text-slate-400 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit WBS Modal (Dictionary Info) */}
      <AnimatePresence>
        {editingWbs && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">WBS Dictionary Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Title</label>
                  <input 
                    type="text" 
                    value={editingWbs.title}
                    onChange={e => setEditingWbs({...editingWbs, title: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Type</label>
                    <select 
                      value={editingWbs.type}
                      onChange={e => setEditingWbs({...editingWbs, type: e.target.value as any})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="Zone">Zone</option>
                      <option value="Area">Area</option>
                      <option value="Building">Building</option>
                      <option value="Floor">Floor</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Status</label>
                    <select 
                      value={editingWbs.status || 'Not Started'}
                      onChange={e => setEditingWbs({...editingWbs, status: e.target.value as any})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Delayed">Delayed</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Parent Level</label>
                  <select 
                    value={editingWbs.parentId || ''}
                    onChange={e => setEditingWbs({...editingWbs, parentId: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">None (Root Level)</option>
                    {wbsLevels.filter(l => l.id !== editingWbs.id).map(l => (
                      <option key={l.id} value={l.id}>{l.title} ({l.type})</option>
                    ))}
                    <option value="new">+ Add New Level...</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setEditingWbs(null)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        await setDoc(doc(db, 'wbs', editingWbs.id), editingWbs);
                        setEditingWbs(null);
                      } catch (err) {
                        handleFirestoreError(err, OperationType.WRITE, 'wbs');
                      }
                    }}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Work Package Modal */}
      <AnimatePresence>
        {(showAddPackage || editingPackage) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">
                {editingPackage ? 'Edit Work Package' : 'Add Work Package'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Title</label>
                  <input 
                    type="text" 
                    value={editingPackage ? editingPackage.title : newPackage.title}
                    onChange={e => editingPackage ? setEditingPackage({...editingPackage, title: e.target.value}) : setNewPackage({...newPackage, title: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Concrete Substructure"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</label>
                  <textarea 
                    value={editingPackage ? editingPackage.description : newPackage.description}
                    onChange={e => editingPackage ? setEditingPackage({...editingPackage, description: e.target.value}) : setNewPackage({...newPackage, description: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24"
                    placeholder="Describe the scope of this work package..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Division</label>
                    <select 
                      value={editingPackage ? editingPackage.divisionId : newPackage.divisionId}
                      onChange={e => {
                        if (e.target.value === 'new') {
                          window.location.href = '/page/2.2.1';
                          return;
                        }
                        editingPackage ? setEditingPackage({...editingPackage, divisionId: e.target.value}) : setNewPackage({...newPackage, divisionId: e.target.value})
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {masterFormatDivisions.map(div => (
                        <option key={div.id} value={div.id}>{div.id} - {div.title}</option>
                      ))}
                      <option value="new" className="text-blue-600 font-bold">+ Add New Division...</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">WBS Level</label>
                    <select 
                      value={editingPackage ? editingPackage.wbsId : newPackage.wbsId}
                      onChange={e => {
                        if (e.target.value === 'new') {
                          setShowAddWbs(true);
                          return;
                        }
                        editingPackage ? setEditingPackage({...editingPackage, wbsId: e.target.value}) : setNewPackage({...newPackage, wbsId: e.target.value})
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">General / Project Wide</option>
                      {wbsLevels.map(l => (
                        <option key={l.id} value={l.id}>{l.title} ({l.type})</option>
                      ))}
                      <option value="new" className="text-blue-600 font-bold">+ Add New Level...</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => { setShowAddPackage(false); setEditingPackage(null); }}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={editingPackage ? () => handleUpdateWorkPackage(editingPackage.id, editingPackage) : handleAddWorkPackage}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                  >
                    {editingPackage ? 'Save Changes' : 'Create Package'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add WBS Modal */}
      <AnimatePresence>
        {showAddWbs && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Add WBS Level</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Title</label>
                  <input 
                    type="text" 
                    value={newWbs.title}
                    onChange={e => setNewWbs({...newWbs, title: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. South Zone, Villa 2, Floor 1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Type</label>
                  <select 
                    value={newWbs.type}
                    onChange={e => setNewWbs({...newWbs, type: e.target.value as any})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Zone">Zone</option>
                    <option value="Area">Area</option>
                    <option value="Building">Building</option>
                    <option value="Floor">Floor</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Parent Level</label>
                  <select 
                    value={newWbs.parentId}
                    onChange={e => setNewWbs({...newWbs, parentId: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">None (Root Level)</option>
                    {wbsLevels.map(l => (
                      <option key={l.id} value={l.id}>{l.title} ({l.type})</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowAddWbs(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddWbs}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                  >
                    Create Level
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
