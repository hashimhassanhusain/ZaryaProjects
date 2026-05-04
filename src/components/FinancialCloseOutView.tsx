import React, { useState, useEffect } from 'react';
import { Page, Activity, PurchaseOrder } from '../types';
import { StandardProcessPage } from './StandardProcessPage';
import { Banknote, CheckCircle2, AlertCircle, FileCheck, ArrowRight, Printer } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { formatCurrency } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface FinancialCloseOutViewProps {
  page: Page;
}

export const FinancialCloseOutView: React.FC<FinancialCloseOutViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!selectedProject?.id) return;
    const q = query(collection(db, 'purchase_orders'), where('projectId', '==', selectedProject.id));
    const unsub = onSnapshot(q, (snapshot) => {
      setPurchaseOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder)));
    });
    return () => unsub();
  }, [selectedProject?.id]);

  const openPOs = purchaseOrders.filter(po => po.status !== 'Closed' && po.status !== 'Paid');
  const allClosed = openPOs.length === 0 && purchaseOrders.length > 0;
  const totalSpent = purchaseOrders.reduce((acc, po) => acc + (po.amount || 0), 0);

  const handlePrintCertificate = () => {
    if (!selectedProject) return;
    setIsGenerating(true);
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Header
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('FINANCIAL CLOSURE CERTIFICATE', 105, 25, { align: 'center' });
    
    // Content
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Project: ${selectedProject.name} (${selectedProject.code})`, 20, 60);
    doc.text(`Date of Closure: ${new Date().toLocaleDateString()}`, 20, 70);
    
    doc.setFontSize(10);
    doc.text('This is to certify that all financial liabilities related to the aforementioned project have been satisfied.', 20, 90);
    doc.text('All purchase orders have been reconciled and closed.', 20, 95);

    autoTable(doc, {
      startY: 110,
      head: [['Metric', 'Value']],
      body: [
        ['Total Budgeted Value (BAC)', formatCurrency(selectedProject.charterData?.estimatedBudget || 0)],
        ['Total Actual Cost (AC)', formatCurrency(totalSpent)],
        ['Total POs Processed', purchaseOrders.length.toString()],
        ['Outstanding Liabilities', openPOs.length > 0 ? 'EXISTING' : 'NONE'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [13, 148, 136] }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 150;

    // Signatures
    doc.line(20, finalY + 40, 80, finalY + 40);
    doc.text('Finance Manager', 20, finalY + 45);
    
    doc.line(130, finalY + 40, 190, finalY + 40);
    doc.text('Project Sponsor', 130, finalY + 45);

    doc.save(`${selectedProject.code}-Financial-Closure.pdf`);
    setIsGenerating(false);
  };

  return (
    <StandardProcessPage
      page={page}
      inputs={[
        { id: '4.4.2', title: 'PO Audit', status: 'Final' },
        { id: '4.4.1', title: 'EVM Snapshot', status: 'Approved' }
      ]}
      outputs={[
        { id: '5.4.1-OUT', title: 'Financial Closure Cert', status: 'Draft' }
      ]}
    >
      <div className="space-y-8 pb-20">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg text-white">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 tracking-tight italic uppercase">Financial Close-Out</h2>
              <p className="text-sm text-slate-500 font-medium">Reconciling final accounts and verifying all project liabilities are settled.</p>
            </div>
          </div>
          {allClosed && (
             <button 
              onClick={handlePrintCertificate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-2xl font-semibold text-[10px] uppercase tracking-widest hover:bg-teal-700 transition-all shadow-xl shadow-teal-100"
             >
                <Printer className="w-4 h-4" />
                Issue Closure Certificate
             </button>
          )}
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className={`p-8 rounded-[2.5rem] border ${allClosed ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'} space-y-6 transition-all`}>
              <div className="flex items-center justify-between">
                 <h3 className="text-lg font-semibold text-slate-900 italic">Closure Readiness</h3>
                 {allClosed ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <AlertCircle className="w-6 h-6 text-rose-500" />}
              </div>
              <div className="space-y-4">
                 <div className="flex items-center justify-between p-4 bg-white/50 rounded-2xl">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Open Purchase Orders</span>
                    <span className={`text-xl font-semibold italic ${openPOs.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{openPOs.length}</span>
                 </div>
                 <div className="flex items-center justify-between p-4 bg-white/50 rounded-2xl">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Total Project Spend</span>
                    <span className="text-xl font-semibold italic text-slate-900">{formatCurrency(totalSpent)}</span>
                 </div>
              </div>
              {!allClosed && (
                <p className="text-xs text-rose-600 font-bold italic leading-relaxed">
                  Blocking: {openPOs.length} purchase orders are still in draft, pending or approved status. They must be marked as "Closed" or "Paid" before final close-out.
                </p>
              )}
           </div>

           <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Next Action</h3>
              <div className="space-y-4">
                 <div className="group p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer hover:bg-teal-600 hover:text-white transition-all">
                    <div>
                        <p className="text-sm font-semibold italic">Audit PO History</p>
                        <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Verify all deliverables received</p>
                    </div>
                    <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all" />
                 </div>
                 <div className="group p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer hover:bg-teal-600 hover:text-white transition-all">
                    <div>
                        <p className="text-sm font-semibold italic">Reconcile Reserves</p>
                        <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Release unused budget to company</p>
                    </div>
                    <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-all" />
                 </div>
              </div>
           </div>
        </section>

        <section className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
            <div className="p-8 border-b border-slate-50 flex items-center gap-3">
               <FileCheck className="w-5 h-5 text-teal-600" />
               <h3 className="text-lg font-semibold text-slate-900 tracking-tight italic">Liability Audit Table</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-8 py-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">PO Ref</th>
                        <th className="px-8 py-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Supplier</th>
                        <th className="px-8 py-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400 text-center">Status</th>
                        <th className="px-8 py-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400 text-right">Value</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {purchaseOrders.map(po => (
                        <tr key={po.id} className="hover:bg-slate-50/30 transition-colors">
                           <td className="px-8 py-6 text-sm font-semibold text-slate-900">{po.id}</td>
                           <td className="px-8 py-6 text-sm font-medium text-slate-600">{po.supplier}</td>
                           <td className="px-8 py-6 text-center">
                              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                                 ['Closed', 'Paid'].includes(po.status || '') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                              }`}>
                                 {po.status}
                              </span>
                           </td>
                           <td className="px-8 py-6 text-sm font-semibold text-slate-900 text-right">{formatCurrency(po.amount)}</td>
                        </tr>
                      ))}
                      {purchaseOrders.length === 0 && (
                        <tr>
                           <td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-medium italic">No purchase orders found.</td>
                        </tr>
                      )}
                   </tbody>
                </table>
            </div>
        </section>
      </div>
    </StandardProcessPage>
  );
};
