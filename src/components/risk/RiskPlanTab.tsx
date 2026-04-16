import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Save, 
  Loader2, 
  FileText,
  BookOpen,
  Settings,
  Users,
  Target,
  Activity
} from 'lucide-react';
import { db, OperationType, handleFirestoreError, auth } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';

interface RiskPlanTabProps {
  projectId: string;
}

export const RiskPlanTab: React.FC<RiskPlanTabProps> = ({ projectId }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const docRef = doc(db, 'risk_management_plans', projectId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setContent(docSnap.data().content || '');
        } else {
          // Default template
          setContent(`# Risk Management Plan

## 1. Introduction
This plan defines how risks will be identified, analyzed, and managed throughout the project lifecycle.

## 2. Roles and Responsibilities
- **Project Manager:** Overall risk management responsibility.
- **Risk Owner:** Responsible for monitoring specific risks and implementing responses.
- **Team Members:** Identify and report risks.

## 3. Risk Categories (RBS)
- **Technical:** Requirements, Technology, Complexity, Interfaces, Performance, Reliability, Quality.
- **Management:** Project Management, Program/Portfolio Management, Operations Management, Organization, Resource Management, Communication.
- **Commercial:** Contractual terms, Internal procurement, Suppliers/Vendors, Subcontracts, Client/Customer stability.
- **External:** Legislation, Exchange rates, Site/Facilities, Environmental/Weather, Competition, Regulatory.

## 4. Risk Probability and Impact Scales
We use a 1-5 scale for both Probability and Impact.
- 1: Very Low
- 2: Low
- 3: Medium
- 4: High
- 5: Very High

## 5. Risk Scoring and Thresholds
Risk Score = Probability x Impact.
- **Low (1-7):** Monitor and accept.
- **Medium (8-14):** Plan mitigation and assign owner.
- **High (15-25):** Urgent mitigation, escalate if necessary.

## 6. Reporting and Communication
Risk status will be reported in weekly progress meetings.`);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'risk_management_plans');
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [projectId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'risk_management_plans', projectId), {
        content,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'System'
      });
      toast.success('Risk Management Plan saved');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'risk_management_plans');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Loading Plan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-red-600" />
          Risk Management Plan
        </h3>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Plan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-[800px] p-10 text-slate-700 font-mono text-sm leading-relaxed focus:outline-none resize-none"
              placeholder="Enter Risk Management Plan content (Markdown supported)..."
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl shadow-slate-200">
            <h4 className="text-sm font-black uppercase tracking-widest mb-6 text-white/40 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Plan Sections
            </h4>
            <div className="space-y-4">
              {[
                { label: 'Methodology', icon: Settings },
                { label: 'Roles & Responsibilities', icon: Users },
                { label: 'Risk Categories', icon: Target },
                { label: 'Scoring Scales', icon: Activity },
                { label: 'Thresholds', icon: ShieldAlert },
                { label: 'Reporting', icon: FileText },
              ].map(section => (
                <div key={section.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <section.icon className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold">{section.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-200">
            <h4 className="font-bold mb-2">Pro Tip</h4>
            <p className="text-xs text-blue-100 leading-relaxed">
              Use Markdown to structure your plan. This document serves as the governance framework for all risk activities in this project.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
