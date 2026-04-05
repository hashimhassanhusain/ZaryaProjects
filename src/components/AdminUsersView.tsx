import React, { useState } from 'react';
import { UserPlus, Search, Trash2, Shield, Mail, User, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminUsersView: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([
    { id: 'u1', name: 'Hashim Husain', email: 'hashim.h.husain@gmail.com', role: 'admin' },
    { id: 'u2', name: 'Ahmed Ali', email: 'ahmed.ali@zarya.com', role: 'user' },
    { id: 'u3', name: 'Sarah Ahmed', email: 'sarah.ahmed@zarya.com', role: 'user' },
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'user' });

  const handleAddUser = () => {
    navigate('/admin/users/new');
  };

  const handleEditUser = (uid: string) => {
    navigate(`/admin/users/${uid}`);
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Management</h1>
            <p className="text-slate-500 text-sm">Manage user access and permissions for the Zarya System.</p>
          </div>
        </div>
        <button 
          onClick={handleAddUser}
          className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 transition-all flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Add New User
        </button>
      </header>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search users by name or email..."
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
                <th className="px-8 py-4">Email Address</th>
                <th className="px-8 py-4">Role</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-all group cursor-pointer" onClick={() => handleEditUser(user.id)}>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-sm border-2 border-white shadow-sm">
                        {user.name.charAt(0)}
                      </div>
                      <div className="font-bold text-slate-800">{user.name}</div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-slate-500 font-medium">{user.email}</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      user.role === 'admin' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); /* delete logic */ }}>
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
