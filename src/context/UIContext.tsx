import React, { createContext, useContext, useState } from 'react';

import { DomainId, FocusAreaId } from '../constants/navigation';

interface UIContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  selectedDomain: DomainId | null;
  setSelectedDomain: (id: DomainId | null) => void;
  selectedFocusArea: FocusAreaId;
  setSelectedFocusArea: (id: FocusAreaId) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [sidebarWidth, setSidebarWidth] = useState(80);
  const [selectedDomain, setSelectedDomain] = useState<DomainId | null>(null);
  const [selectedFocusArea, setSelectedFocusArea] = useState<FocusAreaId>('Planning');

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <UIContext.Provider value={{ 
      isSidebarOpen, 
      toggleSidebar, 
      closeSidebar,
      sidebarWidth,
      setSidebarWidth,
      selectedDomain,
      setSelectedDomain,
      selectedFocusArea,
      setSelectedFocusArea
    }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
