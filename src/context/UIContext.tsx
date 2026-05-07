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
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  isRibbonCollapsed: boolean;
  setIsRibbonCollapsed: (collapsed: boolean) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [sidebarWidth, setSidebarWidth] = useState(80);
  const [selectedDomain, setSelectedDomain] = useState<DomainId | null>(null);
  const [selectedFocusArea, setSelectedFocusArea] = useState<FocusAreaId>('Planning');
  const [favorites, setFavorites] = useState<string[]>(['3.6.3', '3.6.4', '2.4.1']);
  const [isRibbonCollapsed, setIsRibbonCollapsed] = useState(false);
  const [theme] = useState<'light' | 'dark'>('light');

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const toggleTheme = () => {
    // Theme is locked to light
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      return next;
    });
  };

  const isFavorite = (id: string) => favorites.includes(id);

  React.useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }, []);

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
      setSelectedFocusArea,
      favorites,
      toggleFavorite,
      isFavorite,
      isRibbonCollapsed,
      setIsRibbonCollapsed,
      theme,
      toggleTheme
    }}>
      <div className={theme}>
        {children}
      </div>
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
