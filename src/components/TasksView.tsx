import React, { useState, useEffect } from 'react';
import { Layout, List, Plus, Search, Calendar, User, MoreVertical, CheckCircle2, Clock, AlertCircle, AlertTriangle, Users, Filter, Loader2, GripVertical, Settings, Edit2, Trash2, History, Sparkles } from 'lucide-react';
import { Task, TaskStatus, Workspace, User as UserType } from '../types';
import { initialTasks, workspaces, users, currentUser } from '../data';
import { cn, getISODate, formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'react-hot-toast';
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DropAnimation
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { HelpTooltip } from './HelpTooltip';
import { TaskDetailPanel } from './TaskDetailPanel';

export const TasksView: React.FC = () => {
  const { t, th, isRtl, isHelpRtl } = useLanguage();
  const { selectedProject } = useProject();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dbUsers, setDbUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(workspaces[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'assumption_constraint' | 'issue' | 'meeting'>('all');
  const [showOnlyMyTasks, setShowOnlyMyTasks] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTaskLocal, setEditingTaskLocal] = useState<Partial<Task> | null>(null);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [isAddingStatus, setIsAddingStatus] = useState(false);
  const [isManagingStatuses, setIsManagingStatuses] = useState(false);
  const [editingStatus, setEditingStatus] = useState<{ oldName: string, newName: string } | null>(null);
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
  
  // View states: 'list', 'kanban', 'edit', 'add'
  const activeView = isAddingTask ? 'add' : selectedTaskId ? 'edit' : viewMode;

  const getAssignee = (uid: string) => {
    return dbUsers.find(u => u.uid === uid) || { name: 'Unassigned', photoURL: 'https://picsum.photos/seed/user/200/200' };
  };

  useEffect(() => {
    if (!selectedProject) return;
    if (selectedProject.taskStatuses && selectedProject.taskStatuses.length > 0) {
      setCustomStatuses(selectedProject.taskStatuses);
    }
  }, [selectedProject?.taskStatuses]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('filter') === 'my') {
      setShowOnlyMyTasks(true);
    }
    const taskIdInUrl = params.get('taskId');
    if (taskIdInUrl) {
      setSelectedTaskId(taskIdInUrl);
    }
  }, [window.location.search]);

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList: UserType[] = [];
      const seenIds = new Set();
      snapshot.docs.forEach(doc => {
        if (!seenIds.has(doc.id)) {
          seenIds.add(doc.id);
          usersList.push({ uid: doc.id, ...doc.data() } as UserType);
        }
      });
      setDbUsers(usersList);
    });

    return () => unsubscribeUsers();
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    console.log('Fetching tasks for project:', selectedProject.id);

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
      const unified = [...tasksData, ...issuesData];
      const deDuped: Task[] = [];
      const seen = new Set<string>();
      
      unified.forEach(t => {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          deDuped.push(t);
        }
      });
      
      setTasks(deDuped);
      setIsLoading(false);
    };

    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      console.log('Tasks fetched:', snapshot.docs.length, 'for project', selectedProject.id);
      tasksData = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Task data:', data);
        return {
          id: doc.id,
          ...data
        };
      }) as Task[];
      updateUnifiedTasks();
    }, (error) => {
      console.error('Error fetching tasks:', error);
      handleFirestoreError(error, OperationType.LIST, 'tasks');
    });

    const unsubscribeIssues = onSnapshot(issuesQuery, (snapshot) => {
      issuesData = snapshot.docs.map(doc => {
        const data = doc.data();
        // Map ProjectIssue to Task structure
        return {
          id: 'issue-' + doc.id,
          title: data.issue || 'Unnamed Issue',
          description: `${data.impact || ''}\n\nActions: ${data.actions || ''}`,
          status: data.kanbanStatus || (data.status === 'Open' ? 'TO DO' : 
                  data.status === 'In Progress' ? 'IN PROGRESS' : 
                  data.status === 'Resolved' ? 'COMPLETED' : 
                  data.status === 'Closed' ? 'COMPLETED' : 'TO DO'),
          assigneeId: data.responsiblePartyId || data.responsibleParty || 'Unassigned',
          workspaceId: workspaces[0].id,
          startDate: getISODate(data.createdAt),
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

  const handleSelectTask = (taskId: string | null) => {
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setEditingTaskLocal({ ...task });
      }
    } else {
      setEditingTaskLocal(null);
    }
    setSelectedTaskId(taskId);
  };

  const handleApplyLocalUpdate = (updates: Partial<Task>) => {
    if (editingTaskLocal) {
      setEditingTaskLocal(prev => ({ ...prev, ...updates }));
    }
  };

  const saveEditingTask = async () => {
    if (!editingTaskLocal || !selectedTaskId) return;
    setIsSavingTask(true);
    try {
      await handleUpdateTask(selectedTaskId, editingTaskLocal);
      toast.success(t('task_updated_success') || 'Task updated successfully');
      handleSelectTask(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingTask(false);
    }
  };

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  const filteredTasks = tasks.filter(t => {
    const isWorkspaceMatch = t.workspaceId === selectedWorkspaceId;
    const isFilterTypeMatch = (filterType === 'all' || t.sourceType === filterType);
    const isMyTaskMatch = (showOnlyMyTasks ? t.assigneeId === auth.currentUser?.uid : true);
    const isSearchMatch = (t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!(isWorkspaceMatch && isFilterTypeMatch && isMyTaskMatch && isSearchMatch)) {
        console.log('Task filtered out:', t.title, { isWorkspaceMatch, isFilterTypeMatch, isMyTaskMatch, isSearchMatch, workspaceId: t.workspaceId, selectedWorkspaceId });
    }
    return isWorkspaceMatch && isFilterTypeMatch && isMyTaskMatch && isSearchMatch;
  });

  const columns: TaskStatus[] = ['TO DO', 'PLANNING', 'RFP', 'TENDERING', 'IN PROGRESS', 'AT RISK', 'UPDATE REQUIRED', 'COMPLETED'];

  const translateStatus = (status: string) => {
    const keyMap: { [key: string]: string } = {
       'TO DO': 'todo',
       'PLANNING': 'planning_status',
       'RFP': 'rfp',
       'TENDERING': 'tendering',
       'IN PROGRESS': 'in_progress',
       'AT RISK': 'at_risk',
       'UPDATE REQUIRED': 'update_required',
       'COMPLETED': 'completed'
    };
    const key = keyMap[status];
    return key ? t(key) : status;
  };

  const handleAddTask = async () => {
    if (!newTask.title || !selectedProject) return;
    
    try {
      const taskData = {
        ...newTask,
        projectId: selectedProject.id,
        history: [{ id: 'h' + Date.now(), userId: currentUser.uid, action: 'Created the task', timestamp: new Date().toLocaleString('en-US') }]
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
        const realId = taskId.replace('issue-', '');
        const issueUpdates: any = {};
        if (updates.title) issueUpdates.issue = updates.title;
        if (updates.endDate) issueUpdates.dueDate = updates.endDate;
        if (updates.description) issueUpdates.actions = updates.description;
        if (updates.priority) {
          issueUpdates.urgency = updates.priority; // Map task priority back to issue urgency
        }
        if (updates.assigneeId) {
          issueUpdates.responsibleParty = updates.assigneeId; // Issue log uses responsibleParty for the UID/ID
          issueUpdates.responsiblePartyId = updates.assigneeId; // Keep both for safety
        }
        if (updates.status) {
          issueUpdates.kanbanStatus = updates.status;
          issueUpdates.status = updates.status === 'COMPLETED' ? 'Resolved' : 
                                updates.status === 'IN PROGRESS' ? 'In Progress' : 'Open';
        }
        
        await updateDoc(doc(db, 'issues', realId), {
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
        timestamp: new Date().toLocaleString('en-US')
      };

      if (task.sourceType === 'issue') {
        const realId = taskId.replace('issue-', '');
        // For issues, we might want to append to comments or history
        await updateDoc(doc(db, 'issues', realId), {
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

  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusToDelete, setStatusToDelete] = useState<string | null>(null);

  const handleDeleteStatus = async (status: string) => {
    if (!selectedProject || !customStatuses.includes(status)) return;
    
    const tasksInStatus = tasks.filter(t => t.status === status);
    if (tasksInStatus.length > 0) {
      setStatusError(`Cannot delete status "${status}" because it contains ${tasksInStatus.length} tasks.`);
      setTimeout(() => setStatusError(null), 3000);
      return;
    }

    setStatusToDelete(status);
  };

  const confirmDeleteStatus = async () => {
    if (!statusToDelete || !selectedProject) return;

    const updatedStatuses = customStatuses.filter(s => s !== statusToDelete);
    setCustomStatuses(updatedStatuses);
    try {
      await updateDoc(doc(db, 'projects', selectedProject.id), {
        taskStatuses: updatedStatuses
      });
      setStatusToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'projects');
    }
  };

  const handleRenameStatus = async () => {
    if (!selectedProject || !editingStatus || !editingStatus.newName.trim()) return;
    const { oldName, newName } = editingStatus;
    const trimmedNewName = newName.trim().toUpperCase();

    if (oldName === trimmedNewName) {
      setEditingStatus(null);
      return;
    }

    if (customStatuses.includes(trimmedNewName)) {
      setStatusError('A status with this name already exists.');
      setTimeout(() => setStatusError(null), 3000);
      return;
    }

    const updatedStatuses = customStatuses.map(s => s === oldName ? trimmedNewName : s);
    setCustomStatuses(updatedStatuses);
    
    try {
      // Update project statuses
      await updateDoc(doc(db, 'projects', selectedProject.id), {
        taskStatuses: updatedStatuses
      });

      // Update all tasks with this status
      const tasksToUpdate = tasks.filter(t => t.status === oldName);
      for (const task of tasksToUpdate) {
        await updateDoc(doc(db, 'tasks', task.id), { status: trimmedNewName });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'projects/tasks');
    }
    setEditingStatus(null);
  };

  const handleReorderStatuses = async (oldIndex: number, newIndex: number) => {
    if (!selectedProject) return;
    const updatedStatuses = arrayMove(customStatuses, oldIndex, newIndex);
    setCustomStatuses(updatedStatuses);
    try {
      await updateDoc(doc(db, 'projects', selectedProject.id), {
        taskStatuses: updatedStatuses
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'projects');
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    const historyItem = { id: 'h' + Date.now(), userId: currentUser.uid, action: `Changed status to ${newStatus}`, timestamp: new Date().toLocaleString('en-US') };
    await handleUpdateTask(taskId, { 
      status: newStatus,
      history: [...(tasks.find(t => t.id === taskId)?.history || []), historyItem]
    });
  };

  const updateTaskAssignee = async (taskId: string, newAssigneeId: string) => {
    const newAssignee = dbUsers.find(u => u.uid === newAssigneeId);
    const historyItem = { id: 'h' + Date.now(), userId: currentUser.uid, action: `Assigned task to ${newAssignee?.name || 'Unassigned'}`, timestamp: new Date().toLocaleString('en-US') };
    await handleUpdateTask(taskId, { 
      assigneeId: newAssigneeId,
      history: [...(tasks.find(t => t.id === taskId)?.history || []), historyItem]
    });
  };

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: any) => {
    const taskId = event.active.id as string;
    setActiveId(taskId);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find(t => t.id === activeTaskId);
    if (!activeTask) return;

    // Determine the target status
    let newStatus = overId;
    const overTask = tasks.find(t => t.id === overId);
    if (overTask) {
      newStatus = overTask.status;
    }

    // Only update if it's a valid status and different
    if (activeTask.status !== newStatus && customStatuses.includes(newStatus as TaskStatus)) {
      setTasks(prev => prev.map(t => 
        t.id === activeTaskId ? { ...t, status: newStatus as TaskStatus } : t
      ));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    let newStatus = over.id as string;

    // If dragging over a task, get its status
    const overTask = tasks.find(t => t.id === over.id);
    if (overTask) {
      newStatus = overTask.status;
    }

    const task = tasks.find(t => t.id === taskId);
    if (task) {
      // Check if newStatus is a valid status from customStatuses
      if (customStatuses.includes(newStatus as TaskStatus)) {
        // Force update even if local status was changed optimistically during dragOver
        await updateTaskStatus(taskId, newStatus as TaskStatus);
      }
    }
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  const DraggableTaskCard: React.FC<{ task: Task }> = ({ task }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({ id: task.id });

    const style = {
      transform: CSS.Translate.toString(transform),
      transition,
      opacity: isDragging ? 0.3 : 1,
    };

    return (
      <HelpTooltip text={th('task_instructions')} position="top">
        <div 
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          onClick={() => handleSelectTask(task.id)}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-grab active:cursor-grabbing relative"
        >

        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
              task.priority === 'High' ? "bg-red-50 text-red-600" :
              task.priority === 'Medium' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
            )}>
              {t(task.priority.toLowerCase())}
            </span>
            {task.sourceType === 'assumption_constraint' && (
              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {t('ac_short')}
              </span>
            )}
            {task.isProcurement && (
              <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                FROM PR
              </span>
            )}
            {task.sourceType === 'issue' && (
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {t('issue_label')}
              </span>
            )}
            {task.sourceType === 'meeting' && (
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3 h-3" />
                {t('meeting_label')}
              </span>
            )}
          </div>
          <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
        </div>
        <h4 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-blue-600 transition-colors">{task.title}</h4>
        <p className="text-slate-500 text-xs line-clamp-2 mb-4">{task.description}</p>
        
        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
          <div className="flex items-center gap-2">
            {getAssignee(task.assigneeId)?.photoURL ? (
              <img 
                src={getAssignee(task.assigneeId)?.photoURL || null} 
                alt="" 
                className="w-6 h-6 rounded-full border-2 border-white shadow-sm object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm bg-slate-100 flex items-center justify-center">
                <User className="w-3 h-3 text-slate-400" />
              </div>
            )}
            <span className="text-[10px] font-medium text-slate-400">{getAssignee(task.assigneeId)?.name}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Calendar className="w-3 h-3" />
            <span className="text-[10px] font-medium">{formatDate(task.endDate)}</span>
          </div>
        </div>
      </div>
    </HelpTooltip>
    );
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'TO DO': return { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600', icon: Clock };
      case 'PLANNING': return { dot: 'bg-purple-500', badge: 'bg-purple-100 text-purple-600', icon: Calendar };
      case 'RFP': return { dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-600', icon: AlertCircle };
      case 'TENDERING': return { dot: 'bg-pink-500', badge: 'bg-pink-100 text-pink-600', icon: AlertCircle };
      case 'IN PROGRESS': return { dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-600', icon: Clock };
      case 'AT RISK': return { dot: 'bg-red-500', badge: 'bg-red-100 text-red-600', icon: AlertTriangle };
      case 'UPDATE REQUIRED': return { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-600', icon: AlertCircle };
      case 'COMPLETED': return { dot: 'bg-green-500', badge: 'bg-green-100 text-green-600', icon: CheckCircle2 };
      default: 
        // Generate a stable color based on status name
        const colors = [
          { dot: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-600' },
          { dot: 'bg-cyan-500', badge: 'bg-cyan-100 text-cyan-600' },
          { dot: 'bg-teal-500', badge: 'bg-teal-100 text-teal-600' },
          { dot: 'bg-rose-500', badge: 'bg-rose-100 text-rose-600' },
          { dot: 'bg-violet-500', badge: 'bg-violet-100 text-violet-600' },
        ];
        const index = status.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
        return { ...colors[index], icon: AlertCircle };
    }
  };

  const KanbanColumn: React.FC<{ status: string, tasks: Task[] }> = ({ status, tasks }) => {
    const { setNodeRef, isOver } = useSortable({ id: status });

    return (
      <div 
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-4 min-w-[300px] bg-slate-50/50 p-3 rounded-2xl border transition-colors",
          isOver ? "border-blue-300 bg-blue-50/50" : "border-slate-100"
        )}
      >
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", getStatusStyle(status).dot)}></div>
            <h3 className="font-bold text-slate-700 text-sm">{translateStatus(status)}</h3>
            <span className="bg-white text-slate-500 text-[10px] px-2 py-0.5 rounded-full font-bold border border-slate-200">
              {tasks.length}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 min-h-[150px]">
          <SortableContext 
            items={tasks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task, idx) => (
              <DraggableTaskCard key={`${task.id}-${idx}`} task={task} />
            ))}
          </SortableContext>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (activeView === 'kanban' || activeView === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-end gap-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsManagingStatuses(true)}
            className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            {t('manage_statuses')}
          </button>
          <button 
            onClick={() => setShowOnlyMyTasks(!showOnlyMyTasks)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold transition-all border",
              showOnlyMyTasks ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            {showOnlyMyTasks ? t('all_tasks') : t('my_tasks')}
          </button>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('kanban')}
              title={t('kanban_view')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'kanban' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Layout className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              title={t('list_view')}
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
            {t('add_task')}
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
            {workspaces.map((w, idx) => (
              <option key={`${w.id}-${idx}`} value={w.id}>{w.name}</option>
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
            <option value="all">{t('all_tasks')}</option>
            <option value="assumption_constraint">{t('assumption_constraint')}</option>
            <option value="issue">{t('issues')}</option>
            <option value="meeting">{t('meeting_actions')}</option>
          </select>
        </div>
        <div className="h-6 w-[1px] bg-slate-200 hidden md:block"></div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder={t('search_tasks')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 overflow-x-auto pb-6 min-h-[600px] items-start">
            {customStatuses.map((status, sIdx) => (
              <KanbanColumn 
                key={`${status}-${sIdx}`} 
                status={status} 
                tasks={filteredTasks.filter(t => t.status === status)} 
              />
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
                    placeholder={t('status_name_placeholder')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3 outline-none focus:ring-2 focus:ring-blue-500/20"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStatus()}
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={handleAddStatus}
                      className="flex-1 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all"
                    >
                      {t('add')}
                    </button>
                    <button 
                      onClick={() => setIsAddingStatus(false)}
                      className="flex-1 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-all"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingStatus(true)}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-sm hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {t('add_status')}
                </button>
              )}
            </div>
          </div>
          
          {statusToDelete && (
            <div className="fixed inset-0 z-[1000001] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full">
                    <h3 className="font-bold text-lg mb-2">Delete status?</h3>
                    <p className="text-slate-600 mb-6">Are you sure you want to delete "{statusToDelete}"?</p>
                    <div className="flex gap-3">
                        <button onClick={() => setStatusToDelete(null)} className="flex-1 p-2 bg-slate-100 rounded-lg font-bold">Cancel</button>
                        <button onClick={confirmDeleteStatus} className="flex-1 p-2 bg-red-600 text-white rounded-lg font-bold">Delete</button>
                    </div>
                </div>
            </div>
          )}
          
          {statusError && (
             <div className="fixed bottom-4 right-4 bg-red-600 text-white p-4 rounded-xl shadow-lg z-[1000002]">
                {statusError}
             </div>
          )}

          {isManagingStatuses && (
            <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
                <h3 className="text-xl font-bold mb-6">{t('manage_statuses')}</h3>
                <div className="space-y-3 mb-8 max-h-[400px] overflow-y-auto">
                  {customStatuses.map(status => (
                    <div key={status} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                      {editingStatus?.oldName === status ? (
                         <input 
                           autoFocus
                           value={editingStatus.newName}
                           onChange={(e) => setEditingStatus({...editingStatus, newName: e.target.value})}
                           onKeyDown={(e) => e.key === 'Enter' && handleRenameStatus()}
                           className="px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                         />
                      ) : (
                          <span className="font-medium text-slate-700">{translateStatus(status)}</span>
                      )}
                      <div className="flex gap-2">
                          {editingStatus?.oldName === status ? (
                            <button onClick={handleRenameStatus} className="text-blue-600 font-bold text-sm">Save</button>
                          ) : (
                            <>
                              <button onClick={() => setEditingStatus({oldName: status, newName: status})}><Edit2 className="w-4 h-4 text-slate-400 hover:text-blue-600" /></button>
                              <button onClick={() => handleDeleteStatus(status)}><Trash2 className="w-4 h-4 text-slate-400 hover:text-red-600" /></button>
                            </>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2 mb-6">
                   <input 
                     value={newStatusName} 
                     onChange={e => setNewStatusName(e.target.value)} 
                     placeholder={t('status_name_placeholder') || 'New status...'} 
                     className="flex-1 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" 
                     onKeyDown={(e) => e.key === 'Enter' && handleAddStatus()}
                   />
                   <button onClick={handleAddStatus} className="bg-blue-600 text-white px-4 py-2 font-bold rounded-xl">{t('add')}</button>
                </div>

                <button onClick={() => setIsManagingStatuses(false)} className="w-full p-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200">{t('close')}</button>
              </div>
            </div>
          )}
          
          <DragOverlay dropAnimation={dropAnimation}>
            {activeId ? (
              <div className="bg-white p-4 rounded-xl border border-blue-400 shadow-xl opacity-90 scale-105 cursor-grabbing">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                      tasks.find(t => t.id === activeId)?.priority === 'High' ? "bg-red-50 text-red-600" :
                      tasks.find(t => t.id === activeId)?.priority === 'Medium' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {tasks.find(t => t.id === activeId)?.priority}
                    </span>
                  </div>
                  <GripVertical className="w-4 h-4 text-blue-500" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm mb-1">{tasks.find(t => t.id === activeId)?.title}</h4>
                <p className="text-slate-500 text-xs line-clamp-2">{tasks.find(t => t.id === activeId)?.description}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('task_label')}</th>
            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('status_label')}</th>
            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('assignee_label')}</th>
            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('priority_label')}</th>
            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('due_date_label')}</th>
          </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task, idx) => (
                <tr 
                  key={`${task.id}-${idx}`} 
                  onClick={() => handleSelectTask(task.id)}
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
                      getStatusStyle(task.status).badge
                    )}>
                      {React.createElement(getStatusStyle(task.status).icon, { className: "w-3 h-3" })}
                      {translateStatus(task.status)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getAssignee(task.assigneeId)?.photoURL ? (
                        <img src={getAssignee(task.assigneeId)?.photoURL || null} className="w-6 h-6 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                          <User className="w-3 h-3 text-slate-400" />
                        </div>
                      )}
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
                    <div className="text-xs font-medium text-slate-500">{formatDate(task.endDate)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

  if (activeView === 'add') {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px]"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-2xl font-bold text-slate-800">{t('create_new_task')}</h3>
            <p className="text-sm text-slate-500 mt-1">Project: {selectedProject?.name}</p>
          </div>
          <button 
            onClick={() => setIsAddingTask(false)}
            className="p-3 hover:bg-slate-200 rounded-2xl transition-all text-slate-500"
          >
            <Plus className="w-6 h-6 rotate-45" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-8 pb-32">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Task Title</label>
                  <input 
                    type="text" 
                    value={newTask.title || ''}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="e.g. Site Survey Block A"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                  <textarea 
                    value={newTask.description || ''}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    rows={6}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none"
                    placeholder="Detailed description of the task..."
                  />
                </div>
              </div>

              <div className="space-y-6 bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Assignee</label>
                    <select 
                      value={newTask.assigneeId}
                      onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    >
                      <option value="Unassigned">Unassigned</option>
                      {dbUsers.map((u, idx) => (
                        <option key={`${u.uid}-${idx}`} value={u.uid}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Priority</label>
                    <select 
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                    <input 
                      type="date" 
                      value={getISODate(newTask.startDate)}
                      onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">End Date</label>
                    <input 
                      type="date" 
                      value={getISODate(newTask.endDate)}
                      onChange={(e) => setNewTask({ ...newTask, endDate: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Status</label>
                  <select 
                    value={newTask.status}
                    onChange={(e) => setNewTask({ ...newTask, status: e.target.value as any })}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                  >
                    {customStatuses.map((s, idx) => (
                      <option key={`${s}-${idx}`} value={s}>{translateStatus(s)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
          <button 
            onClick={() => setIsAddingTask(false)}
            className="px-8 py-4 text-slate-600 font-bold hover:bg-slate-200 rounded-2xl transition-all"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={handleAddTask}
            disabled={!newTask.title}
            className="px-10 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50"
          >
            {t('create_task')}
          </button>
        </div>
      </motion.div>
    );
  }

  {selectedTask && (
    <TaskDetailPanel
      task={selectedTask}
      onUpdate={async (field: string, value: any) => {
        await handleUpdateTask(selectedTaskId!, { [field]: value });
      }}
      onClose={() => handleSelectTask(null)}
      customStatuses={customStatuses}
      translateStatus={translateStatus}
      users={dbUsers}
    />
  )}

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {statusError && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000000] px-6 py-3 bg-red-600 text-white rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            {statusError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Delete Confirmation Modal */}
      <AnimatePresence>
        {statusToDelete && (
          <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex-shrink-0 space-y-6">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
                  <AlertTriangle className="w-8 h-8" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar my-6 text-center space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Delete Status?</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Are you sure you want to delete the status "{statusToDelete}"? This action cannot be undone.
                </p>
              </div>
              <div className="flex-shrink-0 flex gap-3">
                <button 
                  onClick={() => setStatusToDelete(null)}
                  className="flex-1 px-6 py-3.5 bg-slate-100 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteStatus}
                  className="flex-1 px-6 py-3.5 bg-red-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-red-200 hover:bg-red-700 transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
