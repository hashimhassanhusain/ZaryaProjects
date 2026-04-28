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
  const [mode, setMode] = useState<DocumentShellMode>(
    // If no versions exist yet, jump straight to edit mode for first-time use
    versions.length === 0 && !isLoading ? 'edit' : initialMode,
  );
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
            {/* Edit-mode breadcrumb */}
            <div className="flex items-center gap-2 px-8 pt-6 pb-2">
              <button
                onClick={handleCancel}
                className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors"
              >
                {title}
              </button>
              <span className="text-slate-300 text-xs">›</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Edit
              </span>
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
