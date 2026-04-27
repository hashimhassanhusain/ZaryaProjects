import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  MoreVertical, 
  Search,
  Plus,
  Mail,
  Briefcase,
  ExternalLink,
  ShieldAlert,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  query, 
  where, 
  deleteDoc,
  serverTimestamp,
  updateDoc 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { User, Project, UserProject } from '../types';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

export const UserAccessManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignments, setAssignments] = useState<UserProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const userSnap = await getDocs(collection(db, 'users'));
      const projSnap = await getDocs(collection(db, 'projects'));
      const assignSnap = await getDocs(collection(db, 'userProjects'));

      setUsers(userSnap.docs.map(d => ({ uid: d.id, ...d.data() } as User)));
      setProjects(projSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
      setAssignments(assignSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProject)));
    } catch (error) {
      console.error('Error fetching access data:', error);
      toast.error('Failed to load user access data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAssignment = async (userId: string, projectId: string, role: string) => {
    const assignId = `${userId}_${projectId}`;
    const data = {
      userId,
      projectId,
      role,
      grantedBy: auth.currentUser?.uid || 'system',
      grantedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'userProjects', assignId), data);
      
      // Update the user's accessibleProjects array for legacy compatibility and quick lookups
      const userRef = doc(db, 'users', userId);
      const user = users.find(u => u.uid === userId);
      if (user) {
        const currentProjects = user.accessibleProjects || [];
        if (!currentProjects.includes(projectId)) {
          await updateDoc(userRef, {
            accessibleProjects: [...currentProjects, projectId]
          });
        }
      }

      toast.success('Assignment updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update assignment');
    }
  };

  const handleRemoveAssignment = async (userId: string, projectId: string) => {
    const assignId = `${userId}_${projectId}`;
    try {
      await deleteDoc(doc(db, 'userProjects', assignId));
      
      // Update legacy field
      const userRef = doc(db, 'users', userId);
      const user = users.find(u => u.uid === userId);
      if (user) {
        await updateDoc(userRef, {
          accessibleProjects: (user.accessibleProjects || []).filter(id => id !== projectId)
        });
      }

      toast.success('Access removed');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove access');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Access Control Matrix</h3>
          <p className="text-sm text-slate-500">Assign project roles and manage user permissions</p>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search users..." 
            className="pl-11 pr-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl w-full md:w-64 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Select User</div>
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
          ) : filteredUsers.map(user => (
            <button 
              key={user.uid}
              onClick={() => setSelectedUser(user)}
              className={cn(
                "w-full p-4 rounded-3xl border transition-all flex items-center gap-4 group text-left",
                selectedUser?.uid === user.uid 
                  ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/20" 
                  : "bg-white border-slate-100 text-slate-700 hover:border-blue-200 hover:shadow-lg"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg",
                selectedUser?.uid === user.uid ? "bg-white/20" : "bg-slate-50"
              )}>
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="font-bold truncate">{user.name}</div>
                <div className={cn(
                  "text-[10px] uppercase tracking-widest font-bold truncate opacity-60",
                  selectedUser?.uid === user.uid ? "text-white" : "text-slate-400"
                )}>{user.role || 'No global role'}</div>
              </div>
              <ChevronRight className={cn(
                "w-4 h-4 transition-transform",
                selectedUser?.uid === user.uid ? "translate-x-1 opacity-100" : "opacity-0 group-hover:opacity-100"
              )} />
            </button>
          ))}
        </div>

        {/* Access Details */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-8 bg-slate-50 border-b border-slate-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-[2rem] bg-white border border-slate-200 shadow-xl flex items-center justify-center text-4xl font-black text-blue-600">
                      {selectedUser.name?.[0]}
                    </div>
                    <div>
                      <h4 className="text-3xl font-black text-slate-900 tracking-tight">{selectedUser.name}</h4>
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-widest">
                          <Mail className="w-3.5 h-3.5" />
                          {selectedUser.email}
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        <div className="text-blue-600 text-xs font-black uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-lg">
                          GLOBAL: {selectedUser.role}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowAssignModal(true)}
                    className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Grant Project Access
                  </button>
                </div>
              </div>

              <div className="p-8">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Active Project Assignments</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignments.filter(a => a.userId === selectedUser.uid).length === 0 ? (
                    <div className="col-span-2 py-20 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                      <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                        <ShieldAlert className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No active project assignments</p>
                      <p className="text-slate-400 text-sm mt-1">This user currently has no access to any project.</p>
                    </div>
                  ) : assignments.filter(a => a.userId === selectedUser.uid).map(assign => {
                    const project = projects.find(p => p.id === assign.projectId);
                    return (
                      <div key={assign.id} className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                              <Briefcase className="w-5 h-5 text-slate-400" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 tracking-tight leading-tight">{project?.name || 'Unknown Project'}</div>
                              <div className="text-[10px] font-bold text-slate-400 tracking-widest mt-0.5">{project?.code}</div>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRemoveAssignment(selectedUser.uid, assign.projectId)}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                        
                        <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Project Role</div>
                            <select 
                              value={assign.role}
                              onChange={(e) => handleUpdateAssignment(selectedUser.uid, assign.projectId, e.target.value)}
                              className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-black uppercase tracking-widest outline-none border-none cursor-pointer focus:ring-2 focus:ring-blue-100"
                            >
                              <option value="admin">Admin</option>
                              <option value="manager">Manager</option>
                              <option value="engineer">Engineer</option>
                              <option value="accountant">Accountant</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Assigned</div>
                            <div className="text-[10px] font-bold text-slate-900 italic opacity-50">
                              {assign.grantedAt ? new Date(assign.grantedAt).toLocaleDateString() : 'Initial Setup'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] border border-slate-200 border-dashed opacity-50 text-center">
              <Users className="w-16 h-16 text-slate-200 mb-4" />
              <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest">Select a User</h3>
              <p className="text-slate-400 text-sm mt-2 max-w-xs">Pick a user from the roster to manage their project permissions and roles.</p>
            </div>
          )}
        </div>
      </div>

      {/* Grant Access Modal */}
      {showAssignModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">Access Grant</h3>
                <p className="text-xs text-slate-400 font-bold tracking-widest uppercase mt-1">Assign {selectedUser.name} to project</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all">
                <XCircle className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              await handleUpdateAssignment(
                selectedUser.uid, 
                formData.get('projectId') as string, 
                formData.get('role') as string
              );
              setShowAssignModal(false);
            }} className="p-10 space-y-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Target Project</label>
                  <select 
                    name="projectId" 
                    required 
                    className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all font-black text-slate-900 appearance-none"
                  >
                    <option value="">Select a project...</option>
                    {projects
                      .filter(p => !assignments.some(a => a.userId === selectedUser.uid && a.projectId === p.id))
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.name} [{p.code}]</option>
                      ))
                    }
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Assigned Project Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['manager', 'engineer', 'accountant', 'admin', 'viewer'].map(role => (
                      <label key={role} className="relative group cursor-pointer">
                        <input name="role" type="radio" value={role} defaultChecked={role === 'viewer'} className="peer sr-only" />
                        <div className="px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-bold text-xs uppercase tracking-widest text-slate-400 peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-checked:text-white transition-all text-center group-hover:border-blue-300">
                          {role}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 py-5 text-sm font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest">Ignore</button>
                <button type="submit" className="flex-1 py-5 bg-blue-600 text-white rounded-3xl font-black text-sm shadow-2xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest">
                  Confirm Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
