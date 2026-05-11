import React, { useState } from 'react';
import { ExternalLink, Plus, X } from 'lucide-react';
import { FileTable } from './FileTable';
import { DriveUploadButton } from './DriveUploadButton';

interface DocumentManagerProps {
  files: any[];
  driveFolderUrl: string;
  onUpload: (file: File, metadata: { name: string; type: string }) => void;
  onDownload: (file: any) => void;
  onDelete: (file: any) => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({ files, driveFolderUrl, onUpload, onDownload, onDelete }) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-800">Document Hub</h3>
        <div className="flex gap-3">
          <a href={driveFolderUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200">
            <ExternalLink className="w-4 h-4" />
            Open Drive Folder
          </a>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 shadow-xl shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Upload Digital Asset
          </button>
        </div>
      </div>
      
      <FileTable files={files} onDownload={onDownload} onDelete={onDelete} />
      
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-lg w-full space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-slate-800">Upload Document</h3>
              <button onClick={() => setIsUploadModalOpen(false)}><X className="w-6 h-6 text-slate-500" /></button>
            </div>
            
            <DriveUploadButton onUpload={(file) => {
                onUpload(file, { name: file.name, type: 'Other' });
                setIsUploadModalOpen(false);
            }} />
          </div>
        </div>
      )}
    </div>
  );
};
