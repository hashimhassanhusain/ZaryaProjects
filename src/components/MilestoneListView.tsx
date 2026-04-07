import React, { useState, useEffect } from 'react';
import { Page, Activity, BOQItem, WBSLevel } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, where, doc, updateDoc, getDocs } from 'firebase/firestore';
import { 
  Target, Calendar, Clock, Loader2, Search, Filter, 
  Printer, Download, MoreHorizontal, ChevronRight, Edit2
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { cn } from '../lib/utils';
import { ActivityAttributesModal } from './ActivityAttributesModal';
import { AnimatePresence } from 'motion/react';

interface MilestoneListViewProps {
  page: Page;
}

export const MilestoneListView: React.FC<MilestoneListViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [milestones, setMilestones] = useState<Activity[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMilestone, setEditingMilestone] = useState<Activity | null>(null);

  useEffect(() => {
    if (!selectedProject) return;

    // Fetch BOQ Items
    const fetchBoq = async () => {
      const q = query(collection(db, 'boqItems'), where('projectId', '==', selectedProject.id));
      const snap = await getDocs(q);
      setBoqItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as BOQItem)));
    };

    // Fetch WBS Levels
    const fetchWbs = async () => {
      const q = query(collection(db, 'wbsLevels'), where('projectId', '==', selectedProject.id));
      const snap = await getDocs(q);
      setWbsLevels(snap.docs.map(d => ({ id: d.id, ...d.data() } as WBSLevel)));
    };

    // Fetch All Activities (for predecessor selection)
    const fetchAllActs = async () => {
      const q = query(collection(db, 'activities'), where('projectId', '==', selectedProject.id));
      const snap = await getDocs(q);
      setAllActivities(snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
    };

    fetchBoq();
    fetchWbs();
    fetchAllActs();

    const q = query(
      collection(db, 'activities'), 
      where('projectId', '==', selectedProject.id),
      where('activityType', '==', 'Milestone')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMilestones(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'activities');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedProject]);

  const handleSaveAttributes = async (updatedActivity: Activity) => {
    try {
      const activityRef = doc(db, 'activities', updatedActivity.id);
      const { id, ...data } = updatedActivity;
      await updateDoc(activityRef, data);
      setEditingMilestone(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `activities/${updatedActivity.id}`);
    }
  };

  const filteredMilestones = milestones.filter(m => 
    m.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <div className="text-sm font-medium text-blue-600 mb-2 uppercase tracking-wider">Schedule Domain</div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{page.title}</h2>
          <p className="text-slate-500">Significant points or events in the project timeline.</p>
        </div>
        <div className="flex gap-3">
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
            <Printer className="w-5 h-5" />
          </button>
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search milestones..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full sm:w-64"
              />
            </div>
            <button className="p-2 text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 rounded-lg transition-all">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Milestone</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Planned Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actual Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMilestones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    No milestones found. Mark activities as "Milestone" in the Activity List or Schedule to see them here.
                  </td>
                </tr>
              ) : (
                filteredMilestones.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Target className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-slate-900">MS-{String(idx + 1).padStart(3, '0')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 font-bold">{m.description}</div>
                      <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{m.workPackage}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {m.finishDate || 'TBD'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-emerald-600 font-bold">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        {m.actualFinishDate || 'Not Reached'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                        m.status === 'Completed' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setEditingMilestone(m)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {editingMilestone && (
          <ActivityAttributesModal 
            activity={editingMilestone}
            onClose={() => setEditingMilestone(null)}
            onSave={handleSaveAttributes}
            boqItems={boqItems}
            wbsLevels={wbsLevels}
            allActivities={allActivities}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
