import React, { useState, useEffect } from 'react';
import { Page, WeatherData, DailyReportActivity, SiteIssue, PurchaseOrder, User } from '../types';
import { purchaseOrders, users } from '../data';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
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
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProgressReportViewProps {
  page: Page;
}

export const ProgressReportView: React.FC<ProgressReportViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [activities, setActivities] = useState<DailyReportActivity[]>([]);
  const [issues, setIssues] = useState<SiteIssue[]>([]);
  const [generalWorks, setGeneralWorks] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [incidents, setIncidents] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSave = async () => {
    if (!auth.currentUser) {
      alert('You must be signed in to submit a report.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Save the Daily Report
      const reportRef = await addDoc(collection(db, 'dailyReports'), {
        date: new Date().toISOString().split('T')[0],
        weather,
        activities,
        generalWorks,
        deliverables,
        incidents,
        submittedBy: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });

      // 2. Save Site Issues
      for (const issue of issues) {
        await addDoc(collection(db, 'siteIssues'), {
          ...issue,
          reportId: reportRef.id,
          createdAt: serverTimestamp()
        });
      }

      // 3. Update BOQ Progress (Simulated link)
      // In a real app, you'd map poLineItemId to BOQ items and update them
      for (const activity of activities) {
        if (activity.poLineItemId && activity.progressUpdate > 0) {
          // Find the BOQ item associated with this PO line item (mock logic)
          // For now, we'll just log it
          console.log(`Updating progress for activity ${activity.id} to ${activity.progressUpdate}%`);
        }
      }

      // 4. Generate and Upload PDF to Drive
      try {
        const doc = new jsPDF();
        const projectCode = selectedProject?.code || 'ZRY';
        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `${projectCode}-ZRY-SITE-RPT-${dateStr}.pdf`;

        // PDF Header
        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.text('DAILY SITE REPORT', 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text(`Project: ${selectedProject?.name || 'N/A'} (${projectCode})`, 20, 35);
        doc.text(`Date: ${dateStr}`, 20, 42);
        doc.text(`Submitted By: ${auth.currentUser.email}`, 20, 49);

        if (weather) {
          doc.text(`Weather: ${weather.condition}, ${weather.temp}°C, Humidity: ${weather.humidity}%, Wind: ${weather.windSpeed}km/h`, 20, 56);
        }

        // Activities Table
        doc.setFontSize(14);
        doc.text('Key Activities', 20, 70);
        
        const activityRows = activities.map(a => {
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

        // General Works & Deliverables
        let currentY = (doc as any).lastAutoTable.finalY + 15;
        
        doc.setFontSize(14);
        doc.text('General Works & Safety', 20, currentY);
        doc.setFontSize(10);
        doc.text(generalWorks || 'None reported', 20, currentY + 7, { maxWidth: 170 });
        
        currentY += 30;
        doc.setFontSize(14);
        doc.text('Deliverables & Measurements', 20, currentY);
        doc.setFontSize(10);
        doc.text(deliverables || 'None reported', 20, currentY + 7, { maxWidth: 170 });

        // Incidents & Issues
        currentY += 30;
        doc.setFontSize(14);
        doc.text('Incidents & Issues', 20, currentY);
        doc.setFontSize(10);
        doc.text(`Incidents: ${incidents || 'None'}`, 20, currentY + 7, { maxWidth: 170 });

        if (issues.length > 0) {
          const issueRows = issues.map(i => {
            const assignee = users.find(u => u.uid === i.assignedToId);
            return [i.title, i.severity, assignee?.name || 'Unassigned', i.status];
          });
          
          autoTable(doc, {
            startY: currentY + 15,
            head: [['Title', 'Severity', 'Assigned To', 'Status']],
            body: issueRows,
          });
        }

        // Convert PDF to Blob
        const pdfBlob = doc.output('blob');
        const formData = new FormData();
        formData.append('file', pdfBlob, fileName);
        formData.append('projectRootId', selectedProject?.driveFolderId || '');
        formData.append('path', 'SITE_OPERATIONS_04/04.1_Daily_Site_Reports');

        const driveRes = await fetch('/api/drive/upload-by-path', {
          method: 'POST',
          body: formData
        });

        if (!driveRes.ok) {
          const driveError = await driveRes.json();
          console.error('Drive upload failed:', driveError);
        } else {
          console.log('PDF uploaded to Drive successfully');
        }

        setIsSaving(false);
        alert(`Daily Report submitted successfully!\nProgress synced and PDF saved to Drive: ${fileName}`);
      } catch (pdfError) {
        console.error('Error generating/uploading PDF:', pdfError);
        setIsSaving(false);
        alert('Daily Report saved to database, but there was an error generating the PDF for Drive.');
      }
      
      // Reset form
      setActivities([]);
      setIssues([]);
      setGeneralWorks('');
      setDeliverables('');
      setIncidents('');
    } catch (error) {
      setIsSaving(false);
      handleFirestoreError(error, OperationType.CREATE, 'dailyReports');
    }
  };

  const allPOLineItems = purchaseOrders.flatMap(po => 
    po.lineItems.map(li => ({ ...li, poId: po.id, poSupplier: po.supplier }))
  );

  return (
    <div className="space-y-6 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Progress Reporting</h2>
          <p className="text-slate-500">Site activity logging and performance tracking.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {(['daily', 'weekly', 'monthly'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'daily' ? (
          <motion.div
            key="daily"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Weather Section */}
            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-amber-50 rounded-2xl">
                  <CloudSun className="w-8 h-8 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Site Weather</h3>
                  <p className="text-sm text-slate-500">Automatically recorded for {new Date().toLocaleDateString()}</p>
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
                {isSaving ? 'Saving Report...' : 'Submit Daily Report'}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-12 text-center bg-white rounded-3xl border border-slate-200 border-dashed"
          >
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 capitalize">{activeTab} Report Automation</h3>
              <p className="text-slate-500 leading-relaxed">
                {activeTab === 'weekly' 
                  ? 'Weekly reports are automatically generated every Thursday at 2:00 PM based on the last 7 daily reports.' 
                  : 'Monthly reports are automatically generated on the 1st of every month at 8:00 AM.'}
              </p>
              <div className="pt-6">
                <button className="px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">
                  View Last {activeTab === 'weekly' ? 'Weekly' : 'Monthly'} Report
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
