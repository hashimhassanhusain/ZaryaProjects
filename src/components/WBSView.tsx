import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { WBSLevel, BOQItem, WorkPackage } from '../types';
import { db, handleFirestoreError, OperationType, cleanObject } from '../firebase';
import { collection, onSnapshot, setDoc, doc, query, where, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { 
  LayoutGrid, List, Plus, Trash2, Info, Loader2, 
  ChevronRight, ChevronDown, GripVertical,
  Search, Filter, Download, FileText, Sparkles, Upload,
  Package, Edit2, X, Check, Target, Database, Calendar,
  Building, Layers, MapPin, Zap, Cog, Droplets, Palette, HardHat, Mountain, Boxes, DraftingCompass, ShoppingCart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../context/ProjectContext';
import { cn, formatCurrency, stripNumericPrefix } from '../lib/utils';
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

import { StandardProcessPage } from './StandardProcessPage';
import { UniversalDataTable } from './common/UniversalDataTable';
import { EntityConfig } from '../types';

export const WBSView: React.FC = () => {
  const { t, th, language, isRtl } = useLanguage();
  const { selectedProject } = useProject();
  const location = useLocation();
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'hierarchy' | 'costaccount' | 'packages' | 'milestones' | 'activities'>('hierarchy');
  // Sub-views for Hierarchy to avoid floating modals
  const [hierarchySubView, setHierarchySubView] = useState<'list' | 'edit_wbs' | 'add_package' | 'add_level'>('list');
  const [newLevelData, setNewLevelData] = useState({
    title: '',
    type: 'Zone' as any,
    parentId: '',
    costCenterId: '',
    standardItemId: ''
  });
  
  const [selectedWbsIds, setSelectedWbsIds] = useState<string[]>([]);
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
    'Area': ['Zone', 'Root'],
    'Building': ['Area', 'Zone', 'Root'],
    'Cost Account': ['Building', 'Area', 'Zone', 'Root'],
    'Work Package': ['Cost Account', 'Building', 'Area', 'Zone', 'Root']
  };

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

  const packagesGridConfig: EntityConfig = {
    id: 'packages',
    label: t('work_packages'),
    icon: Package,
    collection: 'wbs',
    columns: [
      { key: 'code', label: t('code'), type: 'string' },
      { key: 'title', label: t('title'), type: 'string' },
      { key: 'divisionCode', label: t('cost_account'), type: 'badge' },
      { key: 'parentId', label: t('parent'), type: 'string' },
      { key: 'status', label: t('status'), type: 'badge' }
    ]
  };

  const costGridConfig: EntityConfig = {
    id: 'cost_accounts',
    label: t('cost_accounts'),
    icon: Database,
    collection: 'wbs',
    columns: [
      { key: 'code', label: t('code'), type: 'string' },
      { key: 'title', label: t('title'), type: 'string' },
      { key: 'progress', label: t('progress'), type: 'progress' }
    ]
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'packages') setView('packages');
    if (tab === 'hierarchy') setView('hierarchy');
    if (tab === 'costaccount') setView('costaccount');
    if (tab === 'milestones') setView('milestones');
    if (tab === 'activities') setView('activities');
  }, [location.search]);

  const toggleSelectWbs = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedWbsIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredWbsForTree = useMemo(() => {
    if (!searchTerm) return wbsLevels;
    
    const searchLower = searchTerm.toLowerCase();
    const matchingIds = new Set<string>();
    
    const directMatches = wbsLevels.filter(l => 
        l.title.toLowerCase().includes(searchLower) || l.code.toLowerCase().includes(searchLower)
    );
    
    // Second pass: include all ancestors of matches to preserve tree structure
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
              The WBS should be hierarchical (Zone -> Area -> Building -> Floor -> Cost Account -> Work Package). 
              Important: Create a strict hierarchy where items are nested under their logical parents.
              Use the 'Cost Account' type for Cost Account Divisions (01-16). 
              Use the 'Work Package' type for specific work packages under Cost Accounts.
              Avoid redundant naming (e.g., don't create a sub-level with the same name as its parent).
              Return the WBS as a JSON array of objects with: title, type (Zone, Area, Building, Floor, Cost Account, Work Package, or Other), and parentTitle (if applicable).` },
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
                type: { type: Type.STRING, enum: ['Zone', 'Area', 'Building', 'Floor', 'Cost Account', 'Work Package', 'Other'] },
                parentTitle: { type: Type.STRING }
              },
              required: ['title', 'type']
            }
          }
        }
      });

      const generatedWbs = JSON.parse(response.text || '[]');
      
      // Map to store created IDs by title to handle hierarchy
      const titleToId: Record<string, string> = {
        [selectedProject.name]: '' // Root
      };
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
          level: (parentId && titleToId[item.parentTitle] ? (currentLevels.find(l => l.id === parentId)?.level || 0) + 1 : 1)
        };

        if (item.type === 'Cost Account') {
          level.divisionCode = divisionCode;
        }

        if (parentId !== undefined) {
          level.parentId = parentId;
        }

        await setDoc(doc(db, 'wbs', id), cleanObject(level));
        titleToId[item.title] = id;
        currentLevels.push(level as WBSLevel);
      }
      toast.success(t('wbs_generated_successfully'));
    } catch (err) {
      console.error("AI WBS Generation failed:", err);
      toast.error(t('failed_to_generate_wbs'));
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
      const divCode = newPackage.divisionId || '01';
      const division = masterFormatDivisions.find(d => d.id === divCode);
      const parentWbs = wbsLevels.find(l => l.id === newPackage.wbsId);
      
      const wp: WBSLevel = {
        id,
        projectId: selectedProject.id,
        parentId: newPackage.wbsId || '',
        title: newPackage.title,
        type: 'Work Package',
        level: (parentWbs?.level || 0) + 1,
        status: 'Not Started',
        code: `${division?.id || '00'}-${parentWbs?.code || 'GEN'}-${wbsLevels.filter(l => l.type === 'Work Package').length + 1}`,
        costCenterId: divCode, // Crucial for filtering
      };

      await setDoc(doc(db, 'wbs', id), cleanObject(wp));
      
      // Trigger rollup to parent
      if (wp.parentId) {
        await rollupToParent('division', wp.parentId);
      }
      
      setHierarchySubView('list');
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
      
      // Ensure costCenterId is kept in sync if title or division changes (if applicable)
      const finalUpdates = { ...updates };
      if ((updates as any).divisionId) {
        finalUpdates.costCenterId = (updates as any).divisionId;
      }

      await setDoc(doc(db, 'wbs', id), cleanObject({ ...wp, ...finalUpdates }));
      
      // Trigger rollup to parent
      if (wp.parentId) {
        await rollupToParent('division', wp.parentId);
      }
      
      setEditingPackage(null);
      setHierarchySubView('list');
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

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const handleDragUpdate = (e: any, info: any) => {
    const x = info.point.x;
    const y = info.point.y;
    const element = document.elementFromPoint(x, y);
    const targetId = element?.closest('[data-wbs-id]')?.getAttribute('data-wbs-id');
    
    if (targetId && targetId !== draggedId) {
      setDropTargetId(targetId);
    } else {
      setDropTargetId(null);
    }
  };

  const handleItemDrop = async (sourceId: string, destId: string | null) => {
    if (!sourceId || sourceId === destId) {
      setDraggedId(null);
      setDropTargetId(null);
      return;
    }
    
    const source = wbsLevels.find(l => l.id === sourceId);
    if (!source) return;

    // Prevent dropping on itself or a child (circular dependency)
    const isRecursiveChild = (parentId: string, childId: string): boolean => {
      const children = wbsLevels.filter(l => l.parentId === parentId);
      if (children.some(c => c.id === childId)) return true;
      return children.some(c => isRecursiveChild(c.id, childId));
    };

    if (destId && (sourceId === destId || isRecursiveChild(sourceId, destId))) {
      toast.error(t('cannot_move_to_child_hierarchy'));
      setDraggedId(null);
      setDropTargetId(null);
      return;
    }

    // Hierarchy Logic Enforcement
    if (destId) {
      const dest = wbsLevels.find(l => l.id === destId);
      if (dest) {
        const allowedParents = hierarchyRules[source.type] || [];
        if (!allowedParents.includes(dest.type) && dest.type !== 'Root') {
          toast.error(`${t('invalid_hierarchy_move')}: ${t(source.type.toLowerCase())} cannot be child of ${t(dest.type.toLowerCase())}`);
          setDraggedId(null);
          setDropTargetId(null);
          return;
        }
      }
    }

    try {
      const newParentId = destId || '';
      const destParent = destId ? wbsLevels.find(l => l.id === destId) : null;
      
      // Update the item
      const updateData: any = {
        parentId: newParentId,
        level: destParent ? (destParent.level + 1) : 1,
        updatedAt: new Date().toISOString()
      };

      // Recalculate code based on new position
      updateData.code = generateCode(source.type, newParentId, wbsLevels.filter(l => l.id !== sourceId));

      await updateDoc(doc(db, 'wbs', sourceId), cleanObject(updateData));
      
      // Trigger rollup for old and new parents
      if (source.parentId) await rollupToParent('division', source.parentId);
      if (newParentId) await rollupToParent('division', newParentId);

      toast.success(t('hierarchy_updated_successfully'));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'wbs');
    } finally {
      setDraggedId(null);
      setDropTargetId(null);
    }
  };

  const handleEditWbs = (level: WBSLevel) => {
    if (draggedId) return; // Prevent edit while dragging
    setEditingWbs(level);
    setHierarchySubView('edit_wbs');
    // Determine if it's a manual title
    if (level.type === 'Work Package') {
      setIsManualWbsTitle(!masterFormatSections.some(s => s.title === level.title));
    } else {
      setIsManualWbsTitle(false);
    }
  };

  const handleEditPackage = (wp: WBSLevel) => {
    setEditingPackage(wp as any);
    setHierarchySubView('add_package');
    const isStandard = masterFormatSections.some(s => s.title === wp.title);
    setIsManualTitle(!isStandard);
  };

  const handleInlineSaveWbs = async (id: string, field: string, value: any) => {
    try {
      const level = wbsLevels.find(l => l.id === id);
      if (!level) return;

      let updateData: any = { 
        [field]: value,
        updatedAt: new Date().toISOString()
      };

      // If updating divisionCode on a Work Package, sync parentId
      if (field === 'divisionCode' && level.type === 'Work Package') {
        const matchingCA = wbsLevels.find(l => l.type === 'Cost Account' && l.divisionCode === value);
        if (matchingCA) {
          updateData.parentId = matchingCA.id;
          updateData.level = matchingCA.level + 1;
        }
      }

      await setDoc(doc(db, 'wbs', id), cleanObject({ ...level, ...updateData }));
      
      // Trigger rollup
      if (updateData.parentId || level.parentId) {
        await rollupToParent('division', updateData.parentId || level.parentId || '');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'wbs');
    }
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

  const handleArchiveWbs = async (level: WBSLevel) => {
    try {
      const isArchived = (level as any).archived || false;
      await updateDoc(doc(db, 'wbs', level.id), {
        archived: !isArchived,
        updatedAt: new Date().toISOString()
      });
      toast.success(!isArchived ? 'Record archived' : 'Record restored');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'wbs');
    }
  };

  const handleArchiveActivity = async (act: Activity) => {
    try {
      const isArchived = (act as any).archived || false;
      await updateDoc(doc(db, 'activities', act.id), {
        archived: !isArchived,
        updatedAt: new Date().toISOString()
      });
      toast.success(!isArchived ? 'Record archived' : 'Record restored');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'activities');
    }
  };

  const getWbsIcon = (type: string, size: string = "w-5 h-5", name: string = "") => {
    const n = name.toLowerCase();
    
    if (type === 'Division' || type === 'Cost Account') {
      if (n.includes('concrete')) return <Boxes className={cn(size, "text-slate-900")} />;
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
    const levels = filteredWbsForTree.filter(l => {
      if (parentId === undefined || parentId === '' || parentId === null) {
        return !l.parentId || l.parentId === '' || l.parentId === null;
      }
      return l.parentId === parentId;
    }).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

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

    const showIndentUI = depth > 0 || (depth === 0 && !parentId && !searchTerm);

    return (
      <div className={cn(
        "space-y-3", 
        showIndentUI && (isRtl ? "mr-8 border-r-2 pr-6 border-slate-100" : "ml-8 border-l-2 border-slate-100 pl-6")
      )}>
        {depth === 0 && !parentId && !searchTerm && (
          <div 
            className={cn(isRtl ? "-mr-8" : "-ml-8", "mb-3")}
            data-wbs-id="root"
          >
            <div className={cn(
              "flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl ring-1 ring-white/10 transition-all",
              dropTargetId === 'root' && "ring-4 ring-blue-500/50 scale-[1.02] bg-slate-800",
              isRtl && "flex-row-reverse"
            )}>
              <div className={cn("flex items-center gap-3", isRtl && "flex-row-reverse")}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Target className="w-5 h-5" />
                </div>
                <div className={cn(isRtl && "text-right")}>
                  <div className={cn("flex items-center gap-2", isRtl && "flex-row-reverse")}>
                    <span className="text-[10px] font-semibold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded uppercase tracking-widest">{selectedProject.code}</span>
                    <div className="text-sm font-semibold text-white">{selectedProject.name}</div>
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
                {dropTargetId === 'root' && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-bold animate-pulse">
                    <Plus className="w-3 h-3" />
                    {t('drop_to_make_root')}
                  </div>
                )}
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
          const isBeingDragged = draggedId === level.id;
          const isDropTarget = dropTargetId === level.id;
          
          return (
            <div key={level.id} className="space-y-3">
              <motion.div 
                layout
                drag
                dragSnapToOrigin
                onDragStart={() => setDraggedId(level.id)}
                onDrag={(e, info) => handleDragUpdate(e, info)}
                onDragEnd={() => handleItemDrop(level.id, dropTargetId === 'root' ? null : dropTargetId)}
                whileDrag={{ 
                  scale: 1.05, 
                  zIndex: 50, 
                  boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                  cursor: "grabbing"
                }}
                data-wbs-id={level.id}
                initial={{ opacity: 0, x: isRtl ? 10 : -10 }}
                animate={{ 
                  opacity: isBeingDragged ? 0.4 : 1, 
                  x: 0,
                  scale: isDropTarget ? 1.02 : 1,
                }}
                onClick={() => handleEditWbs(level)}
                className={cn(
                  "group flex items-center justify-between p-4 bg-white border rounded-2xl transition-all cursor-grab active:cursor-grabbing relative",
                  isDropTarget ? "border-blue-500 border-2 shadow-lg ring-4 ring-blue-500/10" : "border-slate-200 hover:shadow-md hover:border-blue-200",
                  isRtl && "flex-row-reverse"
                )}
              >
                {isDropTarget && (
                  <div className={cn(
                    "absolute -top-3 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full shadow-sm z-10",
                    isRtl ? "right-4" : "left-4"
                  )}>
                    {t('make_child_of')} {level.title}
                  </div>
                )}
                
                <div className={cn("flex items-center gap-4", isRtl && "flex-row-reverse")}>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWbs(level.id);
                      }}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-500">
                      <GripVertical className="w-5 h-5" />
                    </div>
                  </div>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold shadow-sm shrink-0",
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
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-widest shrink-0">{level.code}</span>
                      <div className="text-base font-semibold text-slate-900 leading-tight">{level.title}</div>
                    </div>
                    <div className={cn("flex items-center gap-3 mt-0.5", isRtl && "flex-row-reverse")}>
                      <div className="flex items-center gap-2">
                          <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                            {t(level.type.toLowerCase().replace(' ', ''))}
                          </div>
                          {level.type === 'Work Package' && (level.costCenterId || level.standardItemId) && (
                              <div className={cn("flex gap-1", isRtl && "flex-row-reverse")}>
                                  {level.costCenterId && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[8px] font-bold">CC: {level.costCenterId.substring(0,4)}</span>}
                                  {level.standardItemId && <span className="px-1.5 py-0.5 bg-sky-50 text-sky-600 rounded text-[8px] font-bold">SI: {level.standardItemId.substring(0,4)}</span>}
                              </div>
                          )}
                      </div>
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
                </div>
              </motion.div>
              {!isBeingDragged && renderWbsTree(level.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  if (!selectedProject) return null;

  const milestones = activities.filter(a => a.activityType === 'Milestone');
  const page = { 
    id: '2.2.1', 
    title: t('wbs_hierarchy'), 
    type: 'terminal', 
    domain: 'Planning', 
    focusArea: 'Scope' 
  } as Page;

  return (
    <StandardProcessPage
      page={page}
      ribbon={
        <Ribbon 
          groups={ribbonGroups}
          activeTabId={view}
          onTabChange={(id) => {
             setView(id as any);
             setHierarchySubView('list');
          }}
        />
      }
    >
      <div className="pb-12">
        <AnimatePresence mode="wait">
          {view === 'hierarchy' && hierarchySubView === 'add_level' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 overflow-auto bg-white">
              <div className="max-w-3xl mx-auto p-12">
                <div className="flex items-center justify-between mb-12">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{isRtl ? 'إضافة مستوى جديد' : 'Add New Level'}</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{isRtl ? 'تعريف هيكل تقسيم العمل' : 'Define WBS structure'}</p>
                  </div>
                  <button onClick={() => setHierarchySubView('list')} className="p-3 hover:bg-slate-100 rounded-2xl transition-all border border-slate-200">
                    <X className="w-6 h-6 text-slate-900" />
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">{isRtl ? 'نوع المستوى' : 'Level Type'}</label>
                      <select 
                        value={newLevelData.type}
                        onChange={(e) => {
                          const type = e.target.value as any;
                          setNewLevelData({ ...newLevelData, type, parentId: '' });
                        }}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-930 outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand"
                      >
                        <option value="Zone">Zone</option>
                        <option value="Area">Area</option>
                        <option value="Building">Building</option>
                        <option value="Floor">Floor</option>
                        <option value="Deliverable">Deliverable</option>
                        <option value="Phase">Phase</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">{isRtl ? 'المستوى الأب' : 'Parent Level'}</label>
                      <select 
                        value={newLevelData.parentId}
                        onChange={(e) => setNewLevelData({ ...newLevelData, parentId: e.target.value })}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-930 outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand"
                      >
                        <option value="">{isRtl ? 'مستوى رئيسي' : 'Root Level'}</option>
                        {wbsLevels
                          .filter(l => l.type !== 'Work Package' && (hierarchyRules[newLevelData.type] || []).includes(l.type))
                          .map(l => (
                            <option key={l.id} value={l.id}>{l.code} - {l.title}</option>
                          ))
                        }
                      </select>
                    </div>

                    <div className="col-span-2 space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">{isRtl ? 'العنوان' : 'Title'}</label>
                      <input 
                        type="text"
                        value={newLevelData.title}
                        onChange={(e) => setNewLevelData({ ...newLevelData, title: e.target.value })}
                        placeholder={isRtl ? 'أدخل عنوان المستوى' : 'Enter level title'}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-930 outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-12">
                    <button onClick={() => setHierarchySubView('list')} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-3xl font-black uppercase text-[11px] tracking-widest">{isRtl ? 'إلغاء' : 'Cancel'}</button>
                    <button 
                      onClick={async () => {
                        if (!selectedProject || !newLevelData.title) return;
                        try {
                          const id = crypto.randomUUID();
                          const parent = wbsLevels.find(l => l.id === newLevelData.parentId);
                          const code = generateCode(newLevelData.type, newLevelData.parentId, wbsLevels);
                          
                          const level: WBSLevel = {
                            id,
                            projectId: selectedProject.id,
                            title: newLevelData.title,
                            type: newLevelData.type,
                            level: parent ? parent.level + 1 : 1,
                            code,
                            status: 'Not Started',
                            parentId: newLevelData.parentId || ''
                          };
                          await setDoc(doc(db, 'wbs', id), cleanObject(level));
                          toast.success(isRtl ? 'تمت إضافة المستوى بنجاح' : 'Level added successfully');
                          setHierarchySubView('list');
                        } catch (err) {
                          handleFirestoreError(err, OperationType.WRITE, 'wbs');
                        }
                      }}
                      className="flex-[2] py-5 bg-brand text-white rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-brand/20 active:scale-95 transition-all"
                    >
                      {isRtl ? 'حفظ المستوى' : 'Save Level'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'hierarchy' && hierarchySubView === 'list' && (
            <motion.div 
              key="hierarchy-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
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
                        onClick={() => setHierarchySubView('add_level')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all shadow-md"
                      >
                        <Plus className="w-4 h-4" />
                        {t('add_level')}
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl p-8 min-h-[400px]">
                    {loading ? (
                      <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      </div>
                    ) : wbsLevels.length === 0 ? (
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
            </motion.div>
          )}

          {view === 'hierarchy' && hierarchySubView === 'edit_wbs' && editingWbs && (
              <motion.div 
                 key="edit-wbs"
                 initial={{ opacity: 0, scale: 0.98 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.98 }}
                 className="bg-white rounded-3xl p-8 max-w-4xl mx-auto shadow-xl border border-slate-200"
              >
                 <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">WBS Dictionary: {editingWbs.code}</h3>
                    <button onClick={() => setHierarchySubView('list')} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Technical Title</label>
                        <input 
                          type="text" 
                          value={editingWbs.title}
                          onChange={e => setEditingWbs({...editingWbs, title: e.target.value})}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none text-base font-bold transition-all"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Classification Type</label>
                          <select 
                            value={editingWbs.type}
                            onChange={e => setEditingWbs({...editingWbs, type: e.target.value as any})}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-bold transition-all appearance-none cursor-pointer"
                          >
                            <option value="Zone">Zone</option>
                            <option value="Area">Area</option>
                            <option value="Building">Building</option>
                            <option value="Floor">Floor</option>
                            <option value="Cost Account">Cost Account</option>
                            <option value="Work Package">Work Package</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Current Status</label>
                          <select 
                            value={editingWbs.status || 'Not Started'}
                            onChange={e => setEditingWbs({...editingWbs, status: e.target.value as any})}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-bold transition-all appearance-none cursor-pointer"
                          >
                            <option value="Not Started">Not Started</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Delayed">Delayed</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {editingWbs.type === 'Work Package' && (
                        <div>
                          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Associated Cost Account (Division)</label>
                          <select 
                            value={editingWbs.divisionCode || '01'}
                            onChange={e => setEditingWbs({...editingWbs, divisionCode: e.target.value, costCenterId: e.target.value})}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-bold transition-all"
                          >
                            {masterFormatData.map(div => (
                              <optgroup key={`edit-grp-${div.number}`} label={`${div.number} - ${div.title}`}>
                                <option value={div.number}>{div.number} - {div.title}</option>
                                {div.items.map(item => (
                                  <option key={item.code} value={item.code}>
                                    &nbsp;&nbsp;{item.code} - {item.title}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Parent Reference</label>
                        <select 
                          value={editingWbs.parentId || ''}
                          onChange={e => setEditingWbs({...editingWbs, parentId: e.target.value})}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-bold"
                        >
                          {editingWbs.type !== 'Work Package' && <option value="">None (Root Level)</option>}
                          {wbsLevels
                            .filter(l => l.id !== editingWbs.id && (hierarchyRules[editingWbs.type] || []).includes(l.type))
                            .map(l => (
                              <option key={`parent-${l.id}`} value={l.id}>{l.code} - {l.title} ({l.type})</option>
                            ))
                          }
                        </select>
                      </div>
                    </div>
                 </div>

                 <div className="flex gap-4 mt-12 pt-8 border-t border-slate-100">
                    <button 
                      onClick={() => setHierarchySubView('list')}
                      className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={async () => {
                         try {
                           let updatedWbs = { ...editingWbs };
                           if (updatedWbs.type === 'Cost Account') {
                             const div = masterFormatDivisions.find(d => `${d.id} - ${d.title}` === updatedWbs.title || d.title === updatedWbs.title);
                             const divCode = div ? div.id : (updatedWbs.title.match(/\d+/)?.[0] || '01');
                             updatedWbs.divisionCode = divCode;
                             updatedWbs.costCenterId = divCode;
                           } else if (updatedWbs.type === 'Work Package') {
                              const parent = wbsLevels.find(l => l.id === updatedWbs.parentId);
                              if (!updatedWbs.divisionCode && parent && parent.divisionCode) {
                                 updatedWbs.divisionCode = parent.divisionCode;
                                 updatedWbs.costCenterId = parent.divisionCode;
                              }
                           }
                           await setDoc(doc(db, 'wbs', editingWbs.id), updatedWbs);
                           if (updatedWbs.parentId) await rollupToParent('division', updatedWbs.parentId);
                           setHierarchySubView('list');
                           setEditingWbs(null);
                         } catch (err) {
                           handleFirestoreError(err, OperationType.WRITE, 'wbs');
                         }
                      }}
                      className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20"
                    >
                      Apply Changes
                    </button>
                 </div>
              </motion.div>
          )}

          {view === 'costaccount' && (
            <motion.div key="costaccount-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <UniversalDataTable 
                config={costGridConfig}
                data={wbsLevels.filter(l => {
                  if (l.type !== 'Cost Account') return false;
                  const isArchived = (l as any).archived || false;
                  return showArchived ? isArchived : !isArchived;
                })}
                onRowClick={handleEditWbs}
                onDeleteRecord={handleDeleteWbs}
                onArchiveRecord={handleArchiveWbs}
                showArchived={showArchived}
                onToggleArchived={() => setShowArchived(!showArchived)}
                onInlineSave={handleInlineSaveWbs}
                title={stripNumericPrefix(t('cost_accounts'))}
                favoriteControl={null}
              />
            </motion.div>
          )}

          {view === 'packages' && hierarchySubView === 'list' && (
            <motion.div key="packages-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <UniversalDataTable 
                config={packagesGridConfig}
                data={wbsLevels.filter(l => {
                  if (l.type !== 'Work Package') return false;
                  const isArchived = (l as any).archived || false;
                  return showArchived ? isArchived : !isArchived;
                })}
                onRowClick={handleEditPackage}
                onDeleteRecord={handleDeleteWbs}
                onArchiveRecord={handleArchiveWbs}
                showArchived={showArchived}
                onToggleArchived={() => setShowArchived(!showArchived)}
                onInlineSave={handleInlineSaveWbs}
                title={stripNumericPrefix(t('work_packages'))}
                favoriteControl={null}
                primaryAction={{
                  label: t('add_work_package'),
                  icon: Plus,
                  onClick: () => {
                     setNewPackage({ title: '', description: '', divisionId: '01', wbsId: '', status: 'Active' });
                     setEditingPackage(null);
                     setHierarchySubView('add_package');
                  }
                }}
              />
            </motion.div>
          )}

          {(view === 'packages' || view === 'hierarchy') && hierarchySubView === 'add_package' && (
              <motion.div 
                 key="add-package-form"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 className="bg-white rounded-[2.5rem] p-10 max-w-4xl mx-auto border border-slate-200 shadow-2xl"
              >
                 <div className="flex items-center justify-between mb-10">
                    <div>
                      <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
                        {editingPackage ? 'Edit Work Package' : 'New Work Package'}
                      </h3>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">Define scope and association for this terminal node</p>
                    </div>
                    <button onClick={() => setHierarchySubView('list')} className="p-3 hover:bg-slate-50 rounded-2xl transition-all border border-slate-100 shadow-sm"><X className="w-6 h-6 text-slate-400" /></button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-8">
                       <div>
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Package Title</label>
                          <input 
                             type="text" 
                             value={editingPackage ? editingPackage.title : newPackage.title}
                             onChange={e => editingPackage ? setEditingPackage({...editingPackage, title: e.target.value}) : setNewPackage({...newPackage, title: e.target.value})}
                             className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-[2rem] outline-none focus:ring-8 focus:ring-brand/5 focus:border-brand transition-all font-bold text-lg"
                             placeholder="Enter work package title..."
                          />
                       </div>
                       <div>
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Detailed Scope</label>
                          <textarea 
                             value={editingPackage ? editingPackage.description : newPackage.description}
                             onChange={e => editingPackage ? setEditingPackage({...editingPackage, description: e.target.value}) : setNewPackage({...newPackage, description: e.target.value})}
                             className="w-full px-8 py-6 bg-slate-50 border border-slate-200 rounded-[2rem] outline-none focus:ring-8 focus:ring-brand/5 focus:border-brand transition-all min-h-[160px] font-medium text-slate-700"
                             placeholder="What is included in this package?"
                          />
                       </div>
                    </div>

                    <div className="space-y-8">
                       <div className="grid grid-cols-1 gap-8">
                          <div>
                             <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Division (Cost Center)</label>
                             <select 
                               value={editingPackage ? (editingPackage as any).divisionId : newPackage.divisionId}
                               onChange={e => {
                                  editingPackage ? setEditingPackage({...editingPackage, divisionId: e.target.value as any, costCenterId: e.target.value}) : setNewPackage({...newPackage, divisionId: e.target.value});
                               }}
                               className="w-full px-8 py-5 bg-white border-2 border-slate-100 rounded-[2rem] outline-none focus:border-brand transition-all font-bold appearance-none cursor-pointer"
                             >
                               {masterFormatDivisions.map(div => (
                                 <option key={`div-${div.id}`} value={div.id}>{div.id} - {div.title}</option>
                               ))}
                             </select>
                          </div>
                          <div>
                             <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 block">WBS Anchor Point</label>
                             <select 
                               value={editingPackage ? editingPackage.parentId : newPackage.wbsId}
                               onChange={e => {
                                 const sid = e.target.value;
                                 const selectedWbs = wbsLevels.find(l => l.id === sid);
                                 if (editingPackage) {
                                    setEditingPackage({...editingPackage, parentId: sid, divisionId: (selectedWbs?.divisionCode || (editingPackage as any).divisionId) as any});
                                 } else {
                                    setNewPackage({...newPackage, wbsId: sid, divisionId: selectedWbs?.divisionCode || '01'});
                                 }
                               }}
                               className="w-full px-8 py-5 bg-white border-2 border-slate-100 rounded-[2rem] outline-none focus:border-brand transition-all font-bold appearance-none cursor-pointer"
                             >
                               <option value="">General / Project Wide</option>
                               {wbsLevels.map(l => (
                                 <option key={`wbs-${l.id}`} value={l.id}>{l.code} - {l.title} ({l.type})</option>
                               ))}
                             </select>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="flex gap-4 mt-16">
                    <button 
                      onClick={() => { setHierarchySubView('list'); setEditingPackage(null); }}
                      className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.3em] hover:bg-slate-200 transition-all border border-slate-200"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={editingPackage ? () => handleUpdateWorkPackage(editingPackage.id, editingPackage) : handleAddWorkPackage}
                      className="flex-[2] py-5 bg-brand text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl shadow-brand/20 hover:bg-brand/90 transition-all"
                    >
                      {editingPackage ? 'Update Package' : 'Initialize Package'}
                    </button>
                 </div>
              </motion.div>
          )}

          {view === 'milestones' && (
            <motion.div key="milestones-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <UniversalDataTable 
                config={{
                  id: 'milestones',
                  label: t('milestones'),
                  icon: Flag,
                  collection: 'activities',
                  columns: [
                    { key: 'description', label: t('milestone_title'), type: 'string' },
                    { key: 'plannedFinish', label: t('date'), type: 'date' },
                    { key: 'status', label: t('status'), type: 'badge' }
                  ]
                }}
                data={milestones.filter(m => {
                  const isArchived = (m as any).archived || false;
                  return showArchived ? isArchived : !isArchived;
                })}
                onRowClick={(m) => setEditingActivity(m as any)}
                onDeleteRecord={async (id) => {
                  try {
                    await deleteDoc(doc(db, 'activities', id));
                    toast.success('Milestone deleted');
                  } catch (err) {
                    handleFirestoreError(err, OperationType.DELETE, 'activities');
                  }
                }}
                onArchiveRecord={handleArchiveActivity}
                showArchived={showArchived}
                onToggleArchived={() => setShowArchived(!showArchived)}
                title={stripNumericPrefix(t('milestones'))}
                favoriteControl={null}
                primaryAction={{
                  label: t('add_milestone'),
                  icon: Plus,
                  onClick: () => setShowAddMilestone(true)
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Modals for specific complex data types */}
        {/* Removed Floating AddWBSLevelModal - Now inline */}

        <AnimatePresence>
          {deleteConfirmation && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setDeleteConfirmation(null)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[2.5rem] p-10 w-full max-w-sm shadow-2xl border border-slate-100 flex flex-col items-center text-center overflow-hidden relative"
                onClick={e => e.stopPropagation()}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16" />
                <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mb-6 relative">
                  <Trash2 className="w-10 h-10 text-red-500" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full border-4 border-white flex items-center justify-center">
                    <X className="w-3 h-3 text-white" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic mb-3">
                  {t('confirm_deletion')}
                </h3>
                
                <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
                  {isRtl ? (
                    <>هل أنت متأكد من حذف <span className="font-bold text-slate-900">"{deleteConfirmation.title}"</span>؟ هذا الإجراء لا يمكن التراجع عنه.</>
                  ) : (
                    <>Are you sure you want to delete <span className="font-bold text-slate-900">"{deleteConfirmation.title}"</span>? This action cannot be undone.</>
                  )}
                  {deleteConfirmation.type === 'wbs' && (
                    <span className="block mt-2 text-[10px] text-red-500 font-bold uppercase tracking-widest bg-red-50 py-1 rounded">
                      {isRtl ? 'سيتم حذف جميع المستويات الفرعية والحزم والأنشطة' : 'Will delete all child levels & packages'}
                    </span>
                  )}
                </p>

                <div className="flex flex-col w-full gap-3">
                  <button 
                    onClick={() => {
                      if (deleteConfirmation.type === 'wbs') executeDeleteWbs(deleteConfirmation.id);
                      else executeDeleteWorkPackage(deleteConfirmation.id);
                      setDeleteConfirmation(null);
                    }}
                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-red-600/20 active:scale-95 transition-all"
                  >
                    {isRtl ? 'تأكيد الحذف' : 'Confirm Delete'}
                  </button>
                  <button 
                    onClick={() => setDeleteConfirmation(null)} 
                    className="w-full py-4 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StandardProcessPage>
  );
};
