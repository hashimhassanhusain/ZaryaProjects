import React, { useState, useEffect } from 'react';
import { Calendar, Users, Plus, Search, FileText, UserPlus, CheckCircle2, Clock, ArrowRight, User, Trash2, Save, Loader2 } from 'lucide-react';
import { Meeting, MeetingMinute, User as UserType, Task } from '../types';
import { initialMeetings, users, currentUser, workspaces } from '../data';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { db, OperationType, handleFirestoreError, auth } from '../firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { useProject } from '../context/ProjectContext';

export const MeetingsView: React.FC = () => {
  const { selectedProject } = useProject();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [dbUsers, setDbUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [isAddingMeeting, setIsAddingMeeting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newMeeting, setNewMeeting] = useState<Partial<Meeting>>({
    topic: '',
    date: new Date().toISOString().split('T')[0],
    attendeeIds: [currentUser.uid],
    minutes: [],
  });

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserType));
      setDbUsers(usersList);
    });

    return () => unsubscribeUsers();
  }, []);

  useEffect(() => {
    if (!selectedProject) return;

    const q = query(
      collection(db, 'meetings'),
      where('projectId', '==', selectedProject.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Meeting[];
      setMeetings(data);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'meetings');
    });

    return () => unsubscribe();
  }, [selectedProject?.id]);

  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId);

  const handleAddMeeting = async () => {
    if (!newMeeting.topic || !selectedProject) return;
    setIsSaving(true);
    try {
      const meetingData = {
        ...newMeeting,
        projectId: selectedProject.id,
        minutes: []
      };
      const docRef = await addDoc(collection(db, 'meetings'), meetingData);
      setIsAddingMeeting(false);
      setSelectedMeetingId(docRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'meetings');
    } finally {
      setIsSaving(false);
    }
  };

  const addMinute = async (meetingId: string) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting) return;

    try {
      const newMinute: MeetingMinute = {
        id: 'min' + Date.now(),
        text: '',
      };
      await updateDoc(doc(db, 'meetings', meetingId), {
        minutes: [...meeting.minutes, newMinute]
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'meetings');
    }
  };

  const updateMinuteText = async (meetingId: string, minuteId: string, text: string) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting) return;

    try {
      const updatedMinutes = meeting.minutes.map(min => 
        min.id === minuteId ? { ...min, text } : min
      );
      await updateDoc(doc(db, 'meetings', meetingId), {
        minutes: updatedMinutes
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'meetings');
    }
  };

  const assignMinuteToUser = async (meetingId: string, minuteId: string, userId: string) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (!meeting || !selectedProject) return;

    const minute = meeting.minutes.find(min => min.id === minuteId);
    if (!minute) return;

    try {
      // Create a real task in Firestore
      const taskData: Partial<Task> = {
        title: `[Meeting Action] ${meeting.topic}`,
        description: minute.text,
        status: 'TO DO',
        assigneeId: userId,
        workspaceId: workspaces[0].id, // Default workspace
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 1 week
        priority: 'Medium',
        sourceType: 'meeting',
        sourceId: meetingId,
        projectId: selectedProject.id as any,
        history: [{ 
          id: 'h' + Date.now(), 
          userId: currentUser.uid, 
          action: `Created from meeting: ${meeting.topic}`, 
          timestamp: new Date().toLocaleString('en-US') 
        }]
      };

      const taskRef = await addDoc(collection(db, 'tasks'), taskData);

      // Update the minute with assigned user and task ID
      const updatedMinutes = meeting.minutes.map(min => {
        if (min.id === minuteId) {
          return { ...min, assignedToId: userId, taskId: taskRef.id };
        }
        return min;
      });

      await updateDoc(doc(db, 'meetings', meetingId), {
        minutes: updatedMinutes
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'meetings');
    }
  };

  const getAttendee = (id: string) => dbUsers.find(u => u.uid === id) || users.find(u => u.uid === id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left: Meetings List */}
      <div className="lg:col-span-1 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Meetings</h2>
          <button 
            onClick={() => setIsAddingMeeting(true)}
            className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {meetings.map(meeting => (
            <button
              key={meeting.id}
              onClick={() => setSelectedMeetingId(meeting.id)}
              className={cn(
                "w-full text-left p-4 rounded-2xl border transition-all group",
                selectedMeetingId === meeting.id 
                  ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-200" 
                  : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-md"
              )}
            >
              <div className={cn(
                "text-[10px] font-bold uppercase tracking-widest mb-1",
                selectedMeetingId === meeting.id ? "text-blue-100" : "text-slate-400"
              )}>
                {meeting.date}
              </div>
              <h3 className={cn(
                "font-bold text-sm mb-3",
                selectedMeetingId === meeting.id ? "text-white" : "text-slate-800"
              )}>
                {meeting.topic}
              </h3>
              <div className="flex -space-x-2">
                {meeting.attendeeIds.slice(0, 3).map(id => (
                  <img 
                    key={id}
                    src={getAttendee(id)?.photoURL} 
                    className={cn(
                      "w-6 h-6 rounded-full border-2",
                      selectedMeetingId === meeting.id ? "border-blue-600" : "border-white"
                    )}
                    alt="" 
                  />
                ))}
                {meeting.attendeeIds.length > 3 && (
                  <div className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center text-[8px] font-bold",
                    selectedMeetingId === meeting.id ? "border-blue-600 bg-blue-500 text-white" : "border-white bg-slate-100 text-slate-500"
                  )}>
                    +{meeting.attendeeIds.length - 3}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Meeting Details & Minutes */}
      <div className="lg:col-span-2">
        <AnimatePresence mode="wait">
          {selectedMeeting ? (
            <motion.div 
              key={selectedMeeting.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                      <Calendar className="w-4 h-4" />
                      {selectedMeeting.date}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">{selectedMeeting.topic}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Attendees:</div>
                  <div className="flex items-center gap-2">
                    {selectedMeeting.attendeeIds.map(id => (
                      <div key={id} className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                        <img src={getAttendee(id)?.photoURL} className="w-5 h-5 rounded-full" alt="" />
                        <span className="text-xs font-bold text-slate-600">{getAttendee(id)?.name}</span>
                      </div>
                    ))}
                    <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-all">
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50/30">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Meeting Minutes
                  </h3>
                  <button 
                    onClick={() => addMinute(selectedMeeting.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Point
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedMeeting.minutes.map((minute, idx) => (
                    <div key={minute.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div className="flex-1 space-y-4">
                          <textarea 
                            value={minute.text}
                            onChange={(e) => updateMinuteText(selectedMeeting.id, minute.id, e.target.value)}
                            placeholder="Type discussion point or action item..."
                            className="w-full bg-transparent border-none focus:ring-0 text-slate-700 font-medium placeholder:text-slate-300 resize-none p-0"
                            rows={2}
                          />
                          
                          <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                            <div className="flex items-center gap-3">
                              {minute.assignedToId ? (
                                <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold border border-green-100">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Assigned to {getAttendee(minute.assignedToId)?.name}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assign to:</span>
                                  <div className="flex items-center gap-1">
                                    {selectedMeeting.attendeeIds.map(id => (
                                      <button 
                                        key={id}
                                        onClick={() => assignMinuteToUser(selectedMeeting.id, minute.id, id)}
                                        title={getAttendee(id)?.name}
                                        className="w-7 h-7 rounded-full border-2 border-white hover:border-blue-500 transition-all overflow-hidden"
                                      >
                                        <img src={getAttendee(id)?.photoURL} className="w-full h-full object-cover" alt="" />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            {minute.taskId && (
                              <div className="flex items-center gap-1 text-blue-600 text-[10px] font-bold uppercase tracking-widest">
                                Task Created
                                <ArrowRight className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {selectedMeeting.minutes.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-100">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-slate-400 font-medium">No minutes recorded yet.</p>
                      <button 
                        onClick={() => addMinute(selectedMeeting.id)}
                        className="mt-4 text-blue-600 font-bold text-sm hover:underline"
                      >
                        Start recording minutes
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-24 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6">
                <Calendar className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Select a Meeting</h3>
              <p className="text-slate-500 text-center max-w-xs">Choose a meeting from the list to view details and record minutes.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Meeting Modal */}
      <AnimatePresence>
        {isAddingMeeting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingMeeting(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Schedule New Meeting</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Topic</label>
                    <input 
                      type="text" 
                      value={newMeeting.topic}
                      onChange={(e) => setNewMeeting({ ...newMeeting, topic: e.target.value })}
                      placeholder="e.g. Weekly Progress Review"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Date</label>
                    <input 
                      type="date" 
                      value={newMeeting.date}
                      onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Attendees</label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100">
                      {dbUsers.map(u => (
                        <label key={u.uid} className="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer transition-all">
                          <input 
                            type="checkbox" 
                            checked={newMeeting.attendeeIds?.includes(u.uid)}
                            onChange={(e) => {
                              const ids = newMeeting.attendeeIds || [];
                              if (e.target.checked) {
                                setNewMeeting({ ...newMeeting, attendeeIds: [...ids, u.uid] });
                              } else {
                                setNewMeeting({ ...newMeeting, attendeeIds: ids.filter(id => id !== u.uid) });
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <img src={u.photoURL} className="w-5 h-5 rounded-full" alt="" />
                          <span className="text-xs font-medium text-slate-700">{u.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex justify-end gap-3">
                <button 
                  onClick={() => setIsAddingMeeting(false)}
                  className="px-6 py-2.5 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddMeeting}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Meeting
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
