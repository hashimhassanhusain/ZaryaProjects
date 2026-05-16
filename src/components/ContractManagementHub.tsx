import React, { useState, useMemo } from 'react';
import { Page } from '../types';
import { 
  FileText, 
  Users, 
  Gavel, 
  ClipboardCheck, 
  GitBranch, 
  Banknote,
  Lock,
  ChevronRight,
  Hash,
  LayoutDashboard,
  Mountain,
  Box,
  Grid,
  Hammer,
  Trees,
  Umbrella,
  PanelTop,
  Brush,
  Star,
  Wrench,
  Armchair,
  Tent,
  Navigation,
  Settings as Cog,
  Zap,
  HardHat,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ProcurementWorkflowCenter } from './ProcurementWorkflowCenter';
import { POTracker } from './POTracker';
import { ChangeRequestView } from './ChangeRequestView';
import { ContractorAdvancesView } from './ContractorAdvancesView';
import { ContractsRegistryView } from './ContractsRegistryView';
import { BOQView } from './BOQView';
import { useNavigate } from 'react-router-dom';
import { masterFormatDivisions } from '../data';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { Ribbon, RibbonGroup } from './Ribbon';

interface ContractManagementHubProps {
  page: Page;
}

export const ContractManagementHub: React.FC<ContractManagementHubProps> = ({ page }) => {
  const { t, isRtl } = useLanguage();
  const [selectedCostCenter, setSelectedCostCenter] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<string>('requisitions');
  
  const divisionIcons: Record<string, any> = {
    '01': FileText,
    '02': HardHat,
    '03': Box,
    '04': Grid,
    '05': Hammer,
    '06': Trees,
    '07': Umbrella,
    '08': PanelTop,
    '09': Brush,
    '10': Star,
    '11': Wrench,
    '12': Armchair,
    '13': Tent,
    '14': Navigation,
    '15': Cog,
    '16': Zap,
  };

  const currentCostCenter = useMemo(() => 
    masterFormatDivisions.find(d => d.id === selectedCostCenter), 
    [selectedCostCenter]
  );

  const costCenterGroup: RibbonGroup = {
    id: 'cost-centers',
    tabs: masterFormatDivisions.map((division) => ({
      id: division.id,
      label: division.title,
      icon: divisionIcons[division.id] || Hash,
      size: 'large'
    }))
  };

  const subTabGroups: RibbonGroup[] = [
    {
      id: 'procurement',
      tabs: [
        { id: 'requisitions', label: isRtl ? 'الطلبات' : 'Requisitions', icon: FileText, size: 'large' },
        { id: 'pos', label: isRtl ? 'الأوامر' : 'Orders', icon: Gavel, size: 'large' },
        { id: 'contracts', label: isRtl ? 'العقود' : 'Contracts', icon: FileText, size: 'large' },
      ]
    },
    {
      id: 'project-execution',
      tabs: [
        { id: 'execution', label: isRtl ? 'التنفيذ' : 'Execution', icon: ClipboardCheck, size: 'large' },
        { id: 'changes', label: isRtl ? 'التغييرات' : 'Changes', icon: GitBranch, size: 'large' },
      ]
    },
    {
      id: 'financial',
      tabs: [
        { id: 'advances', label: isRtl ? 'الدفعات' : 'Payments', icon: Banknote, size: 'large' },
        { id: 'closure', label: isRtl ? 'الإغلاق' : 'Closure', icon: Lock, size: 'large' },
      ]
    }
  ];

  const renderModuleContent = () => {
    if (!selectedCostCenter) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50">
          <div className="w-24 h-24 rounded-[2.5rem] bg-white shadow-xl shadow-slate-200 flex items-center justify-center text-slate-300 mb-8 border border-slate-100">
            <LayoutDashboard className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic mb-3">
             {isRtl ? 'اختر مركز تكلفة للبدء' : 'Select a Cost Center to Start'}
          </h2>
          <p className="text-slate-500 max-w-md text-sm leading-relaxed">
            {isRtl 
              ? 'يرجى اختيار مركز التكلفة المناسب من القائمة العلوية للوصول إلى أدوات الوحدة النمطية والمشتريات.'
              : 'Please select a cost center from the top ribbon to access procurement and execution modules.'}
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full bg-white overflow-hidden">
        <Ribbon 
          groups={subTabGroups}
          activeTabId={subTab}
          onTabChange={(id) => setSubTab(id)}
          isCompactMode={subTab === 'execution'}
        />

        <div className="flex-1 overflow-auto relative bg-[#fcfcfc]">
          {subTab === 'requisitions' && <ProcurementWorkflowCenter page={page!} costCenterId={selectedCostCenter} />}
          {subTab === 'pos' && <POTracker page={page!} costCenterId={selectedCostCenter} />}
          {subTab === 'contracts' && (
            <div className="h-full relative w-full overflow-hidden bg-white">
              <ContractsRegistryView page={page!} costCenterId={selectedCostCenter} />
            </div>
          )}
          {subTab === 'execution' && (
            <div className="h-full relative w-full overflow-hidden">
              <BOQView costCenterId={selectedCostCenter} />
            </div>
          )}
          {subTab === 'changes' && (
            <div className="h-full relative w-full overflow-hidden">
              <ChangeRequestView page={page!} costCenterId={selectedCostCenter} />
            </div>
          )}
          {subTab === 'advances' && (
            <div className="h-full relative w-full overflow-hidden bg-white">
               <ContractorAdvancesView page={page} costCenterId={selectedCostCenter} />
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
                  Financial and technical closure for Cost Center {selectedCostCenter}.
                </p>
                <button disabled className="w-full py-4 bg-slate-200 text-slate-400 font-bold rounded-xl text-sm transition-all cursor-not-allowed">
                  No completed contracts in this CC
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden shadow-none rounded-none m-0">
      <Ribbon 
        groups={[costCenterGroup]}
        activeTabId={selectedCostCenter || ''}
        onTabChange={(id) => {
          if (selectedCostCenter === id) {
            setSelectedCostCenter(null);
          } else {
            setSelectedCostCenter(id);
          }
        }}
        isCompactMode={!!selectedCostCenter}
      />

      {selectedCostCenter && (
        <div className="px-6 py-1.5 bg-brand flex items-center justify-between transition-all shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded bg-white/20 flex items-center justify-center">
              <Hash className="w-3 h-3 text-white" />
            </div>
            <h3 className="text-[9px] font-black text-white uppercase tracking-widest italic">
              {currentCostCenter?.title}
            </h3>
          </div>
          <button 
            onClick={() => setSelectedCostCenter(null)}
            className="text-[9px] font-black text-white/70 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1"
          >
            {isRtl ? 'إغلاق' : 'Close Section'} <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedCostCenter || 'selection'}
            initial={{ opacity: 0, x: selectedCostCenter ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: selectedCostCenter ? -20 : 20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {renderModuleContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

