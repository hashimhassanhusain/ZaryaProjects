import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Download, 
  Save, 
  X,
  Loader2,
  Briefcase,
  Shield,
  Award,
  FileText,
  History
} from 'lucide-react';
import { RoleResponsibility, RoleResponsibilityVersion } from '../../types';
import { db, auth, OperationType, handleFirestoreError } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RolesResponsibilitiesTabProps {
  projectId: string;
}

export const RolesResponsibilitiesTab: React.FC<RolesResponsibilitiesTabProps> = ({ projectId }) => {
  const [roles, setRoles] = useState<RoleResponsibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [versions, setVersions] = useState<RoleResponsibilityVersion[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [formData, setFormData] = useState<Partial<RoleResponsibility>>({
    position: '',
    authority: '',
    responsibility: '',
    qualifications: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'roles_responsibilities'), where('projectId', '==', projectId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoleResponsibility));
      setRoles(data);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'roles_responsibilities'));

    const versionsQ = query(collection(db, 'role_versions'), where('projectId', '==', projectId));
    const unsubscribeVersions = onSnapshot(versionsQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoleResponsibilityVersion));
      setVersions(data.sort((a, b) => b.version - a.version));
    });

    return () => {
      unsubscribe();
      unsubscribeVersions();
    };
  }, [projectId]);

  const handleSave = async () => {
    try {
      const data = { ...formData, projectId, updatedAt: new Date().toISOString() };
      let docId = editingId;
      if (editingId) {
        await updateDoc(doc(db, 'roles_responsibilities', editingId), data);
      } else {
        const docRef = await addDoc(collection(db, 'roles_responsibilities'), data);
        docId = docRef.id;
      }

      // Create Version Snapshot
      const versionData = {
        roleId: docId,
        projectId,
        data,
        version: Date.now(),
        userId: auth.currentUser?.uid || 'unknown',
        userName: auth.currentUser?.displayName || 'System',
        timestamp: new Date().toISOString()
      };
      await addDoc(collection(db, 'role_versions'), versionData);

      setIsAdding(false);
      setEditingId(null);
      setFormData({ position: '', authority: '', responsibility: '', qualifications: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'roles_responsibilities');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'roles_responsibilities', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'roles_responsibilities');
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();
    
    doc.setFontSize(20);
    doc.text('ROLES & RESPONSIBILITIES LOG', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Project: ${projectId} | Date: ${date}`, 105, 30, { align: 'center' });

    const tableData = roles.map(r => [
      r.position,
      r.authority,
      r.responsibility,
      r.qualifications
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Position', 'Authority', 'Responsibility', 'Qualifications']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] }
    });

    doc.save(`${projectId}-RES-ROLES-V1-${date.replace(/\//g, '-')}.pdf`);
  };

  const filteredRoles = roles.filter(r => 
    (r.position || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (r.responsibility || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search positions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <Plus className="w-4 h-4" />
            Define Position
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredRoles.map((role) => (
          <motion.div
            key={role.id}
            layout
            className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group relative"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{role.position}</h3>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Position Description</div>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setEditingId(role.id);
                    setFormData(role);
                    setIsAdding(true);
                  }}
                  className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(role.id)}
                  className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-red-600 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  <Shield className="w-3 h-3" />
                  Authority
                </div>
                <p className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {role.authority}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  <FileText className="w-3 h-3" />
                  Responsibility
                </div>
                <p className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {role.responsibility}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  <Award className="w-3 h-3" />
                  Qualifications
                </div>
                <p className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  {role.qualifications}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">
                  {editingId ? 'Edit Position' : 'Define New Position'}
                </h2>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Position Title</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all font-bold"
                    placeholder="e.g. Senior Site Engineer"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Authority</label>
                  <textarea
                    value={formData.authority}
                    onChange={(e) => setFormData({ ...formData, authority: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all min-h-[80px]"
                    placeholder="Decision-making power, approval thresholds..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Responsibility</label>
                  <textarea
                    value={formData.responsibility}
                    onChange={(e) => setFormData({ ...formData, responsibility: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all min-h-[100px]"
                    placeholder="Key duties and deliverables..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Qualifications</label>
                  <textarea
                    value={formData.qualifications}
                    onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all min-h-[80px]"
                    placeholder="Required experience, certifications, skills..."
                  />
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    <History className="w-4 h-4" />
                    {showHistory ? 'Hide Version History' : 'Show Version History'}
                  </button>

                  {showHistory && (
                    <div className="mt-4 space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {versions.filter(v => v.roleId === editingId).map((v) => (
                        <div key={v.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold text-slate-900 uppercase">Version {v.version}</div>
                            <div className="text-[10px] text-slate-500">{v.userName} • {new Date(v.timestamp).toLocaleString()}</div>
                          </div>
                          <button 
                            onClick={() => setFormData(v.data)}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700"
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                      {versions.filter(v => v.roleId === editingId).length === 0 && (
                        <div className="text-center py-4 text-[10px] text-slate-400 font-bold uppercase">No version history found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  Save Position
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
