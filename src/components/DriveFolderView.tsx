import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FolderOpen, FileText, Download, ExternalLink, ChevronRight, Clock, User, HardDrive, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/UserContext';
import { cn } from '../lib/utils';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
  modifiedTime?: string;
  createdTime?: string;
  version?: string;
  lastModifyingUser?: {
    displayName: string;
    photoLink?: string;
  };
}

export const DriveFolderView: React.FC = () => {
  const { folderId } = useParams();
  const { selectedProject } = useProject();
  const { userProfile, isAdmin } = useAuth();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      if (!folderId) return;

      // Permission Check
      if (!isAdmin && userProfile) {
        const permission = userProfile.folderPermissions?.[folderId];
        const isRootFolder = selectedProject?.driveFolderId === folderId;
        
        if (!permission || permission === 'none') {
          if (!isRootFolder) {
            setError('ACCESS_DENIED');
            setLoading(false);
            return;
          }
        }
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/drive/files/${folderId}?details=true`);
        const data = await response.json();
        if (data.files) {
          setFiles(data.files);
        } else {
          setError(data.error || 'Failed to load files');
        }
      } catch (err) {
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [folderId]);

  const formatSize = (bytes?: string) => {
    if (!bytes) return 'N/A';
    const b = parseInt(bytes);
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error === 'ACCESS_DENIED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-white rounded-[2rem] border border-slate-200">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-rose-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Unauthorized Access</h2>
        <p className="text-slate-500 max-w-md">
          You do not have permission to view the contents of this folder.
          Please contact your administrator if you believe this is an error.
        </p>
        <button 
          onClick={() => window.history.back()}
          className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
        >
          Return to Explorer
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-xl border border-red-100">
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder').filter(folder => {
    if (isAdmin || !userProfile) return true;
    const permission = userProfile.folderPermissions?.[folder.id];
    return permission && permission !== 'none';
  });
  const dataFiles = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 flex items-center">
          <FolderOpen className="w-6 h-6 mr-2 text-blue-600" />
          Project Explorer
        </h2>
      </div>

      {folders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map(folder => (
            <Link
              key={folder.id}
              to={`/explorer/${folder.id}`}
              className="flex items-center p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mr-3 group-hover:bg-blue-600 transition-colors">
                <FolderOpen className="w-5 h-5 text-blue-600 group-hover:text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">{folder.name}</div>
                <div className="text-[10px] text-slate-500">Folder</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
            </Link>
          ))}
        </div>
      )}

      {dataFiles.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">File Name</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Version</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Modified By</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Modified Date</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Size</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataFiles.map((file, index) => (
                  <motion.tr
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={file.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-2 text-slate-400" />
                        <span className="text-sm font-medium text-slate-900">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        v{file.version || '1.0'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center text-xs text-slate-600">
                        <User className="w-3 h-3 mr-1 text-slate-400" />
                        {file.lastModifyingUser?.displayName || 'System'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center text-xs text-slate-600">
                        <Clock className="w-3 h-3 mr-1 text-slate-400" />
                        {formatDate(file.modifiedTime)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center text-xs text-slate-600 font-mono">
                        <HardDrive className="w-3 h-3 mr-1 text-slate-400" />
                        {formatSize(file.size)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Open in Drive"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        folders.length === 0 && (
          <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">This folder is empty</p>
          </div>
        )
      )}
    </div>
  );
};
