import React, { useState } from 'react';
import { Users, Building2, ShieldCheck, FolderPlus } from 'lucide-react';
import { AdminUsersView } from './AdminUsersView';
import { AdminGroupsView } from './AdminGroupsView';
import { CorporateStructureView } from './CorporateStructureView'; // Will create this
import { UserAccessManagement } from './UserAccessManagement'; // Will create this
import { cn } from '../lib/utils';

export const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'corporate' | 'users-access' | 'legacy-groups'>('corporate');

  return (
    <div className="w-full py-6 px-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Control Panel</h2>
          <p className="text-sm text-slate-500 mt-1 uppercase tracking-widest font-semibold opacity-60">System Configuration & Corporate Architecture</p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-[2rem] border border-slate-200">
          <button
            onClick={() => setActiveTab('corporate')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold transition-all uppercase tracking-wider",
              activeTab === 'corporate' ? "bg-white text-blue-600 shadow-xl shadow-blue-500/10" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Building2 className="w-4 h-4" />
            Corporate Structure
          </button>
          <button
            onClick={() => setActiveTab('users-access')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold transition-all uppercase tracking-wider",
              activeTab === 'users-access' ? "bg-white text-blue-600 shadow-xl shadow-blue-500/10" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Users className="w-4 h-4" />
            Users & Access
          </button>
          <button
            onClick={() => setActiveTab('legacy-groups')}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold transition-all uppercase tracking-wider text-slate-400 italic",
              activeTab === 'legacy-groups' ? "bg-white text-slate-600 shadow-xl shadow-slate-500/10" : "hover:text-slate-500"
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            Legacy Groups
          </button>
        </div>
      </div>

      <div className="mt-8">
        {activeTab === 'corporate' ? (
          <CorporateStructureView />
        ) : activeTab === 'users-access' ? (
          <UserAccessManagement />
        ) : (
          <AdminGroupsView />
        )}
      </div>
    </div>
  );
};
