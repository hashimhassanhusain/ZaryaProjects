import React, { useState, useMemo } from 'react';
import {
  FilePlus, Search, ChevronUp, ChevronDown, Clock, User,
  FolderOpen, Archive, FileCheck, AlertCircle, LucideIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { PageVersion } from '../../types';

export interface VersionRow {
  version: number;
  date: string;
  author: string;
  status: 'draft' | 'published' | 'archived';
  changeSummary?: string;
  data: Record<string, any>;
}

type SortField = 'version' | 'date' | 'author' | 'status';
type SortDir = 'asc' | 'desc';

interface VersionedDocumentListProps {
  title: string;
  docType: string;
  icon: LucideIcon;
  versions: PageVersion[];
  isLoading: boolean;
  onOpenVersion: (v: PageVersion, index: number) => void;
  onNewDraft: () => void;
  projectCode?: string;
}

const STATUS_CONFIG = {
  published: { label: 'Published', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  draft:     { label: 'Draft',     color: 'bg-amber-100 text-amber-700 border-amber-200' },
  archived:  { label: 'Archived',  color: 'bg-slate-100 text-slate-500 border-slate-200' },
};

function inferStatus(v: PageVersion, index: number, total: number): 'published' | 'draft' | 'archived' {
  if (index === 0) return 'published';
  if (index === total - 1 && total > 1) return 'draft';
  return 'archived';
}

export const VersionedDocumentList: React.FC<VersionedDocumentListProps> = ({
  title,
  docType,
  icon: Icon,
  versions,
  isLoading,
  onOpenVersion,
  onNewDraft,
  projectCode,
}) => {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('version');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft' | 'archived'>('all');

  const rows: (PageVersion & { inferredStatus: string; rowIndex: number })[] = useMemo(() =>
    versions.map((v, i) => ({
      ...v,
      inferredStatus: inferStatus(v, i, versions.length),
      rowIndex: i,
    })),
    [versions],
  );

  const filtered = useMemo(() => {
    let result = [...rows];
    if (filterStatus !== 'all') {
      result = result.filter(r => r.inferredStatus === filterStatus);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        String(r.version).includes(q) ||
        r.author.toLowerCase().includes(q) ||
        (r.date || '').includes(q),
      );
    }
    result.sort((a, b) => {
      let va: any = a[sortField as keyof typeof a];
      let vb: any = b[sortField as keyof typeof b];
      if (sortField === 'version') { va = Number(va); vb = Number(vb); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [rows, filterStatus, search, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    sortField === field
      ? (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)
      : <ChevronDown className="w-3 h-3 opacity-20" />
  );

  return (
    <div className="flex flex-col gap-6 p-8 bg-slate-50 min-h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[1.5rem] bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/20 shrink-0">
            <Icon className="w-7 h-7" strokeWidth={1.2} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.2em] mt-0.5">
              {versions.length} version{versions.length !== 1 ? 's' : ''} · {docType}
            </p>
          </div>
        </div>
        <button
          onClick={onNewDraft}
          className="flex items-center gap-2.5 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-semibold transition-all shadow-lg shadow-blue-600/25 active:scale-95 shrink-0"
        >
          <FilePlus className="w-4 h-4" />
          New Draft
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search versions, authors..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {(['all', 'published', 'draft', 'archived'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all',
                filterStatus === s
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-400 hover:text-slate-700',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-[1.5rem] overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              {([
                { field: 'version', label: 'Version' },
                { field: 'date',    label: 'Date' },
                { field: 'author',  label: 'Author' },
                { field: 'status',  label: 'Status' },
              ] as { field: SortField; label: string }[]).map(col => (
                <th
                  key={col.field}
                  onClick={() => toggleSort(col.field)}
                  className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 cursor-pointer hover:text-slate-600 transition-colors select-none"
                >
                  <span className="flex items-center gap-1.5">
                    {col.label} <SortIcon field={col.field} />
                  </span>
                </th>
              ))}
              <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                Summary
              </th>
              <th className="px-6 py-4" />
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                      <span className="text-xs font-semibold">Loading versions…</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-400">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Icon className="w-8 h-8 opacity-30" strokeWidth={1} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-600">No versions yet</p>
                        <p className="text-xs text-slate-400">Click "New Draft" to create the first version</p>
                      </div>
                      <button
                        onClick={onNewDraft}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all"
                      >
                        <FilePlus className="w-3.5 h-3.5" />
                        Create First Version
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => {
                  const status = row.inferredStatus as 'published' | 'draft' | 'archived';
                  const cfg = STATUS_CONFIG[status];
                  const isLatest = row.rowIndex === 0;
                  return (
                    <motion.tr
                      key={row.version + '-' + i}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={cn(
                        'border-b border-slate-50 hover:bg-blue-50/40 transition-colors group cursor-pointer',
                        isLatest && 'bg-blue-50/20',
                      )}
                      onClick={() => onOpenVersion(row, row.rowIndex)}
                    >
                      {/* Version */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'text-sm font-black tabular-nums',
                            isLatest ? 'text-blue-700' : 'text-slate-700',
                          )}>
                            v{row.version.toFixed(1)}
                          </span>
                          {isLatest && (
                            <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-blue-600 text-white rounded-md">
                              Latest
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-xs font-semibold">
                            {row.date ? new Date(row.date).toLocaleDateString('en-GB', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            }) : '—'}
                          </span>
                        </div>
                      </td>

                      {/* Author */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-black uppercase text-slate-500 shrink-0">
                            {(row.author || 'U').charAt(0)}
                          </div>
                          <span className="text-xs font-semibold truncate max-w-[120px]">
                            {row.author || 'Unknown'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider',
                          cfg.color,
                        )}>
                          {status === 'published' && <FileCheck className="w-3 h-3" />}
                          {status === 'draft' && <AlertCircle className="w-3 h-3" />}
                          {status === 'archived' && <Archive className="w-3 h-3" />}
                          {cfg.label}
                        </span>
                      </td>

                      {/* Summary */}
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-400 font-medium truncate max-w-[200px] block">
                          {(row.data as any)?.projectTitle || (row.data as any)?.title || '—'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4">
                        <button
                          onClick={e => { e.stopPropagation(); onOpenVersion(row, row.rowIndex); }}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold transition-all hover:bg-blue-700"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          Open
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>

        {/* Footer */}
        {!isLoading && filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {filtered.length} of {versions.length} versions
            </span>
            {projectCode && (
              <span className="text-[9px] font-mono text-slate-400">
                {projectCode} · {new Date().toLocaleDateString()}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
