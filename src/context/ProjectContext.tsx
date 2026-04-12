import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project } from '../types';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface ProjectContextType {
  selectedProject: Project | null;
  setSelectedProject: (project: Project) => void;
  projects: Project[];
  loading: boolean;
  scheduleState: {
    expandedWbs: Record<string, boolean>;
    expandedActivities: Record<string, boolean>;
    zoomLevel: string;
    viewLevel: string;
    visibleColumns: Record<string, boolean>;
  };
  setScheduleState: React.Dispatch<React.SetStateAction<{
    expandedWbs: Record<string, boolean>;
    expandedActivities: Record<string, boolean>;
    zoomLevel: string;
    viewLevel: string;
    visibleColumns: Record<string, boolean>;
  }>>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleState, setScheduleState] = useState({
    expandedWbs: {} as Record<string, boolean>,
    expandedActivities: {} as Record<string, boolean>,
    zoomLevel: 'month',
    viewLevel: 'masterformat',
    visibleColumns: {
      plannedStart: true,
      plannedDuration: true,
      plannedFinish: true,
      actualStart: true,
      actualDuration: true,
      actualFinish: true,
      progress: true,
      supplier: true,
      plannedCost: true,
      poCost: true,
      actualCost: true
    }
  });
  const [selectedProject, setSelectedProjectState] = useState<Project | null>(() => {
    const saved = localStorage.getItem('selectedProject');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'projects'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      
      setProjects(projectsData);
      
      // Sync selectedProject with the latest data from Firestore
      setSelectedProjectState(current => {
        if (projectsData.length === 0) return null;
        
        // If we have a current selection, try to find it in the new data
        if (current) {
          const updated = projectsData.find(p => p.id === current.id);
          if (updated) {
            // Update the stored version too in case names/codes changed
            localStorage.setItem('selectedProject', JSON.stringify(updated));
            return updated;
          }
        }
        
        // If no current selection or it was deleted, pick the first one
        const defaultProject = projectsData[0];
        localStorage.setItem('selectedProject', JSON.stringify(defaultProject));
        return defaultProject;
      });
      
      setLoading(false);
    }, (error) => {
      console.error("Error fetching projects:", error);
      handleFirestoreError(error, OperationType.LIST, 'projects');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []); // Empty dependency array for a single stable listener

  const setSelectedProject = (project: Project) => {
    setSelectedProjectState(project);
    localStorage.setItem('selectedProject', JSON.stringify(project));
  };

  return (
    <ProjectContext.Provider value={{ 
      selectedProject, 
      setSelectedProject, 
      projects, 
      loading,
      scheduleState,
      setScheduleState
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
