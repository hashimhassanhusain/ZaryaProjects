import React, { useState, useEffect } from 'react';
import { Page } from '../types';
import { StandardProcessPage } from './StandardProcessPage';
import { Target, Activity, MessageSquare, TrendingUp, AlertTriangle, CheckCircle2, Brain, Send, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, updateDoc, doc, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

interface Stakeholder {
  id: string;
  name: string;
  role: string;
  currentEngagement: string;
  desiredEngagement: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
}

interface SentimentLog {
  id: string;
  stakeholderId: string;
  content: string;
  sentiment: string;
  confidence: number;
  createdAt: any;
}

interface StakeholderEngagementViewProps {
  page: Page;
  defaultTab?: 'engagement' | 'sentiment' | 'nps';
}

export const StakeholderEngagementView: React.FC<StakeholderEngagementViewProps> = ({ page, defaultTab = 'engagement' }) => {
  const { selectedProject } = useProject();
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [activeSubTab, setActiveSubTab] = useState(defaultTab);
  const [logs, setLogs] = useState<SentimentLog[]>([]);
  const [newNote, setNewNote] = useState('');
  const [selectedSh, setSelectedSh] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!selectedProject?.id) return;
    const q = query(collection(db, 'stakeholders'), where('projectId', '==', selectedProject.id));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Stakeholder));
      const deDuped: Stakeholder[] = [];
      const seen = new Set<string>();
      data.forEach(item => {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          deDuped.push(item);
        }
      });
      setStakeholders(deDuped);
    });
    return () => unsub();
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!selectedProject?.id) return;
    const q = query(
      collection(db, 'stakeholder-logs'), 
      where('projectId', '==', selectedProject.id),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SentimentLog));
      const deDuped: SentimentLog[] = [];
      const seen = new Set<string>();
      data.forEach(item => {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          deDuped.push(item);
        }
      });
      setLogs(deDuped);
    });
    return () => unsub();
  }, [selectedProject?.id]);

  const handleAnalyzeSentiment = async () => {
    if (!newNote || !selectedSh || !selectedProject) return;
    setIsAnalyzing(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY || '';
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Analyze the sentiment of this project stakeholder note: "${newNote}". 
      Return JSON with fields: 
      - sentiment: "Positive", "Neutral", "Negative", or "Conflict"
      - analysis: "One sentence explanation"
      - confidence: 0 to 1`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      const data = JSON.parse((response.text || '{}').replace(/```json|```/g, ''));

      await addDoc(collection(db, 'stakeholder-logs'), {
        projectId: selectedProject.id,
        stakeholderId: selectedSh,
        content: newNote,
        sentiment: data.sentiment,
        analysis: data.analysis,
        confidence: data.confidence,
        createdAt: serverTimestamp()
      });

      // Update stakeholder status if sentiment is negative/conflict
      if (['Negative', 'Conflict'].includes(data.sentiment)) {
        await updateDoc(doc(db, 'stakeholders', selectedSh), {
          sentiment: 'Negative',
          lastSentimentUpdate: serverTimestamp()
        });
      }

      setNewNote('');
      setIsAnalyzing(false);
    } catch (err) {
      console.error("AI Analysis failed:", err);
      setIsAnalyzing(false);
    }
  };

  const getEngagementColor = (current: string, desired: string) => {
    const levels = ['Unaware', 'Resistant', 'Neutral', 'Supportive', 'Leading'];
    const curIdx = levels.indexOf(current);
    const desIdx = levels.indexOf(desired);
    
    if (curIdx < desIdx) {
      if (desIdx - curIdx >= 2) return 'bg-rose-50 border-rose-200 text-rose-700'; // Critical Gap
      return 'bg-amber-50 border-amber-200 text-amber-700'; // Gap
    }
    return 'bg-emerald-50 border-emerald-200 text-emerald-700'; // Aligned
  };

  return (
    <StandardProcessPage
      page={page}
      inputs={[
        { id: '1.2.1', title: 'Stakeholder Analysis', status: 'Approved' }
      ]}
      outputs={[
        { id: '2.5.1-OUT', title: 'Sentiment Dashboard', status: 'Real-time' }
      ]}
    >
      <div className="space-y-8 pb-20">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg text-white">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 tracking-tight italic uppercase">Relationships & Sentiment</h2>
              <p className="text-sm text-slate-500 font-medium">Measuring relationship health through AI-powered sentiment logs.</p>
            </div>
          </div>
          <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
             {['engagement', 'sentiment', 'nps'].map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveSubTab(t as any)}
                  className={`px-6 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all ${
                    activeSubTab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                   {t}
                </button>
             ))}
          </div>
        </header>

        {activeSubTab === 'engagement' && (
          <section className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
             <div className="p-8 border-b border-slate-50 bg-slate-50/30">
               <h3 className="text-lg font-semibold text-slate-900 italic">Engagement Matrix (C vs D)</h3>
             </div>
             <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stakeholder</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Current</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Desired</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Strategy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stakeholders.map((sh) => (
                    <tr key={sh.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                              {sh.name[0]}
                           </div>
                           <div>
                              <p className="text-sm font-semibold text-slate-900">{sh.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sh.role}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg uppercase">
                           {sh.currentEngagement || 'Unaware'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-lg uppercase">
                           {sh.desiredEngagement || 'Supportive'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getEngagementColor(sh.currentEngagement, sh.desiredEngagement)}`}>
                           {getEngagementColor(sh.currentEngagement, sh.desiredEngagement).includes('emerald') ? (
                             <CheckCircle2 className="w-3 h-3" />
                           ) : (
                             <AlertTriangle className="w-3 h-3" />
                           )}
                           <span className="text-[9px] font-semibold uppercase tracking-widest">
                              {getEngagementColor(sh.currentEngagement, sh.desiredEngagement).includes('emerald') ? 'Aligned' : 'Gap Detected'}
                           </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <button className="text-[10px] font-semibold text-purple-600 uppercase tracking-widest hover:underline transition-all">
                           View Mitigation Plan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </section>
        )}

        {activeSubTab === 'sentiment' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="space-y-6">
                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                   <h3 className="text-lg font-semibold text-slate-900 italic">Submit Interaction Log</h3>
                   <div className="space-y-4">
                      <div className="space-y-1">
                         <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Stakeholder</label>
                         <select 
                           value={selectedSh}
                           onChange={(e) => setSelectedSh(e.target.value)}
                           className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all cursor-pointer"
                         >
                            <option value="">Select Stakeholder...</option>
                            {stakeholders.map(sh => <option key={sh.id} value={sh.id}>{sh.name} ({sh.role})</option>)}
                         </select>
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Log / Observation Content</label>
                         <textarea 
                           rows={4}
                           placeholder="Type observation based on meeting minutes or conversation..."
                           value={newNote}
                           onChange={(e) => setNewNote(e.target.value)}
                           className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all resize-none"
                         />
                      </div>
                      <button 
                        onClick={handleAnalyzeSentiment}
                        disabled={isAnalyzing}
                        className="w-full py-4 bg-purple-600 text-white rounded-2xl font-semibold text-[11px] uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-600/20 flex items-center justify-center gap-2"
                      >
                         {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                         {isAnalyzing ? 'Analyzing Sentiment...' : 'Analyze & Log Interaction'}
                      </button>
                   </div>
                </div>

                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-4 shadow-xl shadow-purple-900/10">
                   <h4 className="text-[10px] font-semibold uppercase tracking-widest text-purple-400">AI Logic Indicator</h4>
                   <p className="text-sm font-medium leading-relaxed italic text-slate-400">
                     "PMIS uses NLP to detect conflict levels. Stakeholders tagged as 'Critical' will be automatically flagged in the Risk Register."
                   </p>
                </div>
             </div>

             <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm space-y-6 flex flex-col h-[700px]">
                <h3 className="text-lg font-semibold text-slate-900 italic">Sentiment Feed</h3>
                <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                   {logs.map((log) => {
                     const sh = stakeholders.find(s => s.id === log.stakeholderId);
                     return (
                       <motion.div 
                         key={log.id} 
                         initial={{ opacity: 0, x: 20 }}
                         animate={{ opacity: 1, x: 0 }}
                         className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 relative overflow-hidden"
                       >
                          <div className={`absolute top-0 left-0 w-1 h-full ${
                             log.sentiment === 'Positive' ? 'bg-emerald-500' : 
                             log.sentiment === 'Negative' || log.sentiment === 'Conflict' ? 'bg-rose-500' : 'bg-slate-300'
                          }`} />
                          <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-slate-900 uppercase">{sh?.name || 'Unknown'}</span>
                                <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded uppercase ${
                                   log.sentiment === 'Positive' ? 'bg-emerald-50 text-emerald-600' : 
                                   log.sentiment === 'Negative' || log.sentiment === 'Conflict' ? 'bg-rose-50 text-rose-600' : 'bg-slate-200 text-slate-600'
                                }`}>
                                   {log.sentiment}
                                </span>
                             </div>
                             <span className="text-[9px] font-bold text-slate-400">{log.createdAt?.toDate().toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed italic">"{log.content}"</p>
                          <div className="pt-2 flex items-center gap-2 border-t border-slate-200">
                             <TrendingUp className="w-3 h-3 text-slate-400" />
                             <span className="text-[9px] font-bold text-slate-400">AI Analysis: {log.sentiment} confidence {(log.confidence * 100).toFixed(0)}%</span>
                          </div>
                       </motion.div>
                     );
                   })}
                   {logs.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-full text-center py-20 grayscale">
                        <MessageSquare className="w-12 h-12 text-slate-200 mb-4" />
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">No Logs Found</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}
      </div>
    </StandardProcessPage>
  );
};
