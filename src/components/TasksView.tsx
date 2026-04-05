import React, { useState } from 'react';
import { Layout, List, Plus, Search, Calendar, User, MoreVertical, CheckCircle2, Clock, AlertCircle, Filter } from 'lucide-react';
import { Task, TaskStatus, Workspace, User as UserType } from '../types';
import { initialTasks, workspaces, users, currentUser } from '../data';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const TasksView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(workspaces[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    status: 'Todo',
    priority: 'Medium',
    workspaceId: selectedWorkspaceId,
    assigneeId: currentUser.uid,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  const filteredTasks = tasks.filter(t => 
    t.workspaceId === selectedWorkspaceId &&
    (t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const columns: TaskStatus[] = ['Todo', 'In Progress', 'Completed', 'Blocked'];

  const handleAddTask = () => {
    if (!newTask.title) return;
    const task: Task = {
      ...newTask as Task,
      id: 't' + (tasks.length + 1),
      history: [{ id: 'h' + Date.now(), userId: currentUser.uid, action: 'Created the task', timestamp: new Date().toLocaleString() }]
    };
    setTasks([...tasks, task]);
    setIsAddingTask(false);
    setNewTask({
      status: 'Todo',
      priority: 'Medium',
      workspaceId: selectedWorkspaceId,
      assigneeId: currentUser.uid,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    });
  };

  const updateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        const historyItem = { id: 'h' + Date.now(), userId: currentUser.uid, action: `Changed status to ${newStatus}`, timestamp: new Date().toLocaleString() };
        return { ...t, status: newStatus, history: [...(t.history || []), historyItem] };
      }
      return t;
    }));
  };

  const getAssignee = (uid: string) => users.find(u => u.uid === uid);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Task Management</h2>
          <p className="text-slate-500 text-sm">Track and manage your team's progress</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('kanban')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'kanban' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Layout className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'list' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={() => setIsAddingTask(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 min-w-[200px]">
          <Filter className="w-4 h-4 text-slate-400" />
          <select 
            value={selectedWorkspaceId}
            onChange={(e) => setSelectedWorkspaceId(e.target.value)}
            className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            {workspaces.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div className="h-6 w-[1px] bg-slate-200 hidden md:block"></div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto pb-4">
          {columns.map(status => (
            <div key={status} className="flex flex-col gap-4 min-w-[280px]">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    status === 'Todo' ? "bg-slate-400" :
                    status === 'In Progress' ? "bg-blue-500" :
                    status === 'Completed' ? "bg-green-500" : "bg-red-500"
                  )}></div>
                  <h3 className="font-bold text-slate-700 text-sm">{status}</h3>
                  <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {filteredTasks.filter(t => t.status === status).length}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {filteredTasks.filter(t => t.status === status).map(task => (
                  <motion.div 
                    layout
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                        task.priority === 'High' ? "bg-red-50 text-red-600" :
                        task.priority === 'Medium' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                      )}>
                        {task.priority}
                      </span>
                      <button className="text-slate-300 hover:text-slate-600 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-blue-600 transition-colors">{task.title}</h4>
                    <p className="text-slate-500 text-xs line-clamp-2 mb-4">{task.description}</p>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        <img 
                          src={getAssignee(task.assigneeId)?.photoURL} 
                          alt="" 
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                        />
                        <span className="text-[10px] font-medium text-slate-400">{getAssignee(task.assigneeId)?.name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span className="text-[10px] font-medium">{task.endDate}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Task</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assignee</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map(task => (
                <tr 
                  key={task.id} 
                  onClick={() => setSelectedTaskId(task.id)}
                  className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800 text-sm">{task.title}</div>
                    <div className="text-xs text-slate-400 truncate max-w-[200px]">{task.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      task.status === 'Todo' ? "bg-slate-100 text-slate-600" :
                      task.status === 'In Progress' ? "bg-blue-100 text-blue-600" :
                      task.status === 'Completed' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                    )}>
                      {task.status === 'Todo' && <Clock className="w-3 h-3" />}
                      {task.status === 'In Progress' && <Clock className="w-3 h-3" />}
                      {task.status === 'Completed' && <CheckCircle2 className="w-3 h-3" />}
                      {task.status === 'Blocked' && <AlertCircle className="w-3 h-3" />}
                      {task.status}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <img src={getAssignee(task.assigneeId)?.photoURL} className="w-6 h-6 rounded-full" alt="" />
                      <span className="text-xs font-medium text-slate-600">{getAssignee(task.assigneeId)?.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                      task.priority === 'High' ? "bg-red-50 text-red-600" :
                      task.priority === 'Medium' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-medium text-slate-500">{task.endDate}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTaskId(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="relative w-full max-w-4xl h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                      selectedTask.priority === 'High' ? "bg-red-50 text-red-600" :
                      selectedTask.priority === 'Medium' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {selectedTask.priority} Priority
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedTask.id}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800">{selectedTask.title}</h3>
                </div>
                <button 
                  onClick={() => setSelectedTaskId(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  <div className="lg:col-span-2 space-y-8">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Description</h4>
                      <p className="text-slate-600 leading-relaxed">{selectedTask.description}</p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Activity History</h4>
                      <div className="space-y-6">
                        {selectedTask.history?.map((item, idx) => (
                          <div key={item.id} className="flex gap-4 relative">
                            {idx !== selectedTask.history!.length - 1 && (
                              <div className="absolute left-4 top-8 bottom-0 w-[1px] bg-slate-100"></div>
                            )}
                            <img src={getAssignee(item.userId)?.photoURL} className="w-8 h-8 rounded-full z-10" alt="" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-bold text-slate-700">{getAssignee(item.userId)?.name}</span>
                                <span className="text-[10px] text-slate-400 font-medium">{item.timestamp}</span>
                              </div>
                              <p className="text-xs text-slate-500">{item.action}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="bg-slate-50 p-6 rounded-2xl space-y-6">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Status</label>
                        <select 
                          value={selectedTask.status}
                          onChange={(e) => updateTaskStatus(selectedTask.id, e.target.value as TaskStatus)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          {columns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Assignee</label>
                        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                          <img src={getAssignee(selectedTask.assigneeId)?.photoURL} className="w-8 h-8 rounded-full" alt="" />
                          <div>
                            <div className="text-sm font-bold text-slate-800">{getAssignee(selectedTask.assigneeId)?.name}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{getAssignee(selectedTask.assigneeId)?.email}</div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                          <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {selectedTask.startDate}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">End Date</label>
                          <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {selectedTask.endDate}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Task Modal */}
      <AnimatePresence>
        {isAddingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingTask(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Create New Task</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Task Title</label>
                    <input 
                      type="text" 
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="e.g. Site Survey Block A"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                    <textarea 
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Assignee</label>
                      <select 
                        value={newTask.assigneeId}
                        onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                      >
                        {users.map(u => (
                          <option key={u.uid} value={u.uid}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Priority</label>
                      <select 
                        value={newTask.priority}
                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                      <input 
                        type="date" 
                        value={newTask.startDate}
                        onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">End Date</label>
                      <input 
                        type="date" 
                        value={newTask.endDate}
                        onChange={(e) => setNewTask({ ...newTask, endDate: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex justify-end gap-3">
                <button 
                  onClick={() => setIsAddingTask(false)}
                  className="px-6 py-2.5 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddTask}
                  className="px-6 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  Create Task
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
