import React, { useState, useEffect } from 'react';
import { Page } from '../types';
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
  DollarSign
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface ContractorAdvancesViewProps {
  page?: Page;
}

export const ContractorAdvancesView: React.FC<ContractorAdvancesViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedProject) return;
    const q = query(
      collection(db, 'contractor_advances'),
      where('projectId', '==', selectedProject.id)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [selectedProject]);

  return (
    <div className="h-full flex flex-col p-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
             <Banknote className="w-6 h-6 text-emerald-500" />
             مستحقات وسلف المقاولين
          </h2>
          <p className="text-slate-500 text-sm mt-2">سجلات الدفع التفصيلية، السلف المصروفة، ومتابعة الاستقطاعات والاسترداد (Funding Disbursement Records).</p>
        </div>
        <div className="flex items-center gap-2">
           <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
             <Download className="w-4 h-4" />
             تصدير
           </button>
           <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium">
             <Plus className="w-4 h-4" />
             صرف دفعة جديدة
           </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'إجمالي المصروفات', value: '0 IQD', icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'سلف قيد التسوية', value: '0', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'مستخلصات معتمدة', value: '0', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'دفعات متأخرة', value: '0', icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-slate-500 text-xs font-medium mb-1">{stat.label}</p>
              <h3 className="text-xl font-black text-slate-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
             <div className="relative">
               <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
               <input 
                 type="text"
                 placeholder="بحث في السجلات..."
                 className="pl-4 pr-10 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-shadow"
                 dir="rtl"
               />
             </div>
             <button className="p-2 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg">
               <Filter className="w-4 h-4" />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-right" dir="rtl">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="p-4 pr-6">رقم السجل</th>
                <th className="p-4 flex items-center gap-2"><Building className="w-3 h-3"/> الجهة المستفيدة</th>
                <th className="p-4">نوع الدفعة</th>
                <th className="p-4">المبلغ</th>
                <th className="p-4">تاريخ الاستحقاق</th>
                <th className="p-4 text-center">الحالة</th>
                <th className="p-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center">
                     <div className="flex flex-col items-center justify-center">
                       <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                         <FileText className="w-8 h-8 text-slate-300" />
                       </div>
                       <h4 className="text-lg font-bold text-slate-900 mb-1">لا توجد سجلات دفع</h4>
                       <p className="text-slate-500 text-sm max-w-sm mx-auto">لم يتم تسجيل أي دفاعات أو سلف للمقاولين حتى الآن في هذا المشروع.</p>
                     </div>
                  </td>
                </tr>
              ) : (
                 data.map((row, i) => (
                   <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                     <td className="p-4 pr-6 font-mono text-slate-600">{row.id?.slice(-6).toUpperCase()}</td>
                     <td className="p-4 font-semibold text-slate-900">{row.beneficiary || '---'}</td>
                     <td className="p-4 text-slate-500">{row.paymentType || 'سلفة تشغيلية'}</td>
                     <td className="p-4 font-bold text-emerald-600">{row.amount || 0} IQD</td>
                     <td className="p-4 text-slate-500">{row.dueDate || '---'}</td>
                     <td className="p-4 text-center">
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-full">معلق</span>
                     </td>
                     <td className="p-4 flex items-center justify-center gap-2">
                       <button className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"><FileText className="w-4 h-4"/></button>
                     </td>
                   </tr>
                 ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
