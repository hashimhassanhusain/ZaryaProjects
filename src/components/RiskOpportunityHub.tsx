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
  AlertTriangle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { RiskRegisterView } from './RiskRegisterView';
import { RiskDashboardView } from './RiskDashboardView';
import { StandardProcessPage } from './StandardProcessPage';

interface RiskOpportunityHubProps {
  page: Page;
}

export const RiskOpportunityHub: React.FC<RiskOpportunityHubProps> = ({ page }) => {
  const [activeTab, setActiveTab] = useState<'Planning' | 'Monitoring' | 'Executing'>('Planning');

  const tabs = [
    { id: 'Planning', label: 'Defense Strategy', icon: Settings },
    { id: 'Executing', label: 'Response Tracking', icon: AlertTriangle },
    { id: 'Monitoring', label: 'Reserve Control', icon: TrendingDown },
  ];

  const renderContent = () => {
    switch (activeTab) {
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
