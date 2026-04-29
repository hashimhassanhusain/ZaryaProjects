import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserGroup, User, Page } from '../types';
import { pages } from '../data';
import { Plus, Trash2, Edit2, Users, Shield, Save, X, Search, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

export const AdminGroupsView: React.FC = () => {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  useEffect(() => {
    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserGroup[]);
      setIsLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'groups'));

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data() })) as User[]);
    });

    return () => {
      unsubGroups();
      unsubUsers();
    };
  }, []);

  const handleEdit = (group: UserGroup) => {
    setEditingGroup(group);
    setName(group.name);
    setDescription(group.description);
    setSelectedPages(group.accessiblePages || []);
    setSelectedMembers(group.memberIds || []);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Group name is required');
      return;
    }

    const groupData = {
      name,
      description,
      accessiblePages: selectedPages,
      memberIds: selectedMembers,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingGroup) {
        await updateDoc(doc(db, 'groups', editingGroup.id), groupData);
        toast.success('Group updated successfully');
      } else {
        await addDoc(collection(db, 'groups'), groupData);
        toast.success('Group created successfully');
      }
      resetForm();
    } catch (err) {
      handleFirestoreError(err, editingGroup ? OperationType.UPDATE : OperationType.CREATE, 'groups');
    }
  };

  const resetForm = () => {
    setEditingGroup(null);
    setName('');
    setDescription('');
    setSelectedPages([]);
    setSelectedMembers([]);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this group?')) {
      try {
        await deleteDoc(doc(db, 'groups', id));
        toast.success('Group deleted');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'groups');
      }
    }
  };

  const togglePage = (pageId: string) => {
    setSelectedPages(prev => 
      prev.includes(pageId) ? prev.filter(id => id !== pageId) : [...prev, pageId]
    );
  };

  const toggleMember = (uid: string) => {
    setSelectedMembers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Group List */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search groups..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={resetForm}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-100 transition-all border border-blue-100"
          >
            <Plus className="w-4 h-4" /> New Group
          </button>
        </div>

        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500">Loading groups...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No groups found</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredGroups.map((group, idx) => (
              <div 
                key={`${group.id}-${idx}`}
                className={cn(
                  "bg-white p-6 rounded-2xl border transition-all cursor-pointer group",
                  editingGroup?.id === group.id ? "border-blue-500 ring-2 ring-blue-500/10" : "border-slate-200 hover:border-blue-200"
                )}
                onClick={() => handleEdit(group)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{group.name}</h3>
                      <p className="text-sm text-slate-500">{group.description}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5" /> {group.accessiblePages.length} Permissions
                        </span>
                        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> {group.memberIds.length} Members
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(group.id);
                    }}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group Editor Pane */}
      <div className="lg:col-span-5">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              {editingGroup ? <Edit2 className="w-4 h-4 text-blue-500" /> : <Plus className="w-4 h-4 text-blue-500" />}
              {editingGroup ? 'Edit Group' : 'Create New Group'}
            </h3>
            {editingGroup && (
              <button 
                onClick={resetForm}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            )}
          </div>

          <div className="p-8 space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Group Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Site Engineers"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea 
                  placeholder="What is this group for?"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none h-20 resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                  Page Permissions
                  <span className="text-[10px] text-blue-500 normal-case bg-blue-50 px-2 rounded-full">{selectedPages.length} selected</span>
                </label>
                <div className="grid grid-cols-1 gap-2 border border-slate-100 rounded-xl p-3 bg-slate-50/30">
                  {pages.filter(p => p.type === 'terminal').map((page, idx) => (
                    <label 
                      key={`${page.id}-${idx}`}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border",
                        selectedPages.includes(page.id) ? "bg-white border-blue-100 shadow-sm" : "hover:bg-white/50 border-transparent"
                      )}
                    >
                      <input 
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                        checked={selectedPages.includes(page.id)}
                        onChange={() => togglePage(page.id)}
                      />
                      <span className="text-sm text-slate-700 font-medium">{page.title}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                  Group Members
                  <span className="text-[10px] text-emerald-500 normal-case bg-emerald-50 px-2 rounded-full">{selectedMembers.length} selected</span>
                </label>
                <div className="grid grid-cols-1 gap-2 border border-slate-100 rounded-xl p-3 bg-slate-50/30">
                  {users.map((user, idx) => (
                    <label 
                      key={`${user.uid}-${idx}`}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all border",
                        selectedMembers.includes(user.uid) ? "bg-white border-emerald-100 shadow-sm" : "hover:bg-white/50 border-transparent"
                      )}
                    >
                      <input 
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20"
                        checked={selectedMembers.includes(user.uid)}
                        onChange={() => toggleMember(user.uid)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900 font-bold truncate">{user.name}</p>
                        <p className="text-[10px] text-slate-400 truncate uppercase tracking-wider">{user.role}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button 
                onClick={handleSave}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {editingGroup ? 'Update Group' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
