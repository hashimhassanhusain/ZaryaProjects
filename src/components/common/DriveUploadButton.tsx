import React, { useRef, useState } from 'react';
import { Cloud, Loader2, Upload } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';

interface DriveUploadButtonProps {
  drivePath: string;
  onUploadSuccess?: (fileId: string) => void;
  label?: string;
}

export const DriveUploadButton: React.FC<DriveUploadButtonProps> = ({ drivePath, onUploadSuccess, label }) => {
  const { selectedProject } = useProject();
  const { t } = useLanguage();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject?.driveFolderId) return;

    setIsUploading(true);
    const toastId = toast.loading(`${t('uploading') || 'Uploading'} to Google Drive...`);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectRootId', selectedProject.driveFolderId);
      formData.append('path', drivePath);

      const response = await fetch('/api/drive/upload-by-path', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      toast.success(t('upload_success') || 'File uploaded successfully!', { id: toastId });
      onUploadSuccess?.(data.fileId);
    } catch (err) {
      console.error(err);
      toast.error(t('upload_failed') || 'Upload failed', { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
        disabled={isUploading || !selectedProject?.driveFolderId}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-50 dark:hover:bg-white/10 transition-all disabled:opacity-50"
      >
        {isUploading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Upload className="w-3.5 h-3.5" />
        )}
        {label || t('upload_to_drive') || 'Upload to Drive'}
      </button>
    </>
  );
};
