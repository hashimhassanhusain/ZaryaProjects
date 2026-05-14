import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Shield, 
  Users, 
  Lock, 
  Bell, 
  History, 
  Wrench, 
  Bot, 
  Link2, 
  HardDrive, 
  BarChart3,
  UserCheck,
  ChevronRight,
  Activity,
  Plus,
  Search,
  Filter,
  Download,
  MoreVertical,
  Mail,
  Smartphone,
  AlertCircle,
  Database,
  Cloud,
  RefreshCw,
  Cpu,
  Zap,
  DraftingCompass,
  Globe,
  Palette,
  Clock,
  Briefcase,
  Layers,
  FileText
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/UserContext';
import { Page } from '../types';
import { pages } from '../data';
import { cn, stripNumericPrefix } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Ribbon, RibbonGroup } from './Ribbon';

interface PMISAdministrationViewProps {
  page: Page;
}

export const PMISAdministrationView: React.FC<PMISAdministrationViewProps> = ({ page }) => {
  const { t, isRtl } = useLanguage();
  const { userProfile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(page.id === 'admin_hub' ? 'overview' : page.id);

  useEffect(() => {
    if (page.id !== 'admin_hub') {
      setActiveTab(page.id);
    }
  }, [page.id]);

  const adminModules = [
    { id: '09.1', title: t('09.1'), icon: UserCheck, desc: 'Enterprise Identity & Access Management' },
    { id: '09.2', title: t('09.2'), icon: Lock, desc: 'Security Matrix & RBAC Engine' },
    { id: '09.3', title: t('09.3'), icon: Bell, desc: 'Global Alert & Communication System' },
    { id: '09.4', title: t('09.4'), icon: History, desc: 'Immutable System Audit & Activity Logs' },
    { id: '09.5', title: t('09.5'), icon: Wrench, desc: 'Platform Branding & Global Defaults' },
    { id: '09.6', title: t('09.6'), icon: Bot, desc: 'AI Workflows & Smart Process Automation' },
    { id: '09.7', title: t('09.7'), icon: Link2, desc: 'API Gateway & Third-Party Integrations' },
    { id: '09.8', title: t('09.8'), icon: HardDrive, desc: 'Digital Asset Storage & Recovery Policies' },
    { id: '09.9', title: t('09.9'), icon: BarChart3, desc: 'Global KPI & Platform Health Monitor' }
  ];

  const ribbonGroups: RibbonGroup[] = [
    {
      id: 'admin-overview',
      tabs: [{ id: 'overview', label: t('overview'), icon: Settings, size: 'large' }]
    },
    {
      id: 'iam-security',
      tabs: [
        { id: '09.1', label: 'IAM', icon: UserCheck, size: 'large' },
        { id: '09.2', label: 'Security', icon: Lock, size: 'large' }
      ]
    },
    {
      id: 'communications',
      tabs: [
        { id: '09.3', label: 'Alerts', icon: Bell, size: 'large' },
        { id: '09.4', label: 'Audit', icon: History, size: 'large' }
      ]
    },
    {
      id: 'configuration',
      tabs: [
        { id: '09.5', label: 'Settings', icon: Wrench, size: 'large' },
        { id: '09.6', label: 'AI Engine', icon: Bot, size: 'large' }
      ]
    },
    {
      id: 'infrastructure',
      tabs: [
        { id: '09.7', label: 'Gateway', icon: Link2, size: 'large' },
        { id: '09.8', label: 'Storage', icon: HardDrive, size: 'large' },
        { id: '09.9', label: 'Dashboard', icon: BarChart3, size: 'large' }
      ]
    }
  ];

  const renderModuleContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="pb-20 space-y-12 px-6 pt-6">
            <header className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-900 flex items-center justify-center text-white shadow-xl shadow-neutral-900/20">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-neutral-900 tracking-tight italic uppercase">Enterprise Administration</h2>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-0.5">PMIS Global System Layer</p>
                </div>
              </div>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {adminModules.map((module) => (
                <div 
                  key={module.id}
                  onClick={() => setActiveTab(module.id)}
                  className="group bg-white rounded-[2.5rem] p-10 border border-neutral-200 shadow-sm hover:shadow-2xl hover:shadow-brand/10 hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="relative z-10 space-y-6">
                    <div className="w-14 h-14 rounded-2xl bg-neutral-50 flex items-center justify-center text-neutral-400 group-hover:bg-neutral-900 group-hover:text-white group-hover:shadow-xl transition-all duration-300">
                      <module.icon className="w-7 h-7" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-black text-neutral-900 group-hover:text-brand transition-colors">
                        {stripNumericPrefix(module.title)}
                      </h3>
                      <p className="text-[11px] text-neutral-500 font-bold uppercase tracking-wider leading-relaxed">
                        {module.desc}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-neutral-400 group-hover:text-brand transition-colors pt-4">
                      Configure Module <ChevronRight className="w-3 h-3 translate-x-0 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </div>
        );

      case '09.1': // IAM
        return (
          <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-neutral-900 tracking-tight uppercase italic font-sans">User Identity & Access Management</h2>
                <div className="flex items-center gap-2 text-[10px] font-black text-brand uppercase tracking-widest leading-none">
                  <UserCheck className="w-3 h-3" /> Global Directory Service
                </div>
              </div>
              <button className="px-6 py-3 bg-neutral-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-neutral-800 transition-all shadow-xl shadow-neutral-900/20">
                <Plus className="w-4 h-4" /> Provision New User
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Total Users', value: '1,280', icon: Users, color: 'brand' },
                { label: 'Active Sessions', value: '45', icon: Activity, color: 'emerald' },
                { label: 'Suspended Account', value: '12', icon: AlertCircle, color: 'rose' },
                { label: 'Unverified', value: '8', icon: Shield, color: 'amber' }
              ].map(stat => (
                <div key={stat.label} className="bg-white p-6 rounded-[2rem] border border-neutral-200 shadow-sm flex items-center gap-4">
                   <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", `bg-${stat.color || 'brand'}/10 text-${stat.color || 'brand'}`)}>
                      <stat.icon className="w-6 h-6" />
                   </div>
                   <div>
                      <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-0.5">{stat.label}</div>
                      <div className="text-xl font-black text-neutral-900 tracking-tight italic">{stat.value}</div>
                   </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm overflow-hidden">
               <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                     <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input className="w-full bg-neutral-50 border-none rounded-xl py-3 pl-12 pr-4 text-[11px] font-bold outline-none focus:ring-2 focus:ring-brand" placeholder="Search IAM Directory..." />
                     </div>
                     <button className="p-3 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-all">
                        <Filter className="w-4 h-4 text-neutral-600" />
                     </button>
                  </div>
                  <div className="flex items-center gap-3">
                     <button className="flex items-center gap-2 px-4 py-2.5 bg-neutral-50 text-neutral-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-100">
                        <Download className="w-3.5 h-3.5" /> Export DB
                     </button>
                  </div>
               </div>
               <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-neutral-50/50">
                           <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">User Profile</th>
                           <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">System Role</th>
                           <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Department</th>
                           <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Last Login</th>
                           <th className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest text-center">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-neutral-100">
                        {[
                          { name: 'Hashim Husain', email: 'hashim@zarya.com', role: 'Super Admin', dept: 'Executive', status: 'Online', last: 'Now' },
                          { name: 'Sarah Chen', email: 'sarah@zarya.com', role: 'Enterprise Admin', dept: 'IT Systems', status: 'Idle', last: '2h ago' },
                          { name: 'Michael Smith', email: 'michael@zarya.com', role: 'System Admin', dept: 'Infrastructure', status: 'Offline', last: '3d ago' },
                        ].map((user, i) => (
                          <tr key={i} className="hover:bg-neutral-50/30 transition-colors">
                             <td className="px-6 py-4 items-center gap-3 flex">
                                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center font-bold text-neutral-400">{user.name[0]}</div>
                                <div>
                                   <div className="text-[11px] font-black text-neutral-900 tracking-tight uppercase italic">{user.name}</div>
                                   <div className="text-[9px] font-bold text-neutral-400 tracking-widest">{user.email}</div>
                                </div>
                             </td>
                             <td className="px-6 py-4">
                                <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-[9px] font-black uppercase tracking-widest">{user.role}</span>
                             </td>
                             <td className="px-6 py-4 text-[10px] font-black text-neutral-600 uppercase tracking-widest">{user.dept}</td>
                             <td className="px-6 py-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest">{user.last}</td>
                             <td className="px-6 py-4 text-center">
                                <button className="p-2 hover:bg-neutral-100 rounded-lg transition-all text-neutral-400"><MoreVertical className="w-4 h-4" /></button>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          </div>
        );

      case '09.2': // Permissions
        return (
          <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-neutral-900 tracking-tight uppercase italic font-sans">Permissions & Security Matrix</h2>
                <div className="flex items-center gap-2 text-[10px] font-black text-rose-600 uppercase tracking-widest leading-none">
                  <Lock className="w-3 h-3" /> System Access Control Engine
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {/* Role Templates */}
               <div className="bg-white p-8 rounded-[3rem] border border-neutral-200 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                     <h3 className="text-sm font-black text-neutral-900 uppercase tracking-widest italic">Global Role Templates</h3>
                     <Lock className="w-4 h-4 text-brand" />
                  </div>
                  <div className="space-y-2">
                     {['Super Administrator', 'Enterprise Manager', 'Project Director', 'Executive Viewer', 'Third-Party Auditor'].map(role => (
                       <div key={role} className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100 hover:border-brand transition-all group cursor-pointer">
                          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600 group-hover:text-neutral-900">{role}</span>
                          <ChevronRight className="w-4 h-4 text-neutral-300" />
                       </div>
                     ))}
                  </div>
                  <button className="w-full py-4 bg-white border-2 border-dashed border-neutral-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:border-brand hover:text-brand transition-all">
                     Construct Custom Role Template
                  </button>
               </div>

               {/* Access Matrix Preview */}
               <div className="md:col-span-2 bg-neutral-950 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
                     <h3 className="text-[11px] font-black text-brand tracking-[0.3em] uppercase">Dynamic Access Hierarchy Matrix</h3>
                     <Activity className="w-4 h-4 text-brand animate-pulse" />
                  </div>
                  <div className="grid grid-cols-5 gap-4">
                     <div className="col-span-1" />
                     {['PLAN', 'EXEC', 'APPR', 'DEL', 'EXP'].map(perm => (
                       <div key={perm} className="text-center text-[9px] font-black text-neutral-500 uppercase tracking-widest">{perm}</div>
                     ))}
                     
                     {['Governance', 'Commercial', 'Controls', 'Audit'].map(domain => (
                        <React.Fragment key={domain}>
                           <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400 py-3">{domain}</div>
                           {[1, 2, 3, 4].map(i => (
                             <div key={i} className="flex justify-center py-3">
                                <div className={cn("w-2 h-2 rounded-full", Math.random() > 0.3 ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" : "bg-neutral-800")} />
                             </div>
                           ))}
                        </React.Fragment>
                     ))}
                  </div>
                  <div className="mt-8 pt-8 border-t border-white/10 grid grid-cols-2 gap-8">
                     <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10">
                        <div className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-2">Matrix Complexity</div>
                        <div className="text-2xl font-black italic tracking-tighter">O(n²) Scale</div>
                     </div>
                     <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10">
                        <div className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-2">Integrity Status</div>
                        <div className="text-2xl font-black italic tracking-tighter text-brand">VERIFIED</div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        );

      case '09.3': // Notifications
        return (
          <div className="p-8 space-y-8">
            <header className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-neutral-900 tracking-tight uppercase italic font-sans line-clamp-1">Notification & Communication Center</h2>
                <div className="flex items-center gap-2 text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none">
                  <Bell className="w-3 h-3" /> System-Wide Alert Routing Engine
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               <div className="bg-white p-6 rounded-[2rem] border border-neutral-200 shadow-sm col-span-3">
                  <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-6">Template Management</h3>
                  <div className="space-y-4">
                     {[
                       { title: 'Workflow Approval Request', channels: ['App', 'Email'], priority: 'High' },
                       { title: 'Task Escalation Notice', channels: ['App', 'Email', 'Push'], priority: 'Critical' },
                       { title: 'Milestone Completion Alert', channels: ['App'], priority: 'Medium' },
                       { title: 'System Maintenance Notice', channels: ['Email', 'App'], priority: 'Low' }
                     ].map((t, i) => (
                       <div key={i} className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100 hover:border-brand transition-all group">
                          <div className="flex items-center gap-4">
                             <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", t.priority === 'Critical' ? 'bg-rose-100 text-rose-600' : 'bg-neutral-200 text-neutral-500')}>
                                <Mail className="w-4 h-4" />
                             </div>
                             <div>
                                <div className="text-[11px] font-black text-neutral-900 uppercase tracking-tight italic">{t.title}</div>
                                <div className="flex items-center gap-2 mt-1">
                                   {t.channels.map(c => <span key={c} className="text-[8px] font-black text-neutral-400 uppercase tracking-widest bg-neutral-100 px-2 py-0.5 rounded-full">{c}</span>)}
                                </div>
                             </div>
                          </div>
                          <div className="flex items-center gap-4">
                             <span className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full", 
                               t.priority === 'Critical' ? 'bg-rose-500 text-white' : 'bg-brand/10 text-brand'
                             )}>{t.priority}</span>
                             <button className="text-neutral-400 group-hover:text-neutral-900 transition-colors font-black text-[9px] uppercase tracking-widest italic">Edit Template</button>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="bg-neutral-900 rounded-[2.5rem] p-8 text-white space-y-6 relative overflow-hidden shadow-2xl">
                     <div className="absolute bottom-0 right-0 w-32 h-32 bg-brand rounded-full blur-3xl opacity-20 -mr-16 -mb-16" />
                     <h3 className="text-[10px] font-black text-brand uppercase tracking-[0.3em]">Health Check</h3>
                     <div className="space-y-4">
                        {[
                          { label: 'SMTP Relay', status: 'Healthy', icon: Globe },
                          { label: 'Push Hub', status: 'Optimal', icon: Smartphone },
                          { label: 'SMS Gateway', status: 'Degraded', icon: Zap }
                        ].map(s => (
                          <div key={s.label} className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <s.icon className="w-3.5 h-3.5 text-neutral-500" />
                                <span className="text-[10px] font-black uppercase tracking-wider">{s.label}</span>
                             </div>
                             <span className={cn("text-[8px] font-black px-2 py-0.5 rounded", s.status === 'Healthy' ? 'bg-emerald-500/10 text-emerald-400' : s.status === 'Optimal' ? 'bg-brand/10 text-brand' : 'bg-rose-500/10 text-rose-400')}>{s.status}</span>
                          </div>
                        ))}
                     </div>
                  </div>
                  <div className="bg-white rounded-[2rem] border border-neutral-200 p-6 space-y-4">
                     <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none italic">Escalation Matrix</h3>
                     <p className="text-[9px] font-medium text-neutral-500 leading-relaxed uppercase">Automated escalation routing for delayed approvals across enterprise workflows.</p>
                     <button className="w-full py-3 bg-neutral-50 text-neutral-900 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-neutral-100 border border-neutral-100 transition-all">Setup Escalation Policy</button>
                  </div>
               </div>
            </div>
          </div>
        );

      case '09.4': // Audit
        return (
          <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-neutral-900 tracking-tight uppercase italic font-sans line-clamp-1">Forensic Audit & System Activity Logs</h2>
                <div className="flex items-center gap-2 text-[10px] font-black text-neutral-500 uppercase tracking-widest leading-none">
                  <History className="w-3 h-3 text-brand" /> Immutable Security Transaction Logs
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[3rem] border border-neutral-200 shadow-sm flex flex-col h-[60vh]">
               <div className="p-6 border-b border-neutral-100 flex items-center gap-4 bg-neutral-50/30">
                  <div className="flex-1 relative">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                     <input className="w-full bg-white border border-neutral-200 rounded-xl py-3 pl-12 pr-4 text-[11px] font-bold outline-none focus:ring-2 focus:ring-brand" placeholder="Filter Audit Stream (Action, User, IP, Field)..." />
                  </div>
                  <button className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 shadow-lg shadow-neutral-900/10 transition-all">
                     <Download className="w-3.5 h-3.5" /> Export Audit Trail
                  </button>
               </div>
               <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
                  {[
                    { user: 'Hashim Husain', action: 'Modified Global Permissions', target: 'Super Admin Template', ip: '192.168.1.4', time: '12:15:33' },
                    { user: 'System Bot', action: 'Automated Database Backup', target: 'PostgreSQL-DB-1', ip: 'internal-01', time: '12:00:00' },
                    { user: 'Sarah Chen', action: 'Suspended Account', target: 'John Doe (u99)', ip: '45.12.89.2', time: '11:45:02' },
                    { user: 'Michael Smith', action: 'Executed Schema Migration', target: 'Production (v4.2)', ip: '10.0.5.1', time: '10:30:00' },
                    { user: 'System Bot', action: 'OCR Classification Complete', target: '500+ Documents', ip: 'ai-node-4', time: '09:15:00' },
                  ].map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-5 bg-white border border-neutral-100 rounded-2xl hover:border-brand/40 transition-all group">
                       <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center group-hover:bg-brand/5 transition-colors">
                             <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                          </div>
                          <div className="space-y-1">
                             <div className="flex items-center gap-3">
                                <span className="text-[11px] font-black text-neutral-900 uppercase italic tracking-tight">{log.user}</span>
                                <span className="text-[10px] font-bold text-neutral-400">•</span>
                                <span className="text-[10px] font-black text-brand uppercase tracking-widest">{log.action}</span>
                             </div>
                             <div className="flex items-center gap-3 text-[9px] font-black text-neutral-400 uppercase tracking-widest">
                                <span className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> {log.ip}</span>
                                <span className="flex items-center gap-1.5"><Layers className="w-3 h-3" /> {log.target}</span>
                             </div>
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="text-[11px] font-black text-neutral-900">{log.time}</div>
                          <div className="text-[8px] font-black text-neutral-400 uppercase tracking-[0.2em] mt-1">May 14, 2026</div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        );

      case '09.5': // Settings
        return (
          <div className="p-8 space-y-8">
            <header className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-neutral-900 tracking-tight uppercase italic font-sans">Global Platform Configuration</h2>
                <div className="flex items-center gap-2 text-[10px] font-black text-neutral-500 uppercase tracking-widest leading-none">
                  <Wrench className="w-3 h-3 text-brand" /> PMIS Core Engine Tuner
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Branding & UI */}
               <div className="bg-white p-10 rounded-[3rem] border border-neutral-200 shadow-sm space-y-10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32" />
                  <div className="flex items-center justify-between relative z-10">
                     <h3 className="text-sm font-black text-neutral-900 uppercase tracking-[0.3em] italic">Enterprise Identity</h3>
                     <Palette className="w-4 h-4 text-brand" />
                  </div>
                  <div className="space-y-8 relative z-10">
                     <div className="space-y-4">
                        <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest leading-none">System Architecture Brand</label>
                        <div className="flex items-center gap-4">
                           <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center shadow-2xl">
                              <span className="text-brand font-black text-[12px] italic">PMIS</span>
                           </div>
                           <button className="px-5 py-2.5 bg-neutral-50 text-neutral-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-100 transition-all border border-neutral-100">Upload SVG Logo</button>
                        </div>
                     </div>
                     <div className="space-y-4">
                        <label className="text-[9px] font-black text-neutral-400 uppercase tracking-widest leading-none">Core Aesthetic Preset</label>
                        <div className="grid grid-cols-3 gap-3">
                           {['INDUSTRIAL', 'CONTEMPORARY', 'MINIMALIST'].map(p => (
                             <button key={p} className={cn("px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all", p === 'INDUSTRIAL' ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-400 border-neutral-100 hover:border-brand')}>
                                {p}
                             </button>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>

               {/* Regional & Localization */}
               <div className="bg-neutral-950 p-10 rounded-[3rem] text-white space-y-10 shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-brand/20 via-transparent to-transparent pointer-events-none" />
                  <div className="flex items-center justify-between relative z-10">
                     <h3 className="text-sm font-black text-brand uppercase tracking-[0.3em] italic">Regional Dynamics</h3>
                     <Globe className="w-4 h-4 text-brand" />
                  </div>
                  <div className="space-y-8 relative z-10">
                     <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Base Currency</label>
                           <div className="text-2xl font-black italic tracking-tighter text-white">IQD <span className="text-neutral-600">/ USD</span></div>
                        </div>
                        <div className="space-y-3">
                           <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Standard Timezone</label>
                           <div className="text-xl font-black italic tracking-tighter text-white">Asia / Baghdad</div>
                        </div>
                     </div>
                     <div className="space-y-4">
                        <label className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Available UI Lexicons</label>
                        <div className="flex gap-3">
                           {['English (International)', 'Arabic (MENA)'].map(l => (
                             <div key={l} className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-brand" /> {l}
                             </div>
                           ))}
                        </div>
                     </div>
                     <button className="w-full py-5 bg-brand text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand/20 hover:scale-[1.01] transition-all">Save Performance Settings</button>
                  </div>
               </div>
            </div>
          </div>
        );

      case '09.6': // AI & Automation
        return (
          <div className="p-8 space-y-8">
            <header className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-neutral-900 tracking-tight uppercase italic font-sans">AI Kinetic Engine & Automation</h2>
                <div className="flex items-center gap-2 text-[10px] font-black text-brand uppercase tracking-widest leading-none">
                  <Bot className="w-3 h-3 animate-bounce" /> Smart Process Cognitive Hub
                </div>
              </div>
            </header>

            <div className="grid grid-cols-3 gap-8">
               <div className="col-span-2 space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                     {[
                       { title: 'Smart Search Indexing', desc: 'Predictive indexing for all BOQ and record data.', icon: Search },
                       { title: 'OCR Classification', desc: 'Auto-categorization of site-scanned invoices.', icon: FileText },
                       { title: 'Workflow Orchestration', desc: 'Auto-routing of approvals based on AI logic.', icon: Zap },
                       { title: 'Sentiment & Risk Detection', desc: 'AI-driven analysis of project communication cycles.', icon: AlertCircle }
                     ].map((f, i) => (
                       <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm space-y-4 hover:border-brand transition-all group">
                          <div className="w-12 h-12 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400 group-hover:bg-brand/10 group-hover:text-brand transition-all">
                             <f.icon className="w-5 h-5" />
                          </div>
                          <div>
                             <h4 className="text-[12px] font-black uppercase tracking-tight italic text-neutral-900">{f.title}</h4>
                             <p className="text-[10px] font-bold text-neutral-500 mt-1 uppercase tracking-wider">{f.desc}</p>
                          </div>
                          <div className="flex items-center justify-between pt-2">
                             <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded">Enabled</span>
                             <button className="text-[9px] font-black text-neutral-400 hover:text-brand uppercase tracking-widest italic">Configure</button>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>

               <div className="bg-neutral-900 rounded-[3rem] p-10 text-white space-y-8 relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand/20 rounded-full blur-[80px] -mr-32 -mt-32" />
                  <div className="flex flex-col items-center text-center space-y-6 relative z-10">
                     <div className="w-20 h-20 rounded-[2rem] bg-brand flex items-center justify-center shadow-2xl shadow-brand/20 rotate-12">
                        <Cpu className="w-10 h-10 text-white" />
                     </div>
                     <div className="space-y-2">
                        <h3 className="text-xl font-bold italic uppercase tracking-tighter">Gemini 1.5 Pro</h3>
                        <p className="text-[9px] font-black text-neutral-500 uppercase tracking-[0.3em]">Core Cognitive Model</p>
                     </div>
                     <div className="w-full space-y-4">
                        {[
                          { label: 'Latency', val: '240ms' },
                          { label: 'Token Efficiency', val: '98%' },
                          { label: 'System Uptime', val: '99.9%' }
                        ].map(s => (
                          <div key={s.label} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                             <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">{s.label}</span>
                             <span className="text-[10px] font-black italic">{s.val}</span>
                          </div>
                        ))}
                     </div>
                     <button className="w-full py-4 bg-white/10 hover:bg-white text-white hover:text-neutral-900 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">Manage AI Prompts</button>
                  </div>
               </div>
            </div>
          </div>
        );

      case '09.7': // Integrations
        return (
          <div className="p-8 space-y-8">
            <header className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-neutral-900 tracking-tight uppercase italic font-sans">API Gateway & Enterprise Integrations</h2>
                <div className="flex items-center gap-2 text-[10px] font-black text-neutral-500 uppercase tracking-widest leading-none">
                  <Link2 className="w-3 h-3 text-brand" /> Global Data Interchange & Webhooks
                </div>
              </div>
            </header>

            <div className="grid grid-cols-3 gap-8">
               {[
                 { name: 'Google Workspace', status: 'Connected', icon: Globe, endpoints: 12 },
                 { name: 'Primavera P6', status: 'Syncing', icon: Clock, endpoints: 8 },
                 { name: 'SAP ERP Connect', status: 'Paused', icon: Database, endpoints: 15 },
                 { name: 'Power BI Hub', status: 'Connected', icon: BarChart3, endpoints: 5 },
                 { name: 'Microsoft Project', status: 'Idle', icon: FileText, endpoints: 3 },
                 { name: 'Autodesk Construction', status: 'Setup Required', icon: DraftingCompass, endpoints: 0 }
               ].map((int, i) => (
                 <div key={i} className="group bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm hover:shadow-xl transition-all relative overflow-hidden">
                    <div className="relative z-10 flex flex-col justify-between h-full space-y-8">
                       <div className="flex justify-between items-start">
                          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform", 
                            int.status === 'Connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-50 text-neutral-400'
                          )}>
                             <int.icon className="w-7 h-7" />
                          </div>
                          <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                            int.status === 'Connected' ? 'bg-emerald-100 text-emerald-700' : 
                            int.status === 'Syncing' ? 'bg-blue-100 text-blue-700 animate-pulse' : 'bg-neutral-100 text-neutral-500'
                          )}>{int.status}</div>
                       </div>
                       <div className="space-y-2">
                          <h3 className="text-lg font-black text-neutral-900 uppercase tracking-tight italic">{int.name}</h3>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{int.endpoints} Global Data Endpoints Active</p>
                       </div>
                       <div className="flex items-center gap-4 pt-2">
                          <button className="flex-1 py-3 bg-neutral-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Config API</button>
                          <button className="p-3 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-all"><RefreshCw className="w-4 h-4 text-neutral-400" /></button>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        );

      case '09.8': // Storage
        return (
          <div className="p-8 space-y-8">
            <header className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-neutral-900 tracking-tight uppercase italic font-sans">Storage Analytics & Disaster Recovery</h2>
                <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">
                  <HardDrive className="w-3 h-3" /> Digital Asset Health Repository
                </div>
              </div>
            </header>

            <div className="grid grid-cols-4 gap-8">
               <div className="col-span-3 bg-white p-10 rounded-[3rem] shadow-sm border border-neutral-200">
                  <div className="flex items-center justify-between mb-10">
                     <h3 className="text-[12px] font-black uppercase tracking-[0.3em] italic text-neutral-900">Enterprise Storage Utilization</h3>
                     <Cloud className="w-5 h-5 text-neutral-300" />
                  </div>
                  <div className="space-y-12">
                     <div className="relative h-4 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="absolute top-0 left-0 h-full bg-brand w-[45%]" />
                        <div className="absolute top-0 left-[45%] h-full bg-emerald-400 w-[25%]" />
                        <div className="absolute top-0 left-[70%] h-full bg-blue-400 w-[15%]" />
                     </div>
                     <div className="grid grid-cols-4 gap-8">
                        {[
                          { label: 'CAD & Drawings', val: '2.4 TB', color: 'brand' },
                          { label: 'Project Photos', val: '1.2 TB', color: 'emerald' },
                          { label: 'Correspondence', val: '450 GB', color: 'blue' },
                          { label: 'Remaining', val: '5.95 TB', color: 'neutral' }
                        ].map(s => (
                          <div key={s.label} className="space-y-2">
                             <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", s.color === 'brand' ? 'bg-brand' : s.color === 'emerald' ? 'bg-emerald-400' : s.color === 'blue' ? 'bg-blue-400' : 'bg-neutral-200')} />
                                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{s.label}</span>
                             </div>
                             <div className="text-xl font-black text-neutral-900 italic tracking-tighter">{s.val}</div>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>
               
               <div className="bg-neutral-900 rounded-[3rem] p-10 text-white shadow-2xl space-y-10">
                  <div className="text-center space-y-4">
                     <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl">
                        <RefreshCw className="w-10 h-10 text-brand animate-spin-slow" />
                     </div>
                     <h4 className="text-lg font-bold italic uppercase tracking-tighter">Backup Cycle</h4>
                     <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Next Run: 24:00 UTC</p>
                  </div>
                  <div className="space-y-4">
                     <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                        <span className="text-[9px] font-black uppercase tracking-widest">Daily DB</span>
                        <span className="text-brand text-[10px] font-black italic">Success</span>
                     </div>
                     <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                        <span className="text-[9px] font-black uppercase tracking-widest">Cloud Sync</span>
                        <span className="text-emerald-400 text-[10px] font-black italic">Active</span>
                     </div>
                  </div>
                  <button className="w-full py-4 bg-brand text-white rounded-2xl font-black text-[10px] cursive tracking-widest uppercase shadow-lg shadow-brand/20">Initiate Manual Restore</button>
               </div>
            </div>
          </div>
        );

      case '09.9': // Enterprise Dashboard
        return (
          <div className="p-8 space-y-10">
            <header className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-neutral-900 tracking-tight uppercase italic font-sans">Global Enterprise KPI Dashboard</h2>
                <div className="flex items-center gap-2 text-[10px] font-black text-brand uppercase tracking-widest leading-none">
                  <Zap className="w-3 h-3 fill-brand" /> Real-Time PMIS Performance Engine
                </div>
              </div>
            </header>

            <div className="grid grid-cols-4 gap-8">
               {[
                 { label: 'Active Projects', val: '24', trend: '+2', icon: Briefcase },
                 { label: 'Peak Concurrency', val: '142', trend: 'Stable', icon: Users },
                 { label: 'Avg. Response Time', val: '180ms', trend: 'Optimal', icon: Zap },
                 { label: 'Storage Health', val: '99.9%', trend: 'Verified', icon: HardDrive }
               ].map(k => (
                 <div key={k.label} className="bg-white p-8 rounded-[3rem] shadow-sm border border-neutral-200 space-y-4 hover:border-brand transition-all group">
                    <div className="flex items-center justify-between">
                       <k.icon className="w-5 h-5 text-neutral-300 group-hover:text-brand transition-colors" />
                       <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">{k.trend}</span>
                    </div>
                    <div>
                       <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">{k.label}</div>
                       <div className="text-3xl font-black text-neutral-900 italic tracking-tighter">{k.val}</div>
                    </div>
                 </div>
               ))}
            </div>

            <div className="grid grid-cols-3 gap-8">
               <div className="col-span-2 bg-neutral-950 rounded-[4rem] p-12 text-white shadow-3xl relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-brand/10 rounded-full blur-[120px] -mr-48 -mt-48" />
                  <div className="flex items-center justify-between mb-12">
                     <h3 className="text-[11px] font-black text-brand uppercase tracking-[0.4em] italic leading-none">Enterprise Utilization & Load</h3>
                     <div className="flex gap-4">
                        {['7D', '30D', '90D'].map(p => <button key={p} className={cn("text-[9px] font-black border-b-2 py-1", p === '30D' ? 'text-white border-brand' : 'text-neutral-600 border-transparent')}>{p}</button>)}
                     </div>
                  </div>
                  <div className="h-64 flex items-end gap-3 px-4">
                     {[45, 68, 52, 89, 74, 91, 65, 48, 77, 85, 95, 60].map((h, i) => (
                       <motion.div 
                        key={i} 
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        className="flex-1 bg-white/5 hover:bg-brand/40 transition-colors rounded-t-lg relative group/bar"
                       >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-neutral-900 px-2 py-1 rounded text-[8px] font-black opacity-0 group-hover/bar:opacity-100 transition-opacity">
                             {h}%
                          </div>
                       </motion.div>
                     ))}
                  </div>
                  <div className="grid grid-cols-2 gap-12 mt-12 pt-12 border-t border-white/10">
                     <div>
                        <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-3 italic">Max IOPS Throughput</div>
                        <div className="text-4xl font-black italic tracking-tighter text-white">450 <span className="text-xs font-normal text-neutral-600">k/s</span></div>
                     </div>
                     <div>
                        <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-3 italic">CPU Reservation</div>
                        <div className="text-4xl font-black italic tracking-tighter text-brand">34% <span className="text-xs font-normal text-neutral-600">Avg</span></div>
                     </div>
                  </div>
               </div>

               <div className="space-y-8">
                  <div className="bg-white rounded-[3rem] p-10 border border-neutral-200 shadow-sm space-y-8">
                     <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest italic">Security Threat Monitor</h3>
                     <div className="space-y-6">
                        {[
                          { label: 'Brute Force Attempts', val: '0', color: 'emerald' },
                          { label: 'SQLi Probes Detected', val: '2', color: 'amber' },
                          { label: 'Anomalous Logins', val: '0', color: 'emerald' }
                        ].map(s => (
                          <div key={s.label} className="flex items-center justify-between">
                             <span className="text-[11px] font-black text-neutral-600 uppercase italic tracking-tight">{s.label}</span>
                             <span className={cn("text-[11px] font-black", s.color === 'emerald' ? 'text-emerald-500' : 'text-amber-500')}>{s.val}</span>
                          </div>
                        ))}
                     </div>
                     <button className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest italic hover:bg-neutral-800 transition-all">Download Security Audit</button>
                  </div>
                  <div className="bg-brand rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group transition-all">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl opacity-20 -mr-16 -mb-16 group-hover:scale-150 transition-transform" />
                     <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-60 italic leading-none">System Version</h3>
                     <div className="text-4xl font-black italic tracking-tighter leading-none mb-1">PMIS v4.8</div>
                     <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 italic">Enterprise Edition (May 2026)</div>
                  </div>
               </div>
            </div>
          </div>
        );

      default:
        return <div>Module Under Development</div>;
    }
  };

  if (!isAdmin && userProfile && !['super-admin', 'enterprise-admin', 'system-administrator'].includes(userProfile.role)) {
    return (
       <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-white m-6 rounded-[3rem]">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-rose-500" />
          </div>
          <h2 className="text-2xl font-black text-neutral-900 mb-2 uppercase italic">Admin Access Restricted</h2>
          <p className="text-neutral-500 max-w-md font-bold text-[12px] uppercase">
             The Enterprise Administration layer is strictly reserved for system administrators.
          </p>
       </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#fcfcfc]">
      <Ribbon 
        groups={ribbonGroups}
        activeTabId={activeTab}
        onTabChange={(id) => setActiveTab(id as string)}
      />
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );

  function renderContent() {
    return renderModuleContent();
  }
};
