import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
  };

  useEffect(() => {
    if (isVisible) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isVisible]);

  const getPositionStyles = () => {
    if (!triggerRef.current) return {};
    const rect = triggerRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    switch (position) {
      case 'top':
        return {
          top: rect.top + scrollY,
          left: rect.left + scrollX + rect.width / 2,
          transform: 'translate(-50%, -100%) translateY(-12px)',
        };
      case 'bottom':
        return {
          top: rect.bottom + scrollY,
          left: rect.left + scrollX + rect.width / 2,
          transform: 'translate(-50%, 0) translateY(12px)',
        };
      case 'left':
        return {
          top: rect.top + scrollY + rect.height / 2,
          left: rect.left + scrollX,
          transform: 'translate(-100%, -50%) translateX(-12px)',
        };
      case 'right':
        return {
          top: rect.top + scrollY + rect.height / 2,
          left: rect.right + scrollX,
          transform: 'translate(0, -50%) translateX(12px)',
        };
      default:
        return {};
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

  const tooltipContent = (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          style={{
            position: 'absolute',
            zIndex: 99999,
            ...getPositionStyles(),
          }}
          className={cn(
            "w-64 p-3 bg-slate-900/98 backdrop-blur-xl text-white rounded-xl shadow-2xl border border-white/10 pointer-events-none",
            className
          )}
        >
          <div className={cn(
            "leading-relaxed font-medium",
            isHelpRtl ? "text-right font-arabic text-[13px]" : "text-left text-[11px]"
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
  );

  return (
    <div 
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {typeof document !== 'undefined' && createPortal(tooltipContent, document.body)}
    </div>
  );
};
