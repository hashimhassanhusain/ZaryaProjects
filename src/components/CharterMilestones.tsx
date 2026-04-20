import React, { useState } from 'react';
import { Plus, Trash2, Target, Calendar, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { Activity } from '../types';

interface CharterMilestonesProps {
  milestones: Activity[];
  onChange: (milestones: Activity[]) => void;
  isEditing: boolean;
  onEditAttributes?: (milestone: Activity) => void;
}

export const CharterMilestones: React.FC<CharterMilestonesProps> = ({ milestones, onChange, isEditing, onEditAttributes }) => {
  const [newMilestone, setNewMilestone] = useState({ description: '', date: '' });

  const addMilestone = () => {
    if (!newMilestone.description || !newMilestone.date) return;
    const milestone: Activity = {
      id: crypto.randomUUID(),
      description: newMilestone.description,
      finishDate: newMilestone.date,
      activityType: 'Milestone',
      duration: 0,
      status: 'Not Started',
      projectId: '', // Will be set by parent if needed
      wbsId: '',
      workPackage: 'General',
      unit: 'LS',
      quantity: 1,
      rate: 0,
      amount: 0
    };
    onChange([...milestones, milestone]);
    setNewMilestone({ description: '', date: '' });
  };

  const removeMilestone = (id: string) => {
    onChange(milestones.filter(m => m.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Project Milestones</h3>
        </div>
        {!isEditing && milestones.length > 0 && (
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-wider">
            {milestones.length} Defined
          </span>
        )}
      </div>

      {isEditing && (
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Milestone Name</label>
              <input 
                type="text"
                value={newMilestone.description}
                onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                placeholder="e.g. Project Kick-off"
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Date</label>
              <input 
                type="date"
                value={newMilestone.date}
                onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <button 
            onClick={addMilestone}
            disabled={!newMilestone.description || !newMilestone.date}
            className="w-full py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add Milestone to Charter
          </button>
        </div>
      )}

      <div className="space-y-3">
        {milestones.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
            <p className="text-sm text-slate-400 italic">No milestones defined in the charter yet.</p>
          </div>
        ) : (
          milestones.map((m) => (
            <div key={m.id} className="p-4 bg-white border border-slate-100 rounded-xl flex items-center justify-between hover:border-slate-200 transition-all group shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{m.description}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                      <Calendar className="w-3 h-3" />
                      PLN: {m.finishDate || 'TBD'}
                    </div>
                    {m.actualFinishDate && (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                        <Target className="w-3 h-3" />
                        ACT: {m.actualFinishDate}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onEditAttributes && (
                  <button 
                    onClick={() => onEditAttributes(m)}
                    className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Activity Attributes"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
                {isEditing && (
                  <button 
                    onClick={() => removeMilestone(m.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
