import React, { useState } from 'react';
import { Page } from '../types';
import { 
  ShieldAlert, 
  Settings, 
  List, 
  Grid, 
  TrendingDown, 
  LineChart, 
  Lock, 
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { RiskRegisterView } from './RiskRegisterView';
import { RiskDashboardView } from './RiskDashboardView';
import { StandardProcessPage } from './StandardProcessPage';

import { DomainDashboard } from './DomainDashboard';
import { pages } from '../data';

interface RiskOpportunityHubProps {
  page: Page;
}

export const RiskOpportunityHub: React.FC<RiskOpportunityHubProps> = ({ page }) => {
  const [activeTab, setActiveTab] = useState<'Overview' | 'Planning' | 'Monitoring' | 'Executing'>('Overview');

  const tabs = [
    { id: 'Overview', label: 'Domain Overview', icon: Grid },
    { id: 'Planning', label: 'Defense Strategy', icon: Settings },
    { id: 'Executing', label: 'Response Tracking', icon: AlertTriangle },
    { id: 'Monitoring', label: 'Reserve Control', icon: TrendingDown },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'Overview':
        return <DomainDashboard page={page} childrenPages={pages.filter(p => p.domain === 'risk' && p.id !== page.id)} initialTab="overview" />;
      case 'Planning':
        return <RiskRegisterView page={page} />;
      case 'Monitoring':
        return <RiskDashboardView page={page} />;
      case 'Executing':
        return (
          <div className="py-20 text-center space-y-4">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <AlertTriangle className="w-8 h-8" />
             </div>
             <p className="text-xs font-semibold uppercase text-slate-400 tracking-widest italic">Issue Log & Response Execution coming soon...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <header className="px-12 py-6 bg-white border-b border-slate-100 flex items-center justify-between -mx-4 -mt-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-1.5">
              <span>Risk & Opportunity</span>
              <ChevronRight className="w-2.5 h-2.5 opacity-50" />
              <span className="text-blue-600">{activeTab}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-none uppercase">
              {activeTab === 'Overview' ? 'Risk Opportunity Hub' : activeTab}
            </h2>
          </div>
        </div>
      </header>

      {/* Risk Ribbon Navigation */}
      <div className="bg-white/80 backdrop-blur-md sticky top-[calc(var(--header-height)+1px)] z-30 border-b border-slate-100 px-12 py-4">
        <div className="flex items-center gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "relative flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-300 group",
                  isActive 
                    ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10 scale-105" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )}
              >
                <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", isActive ? "text-rose-400" : "")} />
                <span className="text-[10px] font-semibold uppercase tracking-widest">{tab.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="activeTabRisk" 
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-rose-500 rounded-full" 
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -10 }}
           transition={{ duration: 0.3 }}
           className="px-12"
        >
           {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
