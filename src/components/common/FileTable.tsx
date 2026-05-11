import React from 'react';
import { ExternalLink, Download, Trash2, FileText, FileSpreadsheet, FileImage } from 'lucide-react';
import { formatDate } from '../../lib/utils';

interface FileTableProps {
  files: any[];
  onDownload: (file: any) => void;
  onDelete: (file: any) => void;
}

export const FileTable: React.FC<FileTableProps> = ({ files, onDownload, onDelete }) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
          <tr>
            <th className="px-6 py-4">Name</th>
            <th className="px-6 py-4">Type</th>
            <th className="px-6 py-4">Modified</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {files.map(f => (
            <tr key={f.id} className="hover:bg-slate-50">
              <td className="px-6 py-4 font-semibold text-slate-700">
                <a href={f.webViewLink} target="_blank" rel="noreferrer" className="hover:text-blue-600 flex items-center gap-2">
                  {f.mimeType.includes('image') ? <FileImage className="w-4 h-4 text-slate-400" /> : <FileText className="w-4 h-4 text-slate-400" />}
                  {f.name}
                </a>
              </td>
              <td className="px-6 py-4 text-slate-500">{f.mimeType}</td>
              <td className="px-6 py-4 text-slate-500">{formatDate(f.modifiedTime)}</td>
              <td className="px-6 py-4 text-right flex justify-end gap-2">
                <button onClick={() => onDownload(f)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Download className="w-4 h-4"/></button>
                <button onClick={() => onDelete(f)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
