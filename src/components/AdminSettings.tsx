import React, { useState } from 'react';
import { Users, FolderPlus, Shield } from 'lucide-react';
import { AdminUsersView } from './AdminUsersView';
import { AdminProjectsView } from './AdminProjectsView';
import { AdminGroupsView } from './AdminGroupsView';
import { cn } from '../lib/utils';

export const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'projects' | 'groups'>('users');

  return (
    <div className="w-full py-6 px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Admin Settings</h2>
          <p className="text-sm text-slate-500 mt-1">Manage users, groups and project configurations</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'users' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Users className="w-4 h-4" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'groups' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Shield className="w-4 h-4" />
            Groups & Permissions
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'projects' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <FolderPlus className="w-4 h-4" />
            New Project
          </button>
        </div>
      </div>

      <div className="mt-8">
        {activeTab === 'users' ? <AdminUsersView /> : activeTab === 'projects' ? <AdminProjectsView /> : <AdminGroupsView />}
      </div>
    </div>
  );
};
