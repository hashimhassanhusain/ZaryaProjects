import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, List } from 'lucide-react';
import { doc, setDoc, collection } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { WBSLevel, Project } from '../types';
import { masterFormatDivisions } from '../data';
import { masterFormatSections } from '../constants/masterFormat';
import { toast } from 'react-hot-toast';

interface AddWBSLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProject: Project | null;
  wbsLevels: WBSLevel[];
  initialType?: 'Zone' | 'Area' | 'Building' | 'Cost Account' | 'Work Package' | 'Other';
  initialParentId?: string;
  initialDivisionId?: string;
  onSuccess?: (newLevelId: string) => void;
}

export const AddWBSLevelModal: React.FC<AddWBSLevelModalProps> = ({
  isOpen,
  onClose,
  selectedProject,
  wbsLevels,
  initialType = 'Zone',
  initialParentId = '',
  initialDivisionId = '01',
  onSuccess
}) => {
  const [newWbs, setNewWbs] = useState({
    title: '',
    type: initialType as any,
    parentId: initialParentId,
    divisionId: initialDivisionId
  });
  const [isManualWbsTitle, setIsManualWbsTitle] = useState(false);

  const hierarchyRules: Record<string, string[]> = {
    'Zone': [],
    'Area': ['Zone'],
    'Building': ['Area', 'Zone'],
    'Cost Account': ['Building', 'Area', 'Zone'],
    'Work Package': ['Cost Account']
  };

  useEffect(() => {
    if (isOpen) {
      setNewWbs({
        title: '',
        type: initialType,
        parentId: initialParentId,
        divisionId: initialDivisionId
      });
      setIsManualWbsTitle(false);
    }
  }, [isOpen, initialType, initialParentId, initialDivisionId]);

  // Handle type change impacts on parentId
  useEffect(() => {
    if (!isOpen) return;
    
    const allowedParents = hierarchyRules[newWbs.type] || [];
    const parent = wbsLevels.find(l => l.id === newWbs.parentId);
    
    if (newWbs.type === 'Work Package') {
      // If we switched to Work Package and current parent isn't a Cost Account, find the first available CA
      if (!parent || parent.type !== 'Cost Account') {
        const firstCA = wbsLevels.find(l => l.type === 'Cost Account');
        setNewWbs(prev => ({ ...prev, parentId: firstCA?.id || '' }));
      }
    } else if (newWbs.type === 'Zone') {
      setNewWbs(prev => ({ ...prev, parentId: '' }));
    } else if (parent && !allowedParents.includes(parent.type)) {
      setNewWbs(prev => ({ ...prev, parentId: '' }));
    }
  }, [newWbs.type, isOpen]);

  const generateCode = (type: string, parentId: string | undefined, levels: WBSLevel[], divisionCode?: string) => {
    const parent = levels.find(l => l.id === parentId);
    const siblings = levels.filter(l => l.parentId === parentId && l.type === type);
    
    let prefix = '';
    if (parent) {
      prefix = parent.code + '-';
    }

    const nextNum = siblings.length + 1;
    const paddedNum = nextNum.toString().padStart(2, '0');

    switch (type) {
      case 'Zone': return `Z${nextNum}`;
      case 'Area': return `${prefix}A${nextNum}`;
      case 'Building': return `${prefix}B${nextNum}`;
      case 'Cost Account': return `${prefix}CA${divisionCode || '01'}`;
      case 'Work Package': return `${prefix}WP${paddedNum}`;
      default: return `${prefix}${nextNum}`;
    }
  };

  const handleAddWbs = async () => {
    if (!selectedProject || !newWbs.title) {
        toast.error('Please enter a title');
        return;
    }
    
    try {
      let activeParentId = newWbs.parentId;

      // Special handling for Work Package: ensure Cost Account level exists
      if (newWbs.type === 'Work Package') {
        const parent = wbsLevels.find(l => l.id === activeParentId);
        
        // If parent is already a Cost Account, use it directly
        if (parent && parent.type === 'Cost Account') {
          // Division id should match the parent if it's a CA? 
          // Usually yes, but we use the parent itself as activeParentId
        } else {
          // If parent is not a CA (legacy support or 'None'), find or create one
          const division = masterFormatDivisions.find(d => d.id === newWbs.divisionId);
          const caTitle = division ? `${division.id} - ${division.title}` : `Division ${newWbs.divisionId}`;
          
          let caLevel = wbsLevels.find(l => 
            l.type === 'Cost Account' && 
            l.divisionCode === (newWbs.divisionId || '01') && 
            (activeParentId ? l.parentId === activeParentId : !l.parentId)
          );

          if (!caLevel) {
            const caId = crypto.randomUUID();
            const currentDivisionId = newWbs.divisionId || '01';
            const caCode = generateCode('Cost Account', activeParentId || undefined, wbsLevels, currentDivisionId);
            const newCaLevel: any = {
              id: caId,
              projectId: selectedProject.id,
              title: caTitle,
              type: 'Cost Account',
              code: caCode,
              status: 'Not Started',
              divisionCode: currentDivisionId,
              level: activeParentId ? (wbsLevels.find(l => l.id === activeParentId)?.level || 0) + 1 : 1
            };
            if (activeParentId) newCaLevel.parentId = activeParentId;
            
            await setDoc(doc(db, 'wbs', caId), newCaLevel);
            activeParentId = caId;
          } else {
            activeParentId = caLevel.id;
          }
        }
      }

      const parent = wbsLevels.find(l => l.id === activeParentId);
      
      let divisionCode = '';
      if (newWbs.type === 'Cost Account') {
        const div = masterFormatDivisions.find(d => `${d.id} - ${d.title}` === newWbs.title || d.title === newWbs.title);
        divisionCode = div ? div.id : (newWbs.title.match(/\d+/)?.[0] || '01');
      } else if (newWbs.type === 'Work Package') {
        divisionCode = newWbs.divisionId || '01';
      }

      const code = generateCode(newWbs.type, activeParentId || undefined, wbsLevels, divisionCode);
      const levelId = crypto.randomUUID();

      const level: any = {
        id: levelId,
        projectId: selectedProject.id,
        title: newWbs.title,
        type: newWbs.type,
        code,
        status: 'Not Started',
        level: parent ? parent.level + 1 : 1
      };

      if (activeParentId) level.parentId = activeParentId;
      if (divisionCode) level.divisionCode = divisionCode;

      await setDoc(doc(db, 'wbs', levelId), level);
      toast.success('Level added successfully');
      if (onSuccess) onSuccess(levelId);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'wbs');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-slate-100"
          >
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-slate-900">Add WBS Level</h3>
                <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                </button>
            </div>

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
                    let divisionId = newWbs.divisionId || '01';
                    
                    if (type === 'Work Package') {
                      divisionId = '01';
                    }
                    
                    setNewWbs({...newWbs, type, parentId, divisionId});
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
              {newWbs.type === 'Work Package' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cost Account</label>
                  <select 
                    value={newWbs.divisionId}
                    onChange={e => setNewWbs({...newWbs, divisionId: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {masterFormatDivisions.map(div => (
                      <option key={div.id} value={div.id}>{div.id} - {div.title}</option>
                    ))}
                  </select>
                </div>
              )}
              {newWbs.type === 'Cost Account' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cost Account Title</label>
                  <div className="space-y-2">
                    {!isManualWbsTitle ? (
                      <select 
                        value={masterFormatDivisions.some(d => `${d.id} - ${d.title}` === newWbs.title) ? newWbs.title : ''}
                        onChange={e => {
                          if (e.target.value === 'manual') {
                            setIsManualWbsTitle(true);
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
                    ) : (
                      <div className="relative">
                        <input 
                          type="text" 
                          value={newWbs.title}
                          onChange={e => setNewWbs({...newWbs, title: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                          placeholder="Enter custom cost account title..."
                          autoFocus
                        />
                        <button 
                          onClick={() => setIsManualWbsTitle(false)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
                        >
                          <List className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : newWbs.type === 'Work Package' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Work Package Title</label>
                  <div className="space-y-2">
                    {!isManualWbsTitle ? (
                      <select 
                        value={masterFormatSections.some(s => s.title === newWbs.title) ? newWbs.title : ''}
                        onChange={e => {
                          if (e.target.value === 'manual') {
                            setIsManualWbsTitle(true);
                            setNewWbs({...newWbs, title: ''});
                          } else {
                            setNewWbs({...newWbs, title: e.target.value});
                          }
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Select Work Package...</option>
                        {masterFormatSections
                          .filter(s => s.divisionId === (newWbs.divisionId || '01'))
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
                          value={newWbs.title}
                          onChange={e => setNewWbs({...newWbs, title: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                          placeholder="Enter custom work package title..."
                          autoFocus
                        />
                        <button 
                          onClick={() => setIsManualWbsTitle(false)}
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
                  {newWbs.type === 'Work Package' ? 'Parent Cost Account' : 'Parent Level'}
                </label>
                <select 
                  value={newWbs.parentId}
                  onChange={e => setNewWbs({...newWbs, parentId: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {newWbs.type !== 'Work Package' && <option value="">None (Root Level)</option>}
                  {wbsLevels
                    .filter(l => (hierarchyRules[newWbs.type] || []).includes(l.type))
                    .map(l => (
                      <option key={l.id} value={l.id}>{l.title} ({l.type})</option>
                    ))
                  }
                </select>
                {newWbs.type === 'Work Package' && wbsLevels.filter(l => l.type === 'Cost Account').length === 0 && (
                  <p className="mt-1 text-[10px] text-rose-500 font-bold uppercase tracking-wider">
                    No Cost Accounts available. Create one first.
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-6">
                <button 
                  onClick={onClose}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddWbs}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-sm"
                >
                  Create Level
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
