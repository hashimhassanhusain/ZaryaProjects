import React from 'react';
import { Page } from '../types';
import { StandardProcessPage } from './StandardProcessPage';
import { MessageSquare, Calendar, Mail, FileText, Send, Share2, ClipboardList } from 'lucide-react';

interface CommunicationsPlanViewProps {
  page: Page;
}

export const CommunicationsPlanView: React.FC<CommunicationsPlanViewProps> = ({ page }) => {
  const comms = [
    { id: 'C1', topic: 'Project Monthly Performance Report', audience: 'Steering Committee', frequency: 'Monthly', method: 'PDF Report / Meeting', owner: 'Project Manager' },
    { id: 'C2', topic: 'Weekly Technical Sync', audience: 'Engineering Team', frequency: 'Weekly', method: 'Meeting (F2F/Online)', owner: 'Technical Lead' },
    { id: 'C3', topic: 'Daily Site Log', audience: 'Site Engineers / PM', frequency: 'Daily', method: 'Mobile App Submission', owner: 'Site Supervisor' },
    { id: 'C4', topic: 'Procurement & PO Status', audience: 'Finance / Supplier', frequency: 'Event-driven', method: 'Email / Portal', owner: 'Procurement Officer' },
    { id: 'C5', topic: 'Risk & Issue Alerts', audience: 'Key Stakeholders', frequency: 'As needed', method: 'Notification / SMS', owner: 'Project Manager' },
  ];

  return (
    <StandardProcessPage
      page={page}
      inputs={[
        { id: '1.2.1', title: 'Stakeholder Analysis', status: 'Approved' },
        { id: '2.1.2', title: 'Master Plan Assembly', status: 'Draft' }
      ]}
      outputs={[
        { id: '2.5.2-OUT', title: 'Comm Mgmt Plan', status: 'Final' }
      ]}
    >
      <div className="space-y-8 pb-20">
        <header className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg text-white">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">Communications Management Plan</h2>
            <p className="text-sm text-slate-500 font-medium">Establish a structured framework for all project-related communications.</p>
          </div>
        </header>

        <section className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-8">
           <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 italic">Communication Matrix</h3>
              <div className="flex gap-2">
                 <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
                    <Share2 className="w-3.5 h-3.5" />
                    Share Portal
                 </button>
              </div>
           </div>

           <div className="space-y-4">
              {comms.map((c) => (
                <div key={c.id} className="group p-6 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-blue-50/50 hover:border-blue-100 transition-all cursor-pointer">
                   <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="flex items-center gap-4 lg:w-1/3">
                         <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-blue-600 group-hover:shadow-md transition-all">
                            {c.method.includes('Meeting') ? <Calendar className="w-5 h-5" /> : 
                             c.method.includes('Email') ? <Mail className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                         </div>
                         <div>
                            <p className="text-sm font-black text-slate-900 italic line-clamp-1">{c.topic}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.id}</p>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-8 flex-1">
                         <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Audience</p>
                            <p className="text-xs font-bold text-slate-700">{c.audience}</p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Frequency</p>
                            <span className="text-[9px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase">
                               {c.frequency}
                            </span>
                         </div>
                         <div className="space-y-1 hidden lg:block">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Responsibility</p>
                            <p className="text-xs font-bold text-slate-700">{c.owner}</p>
                         </div>
                      </div>

                      <div className="flex items-center gap-3">
                         <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all">
                            <Send className="w-4 h-4" />
                         </button>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-6 shadow-xl shadow-blue-900/10">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                 <ClipboardList className="w-6 h-6 text-blue-400" />
              </div>
              <h4 className="text-xl font-black italic tracking-tight">Information Security</h4>
              <p className="text-sm text-slate-400 font-medium leading-relaxed">
                 All external project reports are marked with **"Restricted - Project Team Only"** as per the Governance and IP protection protocols defined in Project Charter.
              </p>
           </div>

           <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Technical Protocol</h4>
              <p className="text-xs text-slate-600 font-bold leading-relaxed">
                 Zarya API automatically parses "Meeting Minutes" to create tasks in Domain Execute for any decision marked with "Action Required".
              </p>
           </div>
        </section>
      </div>
    </StandardProcessPage>
  );
};
