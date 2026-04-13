import React, { useState, useEffect } from 'react';
import { WBSLevel, BOQItem, WorkPackage } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, setDoc, doc, query, where, deleteDoc, addDoc } from 'firebase/firestore';
import { 
  LayoutGrid, List, Plus, Trash2, Info, Loader2, 
  ChevronRight, ChevronDown,
  Search, Filter, Download, FileText, Sparkles, Upload,
  Package, Edit2, X, Check, Target, Database, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../context/ProjectContext';
import { cn, formatCurrency } from '../lib/utils';
import { GoogleGenAI, Type } from "@google/genai";
import { masterFormatDivisions } from '../data';
import { masterFormatSections } from '../constants/masterFormat';
import { ActivityListView } from './ActivityListView';
import { ActivityAttributesModal } from './ActivityAttributesModal';
import { masterFormatData } from '../data/masterFormat';
import { Page, Activity } from '../types';

export const WBSView: React.FC = () => {
  const { selectedProject } = useProject();
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddWbs, setShowAddWbs] = useState(false);
  const [newWbs, setNewWbs] = useState({ title: '', type: 'Zone' as any, parentId: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'costaccount' | 'packages' | 'milestones' | 'activities'>('hierarchy');
  const [editingWbs, setEditingWbs] = useState<WBSLevel | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  
  const [isManualTitle, setIsManualTitle] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  
  // Work Package states
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [editingPackage, setEditingPackage] = useState<WorkPackage | null>(null);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
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
      case 'Cost Account': return 'CA';
      case 'Work Package': return 'WP';
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
              The WBS should be hierarchical (Zone -> Area -> Building -> Cost Account -> Work Package). 
              Use the 'Cost Account' type for Cost Account Divisions (01-16). 
              Use the 'Work Package' type for specific work packages under Cost Accounts.
              Avoid redundant naming (e.g., don't create a sub-level with the same name as its parent).
              Return the WBS as a JSON array of objects with: title, type (Zone, Area, Building, Cost Account, Work Package, or Other), and parentTitle (if applicable).` },
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
                type: { type: Type.STRING, enum: ['Zone', 'Area', 'Building', 'Cost Account', 'Work Package', 'Other'] },
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
        
        const div = masterFormatDivisions.find(d => `${d.id} - ${d.title}` === item.title || d.title === item.title);
        const divisionCode = div ? div.id : (item.title.match(/\d+/)?.[0] || '01');
        
        const level: any = {
          id,
          projectId: selectedProject.id,
          title: item.title,
          type: item.type,
          code,
          status: 'Not Started',
          level: parentId ? (currentLevels.find(l => l.id === parentId)?.level || 0) + 1 : 1
        };

        if (item.type === 'Cost Account') {
          level.divisionCode = divisionCode;
        }

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

    const actUnsubscribe = onSnapshot(
      query(collection(db, 'activities'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setActivities(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
      }
    );

    return () => {
      wbsUnsubscribe();
      boqUnsubscribe();
      wpUnsubscribe();
      actUnsubscribe();
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
      
      // Extract division code if type is Cost Account
      let divisionCode = '';
      if (newWbs.type === 'Cost Account') {
        const div = masterFormatDivisions.find(d => `${d.id} - ${d.title}` === newWbs.title || d.title === newWbs.title);
        divisionCode = div ? div.id : (newWbs.title.match(/\d+/)?.[0] || '01');
      }

      const level: any = {
        id: crypto.randomUUID(),
        projectId: selectedProject.id,
        title: newWbs.title,
        type: newWbs.type,
        code,
        status: 'Not Started',
        level: parent ? parent.level + 1 : 1
      };

      if (divisionCode) {
        level.divisionCode = divisionCode;
      }

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

  const milestones = activities.filter(a => a.activityType === 'Milestone');

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8">
      {/* Tabs Navigation */}
      <div className="flex justify-between items-center gap-4 mb-6">
        <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full no-scrollbar">
          {[
            { id: 'hierarchy', label: 'WBS Hierarchy', icon: LayoutGrid },
            { id: 'costaccount', label: 'Cost Account', icon: Database },
            { id: 'packages', label: 'Work Packages', icon: Package },
            { id: 'milestones', label: 'Milestones', icon: Target },
            { id: 'activities', label: 'Activities', icon: List },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                activeTab === tab.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'hierarchy' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-12 space-y-6">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search hierarchy..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-all shadow-sm">
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => e.target.files?.[0] && handleAiGenerateWbs(e.target.files[0])}
                  />
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-blue-600" />
                  )}
                  <span className="text-sm font-bold text-slate-700">AI Generate WBS</span>
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
        </div>
      ) : activeTab === 'costaccount' ? (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cost Account</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sections</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {masterFormatDivisions.map(div => {
                  const details = masterFormatData.find(d => d.number === div.id);
                  return (
                    <tr key={div.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{div.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-900">{div.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {details?.items.slice(0, 5).map(item => (
                            <span key={item.code} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {item.code}
                            </span>
                          ))}
                          {(details?.items.length || 0) > 5 && (
                            <span className="text-[10px] text-slate-400">+{details!.items.length - 5} more</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'packages' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Work Packages</h3>
              <p className="text-slate-500">Manage detailed work packages linked to WBS levels and Cost Accounts.</p>
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
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cost Account</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">WBS Level</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wbsLevels.filter(l => l.type === 'Work Package').length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="w-8 h-8 text-slate-200" />
                        <p className="text-slate-400 text-sm">No work packages defined in the WBS Hierarchy yet.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  wbsLevels.filter(l => l.type === 'Work Package').map(wp => {
                    const parent = wbsLevels.find(l => l.id === wp.parentId);
                    const grandParent = parent ? wbsLevels.find(l => l.id === parent.parentId) : null;
                    
                    return (
                      <tr key={wp.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{wp.code}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-slate-900">{wp.title}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-medium text-slate-600">
                            {parent?.type === 'Cost Account' ? parent.title : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-medium text-slate-600">
                            {grandParent ? grandParent.title : (parent?.type !== 'Cost Account' ? parent?.title : 'N/A')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                            wp.status === 'Completed' ? "bg-emerald-100 text-emerald-600" : 
                            wp.status === 'In Progress' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
                          )}>
                            {wp.status || 'Not Started'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button 
                              onClick={() => setEditingWbs(wp)}
                              className="p-2 text-slate-400 hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteWbs(wp.id)}
                              className="p-2 text-slate-400 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'milestones' ? (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Project Milestones</h3>
              <p className="text-slate-500">Key project events and target completion dates.</p>
            </div>
            <button 
              onClick={() => {
                // Open activity attributes modal with milestone type pre-selected
                // We'll need a state for this or use a specific function
                setShowAddMilestone(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              Add Milestone
            </button>
          </div>

          <div className="relative pb-20">
            {milestones.length === 0 ? (
              <div className="p-20 text-center bg-white border border-slate-200 rounded-3xl">
                <Target className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400">No milestones defined in the schedule.</p>
              </div>
            ) : (
              <div className="relative px-4">
                {/* Timeline Line */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2" />
                
                <div className="flex flex-wrap justify-center gap-y-24 gap-x-8 md:gap-x-16 relative">
                  {milestones
                    .sort((a, b) => new Date(a.finishDate || '').getTime() - new Date(b.finishDate || '').getTime())
                    .map((m, idx) => (
                      <div key={m.id} className="relative flex flex-col items-center group">
                        {/* Milestone Circle */}
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: idx * 0.1 }}
                          onClick={() => {
                            setEditingActivity(m);
                          }}
                          className={cn(
                            "w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 flex items-center justify-center z-10 transition-all cursor-pointer group-hover:scale-110",
                            m.status === 'Completed' 
                              ? "bg-emerald-50 border-emerald-500 text-emerald-600 shadow-lg shadow-emerald-500/20" 
                              : "bg-blue-50 border-blue-500 text-blue-600 shadow-lg shadow-blue-500/20"
                          )}
                        >
                          <Target className="w-6 h-6 sm:w-8 sm:h-8" />
                        </motion.div>

                        {/* Label Top */}
                        <div className="absolute -top-12 sm:-top-16 w-32 sm:w-40 text-center">
                          <div className="text-[10px] sm:text-xs font-black text-slate-900 line-clamp-2 px-2">{m.description}</div>
                        </div>

                        {/* Label Bottom */}
                        <div className="absolute -bottom-12 sm:-bottom-16 w-32 sm:w-40 text-center">
                          <div className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                            {m.finishDate || 'TBD'}
                          </div>
                          <div className={cn(
                            "inline-block px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] font-bold uppercase tracking-wider",
                            m.status === 'Completed' ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                          )}>
                            {m.status}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <ActivityListView page={{ id: 'activities', title: 'Activities', type: 'terminal' }} />
        </div>
      )}

      {/* Add/Edit Milestone Modal */}
      <AnimatePresence>
        {(showAddMilestone || editingActivity) && (
          <ActivityAttributesModal 
            activity={editingActivity || {
              id: `milestone-${Date.now()}`,
              projectId: selectedProject?.id || '',
              wbsId: '',
              workPackage: '',
              description: '',
              unit: 'EA',
              quantity: 1,
              rate: 0,
              amount: 0,
              status: 'Planned',
              activityType: 'Milestone'
            }}
            allActivities={activities}
            boqItems={boqItems}
            wbsLevels={wbsLevels}
            onClose={() => {
              setShowAddMilestone(false);
              setEditingActivity(null);
            }}
            onSave={async (updatedActivity) => {
              try {
                if (editingActivity) {
                  await setDoc(doc(db, 'activities', updatedActivity.id), updatedActivity);
                } else {
                  await addDoc(collection(db, 'activities'), updatedActivity);
                }
                setShowAddMilestone(false);
                setEditingActivity(null);
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, 'activities');
              }
            }}
          />
        )}
      </AnimatePresence>

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
                      <option value="Cost Account">Cost Account</option>
                      <option value="Work Package">Work Package</option>
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
                {editingWbs.type === 'Cost Account' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cost Account Title</label>
                    <div className="space-y-2">
                      <select 
                        value={masterFormatDivisions.some(d => `${d.id} - ${d.title}` === editingWbs.title) ? editingWbs.title : 'manual'}
                        onChange={e => {
                          if (e.target.value === 'manual') {
                            setEditingWbs({...editingWbs, title: ''});
                          } else {
                            setEditingWbs({...editingWbs, title: e.target.value});
                          }
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Cost Account...</option>
                        {masterFormatDivisions.map(div => (
                          <option key={div.id} value={`${div.id} - ${div.title}`}>{div.id} - {div.title}</option>
                        ))}
                        <option value="manual" className="text-blue-600 font-bold">+ Other (Manual Entry)</option>
                      </select>
                      {(!masterFormatDivisions.some(d => `${d.id} - ${d.title}` === editingWbs.title) || editingWbs.title === '') && (
                        <input 
                          type="text" 
                          value={editingWbs.title}
                          onChange={e => setEditingWbs({...editingWbs, title: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="Enter custom cost account title..."
                        />
                      )}
                    </div>
                  </div>
                ) : editingWbs.type === 'Work Package' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Work Package Title</label>
                    <div className="space-y-2">
                      <select 
                        value={masterFormatSections.some(s => s.title === editingWbs.title) ? editingWbs.title : (editingWbs.title ? 'manual' : '')}
                        onChange={e => {
                          if (e.target.value === 'manual') {
                            setEditingWbs({...editingWbs, title: ''});
                          } else {
                            setEditingWbs({...editingWbs, title: e.target.value});
                          }
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Work Package...</option>
                        {masterFormatSections
                          .filter(s => {
                            const parent = wbsLevels.find(l => l.id === editingWbs.parentId);
                            if (parent && parent.divisionCode) {
                              return s.divisionId === parent.divisionCode;
                            }
                            return true;
                          })
                          .map(section => (
                            <option key={section.id} value={section.title}>{section.id} - {section.title}</option>
                          ))
                        }
                        <option value="manual" className="text-blue-600 font-bold">+ Other (Manual Entry)</option>
                      </select>
                      {(!masterFormatSections.some(s => s.title === editingWbs.title) && editingWbs.title !== '') && (
                        <input 
                          type="text" 
                          value={editingWbs.title}
                          onChange={e => setEditingWbs({...editingWbs, title: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="Enter custom work package title..."
                        />
                      )}
                    </div>
                  </div>
                ) : null}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Parent Level</label>
                  <select 
                    value={editingWbs.parentId || ''}
                    onChange={e => {
                      if (e.target.value === 'new') {
                        setEditingWbs(null);
                        setShowAddWbs(true);
                        return;
                      }
                      setEditingWbs({...editingWbs, parentId: e.target.value});
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">None (Root Level)</option>
                    {wbsLevels.filter(l => l.id !== editingWbs.id).map(l => (
                      <option key={l.id} value={l.id}>{l.title} ({l.type})</option>
                    ))}
                    <option value="new" className="text-blue-600 font-bold">+ Add New Level...</option>
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
                        let updatedWbs = { ...editingWbs };
                        if (updatedWbs.type === 'Cost Account') {
                          const div = masterFormatDivisions.find(d => d.title === updatedWbs.title);
                          updatedWbs.divisionCode = div ? div.id : (updatedWbs.title.match(/\d+/)?.[0] || '01');
                        } else {
                          delete updatedWbs.divisionCode;
                        }
                        await setDoc(doc(db, 'wbs', editingWbs.id), updatedWbs);
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
                  {!isManualTitle ? (
                    <select 
                      value={editingPackage ? editingPackage.title : newPackage.title}
                      onChange={e => {
                        if (e.target.value === 'manual') {
                          setIsManualTitle(true);
                          return;
                        }
                        if (editingPackage) {
                          setEditingPackage({...editingPackage, title: e.target.value});
                        } else {
                          setNewPackage({...newPackage, title: e.target.value});
                        }
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Select from Cost Accounts...</option>
                      {masterFormatSections
                        .filter(s => s.divisionId === (editingPackage ? editingPackage.divisionId : newPackage.divisionId))
                        .map(section => (
                          <option key={section.id} value={section.title}>{section.id} - {section.title}</option>
                        ))
                      }
                      <option value="manual" className="text-blue-600 font-bold">+ Other (Manual Entry)...</option>
                    </select>
                  ) : (
                    <div className="relative">
                      <input 
                        type="text" 
                        value={editingPackage ? editingPackage.title : newPackage.title}
                        onChange={e => editingPackage ? setEditingPackage({...editingPackage, title: e.target.value}) : setNewPackage({...newPackage, title: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                        placeholder="Enter custom title..."
                        autoFocus
                      />
                      <button 
                        onClick={() => setIsManualTitle(false)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
                        title="Back to list"
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  )}
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
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cost Account</label>
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
                      <option value="new" className="text-blue-600 font-bold">+ Add New Cost Account...</option>
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
                        const selectedWbs = wbsLevels.find(l => l.id === e.target.value);
                        if (selectedWbs && selectedWbs.type === 'Cost Account' && selectedWbs.divisionCode) {
                          if (editingPackage) {
                            setEditingPackage({...editingPackage, wbsId: e.target.value, divisionId: selectedWbs.divisionCode});
                          } else {
                            setNewPackage({...newPackage, wbsId: e.target.value, divisionId: selectedWbs.divisionCode});
                          }
                        } else {
                          editingPackage ? setEditingPackage({...editingPackage, wbsId: e.target.value}) : setNewPackage({...newPackage, wbsId: e.target.value})
                        }
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
                    onChange={e => {
                      const type = e.target.value as any;
                      let parentId = newWbs.parentId;
                      if (type === 'Work Package') {
                        // Auto-select first Cost Account if available
                        const costAccount = wbsLevels.find(l => l.type === 'Cost Account');
                        if (costAccount) {
                          parentId = costAccount.id;
                        } else {
                          // Default to 01 General Requirements if no Cost Account exists
                          const generalReq = wbsLevels.find(l => l.title.includes('01 General Requirements'));
                          if (generalReq) parentId = generalReq.id;
                        }
                      }
                      setNewWbs({...newWbs, type, parentId});
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Zone">Zone</option>
                    <option value="Area">Area</option>
                    <option value="Building">Building</option>
                    <option value="Cost Account">Cost Account</option>
                    <option value="Work Package">Work Package</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {newWbs.type === 'Cost Account' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cost Account Title</label>
                    <div className="space-y-2">
                      <select 
                        value={masterFormatDivisions.some(d => `${d.id} - ${d.title}` === newWbs.title) ? newWbs.title : (newWbs.title ? 'manual' : '')}
                        onChange={e => {
                          if (e.target.value === 'manual') {
                            setNewWbs({...newWbs, title: ''});
                          } else {
                            setNewWbs({...newWbs, title: e.target.value});
                          }
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Cost Account...</option>
                        {masterFormatDivisions.map(div => (
                          <option key={div.id} value={`${div.id} - ${div.title}`}>{div.id} - {div.title}</option>
                        ))}
                        <option value="manual" className="text-blue-600 font-bold">+ Other (Manual Entry)</option>
                      </select>
                      {(!masterFormatDivisions.some(d => `${d.id} - ${d.title}` === newWbs.title) && newWbs.title !== '') && (
                        <input 
                          type="text" 
                          value={newWbs.title}
                          onChange={e => setNewWbs({...newWbs, title: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="Enter custom cost account title..."
                        />
                      )}
                    </div>
                  </div>
                ) : newWbs.type === 'Work Package' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Work Package Title</label>
                    <div className="space-y-2">
                      <select 
                        value={masterFormatSections.some(s => s.title === newWbs.title) ? newWbs.title : (newWbs.title ? 'manual' : '')}
                        onChange={e => {
                          if (e.target.value === 'manual') {
                            setNewWbs({...newWbs, title: ''});
                          } else {
                            setNewWbs({...newWbs, title: e.target.value});
                          }
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Work Package...</option>
                        {masterFormatSections
                          .filter(s => {
                            const parent = wbsLevels.find(l => l.id === newWbs.parentId);
                            if (parent && parent.divisionCode) {
                              return s.divisionId === parent.divisionCode;
                            }
                            return true;
                          })
                          .map(section => (
                            <option key={section.id} value={section.title}>{section.id} - {section.title}</option>
                          ))
                        }
                        <option value="manual" className="text-blue-600 font-bold">+ Other (Manual Entry)</option>
                      </select>
                      {(!masterFormatSections.some(s => s.title === newWbs.title) && newWbs.title !== '') && (
                        <input 
                          type="text" 
                          value={newWbs.title}
                          onChange={e => setNewWbs({...newWbs, title: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="Enter custom work package title..."
                        />
                      )}
                    </div>
                  </div>
                ) : null}
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
