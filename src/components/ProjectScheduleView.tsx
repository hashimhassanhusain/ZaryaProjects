import React, { useState, useEffect, useMemo } from 'react';
import { getParent, masterFormatDivisions } from '../data';
import { Page, Activity, BOQItem, WBSLevel, PurchaseOrder } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, where, setDoc, doc } from 'firebase/firestore';
import { ActivityAttributesModal } from './ActivityAttributesModal';
import { 
  Calendar, Clock, Database, ChevronRight, ChevronDown,
  Loader2, Edit2, Search, Filter, Download, Printer,
  BarChart3, DollarSign, CheckCircle2, AlertCircle,
  ArrowRight, Link2, Plus, MoreHorizontal, Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProject } from '../context/ProjectContext';
import { cn, formatCurrency } from '../lib/utils';

interface ProjectScheduleViewProps {
  page: Page;
}

export const ProjectScheduleView: React.FC<ProjectScheduleViewProps> = ({ page }) => {
  const { selectedProject } = useProject();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [wbsLevels, setWbsLevels] = useState<WBSLevel[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedWbs, setExpandedWbs] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'table' | 'gantt'>('gantt');
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  useEffect(() => {
    if (!selectedProject) return;

    const actUnsubscribe = onSnapshot(
      query(collection(db, 'activities'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setActivities(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
      }
    );

    const wbsUnsubscribe = onSnapshot(
      query(collection(db, 'wbs'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setWbsLevels(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WBSLevel)));
        setLoading(false);
      }
    );

    const poUnsubscribe = onSnapshot(
      collection(db, 'purchaseOrders'),
      (snapshot) => {
        setPurchaseOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder)));
      }
    );

    const boqUnsubscribe = onSnapshot(
      query(collection(db, 'boq'), where('projectId', '==', selectedProject.id)),
      (snapshot) => {
        setBoqItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BOQItem)));
      }
    );

    return () => {
      actUnsubscribe();
      wbsUnsubscribe();
      poUnsubscribe();
      boqUnsubscribe();
    };
  }, [selectedProject]);

  const toggleWbs = (id: string) => {
    setExpandedWbs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Calculate project dates for Gantt
  const projectDates = useMemo(() => {
    const dates = activities
      .filter(a => a.startDate && a.finishDate)
      .flatMap(a => [new Date(a.startDate!), new Date(a.finishDate!)]);
    
    if (dates.length === 0) {
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(today.getMonth() + 3);
      return { start: today, end: nextMonth };
    }

    const start = new Date(Math.min(...dates.map(d => d.getTime())));
    const end = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Add some padding
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() + 14);
    
    return { start, end };
  }, [activities]);

  const timeScale = useMemo(() => {
    const months: { name: string, days: number }[] = [];
    let current = new Date(projectDates.start);
    while (current <= projectDates.end) {
      const monthName = current.toLocaleString('default', { month: 'short', year: '2-digit' });
      const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
      months.push({ name: monthName, days: daysInMonth });
      current.setMonth(current.getMonth() + 1);
      current.setDate(1);
    }
    return months;
  }, [projectDates]);

  const totalDays = useMemo(() => {
    const diffTime = Math.abs(projectDates.end.getTime() - projectDates.start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [projectDates]);

  const getProgress = (activity: Activity) => {
    // Logic to link progress to POs if applicable
    if (activity.status === 'Completed') return 100;
    if (activity.status === 'In Progress') return 50;
    
    // Find linked PO line items to get more granular progress if available
    const linkedPO = purchaseOrders.find(po => po.id === activity.poId);
    if (linkedPO) {
      const lineItem = linkedPO.lineItems.find(li => li.description === activity.description);
      if (lineItem && lineItem.status === 'Completed') return 100;
      if (lineItem && lineItem.status === 'In Progress') return 50;
    }
    
    return 0;
  };

  const handleSaveAttributes = async (updatedActivity: Activity) => {
    try {
      await setDoc(doc(db, 'activities', updatedActivity.id), updatedActivity);
      setEditingActivity(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'activities');
    }
  };

  const renderGanttBar = (activity: Activity) => {
    if (!activity.startDate || !activity.finishDate) return null;
    
    const start = new Date(activity.startDate);
    const finish = new Date(activity.finishDate);
    
    const startOffset = Math.ceil((start.getTime() - projectDates.start.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((finish.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    const left = (startOffset / totalDays) * 100;
    const width = (duration / totalDays) * 100;
    const progress = getProgress(activity);

    // Actual Bar Data
    const actualStart = activity.actualStartDate ? new Date(activity.actualStartDate) : null;
    const actualFinish = activity.actualFinishDate ? new Date(activity.actualFinishDate) : null;
    let actualLeft = 0;
    let actualWidth = 0;

    if (actualStart && actualFinish) {
      const actualStartOffset = Math.ceil((actualStart.getTime() - projectDates.start.getTime()) / (1000 * 60 * 60 * 24));
      const actualDur = Math.ceil((actualFinish.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24));
      actualLeft = (actualStartOffset / totalDays) * 100;
      actualWidth = (actualDur / totalDays) * 100;
    }

    return (
      <div className="relative w-full h-10 flex flex-col justify-center gap-1">
        {/* Planned Bar */}
        <div 
          className="absolute h-3 bg-blue-100 rounded-sm border border-blue-200 group cursor-pointer hover:border-blue-400 transition-all flex items-center justify-between px-1 overflow-hidden top-1"
          style={{ left: `${left}%`, width: `${width}%` }}
          title={`Planned: ${activity.startDate} to ${activity.finishDate}`}
          onClick={(e) => {
            e.stopPropagation();
            setEditingActivity(activity);
          }}
        >
          <div 
            className="absolute inset-0 bg-blue-500 transition-all opacity-20"
            style={{ width: `${progress}%` }}
          />
          <span className="text-[6px] font-bold text-blue-700 z-10 truncate">{activity.duration}d</span>
        </div>

        {/* Actual Bar */}
        {actualStart && actualFinish && (
          <div 
            className="absolute h-3 bg-emerald-100 rounded-sm border border-emerald-200 group cursor-pointer hover:border-emerald-400 transition-all flex items-center justify-between px-1 overflow-hidden bottom-1"
            style={{ left: `${actualLeft}%`, width: `${actualWidth}%` }}
            title={`Actual: ${activity.actualStartDate} to ${activity.actualFinishDate}`}
            onClick={(e) => {
              e.stopPropagation();
              setEditingActivity(activity);
            }}
          >
            <div 
              className="absolute inset-0 bg-emerald-500 transition-all opacity-40"
              style={{ width: '100%' }}
            />
            <span className="text-[6px] font-bold text-emerald-800 z-10 truncate">ACTUAL</span>
          </div>
        )}

        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {progress}% Complete | {formatCurrency(activity.amount)}
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="text-sm font-medium text-blue-600 mb-2 uppercase tracking-wider">Planning Focus Area</div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{page.title}</h2>
          <p className="text-slate-500">Comprehensive project timeline, WBS hierarchy, and performance tracking.</p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setViewMode('table')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
              viewMode === 'table' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Table View
          </button>
          <button 
            onClick={() => setViewMode('gantt')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
              viewMode === 'gantt' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Gantt Chart
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search activities or WBS..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all"><Filter className="w-4 h-4" /></button>
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all"><Download className="w-4 h-4" /></button>
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all"><Printer className="w-4 h-4" /></button>
        </div>
        <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block" />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Actual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded-full" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Planned</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex overflow-x-auto relative">
          {/* Relationship Lines SVG Overlay */}
          {viewMode === 'gantt' && (
            <svg className="absolute inset-0 pointer-events-none z-0 w-full h-full">
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                </marker>
              </defs>
              {(() => {
                const visibleActivities: { id: string, top: number, left: number, width: number }[] = [];
                let currentRow = 0;
                
                const processWbs = (wbsId: string | undefined, level: number) => {
                  const currentWbs = wbsLevels.filter(w => w.parentId === wbsId);
                  currentWbs.forEach(w => {
                    currentRow++; // WBS Row
                    if (expandedWbs[w.id]) {
                      processWbs(w.id, level + 1);
                      const wbsActs = activities.filter(a => a.wbsId === w.id);
                      
                      // Group by division
                      const groups: Record<string, Activity[]> = {};
                      wbsActs.forEach(act => {
                        const div = act.division || '01';
                        if (!groups[div]) groups[div] = [];
                        groups[div].push(act);
                      });
                      const activeDivs = Object.keys(groups).sort();

                      activeDivs.forEach(divId => {
                        currentRow++; // Division Row
                        const divKey = `${w.id}-${divId}`;
                        if (expandedWbs[divKey] ?? true) {
                          groups[divId].forEach(act => {
                            if (act.startDate && act.finishDate) {
                              const start = new Date(act.startDate);
                              const finish = new Date(act.finishDate);
                              const startOffset = Math.ceil((start.getTime() - projectDates.start.getTime()) / (1000 * 60 * 60 * 24));
                              const duration = Math.ceil((finish.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                              
                              visibleActivities.push({
                                id: act.id,
                                top: currentRow * 40 + 40 + 8, // 40 is row height, 40 is header, 8 is bar offset
                                left: (startOffset / totalDays) * 100,
                                width: (duration / totalDays) * 100
                              });
                            }
                            currentRow++; // Activity Row
                          });
                        }
                      });
                    }
                  });
                };

                processWbs(undefined, 0);

                return activities.flatMap(act => {
                  if (!act.predecessors || act.predecessors.length === 0) return [];
                  
                  return act.predecessors.map((dep, idx) => {
                    const pred = visibleActivities.find(a => a.id === dep.id);
                    const curr = visibleActivities.find(a => a.id === act.id);
                    
                    if (!pred || !curr) return null;

                    let x1 = 0, y1 = 0, x2 = 0, y2 = 0;

                    switch (dep.type) {
                      case 'FS':
                        x1 = pred.left + pred.width;
                        y1 = pred.top + 6;
                        x2 = curr.left;
                        y2 = curr.top + 6;
                        break;
                      case 'SS':
                        x1 = pred.left;
                        y1 = pred.top + 6;
                        x2 = curr.left;
                        y2 = curr.top + 6;
                        break;
                      case 'FF':
                        x1 = pred.left + pred.width;
                        y1 = pred.top + 6;
                        x2 = curr.left + curr.width;
                        y2 = curr.top + 6;
                        break;
                      case 'SF':
                        x1 = pred.left;
                        y1 = pred.top + 6;
                        x2 = curr.left + curr.width;
                        y2 = curr.top + 6;
                        break;
                    }

                    return (
                      <g key={`link-${act.id}-${dep.id}-${idx}`}>
                        <path 
                          d={`M ${x1}% ${y1} L ${x1 + 0.5}% ${y1} L ${x1 + 0.5}% ${y2} L ${x2}% ${y2}`}
                          fill="none"
                          stroke="#94a3b8"
                          strokeWidth="1"
                          markerEnd="url(#arrowhead)"
                          className="opacity-40"
                        />
                      </g>
                    );
                  });
                });
              })()}
            </svg>
          )}

          {/* Left Side: WBS & Activity Info */}
          <div className="w-[400px] shrink-0 border-r border-slate-200 bg-slate-50/30">
            <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 h-10 flex items-center px-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WBS / Activity Name</span>
            </div>
            <div className="divide-y divide-slate-100">
              {wbsLevels.filter(w => !w.parentId).map(rootWbs => (
                <WbsRow 
                  key={rootWbs.id} 
                  wbs={rootWbs} 
                  allWbs={wbsLevels} 
                  activities={activities}
                  boqItems={boqItems}
                  expanded={expandedWbs}
                  onToggle={toggleWbs}
                  searchQuery={searchQuery}
                  viewMode={viewMode}
                  purchaseOrders={purchaseOrders}
                  setEditingActivity={setEditingActivity}
                />
              ))}
            </div>
          </div>

          {/* Right Side: Gantt Chart or Detailed Table */}
          <div className="flex-1 overflow-x-auto">
            {viewMode === 'gantt' ? (
              <div className="min-w-[1000px]">
                {/* Gantt Header */}
                <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 h-10 flex">
                  {timeScale.map((month, i) => (
                    <div 
                      key={i} 
                      className="border-r border-slate-200 flex-shrink-0 flex flex-col items-center justify-center"
                      style={{ width: `${(month.days / totalDays) * 100}%` }}
                    >
                      <span className="text-[10px] font-bold text-slate-500">{month.name}</span>
                    </div>
                  ))}
                </div>
                {/* Gantt Rows */}
                <div className="divide-y divide-slate-100">
                  {wbsLevels.filter(w => !w.parentId).map(rootWbs => (
                    <GanttRow 
                      key={rootWbs.id} 
                      wbs={rootWbs} 
                      allWbs={wbsLevels} 
                      activities={activities}
                      expanded={expandedWbs}
                      renderBar={renderGanttBar}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="min-w-[1200px]">
                <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 h-10 flex items-center px-6">
                  <div className="grid grid-cols-10 w-full text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span className="col-span-2">Planned Dates</span>
                    <span className="col-span-2">Actual Dates</span>
                    <span>Duration</span>
                    <span>MasterFormat</span>
                    <span className="text-right">Planned Cost</span>
                    <span className="text-right">Actual Cost</span>
                    <span className="text-center">Progress</span>
                    <span className="text-right">Status</span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {wbsLevels.filter(w => !w.parentId).map(rootWbs => (
                    <TableDetailRow 
                      key={rootWbs.id} 
                      wbs={rootWbs} 
                      allWbs={wbsLevels} 
                      activities={activities}
                      boqItems={boqItems}
                      expanded={expandedWbs}
                      purchaseOrders={purchaseOrders}
                      setEditingActivity={setEditingActivity}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {editingActivity && (
          <ActivityAttributesModal 
            activity={editingActivity}
            onClose={() => setEditingActivity(null)}
            onSave={handleSaveAttributes}
            boqItems={boqItems}
            wbsLevels={wbsLevels}
            allActivities={activities}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper Components for Recursive Rendering

interface WbsRowProps {
  wbs: WBSLevel;
  allWbs: WBSLevel[];
  activities: Activity[];
  boqItems: BOQItem[];
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  searchQuery: string;
  viewMode: 'table' | 'gantt';
  purchaseOrders: PurchaseOrder[];
  setEditingActivity: (act: Activity) => void;
}

const WbsRow: React.FC<WbsRowProps> = ({ wbs, allWbs, activities, boqItems, expanded, onToggle, searchQuery, viewMode, purchaseOrders, setEditingActivity }) => {
  const children = allWbs.filter(w => w.parentId === wbs.id);
  const wbsActivities = activities.filter(a => a.wbsId === wbs.id);
  const isExpanded = expanded[wbs.id];

  const activitiesByDivision = useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    wbsActivities.forEach(act => {
      const div = act.division || '01';
      if (!groups[div]) groups[div] = [];
      groups[div].push(act);
    });
    return groups;
  }, [wbsActivities]);

  const activeDivisions = Object.keys(activitiesByDivision).sort();

  if (searchQuery && !wbs.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
      !wbsActivities.some(a => a.description.toLowerCase().includes(searchQuery.toLowerCase()))) {
    return null;
  }

  return (
    <>
      <div 
        className={cn(
          "h-10 flex items-center px-4 cursor-pointer hover:bg-slate-100 transition-colors",
          wbs.level === 1 ? "bg-slate-50/50" : ""
        )}
        style={{ paddingLeft: `${wbs.level * 16}px` }}
        onClick={() => onToggle(wbs.id)}
      >
        {(children.length > 0 || wbsActivities.length > 0) ? (
          isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 mr-2" /> : <ChevronRight className="w-4 h-4 text-slate-400 mr-2" />
        ) : <div className="w-6" />}
        <Database className="w-3.5 h-3.5 text-blue-500 mr-2" />
        <span className="text-xs font-bold text-slate-700 truncate">{wbs.code} {wbs.title}</span>
      </div>
      
      {isExpanded && (
        <>
          {children.map(child => (
            <WbsRow 
              key={child.id} 
              wbs={child} 
              allWbs={allWbs} 
              activities={activities} 
              boqItems={boqItems}
              expanded={expanded} 
              onToggle={onToggle}
              searchQuery={searchQuery}
              viewMode={viewMode}
              purchaseOrders={purchaseOrders}
              setEditingActivity={setEditingActivity}
            />
          ))}
          {activeDivisions.map(divId => {
            const division = masterFormatDivisions.find(d => d.id === divId);
            const divActivities = activitiesByDivision[divId];
            const divKey = `${wbs.id}-${divId}`;
            const isDivExpanded = expanded[divKey] ?? true; // Default to expanded for divisions

            return (
              <React.Fragment key={divKey}>
                <div 
                  className="h-10 flex items-center px-4 bg-slate-50/30 hover:bg-slate-100 transition-colors cursor-pointer"
                  style={{ paddingLeft: `${(wbs.level + 1) * 16}px` }}
                  onClick={() => onToggle(divKey)}
                >
                  {isDivExpanded ? <ChevronDown className="w-3 h-3 text-slate-400 mr-2" /> : <ChevronRight className="w-3 h-3 text-slate-400 mr-2" />}
                  <Database className="w-3 h-3 text-slate-400 mr-2" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {divId} {division?.title || 'Unknown Division'}
                  </span>
                </div>
                
                {isDivExpanded && divActivities.map(act => {
                  const boqItem = boqItems.find(b => b.id === act.boqItemId);
                  return (
                    <div 
                      key={act.id} 
                      className="h-10 flex items-center px-4 bg-white hover:bg-blue-50/30 transition-colors border-l-2 border-transparent hover:border-blue-500 cursor-pointer"
                      style={{ paddingLeft: `${(wbs.level + 2) * 16}px` }}
                      onClick={() => setEditingActivity(act)}
                    >
                      <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-slate-600 truncate">{act.description}</span>
                          {act.predecessorId && <Link2 className="w-2.5 h-2.5 text-slate-400" title="Has Predecessor" />}
                          {act.successorId && <ArrowRight className="w-2.5 h-2.5 text-slate-400" title="Has Successor" />}
                        </div>
                        {boqItem && <span className="text-[8px] text-slate-400 font-mono truncate">{boqItem.division}</span>}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </>
      )}
    </>
  );
};

interface GanttRowProps {
  wbs: WBSLevel;
  allWbs: WBSLevel[];
  activities: Activity[];
  expanded: Record<string, boolean>;
  renderBar: (activity: Activity) => React.ReactNode;
}

const GanttRow: React.FC<GanttRowProps> = ({ wbs, allWbs, activities, expanded, renderBar }) => {
  const children = allWbs.filter(w => w.parentId === wbs.id);
  const wbsActivities = activities.filter(a => a.wbsId === wbs.id);
  const isExpanded = expanded[wbs.id];

  const activitiesByDivision = useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    wbsActivities.forEach(act => {
      const div = act.division || '01';
      if (!groups[div]) groups[div] = [];
      groups[div].push(act);
    });
    return groups;
  }, [wbsActivities]);

  const activeDivisions = Object.keys(activitiesByDivision).sort();

  return (
    <>
      <div className={cn("h-10 border-b border-slate-50", wbs.level === 1 ? "bg-slate-50/50" : "")} />
      {isExpanded && (
        <>
          {children.map(child => (
            <GanttRow key={child.id} wbs={child} allWbs={allWbs} activities={activities} expanded={expanded} renderBar={renderBar} />
          ))}
          {activeDivisions.map(divId => {
            const divActivities = activitiesByDivision[divId];
            const divKey = `${wbs.id}-${divId}`;
            const isDivExpanded = expanded[divKey] ?? true;

            return (
              <React.Fragment key={divKey}>
                {/* Division Header Row in Gantt */}
                <div className="h-10 border-b border-slate-50 bg-slate-50/10" />
                
                {isDivExpanded && divActivities.map(act => (
                  <div key={act.id} className="h-10 flex items-center px-4 bg-white relative">
                    <div className="absolute inset-0 grid grid-cols-[repeat(100,1fr)] pointer-events-none opacity-10">
                      {Array.from({ length: 20 }).map((_, i) => <div key={i} className="border-r border-slate-200" />)}
                    </div>
                    {renderBar(act)}
                  </div>
                ))}
              </React.Fragment>
            );
          })}
        </>
      )}
    </>
  );
};

interface TableDetailRowProps {
  wbs: WBSLevel;
  allWbs: WBSLevel[];
  activities: Activity[];
  boqItems: BOQItem[];
  expanded: Record<string, boolean>;
  purchaseOrders: PurchaseOrder[];
  setEditingActivity: (act: Activity) => void;
}

const TableDetailRow: React.FC<TableDetailRowProps> = ({ wbs, allWbs, activities, boqItems, expanded, purchaseOrders, setEditingActivity }) => {
  const children = allWbs.filter(w => w.parentId === wbs.id);
  const wbsActivities = activities.filter(a => a.wbsId === wbs.id);
  const isExpanded = expanded[wbs.id];

  const activitiesByDivision = useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    wbsActivities.forEach(act => {
      const div = act.division || '01';
      if (!groups[div]) groups[div] = [];
      groups[div].push(act);
    });
    return groups;
  }, [wbsActivities]);

  const activeDivisions = Object.keys(activitiesByDivision).sort();

  const getProgress = (activity: Activity) => {
    if (activity.status === 'Completed') return 100;
    if (activity.status === 'In Progress') return 50;
    const linkedPO = purchaseOrders.find(po => po.id === activity.poId);
    if (linkedPO) {
      const lineItem = linkedPO.lineItems.find(li => li.description === activity.description);
      if (lineItem && lineItem.status === 'Completed') return 100;
      if (lineItem && lineItem.status === 'In Progress') return 50;
    }
    return 0;
  };

  return (
    <>
      <div className={cn("h-10 border-b border-slate-50 flex items-center px-6", wbs.level === 1 ? "bg-slate-50/50" : "")}>
        <div className="grid grid-cols-10 w-full">
          <span className="col-span-2 text-[10px] text-slate-400">-</span>
          <span className="col-span-2 text-[10px] text-slate-400">-</span>
          <span className="text-[10px] text-slate-400">-</span>
          <span className="text-[10px] text-slate-400">-</span>
          <span className="text-[10px] font-bold text-slate-900 text-right">
            {formatCurrency(wbsActivities.reduce((sum, a) => sum + a.amount, 0) + children.reduce((sum, c) => sum + activities.filter(a => a.wbsId === c.id).reduce((s, a) => s + a.amount, 0), 0))}
          </span>
          <span className="text-[10px] font-bold text-emerald-600 text-right">
            {formatCurrency(wbsActivities.reduce((sum, a) => sum + (a.actualAmount || 0), 0))}
          </span>
          <div className="flex justify-center">
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: '0%' }} />
            </div>
          </div>
          <span className="text-right">-</span>
        </div>
      </div>
      {isExpanded && (
        <>
          {children.map(child => (
            <TableDetailRow key={child.id} wbs={child} allWbs={allWbs} activities={activities} boqItems={boqItems} expanded={expanded} purchaseOrders={purchaseOrders} setEditingActivity={setEditingActivity} />
          ))}
          {activeDivisions.map(divId => {
            const divActivities = activitiesByDivision[divId];
            const divKey = `${wbs.id}-${divId}`;
            const isDivExpanded = expanded[divKey] ?? true;

            return (
              <React.Fragment key={divKey}>
                {/* Division Header Row in Table */}
                <div className="h-10 border-b border-slate-50 flex items-center px-6 bg-slate-50/10">
                  <div className="grid grid-cols-10 w-full">
                    <span className="col-span-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Database className="w-3 h-3" />
                      Division {divId} - {masterFormatDivisions.find(d => d.id === divId)?.title}
                    </span>
                    <span className="text-[10px] text-slate-400">-</span>
                    <span className="text-[10px] text-slate-400">-</span>
                    <span className="text-right font-bold text-slate-400">
                      {formatCurrency(divActivities.reduce((sum, a) => sum + a.amount, 0))}
                    </span>
                    <span className="text-right font-bold text-emerald-400">
                      {formatCurrency(divActivities.reduce((sum, a) => sum + (a.actualAmount || 0), 0))}
                    </span>
                    <span className="text-center">-</span>
                    <span className="text-right">-</span>
                  </div>
                </div>

                {isDivExpanded && divActivities.map(act => {
                  return (
                    <div 
                      key={act.id} 
                      className="h-10 flex items-center px-6 bg-white hover:bg-blue-50/30 transition-colors cursor-pointer"
                      onClick={() => setEditingActivity(act)}
                    >
                      <div className="grid grid-cols-10 w-full text-[11px] text-slate-600 items-center">
                        <span className="col-span-2 font-mono text-[9px]">{act.startDate || 'TBD'} - {act.finishDate || 'TBD'}</span>
                        <span className="col-span-2 font-mono text-[9px] text-emerald-600">
                          {act.actualStartDate ? `${act.actualStartDate} - ${act.actualFinishDate || '...'}` : 'Not Started'}
                        </span>
                        <span className="font-bold">{act.duration || 0}d</span>
                        <span className="text-[9px] text-slate-400 truncate">{act.division || '01'}</span>
                        <span className="text-right font-bold text-slate-900">{formatCurrency(act.amount)}</span>
                        <span className="text-right font-bold text-emerald-600">{formatCurrency(act.actualAmount || 0)}</span>
                        <div className="flex flex-col items-center justify-center gap-1">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all" style={{ width: `${getProgress(act)}%` }} />
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                            act.status === 'Completed' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                          )}>
                            {act.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </>
      )}
    </>
  );
};
