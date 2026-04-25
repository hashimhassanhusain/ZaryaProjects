import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

interface HelpTooltipProps {
  children: React.ReactNode;
  text: string;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  showArrow?: boolean;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({ 
  children, 
  text, 
  className, 
  position = 'bottom',
  showArrow = true
}) => {
  const { isHelpRtl } = useLanguage();
  const [isVisible, setIsVisible] = React.useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-3';
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-3';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-3';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-3';
      default:
        return 'top-full left-1/2 -translate-x-1/2 mt-3';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'top-full left-1/2 -translate-x-1/2 border-t-slate-900';
      case 'bottom':
        return 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900';
      case 'left':
        return 'left-full top-1/2 -translate-y-1/2 border-l-slate-900';
      case 'right':
        return 'right-full top-1/2 -translate-y-1/2 border-r-slate-900';
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900';
    }
  };

  return (
    <div 
      className="relative inline-block group"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: position === 'top' ? 5 : position === 'bottom' ? -5 : 0, x: position === 'left' ? 5 : position === 'right' ? -5 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: position === 'top' ? 5 : position === 'bottom' ? -5 : 0, x: position === 'left' ? 5 : position === 'right' ? -5 : 0 }}
            className={cn(
              "absolute z-[9999] w-64 p-3 bg-slate-900/98 backdrop-blur-xl text-white rounded-xl shadow-2xl border border-white/10 pointer-events-none",
              getPositionClasses(),
              className
            )}
          >
            <div className={cn(
              "text-[10px] leading-relaxed font-medium",
              isHelpRtl ? "text-right font-arabic" : "text-left"
            )}>
              {text}
            </div>
            {showArrow && (
              <div className={cn(
                "absolute border-8 border-transparent",
                getArrowClasses()
              )} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
