import React, { useState, useEffect } from 'react';
import { Page, WeatherData, DailyReportActivity, SiteIssue, PurchaseOrder, User } from '../types';
import { purchaseOrders, users } from '../data';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, onSnapshot, query, where, orderBy, deleteDoc, getDocs, Timestamp } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useProject } from '../context/ProjectContext';
import { 
  CloudSun, 
  Thermometer, 
  Droplets, 
  Wind, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  Camera, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  FileText,
  User as UserIcon,
  Filter,
  ChevronDown,
  LayoutGrid,
  List,
  Save,
  RefreshCw,
  Edit2,
  ChevronRight,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProgressReportViewProps {
  page: Page;
}

interface ProgressReport {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  date: string;
  weather?: WeatherData;
  activities: DailyReportActivity[];
  generalWorks: string;
  deliverables: string;
  incidents: string;
  issues: SiteIssue[];
  submittedBy: string;
  createdAt: any;
  periodStart?: string;
  periodEnd?: string;
  projectId: string;
}

export const ProgressReportView: React.FC<ProgressReportViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [view, setView] = useState<'list' | 'form'>('list');
  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [editingReport, setEditingReport] = useState<ProgressReport | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [activities, setActivities] = useState<DailyReportActivity[]>([]);
  const [issues, setIssues] = useState<SiteIssue[]>([]);
  const [generalWorks, setGeneralWorks] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [incidents, setIncidents] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch reports
  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'progressReports'),
      where('projectId', '==', selectedProject.id),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProgressReport[];
      setReports(reportsData);
      setIsLoading(false);
      
      // Check for automated reports after fetching
      checkAndGenerateAutomatedReports(reportsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'progressReports');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [selectedProject]);

  const checkAndGenerateAutomatedReports = async (existingReports: ProgressReport[]) => {
    if (!selectedProject) return;

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 4 = Thursday
    const isThursday = dayOfWeek === 4;
    const isFirstOfMonth = today.getDate() === 1;

    // Check Weekly (Thursday)
    if (isThursday) {
      const todayStr = today.toISOString().split('T')[0];
      const hasWeeklyToday = existingReports.some(r => r.type === 'weekly' && r.date === todayStr);
      
      if (!hasWeeklyToday) {
        await generateWeeklyReport(today, existingReports);
      }
    }

    // Check Monthly (1st)
    if (isFirstOfMonth) {
      const todayStr = today.toISOString().split('T')[0];
      const hasMonthlyToday = existingReports.some(r => r.type === 'monthly' && r.date === todayStr);
      
      if (!hasMonthlyToday) {
        await generateMonthlyReport(today, existingReports);
      }
    }
  };

  const generateWeeklyReport = async (date: Date, existingReports: ProgressReport[]) => {
    const end = new Date(date);
    const start = new Date(date);
    start.setDate(start.getDate() - 6); // Last 7 days

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const dailyReports = existingReports.filter(r => 
      r.type === 'daily' && r.date >= startStr && r.date <= endStr
    );

    if (dailyReports.length === 0) return;

    // Summarize
    const summary = summarizeReports(dailyReports, 'weekly', startStr, endStr);
    
    try {
      await addDoc(collection(db, 'progressReports'), {
        ...summary,
        projectId: selectedProject?.id,
        submittedBy: 'System',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error generating weekly report:', error);
    }
  };

  const generateMonthlyReport = async (date: Date, existingReports: ProgressReport[]) => {
    const lastMonth = new Date(date);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const start = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const end = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const dailyReports = existingReports.filter(r => 
      r.type === 'daily' && r.date >= startStr && r.date <= endStr
    );

    if (dailyReports.length === 0) return;

    // Summarize
    const summary = summarizeReports(dailyReports, 'monthly', startStr, endStr);
    
    try {
      await addDoc(collection(db, 'progressReports'), {
        ...summary,
        projectId: selectedProject?.id,
        submittedBy: 'System',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error generating monthly report:', error);
    }
  };

  const summarizeReports = (reports: ProgressReport[], type: 'weekly' | 'monthly', start: string, end: string) => {
    const allActivities: DailyReportActivity[] = [];
    const allIssues: SiteIssue[] = [];
    let combinedGeneral = '';
    let combinedDeliverables = '';
    let combinedIncidents = '';

    reports.forEach(r => {
      allActivities.push(...r.activities);
      allIssues.push(...r.issues);
      if (r.generalWorks) combinedGeneral += `\n[${r.date}]: ${r.generalWorks}`;
      if (r.deliverables) combinedDeliverables += `\n[${r.date}]: ${r.deliverables}`;
      if (r.incidents) combinedIncidents += `\n[${r.date}]: ${r.incidents}`;
    });

    // Group activities by PO Line Item and average progress
    const groupedActivities = allActivities.reduce((acc, curr) => {
      if (!acc[curr.poLineItemId]) {
        acc[curr.poLineItemId] = { ...curr, count: 1 };
      } else {
        acc[curr.poLineItemId].progressUpdate += curr.progressUpdate;
        acc[curr.poLineItemId].count += 1;
        if (!acc[curr.poLineItemId].description.includes(curr.description)) {
          acc[curr.poLineItemId].description += `; ${curr.description}`;
        }
      }
      return acc;
    }, {} as Record<string, DailyReportActivity & { count: number }>);

    const finalActivities = Object.values(groupedActivities).map(({ count, ...rest }) => ({
      ...rest,
      progressUpdate: Math.round(rest.progressUpdate / count)
    }));

    return {
      type,
      date: new Date().toISOString().split('T')[0],
      periodStart: start,
      periodEnd: end,
      activities: finalActivities,
      issues: allIssues,
      generalWorks: combinedGeneral.trim(),
      deliverables: combinedDeliverables.trim(),
      incidents: combinedIncidents.trim()
    };
  };

  // Mock weather fetch
  useEffect(() => {
    const fetchWeather = async () => {
      // In a real app, use navigator.geolocation and a weather API
      setWeather({
        temp: 32,
        condition: 'Sunny',
        humidity: 45,
        windSpeed: 12
      });
    };
    fetchWeather();
  }, []);

  const handleAddActivity = () => {
    const newActivity: DailyReportActivity = {
      id: Math.random().toString(36).substr(2, 9),
      poLineItemId: '',
      description: '',
      progressUpdate: 0
    };
    setActivities([...activities, newActivity]);
  };

  const handleRemoveActivity = (id: string) => {
    setActivities(activities.filter(a => a.id !== id));
  };

  const handleAddIssue = () => {
    const newIssue: SiteIssue = {
      id: Math.random().toString(36).substr(2, 9),
      title: '',
      description: '',
      assignedToId: '',
      severity: 'Medium',
      status: 'Open'
    };
    setIssues([...issues, newIssue]);
  };

  const handleNewReport = () => {
    setEditingReport(null);
    setActivities([]);
    setIssues([]);
    setGeneralWorks('');
    setDeliverables('');
    setIncidents('');
    setView('form');
  };

  const handleEditReport = (report: ProgressReport) => {
    setEditingReport(report);
    setActivities(report.activities);
    setIssues(report.issues);
    setGeneralWorks(report.generalWorks);
    setDeliverables(report.deliverables);
    setIncidents(report.incidents);
    setView('form');
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
      await deleteDoc(doc(db, 'progressReports', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'progressReports');
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser || !selectedProject) {
      alert('You must be signed in to submit a report.');
      return;
    }

    setIsSaving(true);
    try {
      const reportData = {
        type: activeTab,
        date: editingReport?.date || new Date().toISOString().split('T')[0],
        weather: activeTab === 'daily' ? weather : null,
        activities,
        generalWorks,
        deliverables,
        incidents,
        issues,
        submittedBy: auth.currentUser.uid,
        projectId: selectedProject.id,
        updatedAt: serverTimestamp()
      };

      if (editingReport) {
        await updateDoc(doc(db, 'progressReports', editingReport.id), reportData);
      } else {
        await addDoc(collection(db, 'progressReports'), {
          ...reportData,
          createdAt: serverTimestamp()
        });
      }

      // Generate PDF logic remains similar but uses reportData
      await generateAndUploadPDF(reportData);

      setIsSaving(false);
      setView('list');
      setEditingReport(null);
    } catch (error) {
      setIsSaving(false);
      handleFirestoreError(error, editingReport ? OperationType.UPDATE : OperationType.CREATE, 'progressReports');
    }
  };

  const generateAndUploadPDF = async (reportData: any) => {
    try {
      const doc = new jsPDF();
      const projectCode = selectedProject?.code || 'ZRY';
      const dateStr = reportData.date;
      const typeLabel = reportData.type.toUpperCase();
      const fileName = `${projectCode}-ZRY-SITE-${typeLabel}-${dateStr}.pdf`;

      // PDF Header
      doc.setFontSize(20);
      doc.setTextColor(40);
      doc.text(`${typeLabel} SITE REPORT`, 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Project: ${selectedProject?.name || 'N/A'} (${projectCode})`, 20, 35);
      doc.text(`Date: ${dateStr}`, 20, 42);
      doc.text(`Submitted By: ${auth.currentUser?.email}`, 20, 49);

      if (reportData.weather) {
        doc.text(`Weather: ${reportData.weather.condition}, ${reportData.weather.temp}°C`, 20, 56);
      }

      // Activities Table
      doc.setFontSize(14);
      doc.text('Key Activities', 20, 70);
      
      const activityRows = reportData.activities.map((a: any) => {
        const poItem = allPOLineItems.find(li => li.id === a.poLineItemId);
        return [
          poItem ? `${poItem.poId} - ${poItem.description}` : 'N/A',
          a.description,
          `${a.progressUpdate}%`
        ];
      });

      autoTable(doc, {
        startY: 75,
        head: [['PO Item', 'Work Description', 'Progress']],
        body: activityRows,
      });

      // Convert PDF to Blob and upload
      const pdfBlob = doc.output('blob');
      const formData = new FormData();
      formData.append('file', pdfBlob, fileName);
      formData.append('projectRootId', selectedProject?.driveFolderId || '');
      formData.append('path', `SITE_OPERATIONS_04/04.${reportData.type === 'daily' ? '1' : reportData.type === 'weekly' ? '2' : '3'}_Reports`);

      await fetch('/api/drive/upload-by-path', {
        method: 'POST',
        body: formData
      });
    } catch (pdfError) {
      console.error('Error generating/uploading PDF:', pdfError);
    }
  };

  const allPOLineItems = purchaseOrders.flatMap(po => 
    po.lineItems.map(li => ({ ...li, poId: po.id, poSupplier: po.supplier }))
  );

  const filteredReports = reports.filter(r => r.type === activeTab);

  return (
    <div className="space-y-6 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Progress Reporting</h2>
          <p className="text-slate-500">Site activity logging and performance tracking.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['daily', 'weekly', 'monthly'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setView('list');
                }}
                className={`px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                  activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          {view === 'list' && activeTab === 'daily' && (
            <button 
              onClick={handleNewReport}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              <Plus className="w-4 h-4" /> New Report
            </button>
          )}
          {view === 'form' && (
            <button 
              onClick={() => setView('list')}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
            >
              Back to List
            </button>
          )}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-slate-500 font-medium">Loading reports...</p>
              </div>
            ) : filteredReports.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredReports.map((report) => (
                  <div 
                    key={report.id}
                    className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${
                          report.type === 'daily' ? 'bg-blue-50 text-blue-600' :
                          report.type === 'weekly' ? 'bg-amber-50 text-amber-600' :
                          'bg-purple-50 text-purple-600'
                        }`}>
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-900">
                            {report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report - {report.date}
                          </h4>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" /> {report.date}
                            </span>
                            <span className="text-sm text-slate-500 flex items-center gap-1">
                              <LayoutGrid className="w-3.5 h-3.5" /> {report.activities.length} Activities
                            </span>
                            {report.periodStart && (
                              <span className="text-sm text-slate-500 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> {report.periodStart} to {report.periodEnd}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => handleEditReport(report)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Edit Report"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteReport(report.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Delete Report"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-5 h-5 text-slate-300 ml-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No {activeTab} reports found</h3>
                <p className="text-slate-500 mt-1 max-w-xs mx-auto">
                  {activeTab === 'daily' 
                    ? 'Start by creating your first daily site report using the button above.' 
                    : `Automated ${activeTab} reports will appear here once generated.`}
                </p>
                {activeTab === 'daily' && (
                  <button 
                    onClick={handleNewReport}
                    className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                  >
                    Create New Report
                  </button>
                )}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {/* Weather Section (Daily Only) */}
            {activeTab === 'daily' && (
              <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-amber-50 rounded-2xl">
                    <CloudSun className="w-8 h-8 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Site Weather</h3>
                    <p className="text-sm text-slate-500">Automatically recorded for {editingReport?.date || new Date().toLocaleDateString()}</p>
                  </div>
                </div>
                {weather && (
                  <div className="flex gap-8">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase mb-1">
                        <Thermometer className="w-3 h-3" /> Temp
                      </div>
                      <div className="text-xl font-bold text-slate-900">{weather.temp}°C</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase mb-1">
                        <Droplets className="w-3 h-3" /> Humidity
                      </div>
                      <div className="text-xl font-bold text-slate-900">{weather.humidity}%</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold uppercase mb-1">
                        <Wind className="w-3 h-3" /> Wind
                      </div>
                      <div className="text-xl font-bold text-slate-900">{weather.windSpeed} km/h</div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Key Activities Section */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-blue-500" />
                  <h3 className="text-lg font-bold text-slate-900">Key Activities (BOQ & PO Linked)</h3>
                </div>
                <button 
                  onClick={handleAddActivity}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all"
                >
                  <Plus className="w-3 h-3" /> Add Activity
                </button>
              </div>
              <div className="p-6 space-y-4">
                {activities.map((activity, index) => (
                  <div key={activity.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 relative group">
                    <div className="md:col-span-5 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Select PO Item</label>
                      <select 
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                        value={activity.poLineItemId}
                        onChange={(e) => {
                          const newActivities = [...activities];
                          newActivities[index].poLineItemId = e.target.value;
                          setActivities(newActivities);
                        }}
                      >
                        <option value="">Select an item...</option>
                        {allPOLineItems.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.poId} - {item.description} ({item.poSupplier})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-4 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Work Description</label>
                      <input 
                        type="text"
                        placeholder="What was done today?"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                        value={activity.description}
                        onChange={(e) => {
                          const newActivities = [...activities];
                          newActivities[index].description = e.target.value;
                          setActivities(newActivities);
                        }}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Progress (%)</label>
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-blue-600"
                        value={activity.progressUpdate}
                        onChange={(e) => {
                          const newActivities = [...activities];
                          newActivities[index].progressUpdate = parseInt(e.target.value) || 0;
                          setActivities(newActivities);
                        }}
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end justify-center pb-1">
                      <button 
                        onClick={() => handleRemoveActivity(activity.id)}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-2xl">
                    <p className="text-sm text-slate-400">No activities added yet. Use the button above to log site work.</p>
                  </div>
                )}
              </div>
            </section>

            {/* General Works & Deliverables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <List className="w-5 h-5 text-slate-400" />
                  General Works & Safety
                </h3>
                <textarea 
                  placeholder="Site cleaning, safety briefings, general maintenance..."
                  className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                  value={generalWorks}
                  onChange={(e) => setGeneralWorks(e.target.value)}
                />
              </section>
              <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-400" />
                  Deliverables & Measurements
                </h3>
                <textarea 
                  placeholder="Drawings completed, square meters measured, inspections done..."
                  className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                  value={deliverables}
                  onChange={(e) => setDeliverables(e.target.value)}
                />
              </section>
            </div>

            {/* Incidents & Issues */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  <h3 className="text-lg font-bold text-slate-900">Incidents & Issues</h3>
                </div>
                <button 
                  onClick={handleAddIssue}
                  className="flex items-center gap-2 px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-all"
                >
                  <Plus className="w-3 h-3" /> Log Issue
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Major Incidents / Accidents</label>
                  <textarea 
                    placeholder="Describe any accidents or major incidents..."
                    className="w-full h-20 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                    value={incidents}
                    onChange={(e) => setIncidents(e.target.value)}
                  />
                </div>
                
                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-500 uppercase">Technical Issues & Assignments</label>
                  {issues.map((issue, index) => (
                    <div key={issue.id} className="p-4 bg-rose-50/50 rounded-xl border border-rose-100 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                          type="text"
                          placeholder="Issue Title"
                          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                          value={issue.title}
                          onChange={(e) => {
                            const newIssues = [...issues];
                            newIssues[index].title = e.target.value;
                            setIssues(newIssues);
                          }}
                        />
                        <select 
                          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                          value={issue.assignedToId}
                          onChange={(e) => {
                            const newIssues = [...issues];
                            newIssues[index].assignedToId = e.target.value;
                            setIssues(newIssues);
                          }}
                        >
                          <option value="">Assign to Engineer...</option>
                          {users.map(u => (
                            <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>
                          ))}
                        </select>
                      </div>
                      <textarea 
                        placeholder="Describe the problem..."
                        className="w-full h-16 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none resize-none"
                        value={issue.description}
                        onChange={(e) => {
                          const newIssues = [...issues];
                          newIssues[index].description = e.target.value;
                          setIssues(newIssues);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Photos Section */}
            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-slate-400" />
                Site Photos
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button className="aspect-square border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-slate-50 transition-all">
                  <Plus className="w-6 h-6" />
                  <span className="text-xs font-bold">Upload Photo</span>
                </button>
              </div>
            </section>

            {/* Floating Save Button */}
            <div className="fixed bottom-8 right-8">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-2xl hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isSaving ? 'Saving Report...' : editingReport ? 'Update Report' : 'Submit Daily Report'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
