import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Download, 
  Save, 
  Loader2, 
  ClipboardList,
  CheckCircle2,
  X,
  ShieldCheck,
  Zap,
  Activity
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { RiskAuditEntry } from '../../types';
import { db, OperationType, handleFirestoreError, auth } from '../../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RiskAuditTabProps {
  audits: RiskAuditEntry[];
  projectId: string;
}

export const RiskAuditTab: React.FC<RiskAuditTabProps> = ({ audits, projectId }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [auditType, setAuditType] = useState<'Event' | 'Response' | 'Process'>('Event');

  const [formData, setFormData] = useState<Partial<RiskAuditEntry>>({
    type: 'Event',
    event: '',
    cause: '',
    response: '',
    successful: true,
    actionsToImprove: '',
    process: '',
    followed: true,
    toolsUsed: '',
    comment: ''
  });

  const handleAdd = (type: 'Event' | 'Response' | 'Process') => {
    setAuditType(type);
    setFormData({
      type,
      event: '',
      cause: '',
      response: '',
      successful: true,
      actionsToImprove: '',
      process: '',
      followed: true,
      toolsUsed: '',
      comment: ''
    });
    setView('form');
  };

  const handleSave = async () => {
    if (!projectId) return;
    setIsSaving(true);
    try {
      const user = auth.currentUser?.displayName || auth.currentUser?.email || 'System';
      const timestamp = new Date().toISOString();
      
      await addDoc(collection(db, 'risk_audits'), {
        ...formData,
        projectId,
        date: timestamp,
        auditor: user
      });
      setView('list');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'risk_audits');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    toast((t) => (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-bold text-slate-900">Are you sure you want to delete this audit entry?</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await deleteDoc(doc(db, 'risk_audits', id));
                toast.success('Audit entry deleted successfully');
              } catch (err) {
                handleFirestoreError(err, OperationType.DELETE, 'risk_audits');
              }
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all"
          >
            Delete
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  const generatePDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;

    doc.addImage('https://lh3.googleusercontent.com/d/1LewYc-2-cN6k2DtwmaBjqBchrk_eZqc7', 'PNG', (pageWidth - 40) / 2, 10, 40, 15);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RISK AUDIT REPORT', pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Project ID: ${projectId}`, 15, 45);
    doc.text(`Audit Date: ${new Date().toLocaleDateString()}`, pageWidth - 15, 45, { align: 'right' });

    // Event Audit
    doc.setFontSize(12);
    doc.text('Risk Event Audit', 15, 55);
    autoTable(doc, {
      startY: 60,
      head: [['Event', 'Cause', 'Response', 'Comment']],
      body: audits.filter(a => a.type === 'Event').map(a => [a.event, a.cause, a.response, a.comment]),
      theme: 'grid',
      headStyles: { fillColor: [0, 82, 136] }
    });

    // Response Audit
    doc.setFontSize(12);
    const lastY1 = (doc as any).lastAutoTable.finalY;
    doc.text('Risk Response Audit', 15, lastY1 + 10);
    autoTable(doc, {
      startY: lastY1 + 15,
      head: [['Event', 'Response', 'Successful', 'Actions to Improve']],
      body: audits.filter(a => a.type === 'Response').map(a => [a.event, a.response, a.successful ? 'Yes' : 'No', a.actionsToImprove]),
      theme: 'grid',
      headStyles: { fillColor: [0, 82, 136] }
    });

    // Process Audit
    doc.setFontSize(12);
    const lastY2 = (doc as any).lastAutoTable.finalY;
    doc.text('Risk Management Process Audit', 15, lastY2 + 10);
    autoTable(doc, {
      startY: lastY2 + 15,
      head: [['Process', 'Followed', 'Tools Used']],
      body: audits.filter(a => a.type === 'Process').map(a => [a.process, a.followed ? 'Yes' : 'No', a.toolsUsed]),
      theme: 'grid',
      headStyles: { fillColor: [0, 82, 136] }
    });

    doc.save(`${projectId}-RISK-AUDIT-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (view === 'form') {
    return (
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">New Risk Audit: {auditType}</h3>
          </div>
          <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {auditType === 'Event' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Risk Event</label>
                <input 
                  type="text"
                  value={formData.event}
                  onChange={(e) => setFormData({ ...formData, event: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Root Cause</label>
                  <textarea 
                    value={formData.cause}
                    onChange={(e) => setFormData({ ...formData, cause: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Response Implemented</label>
                  <textarea 
                    value={formData.response}
                    onChange={(e) => setFormData({ ...formData, response: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {auditType === 'Response' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Risk Event / Response</label>
                <input 
                  type="text"
                  value={formData.event}
                  onChange={(e) => setFormData({ ...formData, event: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Was Response Successful?</label>
                  <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <button 
                      onClick={() => setFormData({ ...formData, successful: true })}
                      className={cn("flex-1 py-2 rounded-lg font-bold text-xs transition-all", formData.successful ? "bg-emerald-600 text-white" : "bg-white text-slate-400")}
                    >
                      Yes
                    </button>
                    <button 
                      onClick={() => setFormData({ ...formData, successful: false })}
                      className={cn("flex-1 py-2 rounded-lg font-bold text-xs transition-all", !formData.successful ? "bg-rose-600 text-white" : "bg-white text-slate-400")}
                    >
                      No
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Actions to Improve</label>
                  <textarea 
                    value={formData.actionsToImprove}
                    onChange={(e) => setFormData({ ...formData, actionsToImprove: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {auditType === 'Process' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Process Audited</label>
                <select 
                  value={formData.process}
                  onChange={(e) => setFormData({ ...formData, process: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="">Select Process...</option>
                  <option value="Plan Risk Management">Plan Risk Management</option>
                  <option value="Identify Risks">Identify Risks</option>
                  <option value="Perform Qualitative Assessment">Perform Qualitative Assessment</option>
                  <option value="Perform Quantitative Assessment">Perform Quantitative Assessment</option>
                  <option value="Plan Risk Responses">Plan Risk Responses</option>
                  <option value="Monitor and Control Risks">Monitor and Control Risks</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Process Followed?</label>
                  <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <button 
                      onClick={() => setFormData({ ...formData, followed: true })}
                      className={cn("flex-1 py-2 rounded-lg font-bold text-xs transition-all", formData.followed ? "bg-emerald-600 text-white" : "bg-white text-slate-400")}
                    >
                      Yes
                    </button>
                    <button 
                      onClick={() => setFormData({ ...formData, followed: false })}
                      className={cn("flex-1 py-2 rounded-lg font-bold text-xs transition-all", !formData.followed ? "bg-rose-600 text-white" : "bg-white text-slate-400")}
                    >
                      No
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Tools and Techniques Used</label>
                  <textarea 
                    value={formData.toolsUsed}
                    onChange={(e) => setFormData({ ...formData, toolsUsed: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">General Comments</label>
            <textarea 
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <button 
              onClick={() => setView('list')}
              className="px-6 py-2.5 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Audit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-900">Risk Audit History</h3>
        <div className="flex items-center gap-3">
          <button 
            onClick={generatePDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
          >
            <Download className="w-4 h-4" />
            Full Audit Report
          </button>
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => handleAdd('Event')}
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 rounded-lg font-bold text-xs shadow-sm hover:bg-slate-50 transition-all"
            >
              <Zap className="w-3 h-3 text-amber-500" />
              Event Audit
            </button>
            <button 
              onClick={() => handleAdd('Response')}
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 rounded-lg font-bold text-xs shadow-sm hover:bg-slate-50 transition-all"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              Response Audit
            </button>
            <button 
              onClick={() => handleAdd('Process')}
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 rounded-lg font-bold text-xs shadow-sm hover:bg-slate-50 transition-all"
            >
              <Activity className="w-3 h-3 text-blue-500" />
              Process Audit
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Event Audits */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
            <Zap className="w-3 h-3 text-amber-500" />
            Risk Event Audits
          </h4>
          <div className="space-y-3">
            {audits.filter(a => a.type === 'Event').length === 0 ? (
              <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400 italic">No event audits.</div>
            ) : (
              audits.filter(a => a.type === 'Event').map(a => (
                <div key={a.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm group relative">
                  <button 
                    onClick={() => handleDelete(a.id)}
                    className="absolute top-2 right-2 p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="text-xs font-bold text-slate-900 mb-1">{a.event}</div>
                  <div className="text-[10px] text-slate-400 font-medium mb-2 line-clamp-2">{a.comment}</div>
                  <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-widest text-slate-400">
                    <span>{new Date(a.date).toLocaleDateString()}</span>
                    <span>{a.auditor}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Response Audits */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            Response Effectiveness
          </h4>
          <div className="space-y-3">
            {audits.filter(a => a.type === 'Response').length === 0 ? (
              <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400 italic">No response audits.</div>
            ) : (
              audits.filter(a => a.type === 'Response').map(a => (
                <div key={a.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm group relative">
                  <button 
                    onClick={() => handleDelete(a.id)}
                    className="absolute top-2 right-2 p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-bold text-slate-900">{a.event}</div>
                    <span className={cn("px-1.5 py-0.5 rounded-md text-[8px] font-semibold uppercase", a.successful ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                      {a.successful ? 'Successful' : 'Failed'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mb-2 line-clamp-2">{a.actionsToImprove}</div>
                  <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-widest text-slate-400">
                    <span>{new Date(a.date).toLocaleDateString()}</span>
                    <span>{a.auditor}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Process Audits */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
            <Activity className="w-3 h-3 text-blue-500" />
            Process Compliance
          </h4>
          <div className="space-y-3">
            {audits.filter(a => a.type === 'Process').length === 0 ? (
              <div className="p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400 italic">No process audits.</div>
            ) : (
              audits.filter(a => a.type === 'Process').map(a => (
                <div key={a.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm group relative">
                  <button 
                    onClick={() => handleDelete(a.id)}
                    className="absolute top-2 right-2 p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-bold text-slate-900">{a.process}</div>
                    <span className={cn("px-1.5 py-0.5 rounded-md text-[8px] font-semibold uppercase", a.followed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                      {a.followed ? 'Followed' : 'Bypassed'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mb-2 line-clamp-2">Tools: {a.toolsUsed}</div>
                  <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-widest text-slate-400">
                    <span>{new Date(a.date).toLocaleDateString()}</span>
                    <span>{a.auditor}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
