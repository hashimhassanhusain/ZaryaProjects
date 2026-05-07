import React, { useState, useEffect, useMemo } from 'react';
import { Page, WeatherData, DailyReportActivity, SiteIssue, PurchaseOrder, User, Activity } from '../types';
import { users } from '../data';
import { cn } from '../lib/utils';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, setDoc, increment, onSnapshot, query, where, orderBy, deleteDoc, getDocs, Timestamp } from 'firebase/firestore';
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
  Download,
  ExternalLink,
  FileCheck,
  HardDrive,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';

interface ProgressReportViewProps {
  page: Page;
}

interface ProgressReport {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  discipline: 'Civil' | 'Mechanical' | 'Electrical' | 'TO' | 'HSE';
  date: string;
  weather?: WeatherData;
  activities: DailyReportActivity[];
  generalWorks: string;
  deliverables: string;
  incidents: string;
  issues: SiteIssue[];
  photos?: string[];
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
  const [discipline, setDiscipline] = useState<'Civil' | 'Mechanical' | 'Electrical' | 'TO' | 'HSE'>('Civil');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [dbUsers, setDbUsers] = useState<Record<string, any>>({});
  const [dbPurchaseOrders, setDbPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [scheduleActivities, setScheduleActivities] = useState<Activity[]>([]);
  
  // PDF Preview & Save states
  const [showPdfConfirm, setShowPdfConfirm] = useState(false);
  const [pdfPreviewBlob, setPdfPreviewBlob] = useState<Blob | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [pendingReportType, setPendingReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [pendingPath, setPendingPath] = useState('');

  // Fetch user profile and all users for display names
  useEffect(() => {
    const fetchUsers = async () => {
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersMap: Record<string, any> = {};
      usersSnap.forEach(doc => {
        usersMap[doc.id] = doc.data();
      });
      setDbUsers(usersMap);

      if (auth.currentUser) {
        const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', auth.currentUser.uid)));
        if (!userSnap.empty) {
          setUserProfile(userSnap.docs[0].data());
        }
      }
    };
    fetchUsers();
  }, []);

  // Fetch purchase orders for activity selection
  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'purchase_orders'),
      where('projectId', '==', selectedProject.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const poData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PurchaseOrder[];
      setDbPurchaseOrders(poData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'purchase_orders');
    });

    const activitiesUnsubscribe = onSnapshot(
      query(collection(db, 'activities'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setScheduleActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity)));
      }
    );

    return () => {
      unsubscribe();
      activitiesUnsubscribe();
    };
  }, [selectedProject]);

  const isStakeholder = userProfile?.role === 'stakeholder';
  const canCreateReport = userProfile?.role === 'admin' || userProfile?.role === 'project-manager' || userProfile?.role === 'engineer' || userProfile?.role === 'technical-office';
  
  // Progress Calculation Helpers
  const getCostCompletion = (activity: Activity): number => {
    const linkedPOs = dbPurchaseOrders.filter(p => p.activityId === activity.id);
    if (linkedPOs.length === 0) return 0;
    const bac = activity.plannedCost || activity.amount || 0;
    if (bac === 0) return 0;
    const ev = linkedPOs.reduce((sum, po) => {
      return sum + (po.lineItems?.reduce((s, li) => s + (li.amount * (li.completion || 0) / 100), 0)
        ?? (po.amount * (po.completion || 0) / 100));
    }, 0);
    return Math.min(100, Math.round((ev / bac) * 100));
  };

  const getTimeCompletion = (activity: Activity): number => {
    const today = new Date();
    const plannedStart = activity.startDate || activity.actualStartDate || '';
    const plannedFinish = activity.finishDate || '';
    if (!plannedStart || !plannedFinish) return 0;
    const start = new Date(plannedStart);
    const finish = new Date(plannedFinish);
    const totalDuration = finish.getTime() - start.getTime();
    if (totalDuration <= 0) return 0;
    if (today < start) return 0;
    if (today > finish) return 100;
    return Math.round(((today.getTime() - start.getTime()) / totalDuration) * 100);
  };

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
      discipline: 'Civil', // Default for automated summaries
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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
    setDiscipline('Civil');
    setView('form');
  };

  const handleEditReport = (report: ProgressReport) => {
    setEditingReport(report);
    setActivities(report.activities);
    setIssues(report.issues);
    setGeneralWorks(report.generalWorks);
    setDeliverables(report.deliverables);
    setIncidents(report.incidents);
    setPhotos(report.photos || []);
    setDiscipline(report.discipline || 'Civil');
    setView('form');
  };

  const handleDeleteReport = async (id: string) => {
    toast((toastRef) => (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-bold text-slate-900">Are you sure you want to delete this report?</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(toastRef.id)}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(toastRef.id);
              try {
                await deleteDoc(doc(db, 'progressReports', id));
                toast.success('Report deleted successfully');
              } catch (error) {
                handleFirestoreError(error, OperationType.DELETE, 'progressReports');
              }
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
          >
            Delete
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectRootId', selectedProject.driveFolderId || '');
      formData.append('path', 'SITE_OPERATIONS_04/04.2_Progress_Photos_and_Videos');

      const response = await fetch('/api/drive/upload-by-path', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      // In a real app, we'd store the Drive file ID or a webViewLink.
      // For now, we'll use a placeholder or the file ID if we can resolve it to a viewable URL.
      setPhotos([...photos, data.fileId]);
      toast.success("Photo uploaded successfully to Google Drive!");
    } catch (error: any) {
      console.error('Photo upload failed:', error);
      toast.error(`Photo upload failed: ${error.message}. Please ensure the Google Drive Service Account has "Editor" access to your project folder.`);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async (forceNew: boolean = false) => {
    if (!auth.currentUser || !selectedProject) {
      toast.error('You must be signed in to submit a report.');
      return;
    }

    setIsSaving(true);
    try {
      // Validate activities
      for (const act of activities) {
        if (!act.poLineItemId && !act.activityName) {
          toast.error('Please specify an item or name for all activities.');
          setIsSaving(false);
          return;
        }
      }

      const reportData = {
        type: activeTab,
        discipline,
        date: editingReport && !forceNew ? editingReport.date : new Date().toISOString().split('T')[0],
        weather: activeTab === 'daily' ? weather : null,
        activities,
        generalWorks,
        deliverables,
        incidents,
        issues,
        photos,
        submittedBy: auth.currentUser.uid,
        projectId: selectedProject.id,
        updatedAt: serverTimestamp()
      };

      if (editingReport && !forceNew) {
        await updateDoc(doc(db, 'progressReports', editingReport.id), reportData);
        toast.success('Report updated successfully');
      } else {
        await addDoc(collection(db, 'progressReports'), {
          ...reportData,
          createdAt: serverTimestamp()
        });
        toast.success('New report created successfully');
      }

      // SYNC COMPLETION TO POs (Physical/Earned Progress)
      for (const act of activities) {
        if (act.poLineItemId && act.poLineItemId !== 'general') {
          const poLineItem = allPOLineItems.find(li => li.id === act.poLineItemId);
          if (poLineItem && poLineItem.poId) {
            const poRef = doc(db, 'purchase_orders', poLineItem.poId);
            const poSnap = await getDocs(query(collection(db, 'purchase_orders'), where('id', '==', poLineItem.poId)));
            
            if (!poSnap.empty) {
              const poDoc = poSnap.docs[0];
              const poData = poDoc.data() as PurchaseOrder;
              const updatedLineItems = poData.lineItems.map(li => {
                if (li.id === act.poLineItemId) {
                  return { ...li, completion: act.progressUpdate };
                }
                return li;
              });
              
              await updateDoc(poDoc.ref, {
                lineItems: updatedLineItems,
                updatedAt: serverTimestamp()
              });

              // Trigger rollup for this PO (line items updated)
              const { rollupToParent } = await import('../services/rollupService');
              await rollupToParent('lineItem', poDoc.id);
            }
          }
        }
      }

      // Sync issues to global Issue Log
      for (const issue of issues) {
        if (!issue.title) continue; // Skip empty issues
        
        const issueRef = doc(db, 'issues', issue.id);
        const projectIssueData = {
          projectId: selectedProject.id,
          category: 'Site Operations',
          issue: issue.title,
          impact: 'Site Progress',
          urgency: issue.severity,
          responsibleParty: users.find(u => u.uid === issue.assignedToId)?.name || 'Unassigned',
          actions: issue.description,
          status: issue.status,
          dueDate: reportData.date,
          comments: `Logged via Daily Report on ${reportData.date}`,
          updatedAt: new Date().toISOString(),
          updatedBy: auth.currentUser.displayName || auth.currentUser.email || 'System',
          createdAt: new Date().toISOString(),
          createdBy: auth.currentUser.displayName || auth.currentUser.email || 'System'
        };

        // Use setDoc with merge to avoid overwriting if it exists, 
        // but since we use issue.id from the report, it will be unique to this report's issue entry.
        await setDoc(issueRef, projectIssueData, { merge: true });
      }

      // Create PDF for preview
      const { blob, fileName, previewUrl, path } = generatePDF(reportData);
      setPdfPreviewBlob(blob);
      setPdfPreviewUrl(previewUrl);
      setPdfFileName(fileName);
      setPendingReportType(reportData.type as any);
      setPendingPath(path);
      setShowPdfConfirm(true);

      setIsSaving(false);
      // We don't call setView('list') yet, we wait for the user to decide on the PDF
    } catch (error) {
      console.error('Save failed:', error);
      setIsSaving(false);
      handleFirestoreError(error, editingReport ? OperationType.UPDATE : OperationType.CREATE, 'progressReports');
    }
  };

  const generatePDF = (reportData: any) => {
    const doc = new jsPDF();
    const projectCode = selectedProject?.code || 'PMIS';
    const dateStr = reportData.date;
    const typeLabel = reportData.type.toUpperCase();
    const disciplineLabel = (reportData.discipline || 'GENERAL').toUpperCase();
    const fileName = `${projectCode}-PMIS-SITE-${disciplineLabel}-${typeLabel}-${dateStr}.pdf`;
    
    // Determine exact path as per project structure in screenshot
    const reportNum = reportData.type === 'daily' ? '1' : reportData.type === 'weekly' ? '2' : '3';
    const typeUpper = reportData.type.toUpperCase();
    const path = `SITE_OPERATIONS_04/04.${reportNum}_${typeUpper}_SITE_REPORTS`;

    // PDF Content
    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175);
    doc.text(`${disciplineLabel} ${typeLabel} SITE REPORT`, 105, 20, { align: 'center' });
    
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 25, 190, 25);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Project: ${selectedProject?.name || 'N/A'} (${projectCode})`, 20, 35);
    doc.text(`Discipline: ${reportData.discipline || 'General'}`, 20, 42);
    doc.text(`Date: ${dateStr}`, 20, 49);
    doc.text(`Submitted By: ${auth.currentUser?.email}`, 20, 56);

    if (reportData.weather) {
      doc.text(`Weather: ${reportData.weather.condition}, ${reportData.weather.temp}°C`, 20, 63);
    }

    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('Key Activities', 20, 75);
    
    const activityRows = reportData.activities.map((a: any) => {
      const poItem = allPOLineItems.find(li => li.id === a.poLineItemId);
      const scheduleActivity = scheduleActivities.find(sa => sa.id === poItem?.activityId);
      
      let metricsStr = `${a.progressUpdate}%`;
      if (scheduleActivity) {
        const timePct = getTimeCompletion(scheduleActivity);
        const spi = timePct > 0 ? a.progressUpdate / timePct : 1;
        metricsStr = `Cost: ${a.progressUpdate}% | Time: ${timePct}% | SPI: ${spi.toFixed(2)}`;
        if (spi < 0.85) metricsStr += ' [SCHEDULE IMPACT]';
      }

      return [
        a.poLineItemId === 'general' ? `[GENERAL] ${a.activityName}` : (poItem ? `${poItem.poId} - ${poItem.description}` : 'N/A'),
        a.description,
        metricsStr
      ];
    });

    autoTable(doc, {
      startY: 80,
      head: [['Activity Link / Item', 'Work Description', 'Progress Metrics']],
      body: activityRows,
      headStyles: { fillColor: [30, 64, 175] },
      styles: { fontSize: 8 }
    });

    const pdfBlob = doc.output('blob');
    const previewUrl = URL.createObjectURL(pdfBlob);
    
    return { blob: pdfBlob, fileName, previewUrl, path };
  };

  const uploadToDrive = async () => {
    if (!pdfPreviewBlob || !selectedProject || !pendingPath) {
      toast.error('Missing required data for upload.');
      return;
    }

    setIsUploadingToDrive(true);
    try {
      const formData = new FormData();
      formData.append('file', pdfPreviewBlob, pdfFileName);
      formData.append('projectRootId', selectedProject?.driveFolderId || '');
      formData.append('path', pendingPath);

      const response = await fetch('/api/drive/upload-by-path', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to upload to Google Drive');
      }

      toast.success('Report successfully archived to Google Drive!');
      handleClosePreview();
    } catch (err: any) {
      console.error('Error uploading PDF:', err);
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const handleClosePreview = () => {
    setShowPdfConfirm(false);
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setPdfPreviewUrl(null);
    setPdfPreviewBlob(null);
    setView('list');
    setEditingReport(null);
  };

  const allPOLineItems = useMemo(() => {
    // Combine mock data with firestore data for backward compatibility and flexibility
    const mockPOItems: any[] = [];
    const dbPOItems = dbPurchaseOrders.flatMap(po => 
      po.lineItems.map(li => ({ ...li, poId: po.id, poSupplier: po.supplier }))
    );
    
    // De-duplicate by id if necessary, prioritising Firestore data
    const itemMap = new Map();
    mockPOItems.forEach(item => itemMap.set(item.id, item));
    dbPOItems.forEach(item => itemMap.set(item.id, item));
    
    return Array.from(itemMap.values());
  }, [dbPurchaseOrders]);

  const filteredReports = reports.filter(r => r.type === activeTab);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-end items-center gap-4 mb-8">
        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
          {(['daily', 'weekly', 'monthly'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setView('list');
              }}
              className={`px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                activeTab === tab ? 'bg-white dark:bg-white/10 text-brand shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        {view === 'list' && activeTab === 'daily' && canCreateReport && (
          <button 
            onClick={handleNewReport}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-brand/20"
          >
            <Plus className="w-4 h-4" /> New Report
          </button>
        )}
        {view === 'form' && (
          <button 
            onClick={() => setView('list')}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-white/20 transition-all"
          >
            Back to List
          </button>
        )}
      </div>

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
                <RefreshCw className="w-8 h-8 text-brand animate-spin" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">Loading reports...</p>
              </div>
            ) : filteredReports.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredReports.map((report) => (
                  <div 
                    key={report.id}
                    onClick={() => handleEditReport(report)}
                    className="bg-white dark:bg-surface p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:border-brand/30 hover:shadow-md transition-all group cursor-pointer"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${
                          report.type === 'daily' ? 'bg-brand/10 text-brand' :
                          report.type === 'weekly' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600' :
                          'bg-purple-50 dark:bg-purple-500/10 text-purple-600'
                        }`}>
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                              {selectedProject?.code}-PMIS-SITE-{(report.discipline || 'General').toUpperCase()}-{report.type.toUpperCase()}-{report.date}
                            </h4>
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                              report.discipline === 'Civil' ? "bg-brand/10 text-brand" :
                              report.discipline === 'Mechanical' ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600" :
                              report.discipline === 'Electrical' ? "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600" :
                              report.discipline === 'TO' ? "bg-purple-50 dark:bg-purple-500/10 text-purple-600" : "bg-green-50 dark:bg-green-500/10 text-green-600"
                            )}>
                              {report.discipline || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> {report.date}
                            </span>
                            <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <UserIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> 
                              {dbUsers[report.submittedBy]?.name || 'Unknown User'}
                            </span>
                            <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <LayoutGrid className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> {report.activities.length} Activities
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all text-slate-400 dark:text-slate-500">
                        <button 
                          onClick={() => handleEditReport(report)}
                          className="p-2 hover:text-brand hover:bg-brand/10 rounded-lg transition-all"
                          title={canCreateReport ? "Edit Report" : "View Report"}
                        >
                          {canCreateReport ? <Edit2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </button>
                        {canCreateReport && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteReport(report.id);
                            }}
                            className="p-2 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                            title="Delete Report"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          className="p-2 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white dark:bg-surface rounded-3xl border-2 border-dashed border-slate-100 dark:border-white/5">
                <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">No {activeTab} reports found</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto text-sm">
                  {activeTab === 'daily' 
                    ? 'Start by creating your first daily site report using the button above.' 
                    : `Automated ${activeTab} reports will appear here once generated.`}
                </p>
                {activeTab === 'daily' && (
                  <button 
                    onClick={handleNewReport}
                    className="mt-6 px-6 py-2 bg-brand text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-brand/20"
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
            {/* Report Metadata Section */}
            {isStakeholder && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-700">
                <AlertTriangle className="w-5 h-5" />
                <p className="text-sm font-medium">You are viewing this report in read-only mode.</p>
              </div>
            )}
            <section className="bg-white dark:bg-surface p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Report Discipline</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {(['Civil', 'Mechanical', 'Electrical', 'TO', 'HSE'] as const).map((d) => (
                    <button
                      key={d}
                      disabled={!canCreateReport}
                      onClick={() => setDiscipline(d)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                        discipline === d 
                          ? 'bg-brand border-brand text-white shadow-lg shadow-brand/20' 
                          : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-brand/30'
                      } ${!canCreateReport && 'opacity-50 cursor-not-allowed'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Report Date</label>
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-slate-300 font-medium">
                  <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  {editingReport?.date || new Date().toLocaleDateString('en-US')}
                </div>
              </div>
            </section>

            {/* Weather Section (Daily Only) */}
            {activeTab === 'daily' && (
              <section className="bg-white dark:bg-surface p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl">
                    <CloudSun className="w-8 h-8 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Site Weather</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Automatically recorded for {editingReport?.date || new Date().toLocaleDateString('en-US')}</p>
                  </div>
                </div>
                {weather && (
                  <div className="flex gap-8">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase mb-1">
                        <Thermometer className="w-3 h-3" /> Temp
                      </div>
                      <div className="text-xl font-bold text-slate-900 dark:text-white">{weather.temp}°C</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase mb-1">
                        <Droplets className="w-3 h-3" /> Humidity
                      </div>
                      <div className="text-xl font-bold text-slate-900 dark:text-white">{weather.humidity}%</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase mb-1">
                        <Wind className="w-3 h-3" /> Wind
                      </div>
                      <div className="text-xl font-bold text-slate-900 dark:text-white">{weather.windSpeed} km/h</div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Key Activities Section */}
            <section className="bg-white dark:bg-surface rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
              <div className="p-6 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-brand" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Key Activities (BOQ & PO Linked)</h3>
                </div>
                {canCreateReport && (
                  <button 
                    onClick={handleAddActivity}
                    className="flex items-center gap-2 px-3 py-1.5 bg-brand text-white text-xs font-bold rounded-lg hover:opacity-90 transition-all shadow-lg shadow-brand/20"
                  >
                    <Plus className="w-3 h-3" /> Add Activity
                  </button>
                )}
              </div>
              <div className="p-6 space-y-4">
                {activities.map((activity, index) => (
                  <div key={activity.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10 relative group transition-colors">
                    <div className="md:col-span-5 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Activity Link</label>
                      <div className="flex flex-col gap-2">
                        <select 
                          className="w-full px-3 py-2 bg-white dark:bg-surface border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand/20 outline-none"
                          value={activity.poLineItemId}
                          onChange={(e) => {
                            const newActivities = [...activities];
                            newActivities[index].poLineItemId = e.target.value;
                            if (e.target.value !== 'general') {
                              newActivities[index].activityName = '';
                            }
                            setActivities(newActivities);
                          }}
                        >
                          <option value="">Select an item...</option>
                          <option value="general" className="font-bold text-brand">★ General Activity (Non-PO)</option>
                          {allPOLineItems.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.poId} - {item.description} ({item.poSupplier})
                            </option>
                          ))}
                        </select>
                        
                        {activity.poLineItemId === 'general' && (
                          <input 
                            type="text"
                            placeholder="Enter general activity name..."
                            className="w-full px-3 py-2 bg-white dark:bg-surface border border-brand/30 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand/20 outline-none animate-in fade-in slide-in-from-top-1"
                            value={activity.activityName || ''}
                            onChange={(e) => {
                              const newActivities = [...activities];
                              newActivities[index].activityName = e.target.value;
                              setActivities(newActivities);
                            }}
                          />
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-4 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Work Description</label>
                      <input 
                        type="text"
                        placeholder="What was done today?"
                        className="w-full px-3 py-2 bg-white dark:bg-surface border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand/20 outline-none"
                        value={activity.description}
                        onChange={(e) => {
                          const newActivities = [...activities];
                          newActivities[index].description = e.target.value;
                          setActivities(newActivities);
                        }}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Progress (%)</label>
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        className="w-full px-3 py-2 bg-white dark:bg-surface border border-slate-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-brand/20 outline-none font-bold text-brand"
                        value={activity.progressUpdate}
                        onChange={(e) => {
                          const newActivities = [...activities];
                          newActivities[index].progressUpdate = parseInt(e.target.value) || 0;
                          setActivities(newActivities);
                        }}
                      />
                      {activity.poLineItemId && activity.poLineItemId !== 'general' && (() => {
                        const poLineItem = allPOLineItems.find(li => li.id === activity.poLineItemId);
                        const scheduleActivity = scheduleActivities.find(a => a.id === poLineItem?.activityId);
                        if (!scheduleActivity) return null;
                        
                        const timePct = getTimeCompletion(scheduleActivity);
                        const spi = timePct > 0 ? activity.progressUpdate / timePct : 1;
                        const isSevere = spi < 0.85;

                        return (
                          <div className="flex flex-col gap-0.5 mt-1">
                            <div className="flex justify-between text-[8px] font-semibold uppercase text-slate-400 dark:text-slate-500 px-1">
                              <span>Time: {timePct}%</span>
                              <span className={cn(spi >= 1 ? 'text-emerald-500' : 'text-rose-500')}>SPI {spi.toFixed(2)}</span>
                            </div>
                            {isSevere && (
                              <div className="text-[8px] font-semibold text-rose-600 animate-pulse bg-rose-50 dark:bg-rose-500/10 px-1 rounded flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                IMPACT
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="md:col-span-1 flex items-end justify-center pb-1">
                      <button 
                        onClick={() => handleRemoveActivity(activity.id)}
                        className="p-2 text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-2xl">
                    <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">No activities added yet. Use the button above to log site work.</p>
                  </div>
                )}
              </div>
            </section>

            {/* General Works & Deliverables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="bg-white dark:bg-surface p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <List className="w-5 h-5 text-brand" />
                  General Works & Safety
                </h3>
                <textarea 
                  placeholder="Site cleaning, safety briefings, general maintenance..."
                  className="w-full h-32 px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand/20 outline-none resize-none transition-colors"
                  value={generalWorks}
                  onChange={(e) => setGeneralWorks(e.target.value)}
                />
              </section>
              <section className="bg-white dark:bg-surface p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand" />
                  Deliverables & Measurements
                </h3>
                <textarea 
                  placeholder="Drawings completed, square meters measured, inspections done..."
                  className="w-full h-32 px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand/20 outline-none resize-none transition-colors"
                  value={deliverables}
                  onChange={(e) => setDeliverables(e.target.value)}
                />
              </section>
            </div>

            {/* Incidents & Issues */}
            <section className="bg-white dark:bg-surface rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden transition-colors">
              <div className="p-6 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Incidents & Issues</h3>
                </div>
                <button 
                  onClick={handleAddIssue}
                  className="flex items-center gap-2 px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20"
                >
                  <Plus className="w-3 h-3" /> Log Issue
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Major Incidents / Accidents</label>
                  <textarea 
                    placeholder="Describe any accidents or major incidents..."
                    className="w-full h-20 px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand/20 outline-none resize-none transition-colors"
                    value={incidents}
                    onChange={(e) => setIncidents(e.target.value)}
                  />
                </div>
                
                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Technical Issues & Assignments</label>
                  {issues.map((issue, index) => (
                    <div key={issue.id} className="p-4 bg-rose-50/50 dark:bg-rose-500/10 rounded-xl border border-rose-100 dark:border-rose-500/20 space-y-4 transition-colors">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                          type="text"
                          placeholder="Issue Title"
                          className="px-3 py-2 bg-white dark:bg-surface border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                          value={issue.title}
                          onChange={(e) => {
                            const newIssues = [...issues];
                            newIssues[index].title = e.target.value;
                            setIssues(newIssues);
                          }}
                        />
                        <select 
                          className="px-3 py-2 bg-white dark:bg-surface border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                          value={issue.assignedToId}
                          onChange={(e) => {
                            const newIssues = [...issues];
                            newIssues[index].assignedToId = e.target.value;
                            setIssues(newIssues);
                          }}
                        >
                          <option value="">Assign to Engineer...</option>
                          {Object.values(dbUsers).map((u: any) => (
                            <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>
                          ))}
                        </select>
                      </div>
                      <textarea 
                        placeholder="Describe the problem..."
                        className="w-full h-16 px-3 py-2 bg-white dark:bg-surface border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand/20 resize-none transition-all"
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
            <section className="bg-white dark:bg-surface p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4 transition-colors">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-brand" />
                Site Photos
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {photos.map((photoId, idx) => (
                  <div key={idx} className="aspect-square bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center relative group overflow-hidden border border-slate-200 dark:border-white/10">
                    <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                      <button 
                        onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                        className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 text-[8px] font-mono text-slate-400 dark:text-slate-600 truncate bg-white/80 dark:bg-white/5 px-1 rounded">
                      ID: {photoId}
                    </div>
                  </div>
                ))}
                <label className="aspect-square border-2 border-dashed border-slate-100 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer">
                  {isUploadingPhoto ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-brand" />
                  ) : (
                    <Plus className="w-6 h-6" />
                  )}
                  <span className="text-xs font-bold uppercase tracking-widest">{isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handlePhotoUpload}
                    disabled={isUploadingPhoto}
                  />
                </label>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-600 italic mt-2">
                Note: Ensure the Google Drive Service Account has "Editor" access to your project folder to save photos.
              </p>
            </section>

            {/* Floating Action Buttons */}
            {canCreateReport && (
              <div className="fixed bottom-8 right-8 flex gap-3 items-center z-50">
                <button 
                  onClick={() => setView('list')}
                  className="px-6 py-4 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 text-sm font-bold shadow-2xl hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all rounded-2xl flex items-center gap-2 group"
                >
                  <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                  Discard
                </button>

                {editingReport && (
                  <button 
                    onClick={() => handleSave(true)}
                    disabled={isSaving}
                    className="px-6 py-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 rounded-2xl text-sm font-bold shadow-2xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-100 dark:border-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" />
                    Save as New
                  </button>
                )}

                <button 
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                  className="px-8 py-4 bg-brand text-white rounded-2xl text-sm font-bold shadow-2xl hover:opacity-90 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {isSaving ? 'Saving...' : editingReport ? 'Update Report' : 'Submit Report'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* PDF Save/Preview Modal */}
      <AnimatePresence>
        {showPdfConfirm && (
          <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClosePreview}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-surface w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-white/10"
            >
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-brand">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <FileCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Report Saved Successfully</h3>
                    <p className="text-xs text-brand-foreground/80 italic">Database updated. Next: Document Archiving.</p>
                  </div>
                </div>
                <button 
                  onClick={handleClosePreview}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Preview Panel */}
                <div className="flex-1 bg-slate-50 dark:bg-background p-4 flex flex-col min-h-[400px]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <LayoutGrid className="w-3.5 h-3.5" /> PDF Preview
                    </span>
                    <a 
                      href={pdfPreviewUrl || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-brand hover:underline flex items-center gap-1 bg-brand/10 px-2 py-1 rounded"
                    >
                      <ExternalLink className="w-3 h-3" /> Open in New Tab
                    </a>
                  </div>
                  <div className="flex-1 bg-white dark:bg-surface rounded-xl shadow-inner border border-slate-200 dark:border-white/10 overflow-hidden relative">
                    {pdfPreviewUrl ? (
                      <iframe 
                        src={pdfPreviewUrl} 
                        className="w-full h-full border-none"
                        title="PDF Preview"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <RefreshCw className="w-8 h-8 animate-spin mb-2" />
                        <p className="text-sm font-medium">Generating Preview...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Panel */}
                <div className="w-full md:w-80 p-8 flex flex-col gap-6 justify-center bg-slate-50 dark:bg-white/5 border-l border-slate-200 dark:border-white/10">
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-brand" /> Save to Cloud
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Upload this PDF report directly to the project's site operations folder in Google Drive.
                    </p>
                  </div>

                  <button 
                    onClick={uploadToDrive}
                    disabled={isUploadingToDrive || !pdfPreviewBlob}
                    className="w-full px-6 py-4 bg-brand text-white rounded-2xl text-sm font-bold shadow-xl shadow-brand/20 hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isUploadingToDrive ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <HardDrive className="w-5 h-5" />
                    )}
                    {isUploadingToDrive ? 'Uploading...' : 'Save to Drive'}
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200 dark:border-white/10"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase">
                      <span className="bg-slate-50 dark:bg-surface px-2 text-slate-400 dark:text-slate-500 font-black tracking-widest">Or</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <a 
                      href={pdfPreviewUrl || '#'} 
                      download={pdfFileName}
                      className="w-full px-6 py-3 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Download Locally
                    </a>
                    <button 
                      onClick={handleClosePreview}
                      className="w-full px-6 py-3 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-300 dark:hover:bg-white/20 transition-all"
                    >
                      Close & Return
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
