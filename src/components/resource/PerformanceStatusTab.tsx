import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Download, 
  Save, 
  X,
  Loader2,
  User,
  Users,
  Calendar,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  Activity as ActivityIcon,
  DollarSign
} from 'lucide-react';
import { 
  PerformanceAssessment, 
  TeamStatusReport, 
  TeamMember, 
  Activity,
  LessonEntry
} from '../../types';
import { db, OperationType, handleFirestoreError, auth } from '../../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PerformanceStatusTabProps {
  projectId: string;
}

export const PerformanceStatusTab: React.FC<PerformanceStatusTabProps> = ({ projectId }) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [assessments, setAssessments] = useState<PerformanceAssessment[]>([]);
  const [statusReports, setStatusReports] = useState<TeamStatusReport[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'performance' | 'status'>('performance');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<PerformanceAssessment | null>(null);
  const [editingReport, setEditingReport] = useState<TeamStatusReport | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Performance Form State
  const [perfData, setPerfData] = useState<Partial<PerformanceAssessment>>({
    memberId: '',
    date: new Date().toISOString().split('T')[0],
    technicalPerformance: {
      scope: 'Meets',
      quality: 'Meets',
      schedule: 'Meets',
      cost: 'Meets',
      comments: ''
    },
    interpersonalCompetency: {
      communication: 'Meets',
      collaboration: 'Meets',
      conflictManagement: 'Meets',
      decisionMaking: 'Meets',
      leadership: 'Meets',
      comments: ''
    },
    strengths: '',
    weaknesses: '',
    areasForDevelopment: [],
    additionalComments: '',
    moraleScore: 7,
    overallRating: 'Meets'
  });

  // Status Report Form State
  const [statusData, setStatusData] = useState<Partial<TeamStatusReport>>({
    memberId: '',
    date: new Date().toISOString().split('T')[0],
    activitiesPlanned: [],
    activitiesAccomplished: [],
    activitiesNotAccomplished: [],
    rootCauseOfVariances: '',
    fundsSpent: 0,
    fundsPlanned: 0,
    qualityVariances: '',
    plannedCorrectiveActions: '',
    activitiesPlannedNext: [],
    costsPlannedNext: 0,
    newRisksIdentified: '',
    issues: '',
    comments: ''
  });

  useEffect(() => {
    if (!projectId) return;

    const unsubMembers = onSnapshot(query(collection(db, 'team_members'), where('projectId', '==', projectId)), (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeamMember)));
    });

    const unsubAssessments = onSnapshot(query(collection(db, 'performance_assessments'), where('projectId', '==', projectId)), (snap) => {
      setAssessments(snap.docs.map(d => ({ id: d.id, ...d.data() } as PerformanceAssessment)));
    });

    const unsubReports = onSnapshot(query(collection(db, 'team_status_reports'), where('projectId', '==', projectId)), (snap) => {
      setStatusReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeamStatusReport)));
    });

    const unsubActivities = onSnapshot(query(collection(db, 'activities'), where('projectId', '==', projectId)), (snap) => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
      setLoading(false);
    });

    return () => {
      unsubMembers();
      unsubAssessments();
      unsubReports();
      unsubActivities();
    };
  }, [projectId]);

  const ratingToScore = (rating: 'Exceeds' | 'Meets' | 'Needs Improvement') => {
    if (rating === 'Exceeds') return 3;
    if (rating === 'Meets') return 2;
    return 1;
  };

  const calculateTeamMorale = () => {
    if (assessments.length === 0) return 0;
    const sum = assessments.reduce((acc, curr) => acc + (curr.moraleScore || 0), 0);
    return (sum / assessments.length).toFixed(1);
  };

  const handleAddAssessment = () => {
    setEditingAssessment(null);
    setPerfData({
      memberId: '',
      date: new Date().toISOString().split('T')[0],
      technicalPerformance: { scope: 'Meets', quality: 'Meets', schedule: 'Meets', cost: 'Meets', comments: '' },
      interpersonalCompetency: { communication: 'Meets', collaboration: 'Meets', conflictManagement: 'Meets', decisionMaking: 'Meets', leadership: 'Meets', comments: '' },
      strengths: '',
      weaknesses: '',
      areasForDevelopment: [],
      additionalComments: '',
      moraleScore: 7,
      overallRating: 'Meets'
    });
    setIsFormOpen(true);
  };

  const handleAddStatus = () => {
    setEditingReport(null);
    setStatusData({
      memberId: '',
      date: new Date().toISOString().split('T')[0],
      activitiesPlanned: [],
      activitiesAccomplished: [],
      activitiesNotAccomplished: [],
      rootCauseOfVariances: '',
      fundsSpent: 0,
      fundsPlanned: 0,
      qualityVariances: '',
      plannedCorrectiveActions: '',
      activitiesPlannedNext: [],
      costsPlannedNext: 0,
      newRisksIdentified: '',
      issues: '',
      comments: ''
    });
    setIsFormOpen(true);
  };

  const handleSavePerformance = async () => {
    const member = members.find(m => m.id === perfData.memberId);
    if (!member) return;

    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const data = {
        ...perfData,
        projectId,
        memberName: member.name,
        memberRole: member.role,
        updatedAt: timestamp,
        version: (editingAssessment?.version || 0) + 1
      };

      if (editingAssessment) {
        await updateDoc(doc(db, 'performance_assessments', editingAssessment.id), data);
      } else {
        await addDoc(collection(db, 'performance_assessments'), data);
      }
      setIsFormOpen(false);
    } catch (err) {
      handleFirestoreError(err, editingAssessment ? OperationType.UPDATE : OperationType.CREATE, 'performance_assessments');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveStatus = async () => {
    const member = members.find(m => m.id === statusData.memberId);
    if (!member) return;

    setIsSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const data = {
        ...statusData,
        projectId,
        memberName: member.name,
        role: member.role,
        updatedAt: timestamp
      };

      if (editingReport) {
        await updateDoc(doc(db, 'team_status_reports', editingReport.id), data);
      } else {
        await addDoc(collection(db, 'team_status_reports'), data);
      }

      // Lessons Learned Trigger
      if (statusData.rootCauseOfVariances) {
        if (window.confirm('Alert: Record this finding in the Lessons Learned Log?')) {
          await addDoc(collection(db, 'lessons_learned'), {
            projectId,
            lessonId: `LL-${Date.now().toString().slice(-4)}`,
            category: 'Process',
            description: `Variance Root Cause: ${statusData.rootCauseOfVariances}`,
            recommendation: statusData.plannedCorrectiveActions || 'Review process for future mitigation.',
            impact: 'Negative',
            ownerId: member.id,
            status: 'Draft',
            version: 1,
            createdAt: timestamp,
            createdBy: auth.currentUser?.displayName || 'System',
            updatedAt: timestamp,
            updatedBy: auth.currentUser?.displayName || 'System'
          });
        }
      }

      setIsFormOpen(false);
    } catch (err) {
      handleFirestoreError(err, editingReport ? OperationType.UPDATE : OperationType.CREATE, 'team_status_reports');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePerformancePDF = (assessment: PerformanceAssessment) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;

    doc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PERFORMANCE EVALUATION', pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Member: ${assessment.memberName}`, 15, 45);
    doc.text(`Role: ${assessment.memberRole}`, 15, 50);
    doc.text(`Date: ${assessment.date}`, pageWidth - 15, 45, { align: 'right' });

    autoTable(doc, {
      startY: 60,
      head: [['CRITERIA', 'RATING', 'COMMENTS']],
      body: [
        ['Technical: Scope', assessment.technicalPerformance.scope, assessment.technicalPerformance.comments],
        ['Technical: Quality', assessment.technicalPerformance.quality, ''],
        ['Technical: Schedule', assessment.technicalPerformance.schedule, ''],
        ['Technical: Cost', assessment.technicalPerformance.cost, ''],
        ['Communication', assessment.interpersonalCompetency.communication, assessment.interpersonalCompetency.comments],
        ['Collaboration', assessment.interpersonalCompetency.collaboration, ''],
        ['Leadership', assessment.interpersonalCompetency.leadership, ''],
      ],
      theme: 'grid',
      headStyles: { fillColor: [0, 82, 136] }
    });

    const dateStr = assessment.date.replace(/-/g, '');
    doc.save(`${projectId}-RES-${assessment.memberName.replace(/\s+/g, '_')}-Performance-V${assessment.version}-${dateStr}.pdf`);
  };

  const isVarianceHigh = (spent: number, planned: number) => {
    if (planned === 0) return false;
    const diff = Math.abs(spent - planned);
    return (diff / planned) > 0.1;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveView('performance')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              activeView === 'performance' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <BarChart3 className="w-4 h-4" />
            Performance Assessments
          </button>
          <button
            onClick={() => setActiveView('status')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
              activeView === 'status' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <ActivityIcon className="w-4 h-4" />
            Team Status Reports
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">Team Morale Avg</span>
            <span className="text-xl font-black text-emerald-700">{calculateTeamMorale()} / 10</span>
          </div>
          <button 
            onClick={activeView === 'performance' ? handleAddAssessment : handleAddStatus}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <Plus className="w-5 h-5" />
            {activeView === 'performance' ? 'New Assessment' : 'New Status Report'}
          </button>
        </div>
      </div>

      {activeView === 'performance' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assessments.map((a) => (
            <div key={a.id} className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm hover:shadow-xl transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-bold text-slate-900">{a.memberName}</h4>
                  <p className="text-xs text-slate-500 font-medium">{a.memberRole}</p>
                </div>
                <span className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest",
                  a.overallRating === 'Exceeds' ? "bg-emerald-50 text-emerald-600" :
                  a.overallRating === 'Meets' ? "bg-blue-50 text-blue-600" :
                  "bg-red-50 text-red-600"
                )}>
                  {a.overallRating}
                </span>
              </div>
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Morale Score</span>
                  <span>{a.moraleScore}/10</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${(a.moraleScore || 0) * 10}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <span className="text-[10px] font-bold text-slate-400">{a.date}</span>
                <button 
                  onClick={() => generatePerformancePDF(a)}
                  className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Member</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Accomplished</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Variance</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {statusReports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6 text-sm font-bold text-slate-900">{r.date}</td>
                  <td className="px-8 py-6">
                    <div className="text-sm font-bold text-slate-900">{r.memberName}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{r.role}</div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-1">
                      {r.activitiesAccomplished.slice(0, 2).map((act, i) => (
                        <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-md">{act}</span>
                      ))}
                      {r.activitiesAccomplished.length > 2 && <span className="text-[10px] text-slate-400">+{r.activitiesAccomplished.length - 2} more</span>}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    {isVarianceHigh(r.fundsSpent, r.fundsPlanned) ? (
                      <div className="flex items-center justify-center gap-1 text-red-600 font-black text-[10px] uppercase tracking-widest">
                        <AlertTriangle className="w-3 h-3" />
                        High Variance
                      </div>
                    ) : (
                      <span className="text-emerald-600 font-black text-[10px] uppercase tracking-widest">Normal</span>
                    )}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                    {activeView === 'performance' ? <BarChart3 className="w-6 h-6 text-white" /> : <ActivityIcon className="w-6 h-6 text-white" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{activeView === 'performance' ? 'Performance Evaluation' : 'Team Status Report'}</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {activeView === 'performance' ? 'Assess individual performance across technical and interpersonal domains.' : 'Track activities, variances, and corrective actions.'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <div className="p-10 space-y-10">
                {/* Common Header */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Team Member</label>
                    <select 
                      value={activeView === 'performance' ? perfData.memberId : statusData.memberId}
                      onChange={(e) => activeView === 'performance' ? setPerfData({ ...perfData, memberId: e.target.value }) : setStatusData({ ...statusData, memberId: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 outline-none"
                    >
                      <option value="">Select Member...</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                    <input 
                      type="date"
                      value={activeView === 'performance' ? perfData.date : statusData.date}
                      onChange={(e) => activeView === 'performance' ? setPerfData({ ...perfData, date: e.target.value }) : setStatusData({ ...statusData, date: e.target.value })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 outline-none"
                    />
                  </div>
                </div>

                {activeView === 'performance' ? (
                  <div className="space-y-10">
                    {/* Technical Performance */}
                    <section className="space-y-6">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        Technical Performance
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {['scope', 'quality', 'schedule', 'cost'].map((field) => (
                          <div key={field} className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{field}</label>
                            <select 
                              value={(perfData.technicalPerformance as any)[field]}
                              onChange={(e) => setPerfData({
                                ...perfData,
                                technicalPerformance: { ...perfData.technicalPerformance!, [field]: e.target.value }
                              })}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
                            >
                              <option value="Exceeds">Exceeds</option>
                              <option value="Meets">Meets</option>
                              <option value="Needs Improvement">Needs Improvement</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Interpersonal */}
                    <section className="space-y-6">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-600" />
                        Interpersonal Competency
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {['communication', 'collaboration', 'leadership'].map((field) => (
                          <div key={field} className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{field}</label>
                            <select 
                              value={(perfData.interpersonalCompetency as any)[field]}
                              onChange={(e) => setPerfData({
                                ...perfData,
                                interpersonalCompetency: { ...perfData.interpersonalCompetency!, [field]: e.target.value }
                              })}
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
                            >
                              <option value="Exceeds">Exceeds</option>
                              <option value="Meets">Meets</option>
                              <option value="Needs Improvement">Needs Improvement</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Team Morale Score (1-10)</label>
                        <input 
                          type="range" min="1" max="10"
                          value={perfData.moraleScore}
                          onChange={(e) => setPerfData({ ...perfData, moraleScore: parseInt(e.target.value) })}
                          className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                        />
                        <div className="flex justify-between text-[10px] font-bold text-slate-400">
                          <span>1 (Low)</span>
                          <span className="text-emerald-600 font-black text-sm">{perfData.moraleScore}</span>
                          <span>10 (High)</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Overall Rating</label>
                        <select 
                          value={perfData.overallRating}
                          onChange={(e) => setPerfData({ ...perfData, overallRating: e.target.value as any })}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:ring-4 focus:ring-blue-500/10 outline-none uppercase tracking-widest"
                        >
                          <option value="Exceeds">Exceeds Expectations</option>
                          <option value="Meets">Meets Expectations</option>
                          <option value="Needs Improvement">Needs Improvement</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-10">
                    {/* Activities */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <section className="space-y-4">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <ActivityIcon className="w-4 h-4 text-blue-600" />
                          Activities Accomplished
                        </h4>
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-100">
                          {activities.map(act => (
                            <label key={act.id} className="flex items-center gap-3 p-3 hover:bg-white rounded-xl transition-all cursor-pointer group">
                              <input 
                                type="checkbox"
                                checked={statusData.activitiesAccomplished?.includes(act.description)}
                                onChange={(e) => {
                                  const list = statusData.activitiesAccomplished || [];
                                  setStatusData({
                                    ...statusData,
                                    activitiesAccomplished: e.target.checked ? [...list, act.description] : list.filter(a => a !== act.description)
                                  });
                                }}
                                className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 transition-all"
                              />
                              <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900">{act.description}</span>
                            </label>
                          ))}
                        </div>
                      </section>

                      <section className="space-y-4">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          Root Cause of Variance
                        </h4>
                        <textarea 
                          value={statusData.rootCauseOfVariances}
                          onChange={(e) => setStatusData({ ...statusData, rootCauseOfVariances: e.target.value })}
                          rows={4}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 outline-none resize-none"
                          placeholder="Explain technically why an activity was not accomplished (e.g., delay in material delivery MasterFormat 16 Divisions: 03 - Concrete)..."
                        />
                      </section>
                    </div>

                    {/* Finance */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <section className="space-y-4">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                          Financial Tracking
                        </h4>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Funds Planned (IQD)</label>
                            <input 
                              type="number"
                              value={statusData.fundsPlanned}
                              onChange={(e) => setStatusData({ ...statusData, fundsPlanned: parseFloat(e.target.value) })}
                              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Funds Spent (IQD)</label>
                            <input 
                              type="number"
                              value={statusData.fundsSpent}
                              onChange={(e) => setStatusData({ ...statusData, fundsSpent: parseFloat(e.target.value) })}
                              className={cn(
                                "w-full px-6 py-4 border rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all",
                                isVarianceHigh(statusData.fundsSpent || 0, statusData.fundsPlanned || 0) ? "bg-red-50 border-red-200 text-red-600" : "bg-slate-50 border-slate-100"
                              )}
                            />
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Planned Corrective Actions
                        </h4>
                        <textarea 
                          value={statusData.plannedCorrectiveActions}
                          onChange={(e) => setStatusData({ ...statusData, plannedCorrectiveActions: e.target.value })}
                          rows={4}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 outline-none resize-none"
                          placeholder="What steps will be taken to resolve the variance?..."
                        />
                      </section>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-900 border-t border-white/10 flex justify-end gap-4 sticky bottom-0 z-10">
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="px-8 py-4 text-white/60 font-bold text-sm hover:text-white transition-all"
                >
                  Discard
                </button>
                <button 
                  onClick={activeView === 'performance' ? handleSavePerformance : handleSaveStatus}
                  disabled={isSaving}
                  className="px-12 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save & Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
