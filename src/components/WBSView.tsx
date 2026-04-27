import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { WBSLevel, BOQItem, WorkPackage } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, setDoc, doc, query, where, deleteDoc, addDoc } from 'firebase/firestore';
import { 
  LayoutGrid, List, Plus, Trash2, Info, Loader2, 
  ChevronRight, ChevronDown,
  Search, Filter, Download, FileText, Sparkles, Upload,
  Package, Edit2, X, Check, Target, Database, Calendar,
  Building, Layers, MapPin, Zap, Cog, Droplets, Palette, HardHat, Mountain, Boxes, DraftingCompass, ShoppingCart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../context/ProjectContext';
import { cn, formatCurrency } from '../lib/utils';
import { GoogleGenAI, Type } from "@google/genai";
import { toast } from 'react-hot-toast';
import { masterFormatDivisions } from '../data';
import { masterFormatSections } from '../constants/masterFormat';
import { ActivityListView } from './ActivityListView';
import { ActivityAttributesModal } from './ActivityAttributesModal';
import { masterFormatData } from '../data/masterFormat';
import { Page, Activity } from '../types';
import { AddWBSLevelModal } from './AddWBSLevelModal';
import { deriveStatus, rollupToParent } from '../services/rollupService';
import { Ribbon, RibbonGroup } from './Ribbon';
import { useLanguage } from '../context/LanguageContext';
import { Flag } from 'lucide-react';

export const WBSView: React.FC = () => {
  const { t, isRtl } = useLanguage();
  const { selectedProject, getPath } = useProject();
  const location = useLocation();
  const navigate = useNavigate();
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddWbs, setShowAddWbs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'costaccount' | 'packages' | 'milestones' | 'activities'>('hierarchy');
  const [selectedWbsIds, setSelectedWbsIds] = useState<string[]>([]);

  const ribbonGroups: RibbonGroup[] = [
    {
      id: 'structure',
      label: t('structure'),
      tabs: [
        { id: 'hierarchy', label: t('wbs_hierarchy'), icon: LayoutGrid },
        { id: 'costaccount', label: t('cost_accounts'), icon: Database },
        { id: 'packages', label: t('work_packages'), icon: Package },
      ]
    },
    {
      id: 'scheduling',
      label: t('scheduling'),
      tabs: [
        { id: 'milestones', label: t('milestones'), icon: Flag },
      ]
    }
  ];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'packages') setActiveTab('packages');
    if (tab === 'hierarchy') setActiveTab('hierarchy');
    if (tab === 'costaccount') setActiveTab('costaccount');
    if (tab === 'milestones') setActiveTab('milestones');
    if (tab === 'activities') setActiveTab('activities');
  }, [location.search]);

  const toggleSelectAllWbs = (type: string) => {
    const filtered = wbsLevels.filter(l => l.type === type);
    if (selectedWbsIds.filter(id => filtered.some(f => f.id === id)).length === filtered.length && filtered.length > 0) {
      setSelectedWbsIds(prev => prev.filter(id => !filtered.some(f => f.id === id)));
    } else {
      setSelectedWbsIds(prev => [...new Set([...prev, ...filtered.map(l => l.id)])]);
    }
  };

  const toggleSelectAllPackages = () => {
    const wbsPks = wbsLevels.filter(l => l.type === 'Work Package');
    const isAllSelected = selectedWbsIds.filter(id => wbsPks.some(p => p.id === id)).length === wbsPks.length && 
                          (wbsPks.length > 0);

    if (isAllSelected) {
      setSelectedWbsIds(prev => prev.filter(id => !wbsPks.some(p => p.id === id)));
    } else {
      setSelectedWbsIds(prev => [...new Set([...prev, ...wbsPks.map(p => p.id)])]);
    }
  };

  const filteredWbsForTree = useMemo(() => {
    if (!searchTerm) return wbsLevels;
    
    const searchLower = searchTerm.toLowerCase();
    const matchingIds = new Set<string>();
    
    // First pass: find all nodes that match directly
    const directMatches = wbsLevels.filter(l => 
      l.title.toLowerCase().includes(searchLower) ||
      l.code.toLowerCase().includes(searchLower)
    );
    
    // Second pass: include all ancestors of matches
    const addAncestors = (parentId: string) => {
      const parent = wbsLevels.find(p => p.id === parentId);
      if (parent && !matchingIds.has(parent.id)) {
        matchingIds.add(parent.id);
        if (parent.parentId) addAncestors(parent.parentId);
      }
    };
    
    directMatches.forEach(match => {
      matchingIds.add(match.id);
      if (match.parentId) addAncestors(match.parentId);
    });
    
    return wbsLevels.filter(l => matchingIds.has(l.id));
  }, [wbsLevels, searchTerm]);

  const toggleSelectWbs = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedWbsIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteWbs = async () => {
    const selectedInType = selectedWbsIds.filter(id => {
      const level = wbsLevels.find(l => l.id === id);
      return level?.type === (activeTab === 'costaccount' ? 'Cost Account' : 'Work Package');
    });

    if (selectedInType.length === 0) return;
    
    toast((t: any) => (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-bold text-slate-900">Delete {selectedInType.length} selected items?</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                const deletePromises = selectedInType.map(id => deleteDoc(doc(db, 'wbs', id)));
                await Promise.all(deletePromises);
                setSelectedWbsIds(prev => prev.filter(id => !selectedInType.includes(id)));
                toast.success(`${selectedInType.length} items deleted successfully`);
              } catch (error) {
                handleFirestoreError(error, OperationType.DELETE, 'wbs');
              }
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
          >
            Delete All
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  const handleBulkDeletePackages = async () => {
    const wbsPksToDelete = selectedWbsIds.filter(id => wbsLevels.find(l => l.id === id)?.type === 'Work Package');

    if (wbsPksToDelete.length === 0) return;
    
    toast((t: any) => (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-bold text-slate-900">Delete {wbsPksToDelete.length} selected work packages?</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                const wbsPromises = wbsPksToDelete.map(id => deleteDoc(doc(db, 'wbs', id)));
                await Promise.all(wbsPromises);
                
                setSelectedWbsIds(prev => prev.filter(id => !wbsPksToDelete.includes(id)));
                toast.success(`${wbsPksToDelete.length} work packages deleted successfully`);
              } catch (error) {
                handleFirestoreError(error, OperationType.DELETE, 'wbs');
              }
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
          >
            Delete All
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };
  const [editingWbs, setEditingWbs] = useState<WBSLevel | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    id: string;
    type: 'wbs' | 'package';
    title: string;
  } | null>(null);
  
  const [isManualTitle, setIsManualTitle] = useState(false);
  const [isManualWbsTitle, setIsManualWbsTitle] = useState(false);

  const hierarchyRules: Record<string, string[]> = {
    'Zone': [],
    'Area': ['Zone'],
    'Building': ['Area', 'Zone'],
    'Cost Account': ['Building', 'Area', 'Zone', 'Root'],
    'Work Package': ['Cost Account']
  };

  useEffect(() => {
    if (!editingWbs) return;
    
    const allowedParents = hierarchyRules[editingWbs.type] || [];
    const parent = wbsLevels.find(l => l.id === editingWbs.parentId);
    
    if (editingWbs.type === 'Work Package') {
      if (!parent || parent.type !== 'Cost Account') {
        const firstCA = wbsLevels.find(l => l.type === 'Cost Account');
        if (firstCA && firstCA.id !== editingWbs.id) {
          setEditingWbs(prev => prev ? ({ ...prev, parentId: firstCA.id }) : null);
        }
      }
    } else if (editingWbs.type === 'Zone') {
      if (editingWbs.parentId) {
        setEditingWbs(prev => prev ? ({ ...prev, parentId: '' }) : null);
      }
    } else if (parent && !allowedParents.includes(parent.type)) {
      setEditingWbs(prev => prev ? ({ ...prev, parentId: '' }) : null);
    }
  }, [editingWbs?.type]);
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

  const generateCode = (type: string, parentId?: string, existingLevels: WBSLevel[] = [], divisionCode?: string) => {
    if (type === 'Cost Account' && divisionCode) {
      const parent = existingLevels.find(l => l.id === parentId);
      const code = `${divisionCode} CA`;
      return parent ? `${parent.code}-${code}` : code;
    }

    const prefix = getPrefix(type);
    const parent = existingLevels.find(l => l.id === parentId);
    const siblings = existingLevels.filter(l => {
      const isRoot = parentId === undefined || parentId === '' || parentId === null;
      if (isRoot) {
        return (!l.parentId || l.parentId === '' || l.parentId === null) && l.type === type;
      }
      return l.parentId === parentId && l.type === type;
    });
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

      let generatedWbs: any[] = [];
      try {
        generatedWbs = JSON.parse(response.text || '[]');
      } catch {
        toast.error("Failed to parse AI response. Please try again.");
        setIsGenerating(false);
        return;
      }

      // Map to store created IDs by title to handle hierarchy
      const titleToId: Record<string, string> = {};
      const currentLevels = [...wbsLevels];

      for (const item of generatedWbs) {
        const id = crypto.randomUUID();
        const parentId = item.parentTitle ? titleToId[item.parentTitle] : undefined;
        
        const div = masterFormatDivisions.find(d => `${d.id} - ${d.title}` === item.title || d.title === item.title);
        const divisionCode = div ? div.id : (item.title.match(/\d+/)?.[0] || '01');
        
        const code = generateCode(item.type, parentId, currentLevels, divisionCode);
        
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

    const actUnsubscribe = onSnapshot(
      query(collection(db, 'activities'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setActivities(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
      }
    );

    return () => {
      wbsUnsubscribe();
      boqUnsubscribe();
      actUnsubscribe();
    };
  }, [selectedProject]);

  const handleAddWorkPackage = async () => {
    if (!selectedProject || !newPackage.title) return;
    try {
      const id = crypto.randomUUID();
      const division = masterFormatDivisions.find(d => d.id === newPackage.divisionId);
      const parentWbs = wbsLevels.find(l => l.id === newPackage.wbsId);
      
      const wp: WBSLevel = {
        id,
        projectId: selectedProject.id,
        parentId: newPackage.wbsId || '',
        divisionCode: newPackage.divisionId || '01',
        title: newPackage.title,
        type: 'Work Package',
        level: (parentWbs?.level || 0) + 1,
        status: 'Not Started',
        code: `${division?.id || '00'}-${parentWbs?.code || 'GEN'}-${wbsLevels.filter(l => l.type === 'Work Package').length + 1}`,
      };

      await setDoc(doc(db, 'wbs', id), wp);
      
      // Trigger rollup to parent
      if (wp.parentId) {
        await rollupToParent('division', wp.parentId);
      }
      
      setShowAddPackage(false);
      setIsManualTitle(false);
      setNewPackage({ title: '', description: '', divisionId: '01', wbsId: '', status: 'Active' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'wbs');
    }
  };

  const handleUpdateWorkPackage = async (id: string, updates: Partial<WBSLevel>) => {
    try {
      const wp = wbsLevels.find(p => p.id === id);
      if (!wp) return;
      await setDoc(doc(db, 'wbs', id), { ...wp, ...updates });
      
      // Trigger rollup to parent
      if (wp.parentId) {
        await rollupToParent('division', wp.parentId);
      }
      
      setEditingPackage(null);
      setIsManualTitle(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'wbs');
    }
  };

  const handleDeleteWorkPackage = async (id: string) => {
    const wp = wbsLevels.find(p => p.id === id);
    if (!wp) return;
    setDeleteConfirmation({ id, type: 'package', title: wp.title });
  };

  const executeDeleteWorkPackage = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'wbs', id));
      setDeleteConfirmation(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'wbs');
    }
  };

  const handleEditWbs = (level: WBSLevel) => {
    setEditingWbs(level);
    // Determine if it's a manual title
    if (level.type === 'Cost Account') {
      setIsManualWbsTitle(!masterFormatDivisions.some(d => `${d.id} - ${d.title}` === level.title));
    } else if (level.type === 'Work Package') {
      setIsManualWbsTitle(!masterFormatSections.some(s => s.title === level.title));
    } else {
      setIsManualWbsTitle(false);
    }
  };

  const handleEditPackage = (wp: WBSLevel) => {
    setEditingPackage(wp as any);
    const isStandard = masterFormatSections.some(s => s.title === wp.title);
    setIsManualTitle(!isStandard);
  };

  const handleDeleteWbs = async (id: string) => {
    const level = wbsLevels.find(l => l.id === id);
    if (!level) return;
    setDeleteConfirmation({ id, type: 'wbs', title: level.title });
  };

  const executeDeleteWbs = async (id: string) => {
    try {
      const levelToDelete = wbsLevels.find(l => l.id === id);
      const parentIdToRollup = levelToDelete?.parentId;

      // Find all children recursively
      const findChildren = (parentId: string): string[] => {
        const children = wbsLevels.filter(l => l.parentId === parentId);
        let ids = children.map(c => c.id);
        children.forEach(c => {
          ids = [...ids, ...findChildren(c.id)];
        });
        return ids;
      };

      const idsToDelete = [id, ...findChildren(id)];
      
      // Delete all WBS levels
      await Promise.all(idsToDelete.map(wbsId => deleteDoc(doc(db, 'wbs', wbsId))));
      
      // Also delete associated activities linked to these WBS IDs
      const actToDelete = activities.filter(act => idsToDelete.includes(act.wbsId));
      await Promise.all(actToDelete.map(act => deleteDoc(doc(db, 'activities', act.id))));

      const boqToDelete = boqItems.filter(item => idsToDelete.includes(item.wbsId));
      await Promise.all(boqToDelete.map(item => deleteDoc(doc(db, 'boq', item.id))));

      // Trigger rollup for parent
      if (parentIdToRollup) {
        await rollupToParent('division', parentIdToRollup);
      }

      setDeleteConfirmation(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'wbs');
    }
  };

  const getWbsIcon = (type: string, size: string = "w-5 h-5", name: string = "") => {
    const n = name.toLowerCase();
    
    if (type === 'Division' || type === 'Cost Account') {
      if (n.includes('concrete')) return <Boxes className={cn(size, "text-orange-900")} />;
      if (n.includes('electrical')) return <Zap className={cn(size, "text-yellow-500")} />;
      if (n.includes('mechanical')) return <Cog className={cn(size, "text-blue-600")} />;
      if (n.includes('plumbing') || n.includes('sanitary')) return <Droplets className={cn(size, "text-sky-500")} />;
      if (n.includes('finishes') || n.includes('painting')) return <Palette className={cn(size, "text-pink-500")} />;
      if (n.includes('site') || n.includes('excavation')) return <Mountain className={cn(size, "text-amber-700")} />;
      if (n.includes('masonry') || n.includes('block')) return <HardHat className={cn(size, "text-orange-500")} />;
    }

    if (type === 'Work Package') {
      if (n.includes('design')) return <DraftingCompass className={cn(size, "text-indigo-500")} />;
      if (n.includes('procurement')) return <ShoppingCart className={cn(size, "text-emerald-500")} />;
      return <Package className={cn(size, "text-teal-500")} />;
    }

    switch (type) {
      case 'Zone': return <Target className={size} />;
      case 'Area': return <MapPin className={size} />;
      case 'Building': return <Building className={size} />;
      case 'Floor': return <Layers className={size} />;
      case 'Division':
      case 'Cost Account': return <Database className={size} />;
      case 'Work Package': return <Package className={size} />;
      default: return <Database className={size} />;
    }
  };

  const renderWbsTree = (parentId?: string, depth = 0) => {
    // Handle root nodes correctly whether parentId is undefined, null or empty string
    const levels = filteredWbsForTree.filter(l => {
      if (parentId === undefined || parentId === '' || parentId === null) {
        return !l.parentId || l.parentId === '' || l.parentId === null;
      }
      return l.parentId === parentId;
    });

    if (levels.length === 0 && depth === 0 && wbsLevels.length > 0) {
      if (searchTerm) {
        return (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="w-12 h-12 text-slate-200 mb-4" />
            <h4 className="text-lg font-bold text-slate-900 mb-1">{t('no_matches_found')}</h4>
            <p className="text-sm text-slate-400">{t('try_searching_different')}</p>
          </div>
        );
      }
    }

    return (
      <div className={cn("space-y-3", (depth > 0 || (depth === 0 && !parentId && !searchTerm)) && (isRtl ? "mr-8 border-r-2 pr-6 border-l-0 pl-0" : "ml-8 border-l-2 border-slate-100 pl-6"))}>
        {depth === 0 && !parentId && !searchTerm && (
          <div className={cn(isRtl ? "-mr-8" : "-ml-8", "mb-3")}>
            <div className={cn("flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl ring-1 ring-white/10", isRtl && "flex-row-reverse")}>
              <div className={cn("flex items-center gap-3", isRtl && "flex-row-reverse")}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Target className="w-5 h-5" />
                </div>
                <div className={cn(isRtl && "text-right")}>
                  <div className={cn("flex items-center gap-2", isRtl && "flex-row-reverse")}>
                    <span className="text-[10px] font-semibold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded uppercase tracking-widest">{selectedProject.code}</span>
                    <div className="text-sm font-semibold text-white">{selectedProject.name} ({t('page')} 0)</div>
                  </div>
                  <div className={cn("flex items-center gap-3 mt-0.5", isRtl && "flex-row-reverse")}>
                    <div className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">{t('project_summary')}</div>
                    <span className="text-slate-800">|</span>
                    <div className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
                      {formatCurrency(boqItems.reduce((sum, i) => sum + i.amount, 0))}
                    </div>
                  </div>
                </div>
              </div>
              <div className={cn("flex items-center gap-4", isRtl && "flex-row-reverse")}>
                <div className="flex flex-col items-end gap-1">
                  <div className={cn("flex items-center gap-2", isRtl && "flex-row-reverse")}>
                    <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: '100%' }} />
                    </div>
                    <span className="text-[9px] font-semibold text-blue-400 uppercase">100% {t('disc')}</span>
                  </div>
                </div>
                <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-xl text-[9px] font-semibold text-white uppercase tracking-widest">
                  {wbsLevels.length} {t('nodes')}
                </div>
              </div>
            </div>
          </div>
        )}
        {levels.map(level => {
          const items = boqItems.filter(i => i.wbsId === level.id);
          const totalValue = items.reduce((sum, i) => sum + i.amount, 0);
          
          return (
            <div key={level.id} className="space-y-3">
              <div 
                onClick={() => handleEditWbs(level)}
                className={cn("group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:shadow-md hover:border-blue-200 transition-all cursor-pointer", isRtl && "flex-row-reverse")}
              >
                <div className={cn("flex items-center gap-4", isRtl && "flex-row-reverse")}>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold shadow-sm",
                    level.type === 'Zone' ? "bg-purple-100 text-purple-600" :
                    level.type === 'Area' ? "bg-blue-100 text-blue-600" :
                    level.type === 'Building' ? "bg-emerald-100 text-emerald-600" :
                    level.type === 'Floor' ? "bg-orange-100 text-orange-600" :
                    level.type === 'Cost Account' ? "bg-amber-100 text-amber-600" :
                    level.type === 'Work Package' ? "bg-sky-100 text-sky-600" :
                    "bg-slate-100 text-slate-600"
                  )}>
                    {getWbsIcon(level.type, "w-5 h-5", level.title)}
                  </div>
                  <div className={cn(isRtl && "text-right")}>
                    <div className={cn("flex items-center gap-2", isRtl && "flex-row-reverse")}>
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-widest">{level.code}</span>
                      <div className="text-base font-semibold text-slate-900">{level.title}</div>
                    </div>
                    <div className={cn("flex items-center gap-3 mt-0.5", isRtl && "flex-row-reverse")}>
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">{t(level.type.toLowerCase().replace(' ', ''))}</div>
                      <span className="text-slate-200">|</span>
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{formatCurrency(totalValue)}</div>
                      <span className="text-slate-200">|</span>
                      <span className={cn(
                        "text-[9px] font-semibold uppercase tracking-wider",
                        level.status === 'Completed' ? "text-emerald-600" :
                        level.status === 'In Progress' ? "text-blue-600" :
                        level.status === 'Delayed' ? "text-red-600" :
                        "text-slate-400"
                      )}>
                        {level.status ? t(level.status.toLowerCase().replace(' ', '_')) : t('not_started')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={cn("flex items-center gap-2", isRtl && "flex-row-reverse")}>
                  <div className="px-3 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-semibold uppercase tracking-wider">
                    {items.length} {t('items')}
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
    <div className="w-full flex flex-col h-[calc(100vh-140px)] overflow-hidden">
      {/* Ribbon Navigation */}
      <Ribbon 
        groups={ribbonGroups}
        activeTabId={activeTab}
        onTabChange={(id) => setActiveTab(id as any)}
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-8">

      {activeTab === 'hierarchy' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-12 space-y-6">
            <div className="flex items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400", isRtl ? "right-4" : "left-4")} />
                <input 
                  type="text"
                  placeholder={t('search_hierarchy')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(
                    "w-full py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all",
                    isRtl ? "pr-12 pl-4 text-right" : "pl-12 pr-4 text-left"
                  )}
                />
              </div>
              <div className={cn("flex items-center gap-3", isRtl && "flex-row-reverse")}>
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
                  <span className="text-sm font-semibold text-slate-700">{t('ai_generate_wbs')}</span>
                </label>
                <button 
                  onClick={() => setShowAddWbs(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  {t('add_level')}
                </button>
              </div>
            </div>
            
            <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl p-8 min-h-[400px]">
              {wbsLevels.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                    <LayoutGrid className="w-8 h-8 text-slate-200" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-1">{t('no_hierarchy_defined')}</h4>
                  <p className="text-sm text-slate-400 max-w-xs">{t('no_hierarchy_hint')}</p>
                </div>
              ) : renderWbsTree()}
            </div>
          </div>
        </div>
      ) : activeTab === 'costaccount' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">{t('cost_accounts')}</h3>
              <p className="text-slate-500">{t('manage_cost_accounts_desc')}</p>
            </div>
            <div className="flex items-center gap-3">
              {selectedWbsIds.filter(id => wbsLevels.find(l => l.id === id)?.type === 'Cost Account').length > 0 && (
                <button 
                  onClick={handleBulkDeleteWbs}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> {t('delete_selected')} ({selectedWbsIds.filter(id => wbsLevels.find(l => l.id === id)?.type === 'Cost Account').length})
                </button>
              )}
              <button 
                onClick={() => {
                  setShowAddWbs(true);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                {t('add_cost_account')}
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 w-10">
                    <input 
                      type="checkbox" 
                      checked={selectedWbsIds.length === wbsLevels.filter(l => l.type === 'Cost Account').length && wbsLevels.filter(l => l.type === 'Cost Account').length > 0}
                      onChange={() => toggleSelectAllWbs('Cost Account')}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('code')}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('cost_account')}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('parent_level')}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wbsLevels.filter(l => l.type === 'Cost Account').length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Database className="w-8 h-8 text-slate-200" />
                        <p className="text-slate-400 text-sm">No cost accounts defined for this project.</p>
                        <button 
                          onClick={() => setShowAddWbs(true)}
                          className="text-blue-600 text-xs font-bold hover:underline"
                        >
                          Add your first cost account
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  wbsLevels.filter(l => l.type === 'Cost Account').map(ca => {
                    const parent = wbsLevels.find(l => l.id === ca.parentId);
                    const isSelected = selectedWbsIds.includes(ca.id);
                    return (
                      <tr 
                        key={ca.id} 
                        onClick={() => handleEditWbs(ca)}
                        className={cn(
                          "hover:bg-slate-50/50 transition-colors group cursor-pointer",
                          isSelected && "bg-blue-50/50"
                        )}
                      >
                        <td className="px-6 py-4" onClick={(e) => toggleSelectWbs(ca.id, e)}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            readOnly
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {ca.divisionCode || ca.code}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-slate-900">{ca.title}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-slate-500 font-medium">
                            {parent ? `${parent.code} - ${parent.title}` : 'Root'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                            deriveStatus(ca.progress || 0, ca.actualStart, ca.actualFinish) === 'Completed' ? "bg-emerald-100 text-emerald-600" : 
                            deriveStatus(ca.progress || 0, ca.actualStart, ca.actualFinish) === 'In Progress' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
                          )}>
                            {deriveStatus(ca.progress || 0, ca.actualStart, ca.actualFinish)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Master Format Reference (Optional/Helpful) */}
          <div className="pt-8 border-t border-slate-100">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Master Format Reference (01-16)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {masterFormatDivisions.slice(0, 8).map(div => (
                <div key={div.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[10px] font-bold text-blue-600 mb-1">{div.id}</div>
                  <div className="text-xs font-bold text-slate-900">{div.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">{t('work_packages')}</h3>
              <p className="text-slate-500">{t('manage_work_packages_desc')}</p>
            </div>
            <div className="flex items-center gap-3">
              {(selectedWbsIds.filter(id => wbsLevels.find(l => l.id === id)?.type === 'Work Package').length) > 0 && (
                <button 
                  onClick={handleBulkDeletePackages}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> {t('delete_selected')} ({selectedWbsIds.filter(id => wbsLevels.find(l => l.id === id)?.type === 'Work Package').length})
                </button>
              )}
              <button 
                onClick={() => setShowAddPackage(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
              >
                <Plus className="w-4 h-4" />
                {t('add_work_package')}
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 w-10">
                    <input 
                      type="checkbox" 
                      checked={
                         (wbsLevels.filter(l => l.type === 'Work Package').length > 0) &&
                         (selectedWbsIds.filter(id => wbsLevels.find(l => l.id === id)?.type === 'Work Package').length === 
                          wbsLevels.filter(l => l.type === 'Work Package').length)
                      }
                      onChange={toggleSelectAllPackages}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('code')}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('title')}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('cost_account')}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('wbs_level')}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(wbsLevels.filter(l => l.type === 'Work Package').length === 0) ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="w-8 h-8 text-slate-200" />
                        <p className="text-slate-400 text-sm">No work packages defined yet.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* WBS-based Work Packages */}
                    {wbsLevels.filter(l => l.type === 'Work Package').map(wp => {
                      const parent = wbsLevels.find(l => l.id === wp.parentId);
                      const grandParent = parent ? wbsLevels.find(l => l.id === parent.parentId) : null;
                      const isSelected = selectedWbsIds.includes(wp.id);
                      
                      return (
                        <tr 
                          key={wp.id} 
                          onClick={() => handleEditWbs(wp)}
                          className={cn(
                            "hover:bg-slate-50/50 transition-colors group cursor-pointer",
                            isSelected && "bg-blue-50/50"
                          )}
                        >
                          <td className="px-6 py-4" onClick={(e) => toggleSelectWbs(wp.id, e)}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              readOnly
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{wp.code}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-slate-900">{wp.title}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs font-medium text-slate-600">
                              {parent?.type === 'Cost Account' ? parent.title : (masterFormatDivisions.find(d => d.id === wp.divisionCode)?.title || wp.divisionCode || 'N/L')}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs font-medium text-slate-600">
                              {grandParent ? grandParent.title : (parent?.type !== 'Cost Account' && parent ? parent.title : 'N/L')}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                              deriveStatus(wp.progress || 0, wp.actualStart, wp.actualFinish) === 'Completed' ? "bg-emerald-100 text-emerald-600" : 
                              deriveStatus(wp.progress || 0, wp.actualStart, wp.actualFinish) === 'In Progress' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
                            )}>
                              {deriveStatus(wp.progress || 0, wp.actualStart, wp.actualFinish)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                )}
              </tbody>
            </table>
          </div>
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
              status: 'Not Started',
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
                      {!isManualWbsTitle && masterFormatDivisions.some(d => `${d.id} - ${d.title}` === editingWbs.title) ? (
                        <select 
                          value={editingWbs.title}
                          onChange={e => {
                            if (e.target.value === 'manual') {
                              setIsManualWbsTitle(true);
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
                      ) : (
                        <div className="relative">
                          <input 
                            type="text" 
                            value={editingWbs.title}
                            onChange={e => setEditingWbs({...editingWbs, title: e.target.value})}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                            placeholder="Enter custom cost account title..."
                            autoFocus={isManualWbsTitle}
                          />
                          <button 
                            onClick={() => setIsManualWbsTitle(!isManualWbsTitle)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
                          >
                            <List className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : editingWbs.type === 'Work Package' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Work Package Title</label>
                    <div className="space-y-2">
                      {!isManualWbsTitle && masterFormatSections.some(s => s.title === editingWbs.title) ? (
                        <select 
                          value={editingWbs.title}
                          onChange={e => {
                            if (e.target.value === 'manual') {
                              setIsManualWbsTitle(true);
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
                      ) : (
                        <div className="relative">
                          <input 
                            type="text" 
                            value={editingWbs.title}
                            onChange={e => setEditingWbs({...editingWbs, title: e.target.value})}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                            placeholder="Enter custom work package title..."
                            autoFocus={isManualWbsTitle}
                          />
                          <button 
                            onClick={() => setIsManualWbsTitle(!isManualWbsTitle)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
                          >
                            <List className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {editingWbs.type === 'Work Package' ? 'Parent Cost Account' : 'Parent Level'}
                  </label>
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
                    {editingWbs.type !== 'Work Package' && <option value="">None (Root Level)</option>}
                    {wbsLevels
                      .filter(l => l.id !== editingWbs.id && (hierarchyRules[editingWbs.type] || []).includes(l.type))
                      .map(l => (
                        <option key={l.id} value={l.id}>{l.title} ({l.type})</option>
                      ))
                    }
                    <option value="new" className="text-blue-600 font-bold">+ Add New Level...</option>
                  </select>
                  {editingWbs.type === 'Work Package' && wbsLevels.filter(l => l.type === 'Cost Account').length === 0 && (
                    <p className="mt-1 text-[10px] text-rose-500 font-bold uppercase tracking-wider">
                      No Cost Accounts available to link.
                    </p>
                  )}
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => { setEditingWbs(null); setIsManualWbsTitle(false); }}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        let updatedWbs = { ...editingWbs };
                        if (updatedWbs.type === 'Cost Account') {
                          const div = masterFormatDivisions.find(d => `${d.id} - ${d.title}` === updatedWbs.title || d.title === updatedWbs.title);
                          updatedWbs.divisionCode = div ? div.id : (updatedWbs.title.match(/\d+/)?.[0] || '01');
                        } else if (updatedWbs.type === 'Work Package') {
                          const parent = wbsLevels.find(l => l.id === updatedWbs.parentId);
                          if (parent && parent.divisionCode) {
                            updatedWbs.divisionCode = parent.divisionCode;
                          } else {
                            delete updatedWbs.divisionCode;
                          }
                        } else {
                          delete updatedWbs.divisionCode;
                        }
                        await setDoc(doc(db, 'wbs', editingWbs.id), updatedWbs);
                        
                        // Trigger rollup to parent if exists
                        if (updatedWbs.parentId) {
                          await rollupToParent('division', updatedWbs.parentId);
                        }
                        
                        setEditingWbs(null);
                        setIsManualWbsTitle(false);
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
                          navigate(getPath('scope', '2.2.1'));
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
                    onClick={() => { setShowAddPackage(false); setEditingPackage(null); setIsManualTitle(false); }}
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
      <AddWBSLevelModal 
        isOpen={showAddWbs}
        onClose={() => setShowAddWbs(false)}
        selectedProject={selectedProject}
        wbsLevels={wbsLevels}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmation && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2 text-center">Confirm Deletion</h3>
              <p className="text-slate-500 text-center mb-8">
                Are you sure you want to delete <span className="font-bold text-slate-900">"{deleteConfirmation.title}"</span>?
                {deleteConfirmation.type === 'wbs' && " This will also delete all its sub-levels, work packages, and activities."}
                {deleteConfirmation.type === 'package' && " This action cannot be undone."}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmation(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (deleteConfirmation.type === 'wbs') {
                      executeDeleteWbs(deleteConfirmation.id);
                    } else {
                      executeDeleteWorkPackage(deleteConfirmation.id);
                    }
                  }}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};
