import React from 'react';
import { Activity } from '../types';
import { CharterMilestones } from './CharterMilestones';
import { Plus, Trash2, Users, Target, Shield, DollarSign, Scale, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface ProjectCharterFormProps {
  formData: Record<string, string>;
  setFormData: (data: Record<string, string>) => void;
  milestones: Activity[];
  setMilestones: (milestones: Activity[]) => void;
  stakeholders: { name: string; role: string }[];
  setStakeholders: (stakeholders: { name: string; role: string }[]) => void;
  isEditing: boolean;
  onEditAttributes?: (milestone: Activity) => void;
}

export const ProjectCharterForm: React.FC<ProjectCharterFormProps> = ({
  formData,
  setFormData,
  milestones,
  setMilestones,
  stakeholders,
  setStakeholders,
  isEditing,
  onEditAttributes
}) => {
  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const addStakeholder = () => {
    setStakeholders([...stakeholders, { name: '', role: '' }]);
  };

  const updateStakeholder = (index: number, field: 'name' | 'role', value: string) => {
    const newStakeholders = [...stakeholders];
    newStakeholders[index][field] = value;
    setStakeholders(newStakeholders);
  };

  const removeStakeholder = (index: number) => {
    setStakeholders(stakeholders.filter((_, i) => i !== index));
  };

  const renderField = (label: string, fieldName: string, type: 'text' | 'textarea' | 'date' = 'text', fullWidth = false) => {
    const value = formData[fieldName] || '';
    
    return (
      <div className={cn("space-y-1", fullWidth ? "col-span-full" : "")}>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
        {isEditing ? (
          type === 'textarea' ? (
            <textarea
              value={value}
              onChange={(e) => updateField(fieldName, e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] resize-none"
              placeholder={`Enter ${label.toLowerCase()}...`}
            />
          ) : (
            <input
              type={type}
              value={value}
              onChange={(e) => updateField(fieldName, e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder={`Enter ${label.toLowerCase()}...`}
            />
          )
        ) : (
          <div className="p-4 bg-white border border-slate-100 rounded-xl text-sm text-slate-700 min-h-[40px]">
            {value || <span className="text-slate-300 italic">Not specified</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-12">
      {/* PAGE 1: BASIC INFO & JUSTIFICATION */}
      <section className="space-y-8">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Target className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-900">1. Project Initiation & Justification</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderField('Project Title', 'Project Title', 'text', true)}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project Base Currency</label>
            {isEditing ? (
              <select
                value={formData['Base Currency'] || 'IQD'}
                onChange={(e) => updateField('Base Currency', e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="IQD">IQD (Iraqi Dinar)</option>
                <option value="USD">USD (US Dollar)</option>
              </select>
            ) : (
              <div className="p-4 bg-white border border-slate-100 rounded-xl text-sm text-slate-700 font-bold">
                {formData['Base Currency'] || 'IQD'}
              </div>
            )}
          </div>
          {renderField('Project Sponsor', 'Project Sponsor')}
          {renderField('Date Prepared', 'Date Prepared', 'date')}
          {renderField('Project Manager', 'Project Manager')}
          {renderField('Project Customer', 'Project Customer')}
          {renderField('Project Purpose or Justification', 'Project Purpose or Justification', 'textarea', true)}
          {renderField('Project Description', 'Project Description', 'textarea', true)}
          {renderField('High-Level Requirements', 'High-Level Requirements', 'textarea', true)}
          {renderField('High-Level Risks', 'High-Level Risks', 'textarea', true)}
        </div>
      </section>

      {/* PAGE 2: OBJECTIVES & MILESTONES */}
      <section className="space-y-8">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Shield className="w-5 h-5 text-emerald-600" />
          <h3 className="text-lg font-bold text-slate-900">2. Project Objectives & Milestones</h3>
        </div>
        
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project Objectives</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Success Criteria</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Person Approving</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {['Scope', 'Time', 'Cost', 'Other'].map((obj) => (
                <tr key={obj}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-900">{obj}</span>
                    </div>
                    {isEditing ? (
                      <textarea 
                        value={formData[`${obj} Objective`] || ''}
                        onChange={(e) => updateField(`${obj} Objective`, e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
                        rows={2}
                      />
                    ) : (
                      <p className="text-xs text-slate-600">{formData[`${obj} Objective`] || 'N/A'}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <textarea 
                        value={formData[`${obj} Success Criteria`] || ''}
                        onChange={(e) => updateField(`${obj} Success Criteria`, e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
                        rows={2}
                      />
                    ) : (
                      <p className="text-xs text-slate-600">{formData[`${obj} Success Criteria`] || 'N/A'}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input 
                        type="text"
                        value={formData[`${obj} Person Approving`] || ''}
                        onChange={(e) => updateField(`${obj} Person Approving`, e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-xs text-slate-600">{formData[`${obj} Person Approving`] || 'N/A'}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <CharterMilestones 
            milestones={milestones}
            onChange={setMilestones}
            isEditing={isEditing}
            onEditAttributes={onEditAttributes}
          />
        </div>
      </section>

      {/* PAGE 3: BUDGET & STAKEHOLDERS */}
      <section className="space-y-8">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <DollarSign className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-bold text-slate-900">3. Budget & Stakeholders</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estimated Budget</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData['Estimated Budget'] || ''}
                  onChange={(e) => updateField('Estimated Budget', e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter estimated budget..."
                />
              ) : (
                <div className="p-4 bg-white border border-slate-100 rounded-xl text-sm text-slate-700 font-bold">
                  {formData['Estimated Budget'] ? (
                    isNaN(Number(formData['Estimated Budget'])) ? 
                      formData['Estimated Budget'] : 
                      new Intl.NumberFormat(formData['Base Currency'] === 'IQD' ? 'ar-IQ' : 'en-US', {
                        style: 'currency',
                        currency: formData['Base Currency'] || 'IQD',
                        maximumFractionDigits: 0
                      }).format(Number(formData['Estimated Budget']))
                  ) : (
                    <span className="text-slate-300 italic">Not specified</span>
                  )}
                </div>
              )}
            </div>
            {renderField('Project Manager Authority Level', 'Project Manager Authority Level', 'textarea', true)}
            {renderField('Staffing Decisions', 'Staffing Decisions', 'textarea', true)}
            {renderField('Budget Management and Variance', 'Budget Management and Variance', 'textarea', true)}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stakeholders & Roles</label>
              {isEditing && (
                <button 
                  onClick={addStakeholder}
                  className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="space-y-3">
              {stakeholders.map((s, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    {isEditing ? (
                      <>
                        <input 
                          type="text"
                          value={s.name}
                          onChange={(e) => updateStakeholder(i, 'name', e.target.value)}
                          placeholder="Name"
                          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                        />
                        <input 
                          type="text"
                          value={s.role}
                          onChange={(e) => updateStakeholder(i, 'role', e.target.value)}
                          placeholder="Role"
                          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                        />
                      </>
                    ) : (
                      <div className="col-span-2 p-3 bg-white border border-slate-100 rounded-xl flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-900">{s.name || 'N/A'}</span>
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{s.role || 'N/A'}</span>
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <button 
                      onClick={() => removeStakeholder(i)}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {stakeholders.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-4">No stakeholders added.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* PAGE 4: GOVERNANCE & APPROVALS */}
      <section className="space-y-8">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Scale className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-slate-900">4. Governance & Approvals</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderField('Technical Decisions', 'Technical Decisions', 'textarea')}
          {renderField('Conflict Resolution', 'Conflict Resolution', 'textarea')}
        </div>

        <div className="mt-12 p-8 bg-slate-900 rounded-3xl text-white space-y-8">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-400" />
            <h4 className="text-xl font-bold">Approvals</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="border-b border-slate-700 pb-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Project Manager Signature</p>
                <div className="h-12 flex items-end">
                  <span className="text-slate-400 italic text-sm">Digital Signature Pending</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Name</p>
                <p className="text-sm font-medium">{formData['Project Manager'] || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Date</p>
                <p className="text-sm font-medium">{new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="border-b border-slate-700 pb-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Sponsor or Originator Signature</p>
                <div className="h-12 flex items-end">
                  <span className="text-slate-400 italic text-sm">Digital Signature Pending</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Name</p>
                <p className="text-sm font-medium">{formData['Project Sponsor'] || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Date</p>
                <p className="text-sm font-medium">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
