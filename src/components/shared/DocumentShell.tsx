/**
 * DocumentShell
 * ─────────────
 * The universal wrapper for all 72 PMIS document outputs.
 *
 * Flow:
 *   Ribbon click → DocumentShell (list mode) → user picks a version → detail mode
 *   Detail mode shows the document form + FloatingActionBar
 *
 * Usage:
 *   Wrap each document view with DocumentShell and delegate save/update to it.
 */
import React, { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { VersionedDocumentList } from './VersionedDocumentList';
import { FloatingActionBar } from './FloatingActionBar';
import { PageVersion } from '../../types';
import { useProject } from '../../context/ProjectContext';

export type DocumentShellMode = 'list' | 'edit';

interface DocumentShellProps {
  /** Lucide icon for the document type */
  icon: LucideIcon;
  /** Human-readable document title, e.g. "Project Charter" */
  title: string;
  /** Short code used in Drive file naming, e.g. "CHARTER" */
  docType: string;
  /** All existing versions from Firestore */
  versions: PageVersion[];
  /** True while Firestore is loading */
  isLoading: boolean;
  /** True while a save/update is in progress */
  isSaving: boolean;
  /** Called when user clicks "Save New Version" in FAB */
  onSaveNew: () => Promise<void> | void;
  /** Called when user clicks "Update Current" in FAB */
  onUpdate: () => Promise<void> | void;
  /**
   * Called when a version row is clicked.
   * The host component should load `version.data` into its local state.
   */
  onOpenVersion: (version: PageVersion, index: number) => void;
  /**
   * Called when user clicks "New Draft".
   * The host component should reset its local state to defaults.
   */
  onNewDraft: () => void;
  /**
   * Async function that generates and returns a PDF Blob for Drive upload.
   * If not provided, the Sync to Drive button is shown but performs a no-op.
   */
  onGeneratePdf?: () => Promise<Blob | null>;
  /** Path within the project Drive folder, e.g. "2.0_Planning/2.1_Governance_Domain" */
  drivePath?: string;
  /** The form content rendered in edit mode */
  children: React.ReactNode;
  /** Override the initial mode (default: 'list') */
  initialMode?: DocumentShellMode;
}

export const DocumentShell: React.FC<DocumentShellProps> = ({
  icon,
  title,
  docType,
  versions,
  isLoading,
  isSaving,
  onSaveNew,
  onUpdate,
  onOpenVersion,
  onNewDraft,
  onGeneratePdf,
  drivePath,
  children,
  initialMode = 'list',
}) => {
  const { selectedProject } = useProject();
  // Always start in list mode — the empty state in VersionedDocumentList
  // provides the "Create First Version" CTA for brand-new documents.
  const [mode, setMode] = useState<DocumentShellMode>(initialMode);
  const [isSyncing, setIsSyncing] = useState(false);

  /* ── Handlers ── */

  const handleOpenVersion = useCallback((v: PageVersion, idx: number) => {
    onOpenVersion(v, idx);
    setMode('edit');
  }, [onOpenVersion]);

  const handleNewDraft = useCallback(() => {
    onNewDraft();
    setMode('edit');
  }, [onNewDraft]);

  const handleSaveNew = useCallback(async () => {
    await onSaveNew();
    setMode('list');
  }, [onSaveNew]);

  const handleUpdate = useCallback(async () => {
    await onUpdate();
  }, [onUpdate]);

  const handleCancel = useCallback(() => {
    setMode('list');
  }, []);

  const handleSyncDrive = useCallback(async () => {
    if (!selectedProject) {
      toast.error('No project selected');
      return;
    }
    if (!onGeneratePdf) {
      toast('PDF generation not configured for this document', { icon: 'ℹ️' });
      return;
    }

    setIsSyncing(true);
    try {
      const pdfBlob = await onGeneratePdf();
      if (!pdfBlob) {
        toast.error('Failed to generate PDF');
        return;
      }

      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const latestVersion = versions[0]?.version ?? 1.0;
      const fileName = `[${selectedProject.code ?? selectedProject.id}]-${docType}-${today}-v${latestVersion.toFixed(1)}.pdf`;

      const projectDoc = await import('firebase/firestore').then(({ getDoc, doc }) =>
        getDoc(doc(
          (await import('../../firebase')).db,
          'projects',
          selectedProject.id,
        )),
      );
      const projectRootId = projectDoc.exists()
        ? (projectDoc.data() as any).driveRootFolderId
        : undefined;

      if (!projectRootId) {
        toast.error('Drive folder not initialized for this project. Run "Init Drive" first.');
        return;
      }

      const formData = new FormData();
      formData.append('file', pdfBlob, fileName);
      formData.append('projectRootId', projectRootId);
      formData.append('path', drivePath ?? '01_PROJECT_MANAGEMENT_FORMS');

      const res = await fetch('/api/drive/upload-by-path', { method: 'POST', body: formData });

      if (res.ok) {
        toast.success(`Uploaded: ${fileName}`);
      } else {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        toast.error(`Drive upload failed: ${err.error}`);
      }
    } catch (e: any) {
      toast.error(`Sync error: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  }, [selectedProject, onGeneratePdf, versions, docType, drivePath]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  /* ── Render ── */

  return (
    <div className="w-full h-full">
      <AnimatePresence mode="wait">
        {mode === 'list' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="w-full h-full"
          >
            <VersionedDocumentList
              title={title}
              docType={docType}
              icon={icon}
              versions={versions}
              isLoading={isLoading}
              onOpenVersion={handleOpenVersion}
              onNewDraft={handleNewDraft}
              projectCode={selectedProject?.code}
            />
          </motion.div>
        ) : (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="w-full h-full"
          >
            {/* Mode toggle bar */}
            <div className="flex items-center justify-between px-8 pt-5 pb-3 border-b border-slate-100 bg-white sticky top-0 z-30">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-700 hover:bg-white/80 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18M3 14h18M3 18h18" />
                  </svg>
                  Grid View
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest bg-blue-600 text-white shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit View
                </button>
              </div>
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Firestore Link
              </div>
            </div>

            {/* Document form */}
            {children}

            {/* Floating action buttons */}
            <FloatingActionBar
              onSaveNew={handleSaveNew}
              onUpdate={handleUpdate}
              onCancel={handleCancel}
              onSyncDrive={handleSyncDrive}
              onPrint={handlePrint}
              isSaving={isSaving}
              isSyncing={isSyncing}
              isVisible
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
