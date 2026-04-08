import React, { useState, useEffect } from 'react';
import { Page, Project, PageVersion } from '../types';
import { useProject } from '../context/ProjectContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { 
  Shield, FileText, History, Save, Edit3, ChevronRight, 
  Users, Clock, MessageSquare, Database, AlertCircle,
  CheckCircle2, Download, Printer, Share2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface GovernancePoliciesViewProps {
  page: Page;
}

const DEFAULT_CONTENT = {
  '1.0': {
    title: 'Governance & Roles (الحوكمة وتوزيع المسؤوليات)',
    sections: [
      {
        subtitle: '1.1 Co-Leadership (القيادة العليا)',
        content: '• Hashim Husain: Responsible for design, technical office, archiving, contracts, and procurement. Final authority for shop drawings and resolving design/financial conflicts.\n• Dana Salih: Responsible for field execution, schedule management, field conflicts, labor management, and safety.'
      },
      {
        subtitle: '1.2 Technical Team (الفريق الفني)',
        content: '• Civil Engineer (Mohsen Jalal): Field supervision (excavation, concrete, masonry), IR issuance, joint measurements, daily reports.\n• Electrical Engineer (Mohammad Ali): Electrical supervision, material specs, joint measurements, daily reports.\n• Mechanical Engineer (Ajwan Mohammad): HVAC/Plumbing supervision, pressure tests, material specs, joint measurements, daily reports.\n• Architect/Technical Office (Ruqaya Hashim): Shop drawings, 3D models, clash detection, weekly technical reports.\n• HSE Officer (Ivan): Safety inductions, compliance monitoring, incident documentation, weekly safety reports.'
      }
    ]
  },
  '2.0': {
    title: 'Operations & Schedule (إدارة العمليات والجدول الزمني)',
    sections: [
      {
        subtitle: '2.1 Schedule Management',
        content: '• The project schedule is updated weekly by Dana Salih (Actual vs. Planned).\n• Archiving path: 02-Planning_Controls \\ 01-Schedule \\ Updates'
      },
      {
        subtitle: '2.2 Technical Decisions',
        content: '• All shop drawings and technical decisions must be discussed with Hashim Husain for approval before execution.'
      }
    ]
  },
  '3.0': {
    title: 'Communication & Meetings (التواصل والاجتماعات)',
    sections: [
      {
        subtitle: '3.1 Weekly Meeting',
        content: '• Full engineering team meeting every Thursday at 2:00 PM.'
      },
      {
        subtitle: '3.2 Official Communication',
        content: '• Official channels are Email and Signed Letters only. WhatsApp is strictly prohibited for critical decision-making.'
      }
    ]
  },
  '4.0': {
    title: 'Information Management & Archiving (إدارة المعلومات والأرشفة)',
    sections: [
      {
        subtitle: '4.1 Naming Protocol',
        content: '• Contracts/Drawings: [P16314]-[DIVxx]-[Type]-[RefNo]-[Desc]-[Ver]-[Date]\n• General Files: [P16314]-[Dept]-[Type]-[Desc]-[Ver]-[Date]'
      },
      {
        subtitle: '4.2 Folder Structure',
        content: '• 00-Transmittals: Incoming/Outgoing, RFIs.\n• 01-Management: Contracts, HSE, Risk, Meetings.\n• 02-Planning_Controls: Cost, Quality (IRs), Testing, Reports.\n• 03-Technical: MasterFormat 16 Divisions system (Div 01-16).'
      }
    ]
  },
  '5.0': {
    title: 'Discipline & Safety Charter (الميثاق الانضباطي والسلامة)',
    sections: [
      {
        subtitle: '5.1 Safety & Transparency',
        content: '• Safety manager reports administratively to Dana Salih.\n• Transparency is mandatory; hiding issues from leadership is a serious violation.\n• Daily reports are the primary legal protection for the company and engineers.'
      }
    ]
  }
};

export const GovernancePoliciesView: React.FC<GovernancePoliciesViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [isEditing, setIsEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [content, setContent] = useState<any>(null);
  const [history, setHistory] = useState<PageVersion[]>([]);
  const [activeTab, setActiveTab] = useState('1.0');

  useEffect(() => {
    if (selectedProject) {
      const projectData = selectedProject.pageData?.[page.id] || DEFAULT_CONTENT;
      setContent(projectData);
      setHistory(selectedProject.pageHistory?.[page.id] || []);
    }
  }, [selectedProject, page.id]);

  const handleSave = async () => {
    if (!selectedProject) return;

    try {
      const newVersion: PageVersion = {
        version: history.length + 1,
        date: new Date().toISOString().split('T')[0],
        data: content,
        author: 'Hashim Husain' // In a real app, this would be the current user
      };

      const projectRef = doc(db, 'projects', selectedProject.id);
      await updateDoc(projectRef, {
        [`pageData.${page.id}`]: content,
        [`pageHistory.${page.id}`]: arrayUnion(newVersion)
      });

      setHistory([...history, newVersion]);
      setIsEditing(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${selectedProject.id}`);
    }
  };

  const handleSectionChange = (tabId: string, sectionIdx: number, field: 'subtitle' | 'content', value: string) => {
    const newContent = { ...content };
    newContent[tabId].sections[sectionIdx][field] = value;
    setContent(newContent);
  };

  if (!content) return null;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <div className="text-sm font-medium text-blue-600 mb-2 uppercase tracking-wider">Governance Domain</div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{page.title}</h2>
          <p className="text-slate-500">Project Management Policies and Procedures Manual (P16314-Villa2).</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
              showHistory ? "bg-blue-600 text-white shadow-lg" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            <History className="w-4 h-4" />
            History
          </button>
          <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-slate-800 transition-all"
          >
            {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            {isEditing ? 'Save Version' : 'Edit Manual'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="space-y-2">
          {Object.entries(content).map(([id, data]: [string, any]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl text-left transition-all group",
                activeTab === id 
                  ? "bg-blue-600 text-white shadow-md" 
                  : "bg-white border border-slate-100 text-slate-600 hover:border-blue-200 hover:bg-blue-50/30"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                  activeTab === id ? "bg-white/20" : "bg-slate-50 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600"
                )}>
                  {id === '1.0' && <Users className="w-4 h-4" />}
                  {id === '2.0' && <Clock className="w-4 h-4" />}
                  {id === '3.0' && <MessageSquare className="w-4 h-4" />}
                  {id === '4.0' && <Database className="w-4 h-4" />}
                  {id === '5.0' && <AlertCircle className="w-4 h-4" />}
                </div>
                <span className="text-sm font-bold truncate">{data.title.split('(')[0]}</span>
              </div>
              <ChevronRight className={cn("w-4 h-4 transition-transform", activeTab === id ? "rotate-90" : "")} />
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            {showHistory ? (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm"
              >
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-900">Revision History</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {history.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 italic">No previous versions found.</div>
                  ) : (
                    [...history].reverse().map((v) => (
                      <div key={v.version} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            v{v.version}.0
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">Approved Version {v.version}</div>
                            <div className="text-xs text-slate-400 mt-1">Updated on {v.date} by {v.author}</div>
                          </div>
                        </div>
                        <button 
                          onClick={() => setContent(v.data)}
                          className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-bold transition-all"
                        >
                          Restore this version
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                      <Shield className="w-6 h-6 text-blue-600" />
                      {content[activeTab].title}
                    </h3>
                    <div className="flex gap-2">
                      <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                        <Printer className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {content[activeTab].sections.map((section: any, idx: number) => (
                      <div key={idx} className="space-y-4">
                        {isEditing ? (
                          <input 
                            type="text"
                            value={section.subtitle}
                            onChange={(e) => handleSectionChange(activeTab, idx, 'subtitle', e.target.value)}
                            className="w-full text-lg font-bold text-slate-900 border-b border-slate-200 focus:border-blue-500 outline-none pb-2"
                          />
                        ) : (
                          <h4 className="text-lg font-bold text-slate-900 border-l-4 border-blue-600 pl-4">{section.subtitle}</h4>
                        )}
                        
                        {isEditing ? (
                          <textarea 
                            value={section.content}
                            onChange={(e) => handleSectionChange(activeTab, idx, 'content', e.target.value)}
                            rows={6}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                          />
                        ) : (
                          <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                              {section.content}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white text-emerald-600 flex items-center justify-center shadow-sm">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Status</div>
                      <div className="text-sm font-bold text-slate-900">Approved v1.0</div>
                    </div>
                  </div>
                  <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center shadow-sm">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Format</div>
                      <div className="text-sm font-bold text-slate-900">Official Manual</div>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Updated</div>
                      <div className="text-sm font-bold">08 Jan 2026</div>
                    </div>
                    <Share2 className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
