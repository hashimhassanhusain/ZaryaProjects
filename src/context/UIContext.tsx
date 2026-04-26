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
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [sidebarWidth, setSidebarWidth] = useState(80);
  const [selectedDomain, setSelectedDomain] = useState<DomainId | null>(null);
  const [selectedFocusArea, setSelectedFocusArea] = useState<FocusAreaId>('Planning');
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('zarya_favorites');
    return saved ? JSON.parse(saved) : ['3.6.3', '3.6.4', '2.4.1'];
  });

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem('zarya_favorites', JSON.stringify(next));
      return next;
    });
  };

  const isFavorite = (id: string) => favorites.includes(id);

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
      isFavorite
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
