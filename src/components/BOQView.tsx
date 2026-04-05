import React, { useState, useEffect } from 'react';
import { BOQItem } from '../types';
import { boqData } from '../data';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { Table, Filter, LayoutGrid, List, Upload, RefreshCw, CheckCircle2, Clock, AlertCircle, Database } from 'lucide-react';
import { motion } from 'motion/react';

export const BOQView: React.FC = () => {
  const [data, setData] = useState<BOQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('grouped');
  const [isRestructuring, setIsRestructuring] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'boq'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BOQItem));
      setData(items);
      setLoading(false);
      
      // Auto-seed if empty
      if (items.length === 0 && !loading) {
        seedData();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'boq');
    });
    return () => unsubscribe();
  }, [loading]);

  const seedData = async () => {
    try {
      for (const item of boqData) {
        await setDoc(doc(db, 'boq', item.id), item);
      }
      alert('BOQ Data Seeded Successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'boq');
    }
  };

  const handleRestructure = async () => {
    setIsRestructuring(true);
    try {
      // Mapping from legacy/generic divisions to Master Format 2024
      const mapping: Record<string, string> = {
        'Div. 02 - Sitework': 'Div. 31 - Earthwork',
        'Div. 03 - Concrete': 'Div. 03 - Concrete',
        'Div. 09 - Finishes': 'Div. 09 - Finishes',
      };

      for (const item of data) {
        const newDivision = mapping[item.division] || item.division;
        if (newDivision !== item.division) {
          await setDoc(doc(db, 'boq', item.id), {
            ...item,
            division: newDivision
          });
        }
      }
      alert('BOQ Restructured to Master Format 2024 Successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'boq');
    } finally {
      setIsRestructuring(false);
    }
  };

  const groupedData = data.reduce((acc, item) => {
    const key = `${item.location} > ${item.division}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, BOQItem[]>);

  const getStatusIcon = (completion: number) => {
    if (completion === 100) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (completion > 0) return <Clock className="w-4 h-4 text-blue-500" />;
    return <AlertCircle className="w-4 h-4 text-slate-300" />;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    // For now, we'll use a placeholder folder ID or the parent folder ID
    // In a real scenario, this would be the specific project folder
    formData.append('folderId', '1veRtpHqs_f8nCDtRmpMa9NqCy1oiBRE0'); 

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        alert('File uploaded successfully to Google Drive!');
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('An error occurred during upload.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Bill of Quantities (BOQ)</h2>
          <p className="text-slate-500">Detailed cost control and progress tracking based on WBS hierarchy.</p>
        </div>
        <div className="flex gap-3">
          {data.length === 0 && (
            <button 
              onClick={seedData}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-sm"
            >
              <Database className="w-4 h-4" />
              Seed Initial Data
            </button>
          )}
          <button 
            onClick={handleRestructure}
            disabled={isRestructuring}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRestructuring ? 'animate-spin' : ''}`} />
            {isRestructuring ? 'Restructuring...' : 'Restructure to Master Format 2024'}
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
            <Upload className="w-4 h-4" />
            Upload BOQ
            <input type="file" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </header>

      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setViewMode('grouped')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'grouped' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Grouped View
        </button>
        <button
          onClick={() => setViewMode('flat')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'flat' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <List className="w-4 h-4" />
          Flat List
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Unit</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Qty</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Rate</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Progress</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {viewMode === 'grouped' ? (
              Object.entries(groupedData).map(([group, items]: [string, BOQItem[]]) => (
                <React.Fragment key={group}>
                  <tr className="bg-slate-50/50">
                    <td colSpan={7} className="px-6 py-3 text-sm font-bold text-blue-600">
                      {group}
                    </td>
                  </tr>
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">{item.description}</div>
                        <div className="text-xs text-slate-400">{item.workPackage}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.unit}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 text-right font-mono">{item.quantity}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 text-right font-mono">${item.rate}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right font-mono">${item.amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all duration-500" 
                              style={{ width: `${item.completion}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-600 w-8">{item.completion}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.completion)}
                          <span className="text-xs font-medium text-slate-600">
                            {item.completion === 100 ? 'Completed' : item.completion > 0 ? 'In Progress' : 'Pending'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            ) : (
              data.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">{item.description}</div>
                    <div className="text-xs text-slate-400">{item.location} &gt; {item.division}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.unit}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-right font-mono">{item.quantity}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-right font-mono">${item.rate}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right font-mono">${item.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-500" 
                          style={{ width: `${item.completion}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-600 w-8">{item.completion}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.completion)}
                      <span className="text-xs font-medium text-slate-600">
                        {item.completion === 100 ? 'Completed' : item.completion > 0 ? 'In Progress' : 'Pending'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
