import React, { useState, useEffect } from 'react';
import { Activity, BOQItem, WBSLevel, ActivityDependency, DependencyType } from '../types';
import { masterFormatDivisions } from '../data';
import { motion } from 'motion/react';
import { X, Calendar, Clock, Save, Database, Plus, Trash2, Link2, DollarSign, TrendingUp, CheckCircle2 } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';

interface ActivityAttributesModalProps {
  activity: Activity;
  allActivities: Activity[];
  boqItems: BOQItem[];
  wbsLevels: WBSLevel[];
  onClose: () => void;
  onSave: (updatedActivity: Activity) => void;
}

export const ActivityAttributesModal: React.FC<ActivityAttributesModalProps> = ({ 
  activity, 
  allActivities, 
  boqItems, 
  wbsLevels, 
  onClose, 
  onSave 
}) => {
  const [formData, setFormData] = useState<Activity>({ 
    ...activity,
    predecessors: activity.predecessors || []
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const updatedData = { ...formData, [name]: value };

    // Auto-calculate finish date if start and duration exist
    if (name === 'startDate' || name === 'duration') {
      const start = name === 'startDate' ? value : updatedData.startDate;
      const dur = name === 'duration' ? parseInt(value) : updatedData.duration;
      
      if (start && !isNaN(dur)) {
        const startDate = new Date(start);
        const finishDate = new Date(startDate);
        finishDate.setDate(startDate.getDate() + dur);
        updatedData.finishDate = finishDate.toISOString().split('T')[0];
      }
    }

    // Auto-calculate actual duration if actual start and finish exist
    if (name === 'actualStartDate' || name === 'actualFinishDate') {
      const start = name === 'actualStartDate' ? value : updatedData.actualStartDate;
      const finish = name === 'actualFinishDate' ? value : updatedData.actualFinishDate;
      
      if (start && finish) {
        const startDate = new Date(start);
        const finishDate = new Date(finish);
        const diffTime = Math.abs(finishDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        updatedData.actualDuration = diffDays;
      }
    }

    setFormData(updatedData);
  };

  const addPredecessor = () => {
    const newDep: ActivityDependency = { id: '', type: 'FS', lag: 0 };
    setFormData(prev => ({
      ...prev,
      predecessors: [...(prev.predecessors || []), newDep]
    }));
  };

  const removePredecessor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      predecessors: prev.predecessors?.filter((_, i) => i !== index)
    }));
  };

  const updatePredecessor = (index: number, field: keyof ActivityDependency, value: any) => {
    setFormData(prev => {
      const newPredecessors = [...(prev.predecessors || [])];
      newPredecessors[index] = { ...newPredecessors[index], [field]: value };
      return { ...prev, predecessors: newPredecessors };
    });
  };

  const calculateDatesFromPredecessors = () => {
    if (!formData.predecessors || formData.predecessors.length === 0) return;

    let latestStart: Date | null = null;

    formData.predecessors.forEach(dep => {
      const pred = allActivities.find(a => a.id === dep.id);
      if (!pred) return;

      let calculatedDate: Date | null = null;
      const predStart = pred.startDate ? new Date(pred.startDate) : null;
      const predFinish = pred.finishDate ? new Date(pred.finishDate) : null;

      if (!predStart || !predFinish) return;

      switch (dep.type) {
        case 'FS':
          calculatedDate = new Date(predFinish);
          calculatedDate.setDate(calculatedDate.getDate() + dep.lag);
          break;
        case 'SS':
          calculatedDate = new Date(predStart);
          calculatedDate.setDate(calculatedDate.getDate() + dep.lag);
          break;
        case 'FF':
          // For FF, we calculate the finish date, then subtract duration to get start
          const finish = new Date(predFinish);
          finish.setDate(finish.getDate() + dep.lag);
          calculatedDate = new Date(finish);
          calculatedDate.setDate(calculatedDate.getDate() - (formData.duration || 0));
          break;
        case 'SF':
          const finishSF = new Date(predStart);
          finishSF.setDate(finishSF.getDate() + dep.lag);
          calculatedDate = new Date(finishSF);
          calculatedDate.setDate(calculatedDate.getDate() - (formData.duration || 0));
          break;
      }

      if (calculatedDate && (!latestStart || calculatedDate > latestStart)) {
        latestStart = calculatedDate;
      }
    });

    if (latestStart) {
      const startStr = latestStart.toISOString().split('T')[0];
      const dur = formData.duration || 0;
      const finishDate = new Date(latestStart);
      finishDate.setDate(latestStart.getDate() + dur);
      const finishStr = finishDate.toISOString().split('T')[0];

      setFormData(prev => ({
        ...prev,
        startDate: startStr,
        finishDate: finishStr
      }));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Activity Attributes & Scheduling</h3>
            <p className="text-xs text-slate-500 mt-1">Configure dependencies, planned vs actual data, and MasterFormat categorization.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8">
          {/* Basic Info */}
          <section className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Database className="w-3 h-3" /> Basic Information
            </h4>
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[60px]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">MasterFormat Division</label>
                <select 
                  name="division"
                  value={formData.division || '01'}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  {masterFormatDivisions.map(div => (
                    <option key={div.id} value={div.id}>{div.id} - {div.title}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 pt-4">
                <input 
                  type="checkbox"
                  id="isMilestone"
                  checked={formData.activityType === 'Milestone'}
                  onChange={(e) => {
                    const isMilestone = e.target.checked;
                    setFormData(prev => ({
                      ...prev,
                      activityType: isMilestone ? 'Milestone' : 'Task',
                      duration: isMilestone ? 0 : prev.duration
                    }));
                  }}
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isMilestone" className="text-sm font-bold text-slate-700 cursor-pointer">
                  Milestone
                </label>
              </div>
            </div>
          </section>

          {/* Planned Schedule */}
          <section className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Planned Schedule (Baseline)
            </h4>
            <div className="grid grid-cols-3 gap-6 bg-blue-50/30 p-6 rounded-2xl border border-blue-100">
              <div>
                <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Planned Start</label>
                <input 
                  type="date"
                  name="startDate"
                  value={formData.startDate || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Planned Duration (Days)</label>
                <input 
                  type="number"
                  name="duration"
                  value={formData.duration || ''}
                  onChange={handleInputChange}
                  disabled={formData.activityType === 'Milestone'}
                  className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Planned Finish</label>
                <input 
                  type="date"
                  name="finishDate"
                  value={formData.finishDate || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </section>

          {/* Dependencies */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Link2 className="w-3 h-3" /> Dependencies (Predecessors)
              </h4>
              <div className="flex gap-2">
                <button 
                  onClick={calculateDatesFromPredecessors}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-all flex items-center gap-1"
                >
                  <TrendingUp className="w-3 h-3" /> Recalculate Dates
                </button>
                <button 
                  onClick={addPredecessor}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-200 transition-all flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Dependency
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              {formData.predecessors?.map((dep, index) => (
                <div key={index} className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex-1">
                    <select 
                      value={dep.id}
                      onChange={(e) => updatePredecessor(index, 'id', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Select Predecessor...</option>
                      {allActivities.filter(a => a.id !== formData.id).map(a => (
                        <option key={a.id} value={a.id}>{a.description}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <select 
                      value={dep.type}
                      onChange={(e) => updatePredecessor(index, 'type', e.target.value as DependencyType)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="FS">FS</option>
                      <option value="SS">SS</option>
                      <option value="FF">FF</option>
                      <option value="SF">SF</option>
                    </select>
                  </div>
                  <div className="w-24">
                    <input 
                      type="number"
                      value={dep.lag}
                      onChange={(e) => updatePredecessor(index, 'lag', parseInt(e.target.value))}
                      placeholder="Lag"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <button 
                    onClick={() => removePredecessor(index)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {(!formData.predecessors || formData.predecessors.length === 0) && (
                <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 text-xs font-medium">
                  No dependencies defined.
                </div>
              )}
            </div>
          </section>

          {/* Actual Data */}
          <section className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3" /> Actual Progress & Costs
            </h4>
            <div className="grid grid-cols-3 gap-6 bg-emerald-50/30 p-6 rounded-2xl border border-emerald-100">
              <div>
                <label className="block text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Actual Start</label>
                <input 
                  type="date"
                  name="actualStartDate"
                  value={formData.actualStartDate || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white border border-emerald-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Actual Finish</label>
                <input 
                  type="date"
                  name="actualFinishDate"
                  value={formData.actualFinishDate || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white border border-emerald-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Actual Cost (IQD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                  <input 
                    type="number"
                    name="actualAmount"
                    value={formData.actualAmount || ''}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-emerald-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="p-8 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
          <button 
            onClick={onClose}
            className="px-6 py-3 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-2xl transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(formData)}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
          >
            <Save className="w-4 h-4" />
            Save Attributes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
