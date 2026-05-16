import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Option {
  id: string;
  name: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string; // The ID or Name depending on usage
  onChange: (value: string, name?: string) => void;
  placeholder?: string;
  valueIsName?: boolean; // If true, value is matched against name, else id
  className?: string;
  disabled?: boolean;
  onAddClick?: () => void;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options, value, onChange, placeholder = "Select...", valueIsName = false, className, disabled, onAddClick
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));
  
  const selectedOption = valueIsName 
    ? options.find(o => o.name === value)
    : options.find(o => o.id === value);

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      <div 
        className={cn(
          "flex items-center justify-between w-full min-h-[48px] px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold cursor-pointer transition-all",
          isOpen ? "bg-white ring-2 ring-blue-500/20 border-blue-200" : "hover:bg-slate-100",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={cn("truncate", !selectedOption && "text-slate-400 capitalize")}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-slate-50/50 relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-4 py-2 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:bg-slate-100 transition-colors"
                  onClick={e => e.stopPropagation()}
                />
              </div>
              {onAddClick && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddClick();
                  }}
                  className="p-1 px-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  title="Add New"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="max-h-60 overflow-y-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-xs font-bold text-slate-400">No results found</div>
              ) : (
                filteredOptions.map(option => {
                  const isSelected = valueIsName ? option.name === value : option.id === value;
                  return (
                    <div
                      key={option.id}
                      className={cn(
                        "flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl cursor-pointer transition-colors",
                        isSelected ? "bg-blue-50 text-blue-600" : "hover:bg-slate-50 text-slate-700"
                      )}
                      onClick={() => {
                        onChange(valueIsName ? option.name : option.id, option.name);
                        setIsOpen(false);
                        setSearch('');
                      }}
                    >
                      <span className="truncate">{option.name}</span>
                      {isSelected && <Check className="w-4 h-4" />}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
