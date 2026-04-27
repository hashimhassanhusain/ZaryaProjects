import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Project, UserProject, Company } from '../types';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { useAuth } from './UserContext';
import { toSlug } from '../lib/utils';

interface ProjectContextType {
  selectedProject: Project | null;
  setSelectedProject: (project: Project) => void;
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company) => void;
  projects: Project[];
  companies: Company[];
  loading: boolean;
  resolveContext: (companySlug: string, projectSlug: string) => void;
  getPath: (domainSlug: string, pageSlug: string) => string;
  scheduleState: any; 
  setScheduleState: React.Dispatch<React.SetStateAction<any>>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, isAdmin } = useAuth();
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [userProjects, setUserProjects] = useState<UserProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(null);
  
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

  // Listen to ALL companies
  useEffect(() => {
    const q = query(collection(db, 'companies'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
      setAllCompanies(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'companies');
    });
    return () => unsubscribe();
  }, []);

  // Listen to ALL projects (Admin or base for filtering)
  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      setAllProjects(projectsData);
      if (isAdmin) setLoading(false);
    }, (error) => {
      console.error("Error fetching projects:", error);
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // Listen to user's assigned projects in 'userProjects' collection
  useEffect(() => {
    if (!userProfile || isAdmin) return;

    const q = query(collection(db, 'userProjects'), where('userId', '==', userProfile.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const assignments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserProject[];
      setUserProjects(assignments);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching user projects:", error);
      handleFirestoreError(error, OperationType.LIST, 'userProjects');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile, isAdmin]);

  // Derived list of accessible projects
  const accessibleProjects = useMemo(() => {
    const base = isAdmin ? allProjects : (() => {
      const assignedIds = new Set(userProjects.map(up => up.projectId));
      if (userProfile?.accessibleProjects) {
        userProfile.accessibleProjects.forEach(id => assignedIds.add(id));
      }
      return allProjects.filter(p => assignedIds.has(p.id));
    })();
    
    if (selectedCompany) {
      return base.filter(p => p.companyId === selectedCompany.id);
    }
    
    return base;
  }, [allProjects, userProjects, isAdmin, userProfile, selectedCompany]);

  // Derived list of accessible companies
  const accessibleCompanies = useMemo(() => {
    if (isAdmin) return allCompanies;
    const companyIds = new Set(accessibleProjects.map(p => p.companyId));
    return allCompanies.filter(c => companyIds.has(c.id));
  }, [allCompanies, accessibleProjects, isAdmin]);

  // Resolve Context from Slugs
  const resolveContext = (companySlug: string, projectSlug: string) => {
    const company = allCompanies.find(c => c.slug === companySlug || toSlug(c.name) === companySlug);
    const project = allProjects.find(p => p.slug === projectSlug || toSlug(p.name) === projectSlug);

    if (company) setSelectedCompanyState(company);
    if (project) {
      setSelectedProjectState(project);
      localStorage.setItem('selectedProject', JSON.stringify(project));
    }
  };

  const setSelectedProject = (project: Project) => {
    setSelectedProjectState(project);
    localStorage.setItem('selectedProject', JSON.stringify(project));
  };

  const setSelectedCompany = (company: Company) => {
    setSelectedCompanyState(company);
  };

  const getPath = (domainSlug: string, pageSlug: string) => {
    const compSlug = selectedCompany?.slug || toSlug(selectedCompany?.name || 'unknown');
    const projSlug = selectedProject?.slug || (selectedProject?.name ? toSlug(selectedProject.name) : 'unknown');
    return `/${compSlug}/${projSlug}/${domainSlug}/${pageSlug}`;
  };

  return (
    <ProjectContext.Provider value={{ 
      selectedProject, 
      setSelectedProject, 
      selectedCompany,
      setSelectedCompany,
      projects: accessibleProjects, 
      companies: accessibleCompanies,
      loading,
      resolveContext,
      getPath,
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
