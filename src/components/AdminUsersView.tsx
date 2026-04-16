import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Trash2, Shield, Mail, User, ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { User as UserType } from '../types';
import { Breadcrumbs } from './Breadcrumbs';
import { toast } from 'react-hot-toast';

export const AdminUsersView: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserType));
      setUsers(list);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddUser = () => {
    navigate('/admin/users/new');
  };

  const handleEditUser = (uid: string) => {
    navigate(`/admin/users/${uid}`);
  };

  const handleDeleteUser = async (uid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast((t) => (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-bold text-slate-900">Are you sure you want to delete this user?</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await deleteDoc(doc(db, 'users', uid));
                toast.success('User deleted successfully');
              } catch (error) {
                handleFirestoreError(error, OperationType.DELETE, 'users');
              }
            }}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
          >
            Delete
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.companyName && u.companyName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center mb-6">
        <button 
          onClick={handleAddUser}
          className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 transition-all flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Add New User
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search users by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Users: {users.length}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
              <tr>
                <th className="px-8 py-4">User Info</th>
                <th className="px-8 py-4">Company</th>
                <th className="px-8 py-4">Role</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-slate-50/50 transition-all group cursor-pointer" onClick={() => handleEditUser(user.uid)}>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-sm border-2 border-white shadow-sm">
                          {user.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-800">{user.name}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium">{user.companyName || 'Not Assigned'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      user.role === 'admin' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100" onClick={(e) => handleDeleteUser(user.uid, e)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
