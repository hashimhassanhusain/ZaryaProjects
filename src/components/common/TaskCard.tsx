import React from 'react';
import { Calendar, User, AlertCircle, CheckCircle2, AlertTriangle, Users, ShoppingCart, ShieldAlert, FileText } from 'lucide-react';
import { Task } from '../../types';
import { cn, formatDate } from '../../lib/utils';
import { HelpTooltip } from '../HelpTooltip';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  assignee: { name: string; photoURL?: string } | undefined;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, assignee }) => {
  return (
    <HelpTooltip text="Task Details" position="top">
      <div 
        onClick={onClick}
        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-pointer relative h-full flex flex-col"
      >
        <div className="flex flex-wrap gap-2 mb-2">
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
              task.priority === 'High' ? "bg-red-50 text-red-600" :
              task.priority === 'Medium' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
            )}>
              {task.priority || 'Low'}
            </span>
            {task.sourceType === 'assumption_constraint' && (
              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                AC
              </span>
            )}
            {task.sourceType === 'issue' && (
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                ISSUE
              </span>
            )}
            {task.sourceType === 'risk' && (
              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                RISK
              </span>
            )}
            {task.sourceType === 'pr' && (
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <ShoppingCart className="w-3 h-3" />
                PR
              </span>
            )}
            {task.sourceType === 'meeting' && (
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3 h-3" />
                MEETING
              </span>
            )}
            {task.sourceType === 'daily_report' && (
              <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3 h-3" />
                REPORT
              </span>
            )}
        </div>
        <h4 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-blue-600 transition-colors">{task.title}</h4>
        <p className="text-slate-500 text-xs line-clamp-2 mb-4">{task.description}</p>
        
        <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-auto">
          <div className="flex items-center gap-2">
            {assignee?.photoURL ? (
              <img 
                src={assignee.photoURL} 
                alt="" 
                className="w-6 h-6 rounded-full border-2 border-white shadow-sm object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm bg-slate-100 flex items-center justify-center">
                <User className="w-3 h-3 text-slate-400" />
              </div>
            )}
            <span className="text-[10px] font-medium text-slate-400">{assignee?.name || 'Unassigned'}</span>
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
