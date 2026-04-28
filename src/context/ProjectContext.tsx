import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, Company } from '../types';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';

interface ProjectContextType {
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  selectedCompanyId: string;
  setSelectedCompanyId: (id: string) => void;
  selectedInstitutionId: string;
  setSelectedInstitutionId: (id: string) => void;
  projects: Project[];
  companies: Company[];
  loading: boolean;
  scheduleState: {
    expandedWbs: Record<string, boolean>;
    expandedActivities: Record<string, boolean>;
    zoomLevel: string;
    viewLevel: string;
    visibleColumns: Record<string, boolean>;
    columnOrder: string[];
  };
  setScheduleState: React.Dispatch<React.SetStateAction<{
    expandedWbs: Record<string, boolean>;
    expandedActivities: Record<string, boolean>;
    zoomLevel: string;
    viewLevel: string;
    visibleColumns: Record<string, boolean>;
    columnOrder: string[];
  }>>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string>('');
  const [selectedInstitutionId, setSelectedInstitutionIdState] = useState<string>('');

  const [scheduleState, setScheduleState] = useState({
    expandedWbs: {} as Record<string, boolean>,
    expandedActivities: {} as Record<string, boolean>,
    zoomLevel: 'month',
    viewLevel: 'costaccount',
    visibleColumns: {
      plannedStart: true,
      plannedDuration: true,
      plannedFinish: true,
      actualStart: true,
      actualDuration: true,
      actualFinish: true,
      progress: true,
      status: true,
      supplier: false,
      plannedCost: true,
      poCost: false,
      actualCost: false
    },
    columnOrder: ['status', 'plannedStart', 'plannedFinish', 'plannedDuration', 'actualStart', 'actualFinish', 'actualDuration', 'progress', 'plannedCost', 'supplier', 'poCost', 'actualCost']
  });

  const [selectedProject, setSelectedProjectState] = useState<Project | null>(null);

  useEffect(() => {
    setLoading(true);
    const qComp = query(collection(db, 'companies'), orderBy('name'));
    const unsubscribeComp = onSnapshot(qComp, (snapshot) => {
      setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company)));
    });

    const qProj = query(collection(db, 'projects'), orderBy('name'));
    const unsubscribeProj = onSnapshot(qProj, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      
      setProjects(projectsData);
      
      // Sync selectedProject with the latest data from Firestore
      setSelectedProjectState(current => {
        if (projectsData.length === 0) return null;
        if (current) {
          const updated = projectsData.find(p => p.id === current.id);
          if (updated) {
            return updated;
          }
        }
        return null;
      });
      
      setLoading(false);
    }, (error) => {
      console.error("Error fetching projects:", error);
      handleFirestoreError(error, OperationType.LIST, 'projects');
      setLoading(false);
    });

    return () => {
      unsubscribeComp();
      unsubscribeProj();
    };
  }, []);

  const setSelectedProject = (project: Project | null) => {
    setSelectedProjectState(project);
    if (project) {
      // Optionally auto-select company/institution
      if (project.companyId) {
        setSelectedCompanyId(project.companyId);
        const comp = companies.find(c => c.id === project.companyId);
        if (comp?.parent_entity_id) {
          setSelectedInstitutionId(comp.parent_entity_id);
        }
      }
    }
  };

  const setSelectedCompanyId = (id: string) => {
    setSelectedCompanyIdState(id);
  };

  const setSelectedInstitutionId = (id: string) => {
    setSelectedInstitutionIdState(id);
  };

  return (
    <ProjectContext.Provider value={{ 
      selectedProject, 
      setSelectedProject, 
      selectedCompanyId,
      setSelectedCompanyId,
      selectedInstitutionId,
      setSelectedInstitutionId,
      projects, 
      companies,
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
