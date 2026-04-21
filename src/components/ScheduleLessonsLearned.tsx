import React from 'react';
import { Page } from '../types';
import { LessonsLearnedView } from './LessonsLearnedView';

interface ScheduleLessonsLearnedProps {
  page: Page;
}

export const ScheduleLessonsLearned: React.FC<ScheduleLessonsLearnedProps> = ({ page }) => {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 p-8 rounded-[2rem] flex items-center justify-between">
         <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 tracking-tight italic">Time Performance Knowledge Transfer</h2>
            <p className="text-sm text-blue-600 font-medium">Capturing schedule-specific insights to improve future project durations.</p>
         </div>
      </div>
      <LessonsLearnedView page={page} />
    </div>
  );
};
