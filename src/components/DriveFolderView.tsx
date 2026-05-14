import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  FolderOpen, FileText, Download, ExternalLink, ChevronRight, 
  Clock, User, HardDrive, ShieldAlert, Folder, File, ChevronDown,
  Loader2, Search, Filter, MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/UserContext';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

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
  thumbnailLink?: string;
  lastModifyingUser?: {
    displayName: string;
    photoLink?: string;
  };
}

interface TreeItemProps {
  item: any;
  allFolders: any[];
  level?: number;
  currentId?: string;
}

const TreeItem: React.FC<TreeItemProps> = ({ item, allFolders, level = 0, currentId }) => {
  const isSelected = currentId === item.id;
  const children = allFolders.filter(f => f.parentId === item.id);
  const hasChildren = children.length > 0;
  const [isOpen, setIsOpen] = useState(isSelected || level < 1);

  return (
    <div className="select-none">
      <Link
        to={`/explorer/${item.id}`}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-all text-[11px] font-bold uppercase tracking-wider group",
          isSelected ? "bg-[#e5f3ff] text-blue-700 shadow-sm" : "text-slate-500 hover:bg-slate-100",
          level > 0 ? (item.parentId ? "ml-4" : "") : ""
        )}
      >
        <div className="flex items-center gap-1">
          {hasChildren ? (
            isOpen ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />
          ) : (
            <div className="w-3 h-3" />
          )}
          <Folder className={cn("w-4 h-4 text-blue-600 stroke-[2.5]", isSelected ? "fill-blue-100/50" : "fill-white")} />
        </div>
        <span className="truncate">{item.name}</span>
      </Link>
      {isOpen && hasChildren && (
        <div className="mt-0.5">
          {children.map(child => (
            <TreeItem key={child.id} item={child} allFolders={allFolders} level={level + 1} currentId={currentId} />
          ))}
        </div>
      )}
    </div>
  );
};

export const DriveFolderView: React.FC = () => {
  const { folderId } = useParams();
  const { selectedProject } = useProject();
  const { userProfile, isAdmin } = useAuth();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [allFolders, setAllFolders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (selectedProject?.driveFolderId) {
      fetchAllFolders(selectedProject.driveFolderId);
    }
  }, [selectedProject]);

  const fetchAllFolders = async (rootId: string) => {
    try {
      const res = await fetch(`/api/drive/folders-recursive/${rootId}`);
      if (res.ok) {
        const data = await res.json();
        setAllFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    }
  };

  useEffect(() => {
    const fetchFiles = async () => {
      if (!folderId) return;

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/drive/files/${folderId}?details=true`);
        if (!response.ok) {
           throw new Error('Server returned an error');
        }
        const data = await response.json().catch(() => ({}));
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
    if (!bytes) return '---';
    const b = parseInt(bytes);
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '---';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredItems = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    const aIsFolder = a.mimeType === 'application/vnd.google-apps.folder';
    const bIsFolder = b.mimeType === 'application/vnd.google-apps.folder';
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;
    return a.name.localeCompare(b.name);
  });

  if (error === 'ACCESS_DENIED') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-white rounded-[2rem] border border-slate-200">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6 text-rose-500">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Unauthorized Access</h2>
        <p className="text-slate-500 max-w-md">You do not have permission to view the contents of this folder.</p>
        <button onClick={() => window.history.back()} className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg">
          Return to Explorer
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[800px] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden relative font-sans">
      {/* ── Header Toolbar ── */}
      <header className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl">
             <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">{selectedProject?.name || 'Project Explorer'}</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Cloud Asset Gateway</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs w-64 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none font-medium"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* ── Column 1: Navigation Sidebar ── */}
        <aside className="w-72 border-r border-slate-100 overflow-y-auto no-scrollbar p-5 bg-slate-50/10">
          <div className="flex items-center gap-2 mb-4 px-1 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] opacity-80">
             Navigation
          </div>
          <div className="space-y-1">
            {selectedProject?.driveFolderId && (
              <TreeItem 
                item={{ id: selectedProject.driveFolderId, name: selectedProject.name }} 
                allFolders={allFolders}
                currentId={folderId}
              />
            )}
          </div>
        </aside>

        {/* ── Column 2: Main Area (Details) ── */}
        <main className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="flex-1 overflow-y-auto no-scrollbar relative">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-300">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Syncing Stream...</span>
              </div>
            ) : filteredItems.length > 0 ? (
              <table className="w-full text-left border-collapse table-fixed">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="border-b border-slate-100">
                    <th className="w-[50%] px-4 py-2 text-[11px] font-normal text-slate-500 border-r border-slate-100 hover:bg-slate-50 transition-colors uppercase tracking-tight">Name</th>
                    <th className="w-[20%] px-4 py-2 text-[11px] font-normal text-slate-500 border-r border-slate-100 hover:bg-slate-50 transition-colors uppercase tracking-tight">Modified</th>
                    <th className="w-[15%] px-4 py-2 text-[11px] font-normal text-slate-500 border-r border-slate-100 hover:bg-slate-50 transition-colors uppercase tracking-tight">Type</th>
                    <th className="w-[15%] px-4 py-2 text-[11px] font-normal text-slate-500 hover:bg-slate-50 transition-colors text-right pr-4 uppercase tracking-tight">Size</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  {filteredItems.map((item) => {
                    const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
                    const fileExt = item.name.split('.').pop()?.toUpperCase();
                    const isSelected = selectedFile?.id === item.id;

                    return (
                      <tr 
                        key={item.id} 
                        onClick={() => setSelectedFile(item)}
                        onDoubleClick={() => isFolder && (window.location.href = `/explorer/${item.id}`)}
                        className={cn(
                          "group transition-all cursor-default select-none h-9 border-b border-transparent",
                          isSelected ? "bg-[#e5f3ff] text-blue-700 font-medium" : "hover:bg-[#f5faff]"
                        )}
                      >
                        <td className="px-3 py-1 whitespace-nowrap overflow-hidden">
                          <div className="flex items-center gap-3">
                             {isFolder ? (
                               <Folder className="w-4 h-4 text-blue-600 stroke-[2.5] fill-white" />
                             ) : (
                               <File className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                             )}
                             <span className="text-[12px] truncate">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap overflow-hidden text-slate-400">
                          <span className="text-[11px]">{formatDate(item.modifiedTime)}</span>
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap overflow-hidden text-slate-400">
                          <span className="text-[11px]">{isFolder ? 'Folder' : `${fileExt} File`}</span>
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap overflow-hidden text-right pr-4 text-slate-400">
                          <span className="text-[11px]">{isFolder ? '' : formatSize(item.size)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 p-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 opacity-50">
                  <Search className="w-10 h-10" />
                </div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No matching items</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">Refine your search query to find specific files or folders.</p>
              </div>
            )}
          </div>
        </main>

        {/* ── Column 3: Preview Pane ── */}
        <aside className="w-80 border-l border-slate-100 bg-white flex flex-col overflow-y-auto no-scrollbar">
          {selectedFile ? (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Asset Identity Card */}
              <div className="p-8 flex flex-col items-center text-center bg-slate-50/30 border-b border-slate-50">
                <div className="w-44 h-56 bg-white shadow-2xl border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 relative group overflow-hidden">
                   {selectedFile.thumbnailLink ? (
                     <div className="absolute inset-0 w-full h-full">
                       <img src={selectedFile.thumbnailLink.replace('s220', 's800')} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                       <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-all" />
                     </div>
                   ) : (
                     <div className="flex flex-col items-center">
                        {selectedFile.mimeType.includes('folder') ? (
                          <Folder className="w-24 h-24 text-blue-600 stroke-[1.5] fill-blue-50/50" />
                        ) : (
                          <>
                            <File className="w-24 h-24 text-slate-100" />
                            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-blue-600 text-white text-[10px] font-black rounded-lg shadow-xl shadow-blue-500/30 uppercase tracking-widest">
                              {selectedFile.name.split('.').pop()}
                            </div>
                          </>
                        )}
                     </div>
                   )}
                </div>
                
                <div className="mt-8 px-4">
                  <h3 className="text-base font-black text-slate-900 leading-[1.1] tracking-tight line-clamp-2">{selectedFile.name}</h3>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[9px] font-bold rounded-full uppercase tracking-widest border border-slate-200">
                      {selectedFile.mimeType.includes('folder') ? 'Directory' : 'Asset'}
                    </span>
                    {!selectedFile.mimeType.includes('folder') && (
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[9px] font-bold rounded-full uppercase tracking-widest border border-blue-100">
                        Secure
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Grid */}
              <div className="p-8 space-y-8 flex-1">
                <div className="grid grid-cols-1 gap-6">
                   {[
                     { label: 'Sync Modified', val: formatDate(selectedFile.modifiedTime), icon: Clock },
                     { label: 'Total Volume', val: selectedFile.mimeType.includes('folder') ? '--' : formatSize(selectedFile.size), icon: HardDrive },
                     { label: 'Authorized By', val: selectedFile.lastModifyingUser?.displayName || 'System Root', icon: User }
                   ].map((item, idx) => (
                     <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100/50">
                       <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                          <item.icon className="w-4 h-4 text-slate-400" />
                       </div>
                       <div className="space-y-0.5">
                         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block opacity-70">{item.label}</span>
                         <p className="text-xs text-slate-800 font-bold tracking-tight">{item.val}</p>
                       </div>
                     </div>
                   ))}
                </div>

                <div className="pt-8 flex flex-col gap-3">
                  <a 
                    href={selectedFile.webViewLink} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 hover:bg-slate-800 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    <ExternalLink className="w-4 h-4 text-blue-400" />
                    Live Preview
                  </a>
                  <button className="w-full py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-95">
                    Download Local
                  </button>
                </div>

                <div className="flex items-center justify-center gap-4 py-6">
                   <div className="w-1 h-1 bg-slate-200 rounded-full" />
                   <div className="w-1 h-1 bg-slate-200 rounded-full" />
                   <div className="w-1 h-1 bg-slate-200 rounded-full" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 relative">
                  <File className="w-8 h-8 text-slate-200" />
                  <div className="absolute inset-0 border-2 border-dashed border-slate-200 rounded-full animate-[spin_10s_linear_infinite]" />
               </div>
               <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed max-w-[170px]">Select an object to load detailed metadata preview.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

