import React, { useState } from 'react';
import { Page } from '../types';
import { pages } from '../data';
import { DetailView } from './DetailView';
import { GovernancePoliciesView } from './GovernancePoliciesView';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  FileText, 
  Shield, 
  ClipboardList, 
  Target, 
  DraftingCompass, 
  Calendar, 
  Banknote, 
  Users, 
  Package, 
  AlertTriangle,
  Settings,
  CheckCircle2
} from 'lucide-react';

interface ProjectManagementPlanViewProps {
  page: Page;
}

export const ProjectManagementPlanView: React.FC<ProjectManagementPlanViewProps> = ({ page }) => {
  const [activeTab, setActiveTab] = useState<'charter' | 'policies' | 'plans' | 'baselines'>('charter');
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [activeBaselineId, setActiveBaselineId] = useState<string | null>(null);

  // Fetch relevant pages
  const charterPage = pages.find(p => p.id === '1.1.1');
  const policiesPage = pages.find(p => p.id === '1.1.2');
  
  const managementPlans = pages.filter(p => 
    p.title.toLowerCase().includes('management plan') && 
    p.id !== '2.0.1' // avoid self reference if we use this ID
  );

  const baselines = [
    { id: 'scope_baseline', title: 'Scope Baseline', icon: DraftingCompass, content: 'The approved version of a scope statement, work breakdown structure (WBS), and its associated WBS dictionary.' },
    { id: 'schedule_baseline', title: 'Schedule Baseline', icon: Calendar, content: 'The approved version of a schedule model that can be changed only through formal change control procedures.' },
    { id: 'cost_baseline', title: 'Cost Baseline', icon: Banknote, content: 'The approved version of the time-phased project budget, excluding any management reserves.' },
  ];

  const tabs = [
    { id: 'charter', title: 'Project Charter', icon: FileText },
    { id: 'policies', title: 'Policies & Procedures', icon: Shield },
    { id: 'plans', title: 'Management Plans', icon: ClipboardList },
    { id: 'baselines', title: 'Baselines', icon: Target },
  ];

  const renderCharter = () => {
    if (!charterPage) return <div>Charter data not found.</div>;
    return <DetailView page={charterPage} />;
  };

  const renderPolicies = () => {
    if (!policiesPage) return <div>Policies data not found.</div>;
    return <GovernancePoliciesView page={policiesPage} />;
  };

  const renderPlans = () => {
    const selectedPlan = managementPlans.find(p => p.id === activePlanId) || managementPlans[0];
    
    return (
      <div className="flex flex-col md:flex-row gap-6 h-full">
        <div className="w-full md:w-64 shrink-0 space-y-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Management Plans</h3>
          {managementPlans.map(plan => (
            <button
              key={plan.id}
              onClick={() => setActivePlanId(plan.id)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm font-medium transition-all border-l-2",
                activePlanId === plan.id || (!activePlanId && plan.id === managementPlans[0].id)
                  ? "bg-blue-50 border-blue-600 text-blue-700"
                  : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              {plan.title}
            </button>
          ))}
        </div>
        <div className="flex-1 bg-white border border-slate-200 p-6 min-h-[400px]">
          {selectedPlan ? (
            <DetailView page={selectedPlan} />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 italic">
              Select a management plan to view details.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderBaselines = () => {
    const selectedBaseline = baselines.find(b => b.id === activeBaselineId) || baselines[0];

    return (
      <div className="flex flex-col md:flex-row gap-6 h-full">
        <div className="w-full md:w-64 shrink-0 space-y-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Project Baselines</h3>
          {baselines.map(baseline => {
            const Icon = baseline.icon;
            return (
              <button
                key={baseline.id}
                onClick={() => setActiveBaselineId(baseline.id)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm font-medium transition-all border-l-2 flex items-center gap-2",
                  activeBaselineId === baseline.id || (!activeBaselineId && baseline.id === baselines[0].id)
                    ? "bg-blue-50 border-blue-600 text-blue-700"
                    : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Icon className="w-4 h-4" />
                {baseline.title}
              </button>
            );
          })}
        </div>
        <div className="flex-1 bg-white border border-slate-200 p-8 min-h-[400px]">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 text-blue-600">
                {React.createElement(selectedBaseline.icon, { className: "w-6 h-6" })}
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{selectedBaseline.title}</h2>
            </div>
            <p className="text-slate-600 leading-relaxed mb-8">
              {selectedBaseline.content}
            </p>
            
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 border border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Approval Status
                </h4>
                <p className="text-sm text-slate-600">Approved by Project Sponsor on 2026-03-15</p>
              </div>
              
              <div className="p-4 bg-slate-50 border border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-600" />
                  Control Process
                </h4>
                <p className="text-sm text-slate-600">Changes to this baseline require a formal Change Request (CR) and approval from the Change Control Board (CCB).</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Project Management Plan</h1>
          <p className="text-slate-500 max-w-2xl">
            The comprehensive document that defines how the project is executed, monitored, controlled, and closed.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap",
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600 bg-blue-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.title}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="mt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'charter' && renderCharter()}
            {activeTab === 'policies' && renderPolicies()}
            {activeTab === 'plans' && renderPlans()}
            {activeTab === 'baselines' && renderBaselines()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
