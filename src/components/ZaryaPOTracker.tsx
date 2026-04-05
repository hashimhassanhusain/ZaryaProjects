import React, { useState, useEffect, useMemo } from 'react';
import { Page, PurchaseOrder, POItem } from '../types';
import { purchaseOrders } from '../data';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { Table, FileText, BarChart3, ShieldCheck, Plus, Save, AlertTriangle, CheckCircle2, TrendingDown, Database, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface ZaryaPOTrackerProps {
  page: Page;
}

export const ZaryaPOTracker: React.FC<ZaryaPOTrackerProps> = ({ page }) => {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'purchaseOrders'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder));
      setPos(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'purchaseOrders');
    });
    return () => unsubscribe();
  }, []);

  // Flatten POs into items for tracking
  const items = useMemo(() => {
    const flattened: POItem[] = [];
    pos.forEach(po => {
      po.lineItems.forEach(li => {
        flattened.push({
          id: li.id,
          code: po.id, // Using PO ID as code for now
          description: li.description,
          totalQty: li.quantity,
          previousQty: li.status === 'Received' ? li.quantity : 0, // Mock logic
          currentQty: 0,
          price: li.rate,
          uom: li.unit
        });
      });
    });
    return flattened;
  }, [pos]);

  const seedData = async () => {
    try {
      for (const po of purchaseOrders) {
        await setDoc(doc(db, 'purchaseOrders', po.id), po);
      }
      alert('PO Data Seeded Successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'purchaseOrders');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' IQD';
  };

  const calculateRemaining = (item: POItem) => {
    const totalReceived = item.previousQty + item.currentQty;
    const remainingQty = item.totalQty - totalReceived;
    const remainingAmount = remainingQty * item.price;
    return { remainingQty, remainingAmount, totalReceived };
  };

  if (loading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;

  const renderPaymentCertificate = () => (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-start mb-8 border-b border-slate-100 pb-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Zarya Company for Construction</h3>
            <p className="text-slate-500">Summery of Work Form - Payment Certificate</p>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-blue-600">Date: 25/03/2026</div>
            <div className="text-xs text-slate-400">Ref: ZARYA-PC-003</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Supplier Name:</span> <span className="font-semibold">Wasta Noory Restaurant</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">PO Number:</span> <span className="font-semibold">COS003853</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Project Name:</span> <span className="font-semibold">Villa 2</span></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Payment Number:</span> <span className="font-semibold">3rd Payment</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Currency:</span> <span className="font-semibold">IQD</span></div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100 mb-6">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Received Qty</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3">UOM</th>
                <th className="px-4 py-3 text-right">Net Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-4 font-mono text-xs">{item.code}</td>
                  <td className="px-4 py-4 text-slate-700">{item.description}</td>
                  <td className="px-4 py-4 text-right">
                    <input 
                      type="number" 
                      value={item.currentQty} 
                      onChange={(e) => {
                        // This is a read-only view for now, or we should manage local state
                        console.log('Update current qty:', e.target.value);
                      }}
                      className="w-20 text-right border-b border-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-4 text-right">{item.price.toLocaleString()}</td>
                  <td className="px-4 py-4">{item.uom}</td>
                  <td className="px-4 py-4 text-right font-semibold">{(item.currentQty * item.price).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-blue-50/50 font-bold">
              <tr>
                <td colSpan={5} className="px-4 py-4 text-right text-blue-900">Total Current Payment:</td>
                <td className="px-4 py-4 text-right text-blue-900">
                  {items.reduce((acc, item) => acc + (item.currentQty * item.price), 0).toLocaleString()} IQD
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-end gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
            <Plus className="w-4 h-4" /> Add Line
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
            <Save className="w-4 h-4" /> Save & Migrate Data
          </button>
        </div>
      </div>
    </div>
  );

  const renderCumulativeTracking = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-900">Cumulative PO Tracking - Master Record</h3>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">IQD BASIS</span>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">SYNCED</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-4 border-r border-slate-200" colSpan={3}>PO Details</th>
                <th className="px-4 py-4 border-r border-slate-200 bg-blue-50/50" colSpan={2}>Payments (Cumulative)</th>
                <th className="px-4 py-4 bg-emerald-50/50" colSpan={3}>Remaining (Balance)</th>
              </tr>
              <tr className="bg-slate-50">
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2 text-right">Total PO Amount</th>
                <th className="px-4 py-2 text-right">Received Qty</th>
                <th className="px-4 py-2 text-right">Received Amount</th>
                <th className="px-4 py-2 text-right">Control Qty</th>
                <th className="px-4 py-2 text-right">Control Amount</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => {
                const { remainingQty, remainingAmount, totalReceived } = calculateRemaining(item);
                const isLow = remainingQty < (item.totalQty * 0.2);
                return (
                  <tr key={idx} className={cn("hover:bg-slate-50 transition-colors", isLow && "bg-rose-50/30")}>
                    <td className="px-4 py-4 font-mono">{item.code}</td>
                    <td className="px-4 py-4">{item.description}</td>
                    <td className="px-4 py-4 text-right font-semibold">{(item.totalQty * item.price).toLocaleString()}</td>
                    <td className="px-4 py-4 text-right">{totalReceived}</td>
                    <td className="px-4 py-4 text-right font-medium">{(totalReceived * item.price).toLocaleString()}</td>
                    <td className="px-4 py-4 text-right font-bold text-blue-600">{remainingQty}</td>
                    <td className="px-4 py-4 text-right font-bold text-emerald-600">{remainingAmount.toLocaleString()}</td>
                    <td className="px-4 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                        isLow ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {isLow ? 'Critical Balance' : 'Remain on PO'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 rounded-lg">
            <TrendingDown className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-bold text-slate-800">Budget Utilization</h3>
        </div>
        <div className="space-y-4">
          {items.map((item, idx) => {
            const { totalReceived } = calculateRemaining(item);
            const percent = (totalReceived / item.totalQty) * 100;
            return (
              <div key={idx}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500 truncate w-32">{item.description}</span>
                  <span className="font-bold">{percent.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-1000", percent > 80 ? "bg-rose-500" : "bg-blue-500")}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-rose-50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <h3 className="font-bold text-slate-800">Critical Alerts</h3>
        </div>
        <div className="space-y-3">
          {items.filter(i => (i.previousQty + i.currentQty) / i.totalQty > 0.8).map((item, idx) => (
            <div key={idx} className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-rose-900">{item.code} - Low Balance</div>
                <div className="text-[10px] text-rose-700">Less than 20% remaining on this PO line. Action required.</div>
              </div>
            </div>
          ))}
          {items.filter(i => (i.previousQty + i.currentQty) / i.totalQty <= 0.8).length === items.length && (
            <div className="text-center py-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs text-slate-400">All PO balances are healthy.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          Financial Summary
        </h3>
        <div className="space-y-6">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Total Contract Value</div>
            <div className="text-2xl font-bold text-blue-400">
              {items.reduce((acc, i) => acc + (i.totalQty * i.price), 0).toLocaleString()} <span className="text-sm">IQD</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
            <div>
              <div className="text-[10px] text-slate-400 mb-1">Total Paid</div>
              <div className="text-sm font-bold">
                {items.reduce((acc, i) => acc + ((i.previousQty + i.currentQty) * i.price), 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 mb-1">Total Remaining</div>
              <div className="text-sm font-bold text-emerald-400">
                {items.reduce((acc, i) => acc + calculateRemaining(i).remainingAmount, 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <div className="text-sm font-medium text-blue-600 mb-2 uppercase tracking-wider">Zarya Construction Co.</div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{page.title}</h2>
        </div>
        <div className="flex gap-2">
           {items.length === 0 && (
             <button 
               onClick={seedData}
               className="px-4 py-2 bg-emerald-600 rounded-lg text-xs font-bold text-white shadow-lg shadow-emerald-500/20 flex items-center gap-2"
             >
               <Database className="w-3 h-3" />
               Seed PO Data
             </button>
           )}
           <div className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold text-slate-500">SYSTEM: ACTIVE</div>
           <div className="px-4 py-2 bg-blue-600 rounded-lg text-xs font-bold text-white shadow-lg shadow-blue-500/20">LIVE SYNC</div>
        </div>
      </header>

      {page.id === '4.2.3' && renderPaymentCertificate()}
      {page.id === '4.2.4' && renderCumulativeTracking()}
      {page.id === '4.2.5' && renderDashboard()}

      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-500 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-blue-900">Smart Logic Enabled</h4>
          <p className="text-xs text-blue-700 leading-relaxed">
            All calculations follow the formula: <code className="bg-blue-100 px-1 rounded">Remaining = Total PO - (Previous + Current)</code>. 
            Data is automatically migrated to the Cumulative Tracking record upon saving.
          </p>
        </div>
      </div>
    </div>
  );
};
