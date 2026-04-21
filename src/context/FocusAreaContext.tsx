import React, { createContext, useContext, useState } from 'react';

export type FocusArea = 'Initiating' | 'Planning' | 'Executing' | 'Monitoring & Controlling' | 'Closing';

interface FocusAreaContextType {
  activeFocusArea: FocusArea;
  setActiveFocusArea: (fa: FocusArea) => void;
}

const FocusAreaContext = createContext<FocusAreaContextType>({
  activeFocusArea: 'Planning',
  setActiveFocusArea: () => {},
});

export const FocusAreaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeFocusArea, setActiveFocusArea] = useState<FocusArea>('Planning');
  return (
    <FocusAreaContext.Provider value={{ activeFocusArea, setActiveFocusArea }}>
      {children}
    </FocusAreaContext.Provider>
  );
};

export const useFocusArea = () => useContext(FocusAreaContext);
