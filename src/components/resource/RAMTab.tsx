import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Search, 
  Download, 
  Loader2,
  Users,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  WBSLevel, 
  Stakeholder, 
  RoleResponsibility 
} from '../../types';
import { toast } from 'react-hot-toast';
import { db, OperationType, handleFirestoreError } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RAMTabProps {
  projectId: string;
}

type RACIValue = 'R' | 'A' | 'C' | 'I' | '';

export const RAMTab: React.FC<RAMTabProps> = ({ projectId }) => {
  const { t, isRtl } = useLanguage();
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [roles, setRoles] = useState<RoleResponsibility[]>([]);
  const [raciData, setRaciData] = useState<Record<string, Record<string, RACIValue>>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const wbsQ = query(collection(db, 'wbs'), where('projectId', '==', projectId));
    const unsubscribeWbs = onSnapshot(wbsQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WBSLevel));
      setWbsLevels(data.sort((a, b) => a.code.localeCompare(b.code)));
    });

    const stakeQ = query(collection(db, 'stakeholders'), where('projectId', '==', projectId));
    const unsubscribeStake = onSnapshot(stakeQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stakeholder));
      setStakeholders(data);
    });

    const rolesQ = query(collection(db, 'roles_responsibilities'), where('projectId', '==', projectId));
    const unsubscribeRoles = onSnapshot(rolesQ, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RoleResponsibility));
      setRoles(data);
    });

    const raciDocRef = doc(db, 'ram_raci', projectId);
    const unsubscribeRaci = onSnapshot(raciDocRef, (snapshot) => {
      if (snapshot.exists()) {
        setRaciData(snapshot.data().matrix || {});
      }
      setLoading(false);
    });

    return () => {
      unsubscribeWbs();
      unsubscribeStake();
      unsubscribeRoles();
      unsubscribeRaci();
    };
  }, [projectId]);

  const handleRACIChange = async (wbsId: string, stakeholderId: string, value: RACIValue) => {
    // Validation: Block "A" if not in Roles & Responsibilities
    if (value === 'A') {
      const stakeholder = stakeholders.find(s => s.id === stakeholderId);
      const roleExists = roles.some(r => r.position.toLowerCase() === stakeholder?.position.toLowerCase());
      if (!roleExists) {
        toast.error(`Validation Error: ${stakeholder?.name} cannot be assigned as Accountable (A) because their position "${stakeholder?.position}" is not defined in the approved Roles & Responsibilities log.`);
        return;
      }
    }

    const newMatrix = {
      ...raciData,
      [wbsId]: {
        ...(raciData[wbsId] || {}),
        [stakeholderId]: value
      }
    };

    try {
      await setDoc(doc(db, 'ram_raci', projectId), { matrix: newMatrix }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'ram_raci');
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const date = new Date().toLocaleDateString();
    
    doc.setFontSize(20);
    doc.text(t('ram_raci_matrix'), 148, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Project: ${projectId} | Date: ${date}`, 148, 30, { align: 'center' });

    const headers = [t('activity_wbs'), ...stakeholders.map(s => s.name)];
    const body = wbsLevels.map(wbs => [
      `${wbs.code} - ${wbs.title}`,
      ...stakeholders.map(s => raciData[wbs.id]?.[s.id] || '')
    ]);

    autoTable(doc, {
      startY: 40,
      head: [headers],
      body: body,
      theme: 'grid',
      styles: { fontSize: 7 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] }
    });

    doc.save(`${projectId}-RES-RAM-V1-${date.replace(/\//g, '-')}.pdf`);
  };

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
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-900">{t('ram_raci_matrix')}</h2>
          <p className="text-sm text-slate-500">{t('intersection_wbs_personnel')}</p>
        </div>
        <button
          onClick={exportPDF}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
        >
          <Download className="w-4 h-4" />
          {t('export_landscape_pdf')}
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-x-auto">
        <table className={cn("w-full border-collapse min-w-[1200px]", isRtl ? "text-right" : "text-left")}>
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              <th className={cn("px-6 py-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest sticky bg-slate-50 z-10 w-64", isRtl ? "right-0" : "left-0")}>{t('activity_wbs')}</th>
              {stakeholders.map(s => (
                <th key={s.id} className="px-4 py-5 text-[10px] font-semibold text-slate-900 uppercase tracking-widest text-center min-w-[120px]">
                  <div className="flex flex-col items-center gap-1">
                    <span className="truncate max-w-[100px]">{s.name}</span>
                    <span className="text-[8px] text-slate-400 normal-case font-medium">{s.position}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {wbsLevels.map((wbs) => (
              <tr key={wbs.id} className="hover:bg-slate-50/50 transition-colors">
                <td className={cn("px-6 py-4 sticky bg-white group-hover:bg-slate-50 z-10 border-slate-100", isRtl ? "right-0 border-l" : "left-0 border-r")}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400">{wbs.code}</span>
                    <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]">{wbs.title}</span>
                  </div>
                </td>
                {stakeholders.map(s => (
                  <td key={s.id} className="px-4 py-4 text-center">
                    <select
                      value={raciData[wbs.id]?.[s.id] || ''}
                      onChange={(e) => handleRACIChange(wbs.id, s.id, e.target.value as RACIValue)}
                      className={cn(
                        "w-12 h-12 rounded-xl text-sm font-semibold transition-all appearance-none text-center focus:outline-none focus:ring-2 focus:ring-slate-900/5",
                        raciData[wbs.id]?.[s.id] === 'R' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                        raciData[wbs.id]?.[s.id] === 'A' ? "bg-slate-900 text-white border border-slate-900" :
                        raciData[wbs.id]?.[s.id] === 'C' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                        raciData[wbs.id]?.[s.id] === 'I' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                        "bg-slate-50 text-slate-300 border border-transparent hover:border-slate-200"
                      )}
                    >
                      <option value=""></option>
                      <option value="R">R</option>
                      <option value="A">A</option>
                      <option value="C">C</option>
                      <option value="I">I</option>
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold text-xs border border-blue-100">R</div>
          <div className="text-xs font-bold text-slate-600">{t('responsible')}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-semibold text-xs border border-slate-900">A</div>
          <div className="text-xs font-bold text-slate-600">{t('accountable')}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-semibold text-xs border border-amber-100">C</div>
          <div className="text-xs font-bold text-slate-600">{t('consulted')}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-semibold text-xs border border-emerald-100">I</div>
          <div className="text-xs font-bold text-slate-600">{t('informed')}</div>
        </div>
        <div className={cn("flex items-center gap-2 text-slate-400", isRtl ? "mr-auto" : "ml-auto")}>
          <AlertCircle className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">{t('accountable_requires_definition')}</span>
        </div>
      </div>
    </div>
  );
};
