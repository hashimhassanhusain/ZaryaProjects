import React, { useState, useEffect } from 'react';
import { Layout, List, Plus, Search, Calendar, User, MoreVertical, CheckCircle2, Clock, AlertCircle, AlertTriangle, Users, Filter, Loader2 } from 'lucide-react';
import { Task, TaskStatus, Workspace, User as UserType } from '../types';
import { initialTasks, workspaces, users, currentUser } from '../data';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';

export const TasksView: React.FC = () => {
  const { selectedProject } = useProject();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dbUsers, setDbUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(workspaces[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'assumption_constraint' | 'issue' | 'meeting'>('all');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isAddingStatus, setIsAddingStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [newNote, setNewNote] = useState('');
  const [customStatuses, setCustomStatuses] = useState<string[]>(['TO DO', 'PLANNING', 'RFP', 'TENDERING', 'IN PROGRESS', 'AT RISK', 'UPDATE REQUIRED', 'COMPLETED']);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    status: 'TO DO',
    priority: 'Medium',
    workspaceId: selectedWorkspaceId,
    assigneeId: currentUser.uid,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (!selectedProject) return;
    if (selectedProject.taskStatuses && selectedProject.taskStatuses.length > 0) {
      setCustomStatuses(selectedProject.taskStatuses);
    }
  }, [selectedProject?.taskStatuses]);

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserType));
      setDbUsers(usersList);
    });

    return () => unsubscribeUsers();
  }, []);

  useEffect(() => {
    if (!selectedProject) return;

    const tasksQuery = query(
      collection(db, 'tasks'),
      where('projectId', '==', selectedProject.id)
    );

    const issuesQuery = query(
      collection(db, 'issues'),
      where('projectId', '==', selectedProject.id)
    );

    let tasksData: Task[] = [];
    let issuesData: Task[] = [];

    const updateUnifiedTasks = () => {
      setTasks([...tasksData, ...issuesData]);
      setIsLoading(false);
    };

    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      updateUnifiedTasks();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
    });

    const unsubscribeIssues = onSnapshot(issuesQuery, (snapshot) => {
      issuesData = snapshot.docs.map(doc => {
        const data = doc.data();
        // Map ProjectIssue to Task structure
        return {
          id: doc.id,
          title: data.issue || 'Unnamed Issue',
          description: `${data.impact || ''}\n\nActions: ${data.actions || ''}`,
          status: data.status === 'Open' ? 'TO DO' : 
                  data.status === 'In Progress' ? 'IN PROGRESS' : 
                  data.status === 'Resolved' ? 'COMPLETED' : 
                  data.status === 'Closed' ? 'COMPLETED' : 'TO DO',
          assigneeId: data.responsiblePartyId || data.responsibleParty || 'Unassigned',
          workspaceId: workspaces[0].id,
          startDate: data.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
          endDate: data.dueDate || '',
          priority: data.urgency === 'Critical' || data.urgency === 'Urgent' ? 'High' :
                    data.urgency === 'High' ? 'High' :
                    data.urgency === 'Medium' ? 'Medium' : 'Low',
          sourceType: 'issue',
          sourceId: doc.id,
          projectId: data.projectId,
          history: []
        } as Task;
      });
      updateUnifiedTasks();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'issues');
    });

    return () => {
      unsubscribeTasks();
      unsubscribeIssues();
    };
  }, [selectedProject?.id]);

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  const filteredTasks = tasks.filter(t => 
    t.workspaceId === selectedWorkspaceId &&
    (filterType === 'all' || t.sourceType === filterType) &&
    (t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const columns: TaskStatus[] = ['TO DO', 'PLANNING', 'RFP', 'TENDERING', 'IN PROGRESS', 'AT RISK', 'UPDATE REQUIRED', 'COMPLETED'];

  const handleAddTask = async () => {
    if (!newTask.title || !selectedProject) return;
    
    try {
      const taskData = {
        ...newTask,
        projectId: selectedProject.id,
        history: [{ id: 'h' + Date.now(), userId: currentUser.uid, action: 'Created the task', timestamp: new Date().toLocaleString() }]
      };
      await addDoc(collection(db, 'tasks'), taskData);
      setIsAddingTask(false);
      setNewTask({
        status: 'TO DO',
        priority: 'Medium',
        workspaceId: selectedWorkspaceId,
        assigneeId: currentUser.uid,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      if (task.sourceType === 'issue') {
        const issueUpdates: any = {};
        if (updates.title) issueUpdates.issue = updates.title;
        if (updates.endDate) issueUpdates.dueDate = updates.endDate;
        if (updates.status) {
          issueUpdates.status = updates.status === 'TO DO' ? 'Open' : 
                                updates.status === 'IN PROGRESS' ? 'In Progress' : 
                                updates.status === 'COMPLETED' ? 'Resolved' : 'Open';
        }
        
        await updateDoc(doc(db, 'issues', taskId), {
          ...issueUpdates,
          updatedAt: new Date().toISOString(),
          updatedBy: auth.currentUser?.displayName || auth.currentUser?.email || 'System'
        });
      } else {
        await updateDoc(doc(db, 'tasks', taskId), updates);
      }
    } catch (error) {
      const task = tasks.find(t => t.id === taskId);
      handleFirestoreError(error, OperationType.UPDATE, task?.sourceType === 'issue' ? 'issues' : 'tasks');
    }
  };

  const handleAddNote = async (taskId: string) => {
    if (!newNote.trim()) return;
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const note = {
        id: 'n' + Date.now(),
        userId: currentUser.uid,
        text: newNote.trim(),
        timestamp: new Date().toLocaleString()
      };

      if (task.sourceType === 'issue') {
        // For issues, we might want to append to comments or history
        await updateDoc(doc(db, 'issues', taskId), {
          comments: (task as any).comments ? `${(task as any).comments}\n\n[${note.timestamp}] ${note.text}` : `[${note.timestamp}] ${note.text}`,
          updatedAt: new Date().toISOString(),
          updatedBy: auth.currentUser?.displayName || auth.currentUser?.email || 'System'
        });
      } else {
        await updateDoc(doc(db, 'tasks', taskId), {
          notes: [...(task.notes || []), note]
        });
      }
      setNewNote('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'tasks');
    }
  };

  const handleAddStatus = async () => {
    if (!newStatusName.trim() || customStatuses.includes(newStatusName.trim().toUpperCase()) || !selectedProject) return;
    const updatedStatuses = [...customStatuses, newStatusName.trim().toUpperCase()];
    setCustomStatuses(updatedStatuses);
    try {
      await updateDoc(doc(db, 'projects', selectedProject.id), {
        taskStatuses: updatedStatuses
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'projects');
    }
    setNewStatusName('');
    setIsAddingStatus(false);
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    const historyItem = { id: 'h' + Date.now(), userId: currentUser.uid, action: `Changed status to ${newStatus}`, timestamp: new Date().toLocaleString() };
    await handleUpdateTask(taskId, { 
      status: newStatus,
      history: [...(tasks.find(t => t.id === taskId)?.history || []), historyItem]
    });
  };

  const updateTaskAssignee = async (taskId: string, newAssigneeId: string) => {
    const newAssignee = dbUsers.find(u => u.uid === newAssigneeId);
    const historyItem = { id: 'h' + Date.now(), userId: currentUser.uid, action: `Assigned task to ${newAssignee?.name || 'Unassigned'}`, timestamp: new Date().toLocaleString() };
    await handleUpdateTask(taskId, { 
      assigneeId: newAssigneeId,
      history: [...(tasks.find(t => t.id === taskId)?.history || []), historyItem]
    });
  };

  const getAssignee = (uid: string) => dbUsers.find(u => u.uid === uid) || users.find(u => u.uid === uid);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

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
        <div className="flex items-center gap-2">
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Tasks</option>
            <option value="assumption_constraint">Assumption & Constraint</option>
            <option value="issue">Issues</option>
            <option value="meeting">Meeting Actions</option>
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
        <div className="flex gap-6 overflow-x-auto pb-6 min-h-[600px] items-start">
          {customStatuses.map(status => (
            <div key={status} className="flex flex-col gap-4 min-w-[300px] bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    status === 'TO DO' ? "bg-slate-400" :
                    status === 'PLANNING' ? "bg-purple-500" :
                    status === 'RFP' ? "bg-orange-500" :
                    status === 'TENDERING' ? "bg-pink-500" :
                    status === 'IN PROGRESS' ? "bg-blue-500" :
                    status === 'AT RISK' ? "bg-red-500" :
                    status === 'UPDATE REQUIRED' ? "bg-amber-500" : "bg-green-500"
                  )}></div>
                  <h3 className="font-bold text-slate-700 text-sm">{status}</h3>
                  <span className="bg-white text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold border border-slate-200">
                    {filteredTasks.filter(t => t.status === status).length}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 min-h-[100px]">
                {filteredTasks.filter(t => t.status === status).map(task => (
                  <motion.div 
                    layout
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                          task.priority === 'High' ? "bg-red-50 text-red-600" :
                          task.priority === 'Medium' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                        )}>
                          {task.priority}
                        </span>
                        {task.sourceType === 'assumption_constraint' && (
                          <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            A&C
                          </span>
                        )}
                        {task.sourceType === 'issue' && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Issue
                          </span>
                        )}
                        {task.sourceType === 'meeting' && (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Meeting
                          </span>
                        )}
                      </div>
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

          {/* Add Status Column */}
          <div className="min-w-[300px] flex flex-col gap-4">
            {isAddingStatus ? (
              <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-lg shadow-blue-50">
                <input 
                  autoFocus
                  type="text" 
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  placeholder="Status Name..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3 outline-none focus:ring-2 focus:ring-blue-500/20"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddStatus()}
                />
                <div className="flex gap-2">
                  <button 
                    onClick={handleAddStatus}
                    className="flex-1 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all"
                  >
                    Add
                  </button>
                  <button 
                    onClick={() => setIsAddingStatus(false)}
                    className="flex-1 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsAddingStatus(true)}
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-sm hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Status
              </button>
            )}
          </div>
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
                    <div className="flex flex-col">
                      <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        {task.title}
                        {task.sourceType === 'assumption_constraint' && (
                          <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            A&C
                          </span>
                        )}
                        {task.sourceType === 'issue' && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Issue
                          </span>
                        )}
                        {task.sourceType === 'meeting' && (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Meeting
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 truncate max-w-[200px]">{task.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      task.status === 'TO DO' ? "bg-slate-100 text-slate-600" :
                      task.status === 'PLANNING' ? "bg-purple-100 text-purple-600" :
                      task.status === 'RFP' ? "bg-orange-100 text-orange-600" :
                      task.status === 'TENDERING' ? "bg-pink-100 text-pink-600" :
                      task.status === 'IN PROGRESS' ? "bg-blue-100 text-blue-600" :
                      task.status === 'AT RISK' ? "bg-red-100 text-red-600" :
                      task.status === 'UPDATE REQUIRED' ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"
                    )}>
                      {task.status === 'TO DO' && <Clock className="w-3 h-3" />}
                      {task.status === 'PLANNING' && <Calendar className="w-3 h-3" />}
                      {task.status === 'RFP' && <AlertCircle className="w-3 h-3" />}
                      {task.status === 'TENDERING' && <AlertCircle className="w-3 h-3" />}
                      {task.status === 'IN PROGRESS' && <Clock className="w-3 h-3" />}
                      {task.status === 'AT RISK' && <AlertTriangle className="w-3 h-3" />}
                      {task.status === 'UPDATE REQUIRED' && <AlertCircle className="w-3 h-3" />}
                      {task.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3" />}
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
                  <input 
                    type="text"
                    value={selectedTask.title}
                    onChange={(e) => handleUpdateTask(selectedTask.id, { title: e.target.value })}
                    className="text-2xl font-bold text-slate-800 bg-transparent border-none focus:ring-0 w-full p-0 hover:bg-slate-50 transition-all rounded-lg"
                  />
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
                      <textarea 
                        value={selectedTask.description}
                        onChange={(e) => handleUpdateTask(selectedTask.id, { description: e.target.value })}
                        className="w-full text-slate-600 leading-relaxed bg-transparent border-none focus:ring-0 p-0 hover:bg-slate-50 transition-all rounded-lg resize-none h-32"
                      />
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Notes</h4>
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <input 
                            type="text"
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Add a note..."
                            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddNote(selectedTask.id)}
                          />
                          <button 
                            onClick={() => handleAddNote(selectedTask.id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all"
                          >
                            Post
                          </button>
                        </div>
                        <div className="space-y-3">
                          {selectedTask.notes?.slice().reverse().map(note => (
                            <div key={note.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <img src={getAssignee(note.userId)?.photoURL} className="w-5 h-5 rounded-full" alt="" />
                                  <span className="text-xs font-bold text-slate-700">{getAssignee(note.userId)?.name}</span>
                                </div>
                                <span className="text-[10px] text-slate-400">{note.timestamp}</span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">{note.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
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
                          {customStatuses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Assignee</label>
                        <select 
                          value={selectedTask.assigneeId}
                          onChange={(e) => updateTaskAssignee(selectedTask.id, e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="Unassigned">Unassigned</option>
                          {dbUsers.map(u => (
                            <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                          <input 
                            type="date"
                            value={selectedTask.startDate}
                            onChange={(e) => handleUpdateTask(selectedTask.id, { startDate: e.target.value })}
                            className="w-full bg-white p-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">End Date</label>
                          <input 
                            type="date"
                            value={selectedTask.endDate}
                            onChange={(e) => handleUpdateTask(selectedTask.id, { endDate: e.target.value })}
                            className="w-full bg-white p-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
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
                        <option value="Unassigned">Unassigned</option>
                        {dbUsers.map(u => (
                          <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>
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
