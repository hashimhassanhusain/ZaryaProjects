import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  ChevronRight, 
  Users, 
  Zap, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  MoreVertical,
  ArrowLeft,
  FileText,
  Loader2,
  Trash2,
  Edit2,
  History,
  Save,
  Download,
  X,
  Gavel
} from 'lucide-react';
import { Page, Project, Stakeholder, ProjectIssue, AssumptionConstraintEntry } from '../types';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  orderBy
} from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { StakeholderRegisterView } from './StakeholderRegisterView';
import { ChangeRequestView } from './ChangeRequestView';
import { LogManagementView } from './LogManagementView';

interface ProjectLogsViewProps {
  page: Page;
}

type LogType = 'stakeholder' | 'decision' | 'change' | 'assumption';

export const ProjectLogsView: React.FC<ProjectLogsViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [activeLog, setActiveLog] = useState<LogType>('stakeholder');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  const logs = [
    { id: 'stakeholder', title: 'Stakeholder Register', icon: Users, pageId: '1.2.1' },
    { id: 'decision', title: 'Decision Log', icon: Gavel, pageId: '3.2.1' }, // Using Issue Log for Decisions
    { id: 'change', title: 'Change Log', icon: Zap, pageId: '3.1.1' },
    { id: 'assumption', title: 'Assumption Log', icon: AlertCircle, pageId: '2.1.5' }
  ];

  // Map active log to sub-components
  const renderActiveLog = () => {
    // We use the existing components but wrap them in the hub's style
    const subPage: Page = {
      id: logs.find(l => l.id === activeLog)?.pageId || '',
      title: logs.find(l => l.id === activeLog)?.title || '',
      type: 'terminal'
    };

    switch (activeLog) {
      case 'stakeholder':
        return <StakeholderRegisterView page={subPage} />;
      case 'change':
        return <ChangeRequestView page={subPage} />;
      case 'decision':
      case 'assumption':
        return <LogManagementView page={subPage} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Project Logs & Registers</h2>
            <p className="text-xs text-slate-500 font-medium">Centralized tracking for all project records</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Side Menu */}
        <aside className="lg:w-72 space-y-4">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-4 shadow-sm">
            <div className="px-4 py-3 mb-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registers</h3>
            </div>
            {logs.map((log) => (
              <button
                key={log.id}
                onClick={() => {
                  setActiveLog(log.id as LogType);
                  setIsAddingNew(false);
                  setSelectedRecord(null);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all text-left",
                  activeLog === log.id 
                    ? "bg-blue-50 text-blue-600 shadow-sm border border-blue-100" 
                    : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <log.icon className={cn("w-4 h-4", activeLog === log.id ? "text-blue-600" : "text-slate-400")} />
                {log.title}
              </button>
            ))}
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="p-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeLog}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderActiveLog()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
