import React, { useState, useEffect, useCallback } from 'react';
import { Inbox } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { PageVersion, Page, Project } from '../types';
import { DocumentShell } from './shared/DocumentShell';
import { cn } from '../lib/utils';

interface CorrespondenceData {
  letterNumber: string;
  date: string;
  type: 'incoming' | 'outgoing';
  priority: 'normal' | 'urgent' | 'confidential';
  party: string;
  subject: string;
  reference: string;
  notes: string;
}

const defaultLetter: CorrespondenceData = {
  letterNumber: '',
  date: new Date().toISOString().split('T')[0],
  type: 'outgoing',
  priority: 'normal',
  party: '',
  subject: '',
  reference: '',
  notes: '',
};

export const CorrespondenceLogView: React.FC<{ page: Page }> = ({ page }) => {
  const { selectedProject } = useProject();
  const { isRtl } = useLanguage();

  const [letter, setLetter] = useState<CorrespondenceData>(defaultLetter);
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;
    const unsub = onSnapshot(doc(db, 'projects', selectedProject.id), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Project;
        if ((data as any).correspondenceHistory) {
          setVersions((data as any).correspondenceHistory);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [selectedProject?.id]);

  const handleSave = useCallback(async (isNewVersion: boolean) => {
    if (!selectedProject) return;
    setIsSaving(true);
    try {
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      const updateData: any = { correspondenceData: letter, updatedAt: new Date().toISOString() };
      if (isNewVersion) {
        const nextVersion = (versions[0]?.version || 0) + 1;
        const newVersion: PageVersion = {
          version: nextVersion,
          date: new Date().toISOString(),
          author: user,
          changeSummary: letter.subject || letter.letterNumber,
          data: letter as any,
        };
        updateData.correspondenceHistory = [newVersion, ...versions];
      }
      await updateDoc(doc(db, 'projects', selectedProject.id), updateData);
      toast.success(isNewVersion ? 'Letter saved to correspondence log' : 'Letter updated');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'projects');
    } finally {
      setIsSaving(false);
    }
  }, [selectedProject, letter, versions]);

  const f = (field: keyof CorrespondenceData, value: string) =>
    setLetter(prev => ({ ...prev, [field]: value }));

  const inputCls = cn(
    'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors',
    isRtl && 'text-right'
  );
  const labelCls = 'block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2';

  return (
    <DocumentShell
      icon={Inbox}
      title="Correspondence Log"
      docType="CORR"
      versions={versions}
      isLoading={loading}
      isSaving={isSaving}
      onSaveNew={() => handleSave(true)}
      onUpdate={() => handleSave(false)}
      onOpenVersion={(v) => setLetter(v.data as CorrespondenceData)}
      onNewDraft={() => setLetter({ ...defaultLetter, date: new Date().toISOString().split('T')[0] })}
      drivePath="01_PROJECT_MANAGEMENT_FORMS/3.0_Executing/3.1_Governance"
    >
      <div className="p-10 space-y-10">

        {/* Type + Priority Banner */}
        <div className="flex items-center gap-4 flex-wrap">
          {(['incoming', 'outgoing'] as const).map(t => (
            <button
              key={t}
              onClick={() => f('type', t)}
              className={cn(
                'px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all border',
                letter.type === t
                  ? t === 'incoming'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200'
                    : 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200'
                  : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
              )}
            >
              {t === 'incoming' ? '↓ Incoming' : '↑ Outgoing'}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-auto">
            {(['normal', 'urgent', 'confidential'] as const).map(p => (
              <button
                key={p}
                onClick={() => f('priority', p)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all',
                  letter.priority === p
                    ? p === 'urgent' ? 'bg-red-500 text-white border-red-500'
                      : p === 'confidential' ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-slate-700 text-white border-slate-700'
                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Row 1: Number + Date + Reference */}
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className={labelCls}>Letter / Ref. No.</label>
            <input
              className={inputCls}
              value={letter.letterNumber}
              onChange={e => f('letterNumber', e.target.value)}
              placeholder="e.g. OUT-2026-042"
              dir={isRtl ? 'rtl' : 'ltr'}
            />
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              className={inputCls}
              value={letter.date}
              onChange={e => f('date', e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>External Reference</label>
            <input
              className={inputCls}
              value={letter.reference}
              onChange={e => f('reference', e.target.value)}
              placeholder="Their ref. / contract clause"
              dir={isRtl ? 'rtl' : 'ltr'}
            />
          </div>
        </div>

        {/* Row 2: Party + Subject */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className={labelCls}>Party / Organization</label>
            <input
              className={inputCls}
              value={letter.party}
              onChange={e => f('party', e.target.value)}
              placeholder="Ministry, Contractor, Consultant..."
              dir={isRtl ? 'rtl' : 'ltr'}
            />
          </div>
          <div>
            <label className={labelCls}>Subject</label>
            <input
              className={inputCls}
              value={letter.subject}
              onChange={e => f('subject', e.target.value)}
              placeholder="Brief subject of the correspondence"
              dir={isRtl ? 'rtl' : 'ltr'}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={labelCls}>Notes / Summary</label>
          <textarea
            rows={5}
            className={cn(inputCls, 'resize-none leading-relaxed')}
            value={letter.notes}
            onChange={e => f('notes', e.target.value)}
            placeholder="Key points, required action, follow-up deadline..."
            dir={isRtl ? 'rtl' : 'ltr'}
          />
        </div>

      </div>
    </DocumentShell>
  );
};
