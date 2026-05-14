import React, { useRef, useState } from 'react';
import { Cloud, Loader2, Upload } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/UserContext';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import { DriveFolderPromptModal } from './DriveFolderPromptModal';
import { storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface DriveUploadButtonProps {
  drivePath: string;
  onUploadSuccess?: (fileId: string) => void;
  label?: string;
  customFileName?: string;
}

export const DriveUploadButton: React.FC<DriveUploadButtonProps> = ({ 
  drivePath, 
  onUploadSuccess, 
  label,
  customFileName 
}) => {
  const { selectedProject } = useProject();
  const { isAdmin } = useAuth();
  const { t, isRtl } = useLanguage();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPromptOpen, setIsPromptOpen] = useState(false);

  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const performUpload = async (file: File, projectRootId: string) => {
    setIsUploading(true);
    const toastId = toast.loading(isRtl ? '☁️ جاري الرفع إلى الخادم...' : '☁️ Uploading to buffer server...', { duration: 30000 });

    try {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      const finalName = customFileName ? (customFileName.endsWith(extension) ? customFileName : customFileName + extension) : file.name;
      
      let firebaseUrl = '';
      let driveFileId = '';
      
      const overriddenDrivePath = '.'; // Ignore folder hierarchies according to use request

      // 1. Try Firebase Storage Upload (Bypass Nginx limit)
      try {
        console.log(`🚀 [Drive Protocol] Step 1: Uploading buffer ${finalName}`);
        const bufferPath = `drive_temp/${selectedProject?.id || 'common'}/${Date.now()}_${finalName}`;
        const storageRef = ref(storage, bufferPath);
        const uploadResult = await uploadBytes(storageRef, file);
        firebaseUrl = await getDownloadURL(uploadResult.ref);
      } catch (storageErr) {
        console.warn('⚠️ [Firebase Storage] Buffer failed. Attempting direct fallback...', storageErr);
        
        toast.loading(isRtl ? '🔄 جاري الرفع المباشر...' : '🔄 Direct Upload Fallback...', { id: toastId });
        const directFormData = new FormData();
        directFormData.append('file', file);
        directFormData.append('projectRootId', projectRootId);
        directFormData.append('path', overriddenDrivePath);
        directFormData.append('fileName', finalName);
        directFormData.append('projectCode', selectedProject?.code || '16314');

        const directRes = await fetch('/api/drive/upload-by-path', {
          method: 'POST',
          body: directFormData
        });

        if (directRes.ok) {
          const data = await directRes.json();
          driveFileId = data.fileId;
          toast.success(isRtl ? '✅ تم الرفع بنجاح!' : '✅ Uploaded successfully!', { id: toastId });
          onUploadSuccess?.(driveFileId);
          return; // Exit success
        }
        throw storageErr; // Re-throw if fallback not possible or failed
      }
      
      toast.loading(isRtl ? '🔄 جاري المزامنة مع جوجل درايف...' : '🔄 Syncing with Google Drive...', { id: toastId });

      // 2. Drive Sync via URL (only if direct upload didn't happen)
      if (firebaseUrl) {
        const response = await fetch('/api/drive/upload-by-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectRootId: projectRootId,
            path: overriddenDrivePath,
            projectCode: selectedProject?.code || '16314',
            fileUrl: firebaseUrl,
            fileName: finalName,
            mimeType: file.type || 'application/octet-stream'
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Drive sync failed');
        }

        const data = await response.json();
        toast.success(isRtl ? '✅ تم الرفع والمزامنة بنجاح!' : '✅ Uploaded and synced successfully!', { id: toastId, duration: 4000 });
        onUploadSuccess?.(data.fileId);
      }
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? '❌ فشل الرفع' : '❌ Upload failed', { id: toastId, duration: 4000 });
    } finally {
      setIsUploading(false);
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;
    
    // Drive folder verification First
    let projectRootId = selectedProject.driveFolderId;
    if (!projectRootId || projectRootId.length < 5 || projectRootId === '.') {
       if (isAdmin) {
         setPendingFile(file);
         setIsPromptOpen(true);
       } else {
         toast.error(
           isRtl
             ? 'لم يتم العثور على مجلد المشروع الرئيسي. يرجى الاتصال بالآدمن.'
             : 'Project Main Folder not found. Please contact the Admin.',
           { duration: 4000 }
         );
       }
       if (fileInputRef.current) fileInputRef.current.value = '';
       return;
    }

    await performUpload(file, projectRootId);
  };

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUpload} 
        className="hidden" 
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading || !selectedProject}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-50 dark:hover:bg-white/10 transition-all disabled:opacity-50"
      >
        {isUploading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Upload className="w-3.5 h-3.5" />
        )}
        {label || t('upload_to_drive') || 'Upload to Drive'}
      </button>

      <DriveFolderPromptModal 
        isOpen={isPromptOpen}
        onClose={() => {
          setIsPromptOpen(false);
          setPendingFile(null);
        }}
        onSuccess={async (newFolderId) => {
          setIsPromptOpen(false);
          if (pendingFile) {
            await performUpload(pendingFile, newFolderId);
          }
        }}
      />
    </>
  );
};

