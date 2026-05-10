import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, List } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { WBSLevel, Project, CostCenter, StandardItem } from '../types';
import { getCostCenters, getStandardItems } from '../services/masterDataService';
import { toast } from 'react-hot-toast';
import { rollupToParent } from '../services/rollupService';

interface AddWBSLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProject: Project | null;
  wbsLevels: WBSLevel[];
  initialType?: 'Zone' | 'Area' | 'Building' | 'Floor' | 'Work Package' | 'Deliverable' | 'Phase' | 'Other';
  initialParentId?: string;
  onSuccess?: (newLevelId: string) => void;
}

export const AddWBSLevelModal: React.FC<AddWBSLevelModalProps> = ({
  isOpen,
  onClose,
  selectedProject,
  wbsLevels,
  initialType = 'Zone',
  initialParentId = '',
  onSuccess
}) => {
  const [newWbs, setNewWbs] = useState({
    title: '',
    type: initialType as any,
    parentId: initialParentId,
    costCenterId: '',
    standardItemId: ''
  });
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [standardItems, setStandardItems] = useState<StandardItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setNewWbs({
        title: '',
        type: initialType,
        parentId: initialParentId,
        costCenterId: '',
        standardItemId: ''
      });
      getCostCenters().then(setCostCenters);
      getStandardItems().then(setStandardItems);
    }
  }, [isOpen]);

  const handleAddWbs = async () => {
    if (!selectedProject || !newWbs.title) {
        toast.error('Please enter a title');
        return;
    }
    
    try {
      const parent = wbsLevels.find(l => l.id === newWbs.parentId);
      const code = `${newWbs.title.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
      const levelId = crypto.randomUUID();

      const level: WBSLevel = {
        id: levelId,
        projectId: selectedProject.id,
        title: newWbs.title,
        type: newWbs.type,
        level: parent ? parent.level + 1 : 1,
        code,
        status: 'Not Started',
        parentId: newWbs.parentId || undefined,
        costCenterId: newWbs.costCenterId || undefined,
        standardItemId: newWbs.standardItemId || undefined
      };

      await setDoc(doc(db, 'wbs', levelId), level);
      
      if (newWbs.parentId) {
        await rollupToParent('division', newWbs.parentId);
      }
      
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
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-slate-50">
                <h3 className="text-base font-bold text-slate-900">Add WBS Level</h3>
                <button onClick={onClose} className="p-1 hover:bg-slate-50 rounded-full transition-colors">
                    <X className="w-4 h-4 text-slate-400" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Title</label>
                <input 
                  type="text" 
                  value={newWbs.title || ''}
                  onChange={e => setNewWbs({...newWbs, title: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="e.g. South Zone, Villa 2, Floor 1"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Type</label>
                <select 
                  value={newWbs.type || 'Zone'}
                  onChange={e => setNewWbs({...newWbs, type: e.target.value as any})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  {['Zone', 'Area', 'Building', 'Floor', 'Work Package', 'Deliverable', 'Phase', 'Other'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              
              {newWbs.type === 'Work Package' && (
                <>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cost Center</label>
                    <select 
                      value={newWbs.costCenterId || ''}
                      onChange={e => setNewWbs({...newWbs, costCenterId: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="">Select Cost Center...</option>
                      {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Standard Item</label>
                    <select 
                      value={newWbs.standardItemId || ''}
                      onChange={e => setNewWbs({...newWbs, standardItemId: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="">Select Standard Item...</option>
                      {standardItems.map(si => <option key={si.id} value={si.id}>{si.title}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Parent Level</label>
                <select 
                  value={newWbs.parentId || ''}
                  onChange={e => setNewWbs({...newWbs, parentId: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="">None (Root Level)</option>
                  {wbsLevels.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                </select>
              </div>
            </div>

            <div className="flex-shrink-0 flex gap-2 p-4 border-t border-slate-50 bg-slate-50/50">
              <button 
                onClick={onClose}
                className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddWbs}
                className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-sm"
              >
                Create
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
