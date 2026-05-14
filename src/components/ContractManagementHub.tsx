import React, { useState } from 'react';
import { Page } from '../types';
import { 
  FileText, 
  Users, 
  Gavel, 
  ClipboardCheck, 
  GitBranch, 
  Banknote,
  Lock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ProcurementWorkflowCenter } from './ProcurementWorkflowCenter';
import { UniversalManager } from './common/UniversalManager';
import { POTracker } from './POTracker';
import { SupplierMasterRegister } from './SupplierMasterRegister';
import { ChangeRequestView } from './ChangeRequestView';
import { ContractorAdvancesView } from './ContractorAdvancesView';
import { ContractsRegistryView } from './ContractsRegistryView';
import { BOQView } from './BOQView';
import { useNavigate } from 'react-router-dom';

interface ContractManagementHubProps {
  page: Page;
}

export const ContractManagementHub: React.FC<ContractManagementHubProps> = ({ page }) => {
  const [subTab, setSubTab] = useState<'requisitions' | 'suppliers' | 'pos' | 'contracts' | 'execution' | 'changes' | 'advances' | 'closure'>('requisitions');
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden m-2">
      <div className="flex border-b border-slate-200 bg-[#F8FAFC] px-4 overflow-x-auto no-scrollbar gap-4">
        <button 
          onClick={() => setSubTab('requisitions')}
          className={cn("py-2 text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2 border-b-2", subTab === 'requisitions' ? "text-[#FF5F00] border-[#FF5F00]" : "text-[#4A5568] border-transparent hover:text-[#1A1C1E]")}
        >
          <FileText className="w-3.5 h-3.5" />
          Requisitions
        </button>
        <button 
          onClick={() => setSubTab('suppliers')}
          className={cn("py-2 text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2 border-b-2", subTab === 'suppliers' ? "text-[#FF5F00] border-[#FF5F00]" : "text-[#4A5568] border-transparent hover:text-[#1A1C1E]")}
        >
          <Users className="w-3.5 h-3.5" />
          Vendors
        </button>
        <button 
          onClick={() => setSubTab('pos')}
          className={cn("py-2 text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2 border-b-2", subTab === 'pos' ? "text-[#FF5F00] border-[#FF5F00]" : "text-[#4A5568] border-transparent hover:text-[#1A1C1E]")}
        >
          <Gavel className="w-3.5 h-3.5" />
          Orders
        </button>
        <button 
          onClick={() => setSubTab('contracts')}
          className={cn("py-2 text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2 border-b-2", subTab === 'contracts' ? "text-[#FF5F00] border-[#FF5F00]" : "text-[#4A5568] border-transparent hover:text-[#1A1C1E]")}
        >
          <FileText className="w-3.5 h-3.5" />
          Contracts
        </button>
        <button 
          onClick={() => setSubTab('execution')}
          className={cn("py-2 text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2 border-b-2", subTab === 'execution' ? "text-[#FF5F00] border-[#FF5F00]" : "text-[#4A5568] border-transparent hover:text-[#1A1C1E]")}
        >
          <ClipboardCheck className="w-3.5 h-3.5" />
          Execution
        </button>
        <button 
          onClick={() => setSubTab('changes')}
          className={cn("py-2 text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2 border-b-2", subTab === 'changes' ? "text-[#FF5F00] border-[#FF5F00]" : "text-[#4A5568] border-transparent hover:text-[#1A1C1E]")}
        >
          <GitBranch className="w-3.5 h-3.5" />
          Changes
        </button>
        <button 
          onClick={() => setSubTab('advances')}
          className={cn("py-2 text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2 border-b-2", subTab === 'advances' ? "text-[#FF5F00] border-[#FF5F00]" : "text-[#4A5568] border-transparent hover:text-[#1A1C1E]")}
        >
          <Banknote className="w-3.5 h-3.5" />
          Payments
        </button>
        <button 
          onClick={() => setSubTab('closure')}
          className={cn("py-2 text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2 border-b-2", subTab === 'closure' ? "text-[#FF5F00] border-[#FF5F00]" : "text-[#4A5568] border-transparent hover:text-[#1A1C1E]")}
        >
          <Lock className="w-3.5 h-3.5" />
          Closure
        </button>
      </div>

      <div className="flex-1 overflow-auto relative bg-[#fcfcfc]">
        {subTab === 'requisitions' && <ProcurementWorkflowCenter page={page!} />}
        
        {subTab === 'suppliers' && (
          <div className="h-full relative w-full overflow-hidden bg-white">
            <SupplierMasterRegister page={page!} />
          </div>
        )}

        {subTab === 'pos' && <POTracker page={page!} />}

        {subTab === 'contracts' && (
          <div className="h-full relative w-full overflow-hidden bg-white">
            <ContractsRegistryView page={page!} />
          </div>
        )}

        {subTab === 'execution' && (
          <div className="h-full relative w-full overflow-hidden">
            <BOQView />
          </div>
        )}

        {subTab === 'changes' && (
          <div className="h-full relative w-full overflow-hidden">
            <ChangeRequestView page={page!} />
          </div>
        )}

        {subTab === 'advances' && (
          <div className="h-full relative w-full overflow-hidden bg-white">
             <ContractorAdvancesView page={page} />
          </div>
        )}

        {subTab === 'closure' && (
          <div className="p-8 h-full flex items-center justify-center">
            <div className="max-w-md w-full bg-slate-50 rounded-[2rem] border border-slate-200 border-dashed p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-6 relative">
                 <Lock className="w-8 h-8 text-slate-300" />
                 <div className="absolute top-0 right-0 w-4 h-4 bg-red-400 rounded-full border-2 border-white"></div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Contract Closure</h3>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                This module is used to archive contracts and close them financially and technically. Only contracts with 100% completion and payment will appear here.
              </p>
              <button disabled className="w-full py-4 bg-slate-200 text-slate-400 font-bold rounded-xl text-sm transition-all cursor-not-allowed">
                No completed contracts currently
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
