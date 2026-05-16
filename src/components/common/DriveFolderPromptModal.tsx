import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Folder, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useProject } from '../../context/ProjectContext';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

interface DriveFolderPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newFolderId: string) => void;
}

export const DriveFolderPromptModal: React.FC<DriveFolderPromptModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t, isRtl } = useLanguage();
  const { selectedProject, setSelectedProject } = useProject();
  const [folderId, setFolderId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !selectedProject) return null;

  const handleSave = async () => {
    if (!folderId || folderId.trim().length < 5 || folderId.includes('eFit1RP')) {
      toast.error(isRtl ? 'يرجى إدخال آي دي صحيح (لا يمكن استخدام المجلد العام)' : 'Please enter a valid Folder ID (General folder not allowed)');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading(isRtl ? 'جاري الحفظ...' : 'Saving...');
    
    try {
      const cleanId = folderId.trim();
      await updateDoc(doc(db, 'projects', selectedProject.id!), {
        driveFolderId: cleanId,
        updatedAt: new Date().toISOString()
      });
      
      // Update local context manually to avoid waiting for snapshot
      setSelectedProject({ ...selectedProject, driveFolderId: cleanId });
      
      toast.success(isRtl ? 'تم تحديث المجلد' : 'Folder updated successfully', { id: toastId });
      onSuccess(cleanId);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${selectedProject.id}`);
      toast.error(isRtl ? 'فشل الحفظ' : 'Failed to save', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir={isRtl ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Folder className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">
              {isRtl ? 'آي دي مجلد جوجل درايف' : 'Google Drive Folder ID'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm font-medium text-slate-600">
            {isRtl 
              ? 'لم يتم إعداد مجلد المشروع. يرجى إدخال الآي دي الخاص بمجلد المشروع الرئيسي في جوجل درايف.' 
              : 'The project folder is not set. Please enter the ID of the main project folder in Google Drive.'}
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              {isRtl ? 'آي دي المجلد' : 'Folder ID'}
            </label>
            <input
              type="text"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              placeholder="e.g. 1A2bC3dE4fG5..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
            />
          </div>
        </div>

        <div className="flex gap-3 p-6 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
          >
            {isRtl ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50"
          >
            {isRtl ? 'حفظ ومتابعة' : 'Save & Continue'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
