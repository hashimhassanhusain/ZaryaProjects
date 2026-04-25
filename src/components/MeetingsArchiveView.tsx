import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Search, 
  Plus, 
  Printer, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  MoreHorizontal,
  FileText,
  TrendingUp,
  Download
} from 'lucide-react';
import { Meeting, Project } from '../types';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

interface MeetingsArchiveViewProps {
  project: Project;
  onNewMeeting: () => void;
  onViewMeeting: (meeting: Meeting) => void;
}

export const MeetingsArchiveView: React.FC<MeetingsArchiveViewProps> = ({ project, onNewMeeting, onViewMeeting }) => {
  const { t, isRtl } = useLanguage();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'meetings'),
      where('projectId', '==', project.id),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Meeting)));
    });

    return () => unsubscribe();
  }, [project.id]);

  const filteredMeetings = meetings.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         m.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.agenda.some(a => a.topic.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'All' || m.type === filterType;
    const matchesDate = !selectedDate || m.date === selectedDate;
    return matchesSearch && matchesType && matchesDate;
  });

  const meetingTypes = ['all', 'risk_management', 'technical_review', 'owner_meeting', 'general', 'kick_off', 'progress'];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'risk_management': return 'bg-rose-500';
      case 'technical_review': return 'bg-blue-500';
      case 'owner_meeting': return 'bg-amber-500';
      case 'kick_off': return 'bg-emerald-500';
      case 'progress': return 'bg-indigo-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className={cn("text-3xl font-semibold text-slate-900 tracking-tight flex items-center gap-3", isRtl && "flex-row-reverse")}>
            <Calendar className="w-8 h-8 text-blue-600" />
            {t('meetings')} <span className="text-slate-300 font-light">|</span> <span className="text-blue-600">{t('archive')}</span>
          </h1>
          <p className={cn("text-slate-500 mt-1 font-medium", isRtl && "text-right")}>{t('meetings_desc')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {}} 
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
            title="Bulk Print PDF"
          >
            <Printer className="w-5 h-5" />
          </button>
          <button 
            onClick={onNewMeeting}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
          >
            <Plus className="w-5 h-5" />
            {t('new_meeting')}
          </button>
        </div>
      </div>

      {/* Timeline & Filters */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder={t('search_meetings_placeholder')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
            />
          </div>
              <div className="flex items-center gap-3 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
                {meetingTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all",
                      filterType === type 
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" 
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    )}
                  >
                    {t(type)}
                  </button>
                ))}
              </div>
        </div>

        {/* Mini Timeline View */}
        <div className={cn("flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar border-t border-slate-50 pt-6", isRtl && "flex-row-reverse")}>
          <div className={cn("flex items-center gap-2 shrink-0 px-4", isRtl ? "border-l border-slate-100" : "border-r border-slate-100")}>
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{t('timeline')}</span>
          </div>
          {Array.from({ length: 14 }).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const hasMeeting = meetings.some(m => m.date === dateStr);
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
                className={cn(
                  "flex flex-col items-center gap-1 min-w-[60px] p-2 rounded-xl transition-all",
                  selectedDate === dateStr ? "bg-blue-50 border border-blue-100" : "hover:bg-slate-50",
                  hasMeeting && !selectedDate && "relative after:absolute after:bottom-1 after:w-1 after:h-1 after:bg-blue-500 after:rounded-full"
                )}
              >
                <span className="text-[10px] font-bold text-slate-400">{date.toLocaleDateString(isRtl ? 'ar-SA' : 'en-US', { weekday: 'short' })}</span>
                <span className="text-sm font-semibold text-slate-700">{date.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Meeting Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredMeetings.map((meeting) => (
            <motion.div
              key={meeting.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => onViewMeeting(meeting)}
              className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all cursor-pointer overflow-hidden flex flex-col"
            >
              {/* Card Header */}
              <div className={cn("h-2 w-full", getTypeColor(meeting.type))} />
              <div className="p-6 space-y-4 flex-1">
                <div className="flex items-start justify-between">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest text-white",
                    getTypeColor(meeting.type)
                  )}>
                    {t(meeting.type)}
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">{meeting.time}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {meeting.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{new Date(meeting.date).toLocaleDateString(isRtl ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-medium line-clamp-1">{meeting.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-medium">{meeting.attendeeIds.length}</span>
                  </div>
                </div>

                <p className={cn("text-xs text-slate-500 line-clamp-2 font-medium leading-relaxed", isRtl && "text-right")}>
                  {meeting.notes || t('no_notes_provided')}
                </p>

                {/* Meeting Health Indicator */}
                <div className="pt-4 border-t border-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{t('meeting_health')}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-600">{meeting.meetingHealth || 0}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${meeting.meetingHealth || 0}%` }}
                      className="h-full bg-blue-600 rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {meeting.attendeeIds.slice(0, 3).map((id, i) => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600">
                      {id.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {meeting.attendeeIds.length > 3 && (
                    <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400">
                      +{meeting.attendeeIds.length - 3}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                  <ChevronRight className={cn("w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all", isRtl && "rotate-180")} />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredMeetings.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
            <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">{t('no_meetings_found')}</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-1">{t('adjust_filters_hint')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
