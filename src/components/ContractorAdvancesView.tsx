import React, { useState, useEffect, useMemo } from 'react';
import { Page, EntityConfig } from '../types';
import { 
  Banknote, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  CheckCircle2, 
  Clock,
  AlertCircle,
  Building,
  DollarSign,
  X,
  CreditCard
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  deleteDoc, 
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { UniversalDataTable } from './common/UniversalDataTable';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

interface ContractorAdvance {
  id: string;
  beneficiary: string;
  paymentType: string;
  amount: number;
  dueDate: string;
  status: 'Pending' | 'Approved' | 'Paid' | 'Rejected' | 'Archived';
  projectId: string;
  costCenterId?: string;
  createdAt: any;
  updatedAt: any;
}

interface ContractorAdvancesViewProps {
  page?: Page;
  costCenterId?: string | null;
}

export const ContractorAdvancesView: React.FC<ContractorAdvancesViewProps> = ({ page, costCenterId }) => {
  const { selectedProject } = useProject();
  const { t, isRtl, language } = useLanguage();
  const { formatAmount, baseCurrency } = useCurrency();
  const [data, setData] = useState<ContractorAdvance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ContractorAdvance | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<ContractorAdvance>>({
    beneficiary: '',
    paymentType: 'Progress Payment',
    amount: 0,
    dueDate: new Date().toISOString().split('T')[0],
    status: 'Pending'
  });

  const config: EntityConfig = {
    id: 'contractor_advances',
    label: isRtl ? 'سلف المقاولين' : 'Contractor Advances',
    icon: Banknote,
    collection: 'contractor_advances',
    columns: [
      { key: 'beneficiary', label: isRtl ? 'الجهة المستفيدة' : 'Beneficiary', type: 'string' },
      { key: 'paymentType', label: isRtl ? 'نوع الدفعة' : 'Payment Type', type: 'badge' },
      { key: 'amount', label: isRtl ? 'المبلغ' : 'Amount', type: 'currency' },
      { key: 'dueDate', label: isRtl ? 'تاريخ الاستحقاق' : 'Due Date', type: 'date' },
      { key: 'status', label: isRtl ? 'الحالة' : 'Status', type: 'status' }
    ]
  };

  useEffect(() => {
    if (!selectedProject) return;
    const q = query(
      collection(db, 'contractor_advances'),
      where('projectId', '==', selectedProject.id)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContractorAdvance)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedProject]);

  const filteredData = useMemo(() => {
    let result = data;
    if (costCenterId) {
      result = result.filter(d => d.costCenterId === costCenterId);
    }
    
    // Status-based filtering for Archive
    result = result.filter(d => {
      const isArchived = d.status === 'Archived';
      return showArchived ? isArchived : !isArchived;
    });

    return result;
  }, [data, costCenterId, showArchived]);

  const handleSave = async () => {
    if (!selectedProject) return;
    if (!formData.beneficiary || !formData.amount) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        projectId: selectedProject.id,
        costCenterId: costCenterId || 'General',
        updatedAt: serverTimestamp(),
      };

      if (editingEntry) {
        await updateDoc(doc(db, 'contractor_advances', editingEntry.id), payload);
        toast.success('Advance record updated');
      } else {
        await addDoc(collection(db, 'contractor_advances'), {
          ...payload,
          createdAt: serverTimestamp(),
          status: 'Pending'
        });
        toast.success('Advance record created');
      }
      setIsModalOpen(false);
      setEditingEntry(null);
    } catch (err) {
      handleFirestoreError(err, editingEntry ? OperationType.UPDATE : OperationType.CREATE, 'contractor_advances');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'contractor_advances', id));
      toast.success('Record deleted permanently');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'contractor_advances');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const entry = data.find(d => d.id === id);
      const isArchived = entry?.status === 'Archived';
      await updateDoc(doc(db, 'contractor_advances', id), {
        status: isArchived ? 'Pending' : 'Archived',
        updatedAt: serverTimestamp()
      });
      toast.success(isArchived ? 'Record restored' : 'Record archived');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'contractor_advances');
    }
  };

  const stats = useMemo(() => {
    const total = filteredData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const pending = filteredData.filter(d => d.status === 'Pending').length;
    const paid = filteredData.filter(d => d.status === 'Paid').length;
    return { total, pending, paid };
  }, [filteredData]);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <div className="h-full flex flex-col pt-2 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-10 mb-6 shrink-0">
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{isRtl ? 'إجمالي المصروفات' : 'Total Disbursements'}</p>
            <h3 className="text-xl font-black text-slate-900 tracking-tighter">{formatAmount(stats.total, baseCurrency)}</h3>
          </div>
        </div>
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{isRtl ? 'سلف قيد المعالجة' : 'Pending Advances'}</p>
            <h3 className="text-xl font-black text-slate-900 tracking-tighter">{stats.pending}</h3>
          </div>
        </div>
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{isRtl ? 'تم الدفع' : 'Processed Payments'}</p>
            <h3 className="text-xl font-black text-slate-900 tracking-tighter">{stats.paid}</h3>
          </div>
        </div>
      </div>

      <UniversalDataTable 
        config={config}
        data={filteredData}
        onRowClick={(row) => {
          setEditingEntry(row as ContractorAdvance);
          setFormData(row);
          setIsModalOpen(true);
        }}
        onDeleteRecord={handleDelete}
        onArchiveRecord={handleArchive}
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived(!showArchived)}
        showAddButton={true}
        onNewClick={() => {
          setEditingEntry(null);
          setFormData({ beneficiary: '', paymentType: 'Progress Payment', amount: 0, dueDate: new Date().toISOString().split('T')[0], status: 'Pending' });
          setIsModalOpen(true);
        }}
        title={
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                {isRtl ? 'سلف ومستحقات المقاولين' : 'Contractor Advances'}
              </h2>
              <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Disbursement controls and tracking</p>
            </div>
          </div>
        }
      />

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">
                  {editingEntry ? (isRtl ? 'تعديل السجل' : 'Edit Advance Record') : (isRtl ? 'تسجيل سلفة جديدة' : 'New Advance Record')}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="p-10 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{isRtl ? 'المستفيد' : 'Beneficiary'}</label>
                  <input 
                    type="text" 
                    value={formData.beneficiary}
                    onChange={e => setFormData({...formData, beneficiary: e.target.value})}
                    placeholder="Company Name / Contractor"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 outline-none" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{isRtl ? 'المبلغ' : 'Amount'}</label>
                    <input 
                      type="number" 
                      value={formData.amount}
                      onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 outline-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{isRtl ? 'تاريخ الاستحقاق' : 'Due Date'}</label>
                    <input 
                      type="date" 
                      value={formData.dueDate}
                      onChange={e => setFormData({...formData, dueDate: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 outline-none" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{isRtl ? 'نوع الدفعة' : 'Payment Type'}</label>
                  <select 
                    value={formData.paymentType}
                    onChange={e => setFormData({...formData, paymentType: e.target.value})}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-emerald-500/10 outline-none appearance-none"
                  >
                    <option value="Progress Payment">Progress Payment (مستخلص جاري)</option>
                    <option value="Mobilization Advance">Mobilization Advance (سلفة تشغيلية)</option>
                    <option value="Retention Release">Retention Release (إطلاق أمانات)</option>
                    <option value="Material Advance">Material Advance (سلفة مواد)</option>
                  </select>
                </div>
                <button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? <Clock className="w-5 h-5 animate-spin"/> : <CheckCircle2 className="w-5 h-5" />}
                  {isRtl ? 'حفظ البيانات' : 'Save Advance Record'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
