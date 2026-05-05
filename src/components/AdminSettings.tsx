import React, { useState, useEffect } from 'react';
import { Users, FolderPlus, Shield, Building2, HardDrive } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { AdminUsersView } from './AdminUsersView';
import { AdminProjectsView } from './AdminProjectsView';
import { AdminGroupsView } from './AdminGroupsView';
import { EnterpriseStructure } from './EnterpriseStructure';
import { AdminDriveStatus } from './AdminDriveStatus';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

export const AdminSettings: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'users' | 'projects' | 'groups' | 'enterprise' | 'drive'>(
    location.hash === '#drive' ? 'drive' : 'enterprise'
  );

  useEffect(() => {
    if (location.hash === '#drive') {
      setActiveTab('drive');
    }
  }, [location.hash]);

  return (
    <div className="w-full py-6 px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight italic uppercase">Admin Settings</h2>
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
            onClick={() => setActiveTab('enterprise')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'enterprise' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Building2 className="w-4 h-4" />
            {t('enterprise_structure')}
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
          <button
            onClick={() => setActiveTab('drive')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'drive' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <HardDrive className="w-4 h-4" />
            Drive Status
          </button>
        </div>
      </div>

      <div className="mt-8">
        {activeTab === 'enterprise' ? <EnterpriseStructure /> : 
         activeTab === 'users' ? <AdminUsersView /> : 
         activeTab === 'projects' ? <AdminProjectsView /> : 
         activeTab === 'drive' ? <AdminDriveStatus /> :
         <AdminGroupsView />}
      </div>
    </div>
  );
};
