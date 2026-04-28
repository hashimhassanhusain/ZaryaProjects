import React from 'react';
import { FilePlus, RefreshCw, X, CloudUpload, Printer, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { HelpTooltip } from '../HelpTooltip';

interface FloatingActionBarProps {
  onSaveNew: () => void;
  onUpdate: () => void;
  onCancel: () => void;
  onSyncDrive: () => void;
  onPrint: () => void;
  isSaving?: boolean;
  isSyncing?: boolean;
  isVisible?: boolean;
  className?: string;
}

export const FloatingActionBar: React.FC<FloatingActionBarProps> = ({
  onSaveNew,
  onUpdate,
  onCancel,
  onSyncDrive,
  onPrint,
  isSaving = false,
  isSyncing = false,
  isVisible = true,
  className,
}) => {
  const buttons = [
    {
      id: 'save-new',
      label: 'Save New Version',
      labelAr: 'حفظ إصدار جديد',
      icon: FilePlus,
      onClick: onSaveNew,
      loading: isSaving,
      style: 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/30',
      size: 'large' as const,
    },
    {
      id: 'update',
      label: 'Update Current',
      labelAr: 'تحديث الإصدار الحالي',
      icon: RefreshCw,
      onClick: onUpdate,
      loading: isSaving,
      style: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/30',
      size: 'normal' as const,
    },
    {
      id: 'sync-drive',
      label: 'Sync to Drive',
      labelAr: 'رفع إلى Drive',
      icon: CloudUpload,
      onClick: onSyncDrive,
      loading: isSyncing,
      style: 'bg-slate-700 hover:bg-slate-800 text-white shadow-xl shadow-slate-700/30',
      size: 'normal' as const,
    },
    {
      id: 'print',
      label: 'Print Preview',
      labelAr: 'معاينة الطباعة',
      icon: Printer,
      onClick: onPrint,
      loading: false,
      style: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-lg',
      size: 'normal' as const,
    },
    {
      id: 'cancel',
      label: 'Back to List',
      labelAr: 'العودة للقائمة',
      icon: X,
      onClick: onCancel,
      loading: false,
      style: 'bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-500 border border-slate-200 shadow-lg',
      size: 'normal' as const,
    },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={cn(
            'fixed bottom-8 right-8 z-50 flex flex-col items-end gap-2.5',
            className,
          )}
        >
          {/* Label pill */}
          <div className="bg-slate-900/80 backdrop-blur-sm text-white text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full mb-1 select-none">
            Document Actions
          </div>

          {buttons.map((btn, i) => {
            const Icon = btn.icon;
            const isLarge = btn.size === 'large';
            return (
              <motion.div
                key={btn.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <HelpTooltip text={btn.label} position="left">
                  <button
                    onClick={btn.onClick}
                    disabled={btn.loading}
                    className={cn(
                      'flex items-center gap-2.5 rounded-2xl font-semibold transition-all active:scale-95 disabled:opacity-60',
                      isLarge
                        ? 'px-5 py-3.5 text-sm'
                        : 'px-4 py-2.5 text-[11px]',
                      btn.style,
                    )}
                  >
                    {btn.loading ? (
                      <Loader2 className={cn('animate-spin', isLarge ? 'w-5 h-5' : 'w-4 h-4')} />
                    ) : (
                      <Icon className={cn(isLarge ? 'w-5 h-5' : 'w-4 h-4')} strokeWidth={1.8} />
                    )}
                    <span className="whitespace-nowrap">{btn.label}</span>
                  </button>
                </HelpTooltip>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
