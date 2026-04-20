import { Page, User, Project, Workspace, Task, Meeting, BOQItem, PurchaseOrder } from './types';

export const currentUser: User = {
  uid: 'u1',
  name: 'Hashim Husain',
  email: 'hashim.h.husain@gmail.com',
  photoURL: 'https://picsum.photos/seed/hashim/200',
  role: 'admin',
  accessiblePages: [],
  accessibleProjects: []
};

export const users: User[] = [
  currentUser,
  { uid: 'u2', name: 'Ahmed Hassan', email: 'ahmed@zarya.com', photoURL: 'https://picsum.photos/seed/ahmed/200', role: 'engineer', accessiblePages: [], accessibleProjects: [] },
  { uid: 'u3', name: 'Sarah Jones', email: 'sarah@zarya.com', photoURL: 'https://picsum.photos/seed/sarah/200', role: 'engineer', accessiblePages: [], accessibleProjects: [] },
  { uid: 'u4', name: 'Michael Chen', email: 'michael@zarya.com', photoURL: 'https://picsum.photos/seed/michael/200', role: 'engineer', accessiblePages: [], accessibleProjects: [] },
];

export const workspaces: Workspace[] = [
  { id: 'w1', name: 'Engineering Team', description: 'Technical design and engineering tasks.', memberIds: ['u1', 'u2', 'u3'] },
  { id: 'w2', name: 'Operations', description: 'Site operations and logistics.', memberIds: ['u1', 'u4'] },
];

export const initialTasks: Task[] = [
  { 
    id: 't1', 
    title: 'Site Survey - Block A', 
    description: 'Complete the initial site survey for Block A foundations. This includes soil testing and boundary marking.', 
    status: 'IN PROGRESS', 
    assigneeId: 'u1', 
    workspaceId: 'w1', 
    startDate: '2026-04-01', 
    endDate: '2026-04-05', 
    priority: 'High',
    history: [
      { id: 'h1', userId: 'u1', action: 'Created the task', timestamp: '2026-04-01 09:00' },
      { id: 'h2', userId: 'u1', action: 'Changed status to In Progress', timestamp: '2026-04-01 10:30' },
      { id: 'h3', userId: 'u2', action: 'Added a comment: "Soil samples collected"', timestamp: '2026-04-02 14:00' },
    ]
  },
  { 
    id: 't2', 
    title: 'Procurement List Review', 
    description: 'Review the list of materials needed for next month. Focus on cement and steel reinforcement.', 
    status: 'TO DO', 
    assigneeId: 'u2', 
    workspaceId: 'w1', 
    startDate: '2026-04-03', 
    endDate: '2026-04-07', 
    priority: 'Medium',
    history: [
      { id: 'h4', userId: 'u1', action: 'Created the task', timestamp: '2026-04-01 11:00' },
    ]
  },
  { 
    id: 't3', 
    title: 'Safety Audit', 
    description: 'Weekly safety audit of the main site. Check PPE compliance and heavy machinery logs.', 
    status: 'COMPLETED', 
    assigneeId: 'u4', 
    workspaceId: 'w2', 
    startDate: '2026-03-25', 
    endDate: '2026-03-26', 
    priority: 'High',
    history: [
      { id: 'h5', userId: 'u4', action: 'Created the task', timestamp: '2026-03-24 16:00' },
      { id: 'h6', userId: 'u4', action: 'Changed status to Completed', timestamp: '2026-03-26 17:30' },
    ]
  },
];

export const initialMeetings: Meeting[] = [
  {
    id: 'm1',
    projectId: 'p1',
    title: 'Weekly Progress Meeting',
    date: '2026-04-02',
    time: '10:00',
    location: 'Site Office - Villa 2',
    coordinates: { lat: 33.3128, lng: 44.3615 },
    type: 'Progress',
    attendeeIds: ['u1', 'u2', 'u4'],
    agenda: [
      { id: 'a1', topic: 'Review Block A foundations', isCompleted: true },
      { id: 'a2', topic: 'Procurement delays for steel', isCompleted: false },
    ],
    decisions: [
      { id: 'd1', decision: 'Approved overtime for concrete pour', category: 'Schedule', responsibleParty: 'Hashim Husain' }
    ],
    tasks: [
      { id: 'mt1', description: 'Order new safety gear', assigneeId: 'u4', dueDate: '2026-04-05', status: 'Open' }
    ],
    notes: 'The meeting focused on the critical path for Block A.',
    status: 'Published',
    meetingHealth: 0,
    createdAt: '2026-04-02T09:00:00Z',
    updatedAt: '2026-04-02T11:00:00Z'
  },
];

export const projects: Project[] = [];

export const pages: Page[] = [
  // --- DOMAIN HUBS (LEVEL 0 - ROOT) ---
  { id: 'gov-hub', title: 'Governance', type: 'hub', icon: 'Shield', domain: 'governance', summary: 'Project authorization, policies, and management plans.' },
  { id: 'scope-hub', title: 'Scope', type: 'hub', icon: 'DraftingCompass', domain: 'scope', summary: 'Defining work boundaries, requirements, and WBS.' },
  { id: 'sched-hub', title: 'Schedule', type: 'hub', icon: 'Calendar', domain: 'schedule', summary: 'Timeline, milestones, and project schedule.' },
  { id: 'fin-hub', title: 'Finance', type: 'hub', icon: 'Banknote', domain: 'finance', summary: 'Budgeting, BOQ, and financial control.' },
  { id: 'stak-hub', title: 'Stakeholders', type: 'hub', icon: 'Users', domain: 'stakeholders', summary: 'Stakeholder identification and engagement.' },
  { id: 'res-hub', title: 'Resources', type: 'hub', icon: 'Package', domain: 'resources', summary: 'Team, suppliers, and physical resources.' },
  { id: 'risk-hub', title: 'Risk', type: 'hub', icon: 'AlertTriangle', domain: 'risk', summary: 'Risk assessment, issues, and audit logs.' },

  // --- SUB-DOMAIN HUBS (LEVEL 1) grouped by Domain ---
  
  // Governance Sub-hubs
  { id: 'initiating-gov', title: 'Initiating', parentId: 'gov-hub', type: 'hub', domain: 'governance', icon: 'Zap', summary: 'Process group for initial authorization.' },
  { id: 'planning-gov', title: 'Planning', parentId: 'gov-hub', type: 'hub', domain: 'governance', icon: 'Target', summary: 'Process group for management planning.' },
  { id: 'executing-gov', title: 'Executing', parentId: 'gov-hub', type: 'hub', domain: 'governance', icon: 'Activity', summary: 'Process group for executing plans.' },
  { id: 'monitoring-gov', title: 'Monitoring', parentId: 'gov-hub', type: 'hub', domain: 'governance', icon: 'ShieldCheck', summary: 'Process group for tracking performance.' },
  { id: 'closing-gov', title: 'Closing', parentId: 'gov-hub', type: 'hub', domain: 'governance', icon: 'Flag', summary: 'Process group for closing activities.' },

  // Scope Sub-hubs
  { id: 'planning-scope', title: 'Planning', parentId: 'scope-hub', type: 'hub', domain: 'scope', icon: 'Target', summary: 'Defining the scope baseline.' },
  { id: 'monitoring-scope', title: 'Controlling', parentId: 'scope-hub', type: 'hub', domain: 'scope', icon: 'ShieldCheck', summary: 'Managing scope changes.' },

  // Schedule Sub-hubs
  { id: 'planning-sched', title: 'Planning', parentId: 'sched-hub', type: 'hub', domain: 'schedule', icon: 'Target', summary: 'Developing the project schedule.' },
  { id: 'monitoring-sched', title: 'Controlling', parentId: 'sched-hub', type: 'hub', domain: 'schedule', icon: 'ShieldCheck', summary: 'Tracking schedule progress.' },

  // Finance Sub-hubs
  { id: 'planning-fin', title: 'Planning', parentId: 'fin-hub', type: 'hub', domain: 'finance', icon: 'Target', summary: 'Budgeting and costing.' },
  { id: 'executing-fin', title: 'Executing', parentId: 'fin-hub', type: 'hub', domain: 'finance', icon: 'Activity', summary: 'Managing expenditures.' },
  { id: 'monitoring-fin', title: 'Monitoring', parentId: 'fin-hub', type: 'hub', domain: 'finance', icon: 'ShieldCheck', summary: 'Financial health tracking.' },
  { id: 'closing-fin', title: 'Closing', parentId: 'fin-hub', type: 'hub', domain: 'finance', icon: 'Flag', summary: 'Final account closing.' },

  // Stakeholders Sub-hubs
  { id: 'initiating-stak', title: 'Initiating', parentId: 'stak-hub', type: 'hub', domain: 'stakeholders', icon: 'Zap', summary: 'Identifying stakeholders.' },
  { id: 'monitoring-stak', title: 'Monitoring', parentId: 'stak-hub', type: 'hub', domain: 'stakeholders', icon: 'ShieldCheck', summary: 'Engagement tracking.' },

  // Resources Sub-hubs
  { id: 'planning-res', title: 'Planning', parentId: 'res-hub', type: 'hub', domain: 'resources', icon: 'Target', summary: 'Resource planning.' },
  { id: 'executing-res', title: 'Executing', parentId: 'res-hub', type: 'hub', domain: 'resources', icon: 'Activity', summary: 'Acquiring resources.' },
  { id: 'monitoring-res', title: 'Monitoring', parentId: 'res-hub', type: 'hub', domain: 'resources', icon: 'ShieldCheck', summary: 'Performance tracking.' },

  // Risk Sub-hubs
  { id: 'planning-risk', title: 'Planning', parentId: 'risk-hub', type: 'hub', domain: 'risk', icon: 'Target', summary: 'Risk planning.' },
  { id: 'executing-risk', title: 'Executing', parentId: 'risk-hub', type: 'hub', domain: 'risk', icon: 'Activity', summary: 'Addressing issues.' },
  { id: 'monitoring-risk', title: 'Monitoring', parentId: 'risk-hub', type: 'hub', domain: 'risk', icon: 'ShieldCheck', summary: 'Risk auditing.' },

  // --- TERMINAL PAGES (LEVEL 2) ---

  // Governance
  { id: '1.1.1', title: 'Charter', parentId: 'initiating-gov', type: 'terminal', domain: 'governance', focusArea: 'Initiating', icon: 'FileText' },
  { id: '1.1.2', title: 'Policies', parentId: 'planning-gov', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'BookOpen' },
  { id: '2.1.2', title: 'Mgt Plan', parentId: 'planning-gov', type: 'hub', domain: 'governance', focusArea: 'Planning', icon: 'ClipboardList' },
  { id: '2.1.4', title: 'Metrics', parentId: 'planning-gov', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'BarChart3' },
  { id: '3.1.3', title: 'Decisions', parentId: 'executing-gov', type: 'terminal', domain: 'governance', focusArea: 'Executing', icon: 'CheckCircle2' },
  { id: '4.1.2', title: 'Sign-off', parentId: 'monitoring-gov', type: 'terminal', domain: 'governance', focusArea: 'Monitoring', icon: 'CheckCircle2' },
  { id: '3.1.4', title: 'Audit', parentId: 'monitoring-gov', type: 'terminal', domain: 'governance', focusArea: 'Monitoring', icon: 'ShieldCheck' },
  { id: '5.1.1', title: 'Lessons', parentId: 'closing-gov', type: 'terminal', domain: 'governance', focusArea: 'Closing', icon: 'Award' },
  { id: '5.1.2', title: 'Close Out', parentId: 'closing-gov', type: 'terminal', domain: 'governance', focusArea: 'Closing', icon: 'Flag' },

  // Scope
  { id: '2.2.3', title: 'Scope Statement', parentId: 'planning-scope', type: 'terminal', domain: 'scope', focusArea: 'Planning', icon: 'FileText' },
  { id: '2.2.4', title: 'Requirements', parentId: 'planning-scope', type: 'terminal', domain: 'scope', focusArea: 'Planning', icon: 'FileText' },
  { id: '2.2.6', title: 'Matrix', parentId: 'planning-scope', type: 'terminal', domain: 'scope', focusArea: 'Planning', icon: 'Table' },
  { id: '2.2.9', title: 'WBS', parentId: 'planning-scope', type: 'terminal', domain: 'scope', focusArea: 'Planning', icon: 'LayoutGrid' },
  { id: '2.2.10', title: 'Packages', parentId: 'planning-scope', type: 'terminal', domain: 'scope', focusArea: 'Planning', icon: 'Layers' },

  // Schedule
  { id: '2.3', title: 'Schedule', parentId: 'planning-sched', type: 'terminal', domain: 'schedule', focusArea: 'Planning', icon: 'Clock' },

  // Finance
  { id: '2.4.0', title: 'BOQ', parentId: 'planning-fin', type: 'terminal', domain: 'finance', focusArea: 'Planning', icon: 'FileText' },
  { id: '4.2.3', title: 'Payment Cert', parentId: 'executing-fin', type: 'terminal', domain: 'finance', focusArea: 'Executing', icon: 'FileText' },
  { id: '4.2.6', title: 'PO Track', parentId: 'executing-fin', type: 'terminal', domain: 'finance', focusArea: 'Executing', icon: 'Package' },
  { id: '4.2.1', title: 'Contractor Rep', parentId: 'monitoring-fin', type: 'terminal', domain: 'finance', focusArea: 'Monitoring', icon: 'FileText' },
  { id: '4.2.2', title: 'EVM Rep', parentId: 'monitoring-fin', type: 'terminal', domain: 'finance', focusArea: 'Monitoring', icon: 'TrendingUp' },
  { id: '4.2.4', title: 'PO Cumulative', parentId: 'monitoring-fin', type: 'terminal', domain: 'finance', focusArea: 'Monitoring', icon: 'BarChart3' },
  { id: '4.2.5', title: 'PO Control', parentId: 'monitoring-fin', type: 'terminal', domain: 'finance', focusArea: 'Monitoring', icon: 'LayoutDashboard' },
  { id: '5.2.2', title: 'Audit', parentId: 'closing-fin', type: 'terminal', domain: 'finance', focusArea: 'Closing', icon: 'ShieldCheck' },
  { id: '5.2.1', title: 'Close Out', parentId: 'closing-fin', type: 'terminal', domain: 'finance', focusArea: 'Closing', icon: 'FileText' },

  // Stakeholders
  { id: '1.2.1', title: 'Register', parentId: 'initiating-stak', type: 'terminal', domain: 'stakeholders', focusArea: 'Initiating', icon: 'Users' },
  { id: '1.2.2', title: 'Analysis', parentId: 'initiating-stak', type: 'terminal', domain: 'stakeholders', focusArea: 'Initiating', icon: 'LayoutGrid' },
  { id: '4.3.1', title: 'Perf Rep', parentId: 'monitoring-stak', type: 'terminal', domain: 'stakeholders', focusArea: 'Monitoring', icon: 'FileText' },
  { id: '4.3.2', title: 'Variance', parentId: 'monitoring-stak', type: 'terminal', domain: 'stakeholders', focusArea: 'Monitoring', icon: 'Activity' },

  // Resources
  { id: '2.6.1', title: 'Requirements', parentId: 'planning-res', type: 'terminal', domain: 'resources', focusArea: 'Planning', icon: 'Users2' },
  { id: '2.6.4', title: 'RBS', parentId: 'planning-res', type: 'terminal', domain: 'resources', focusArea: 'Planning', icon: 'Layers' },
  { id: '2.6.5', title: 'RAM', parentId: 'planning-res', type: 'terminal', domain: 'resources', focusArea: 'Planning', icon: 'Grid' },
  { id: '2.6.6', title: 'Roles', parentId: 'planning-res', type: 'terminal', domain: 'resources', focusArea: 'Planning', icon: 'Briefcase' },
  { id: '2.6.7', title: 'Criteria', parentId: 'planning-res', type: 'terminal', domain: 'resources', focusArea: 'Planning', icon: 'Target' },
  { id: '3.3.5', title: 'Agreement', parentId: 'planning-res', type: 'terminal', domain: 'resources', focusArea: 'Planning', icon: 'FileText' },
  { id: '2.6.21', title: 'Tasks', parentId: 'executing-res', type: 'terminal', domain: 'resources', focusArea: 'Executing', icon: 'CheckSquare' },
  { id: '2.6.22', title: 'Meetings', parentId: 'executing-res', type: 'terminal', domain: 'resources', focusArea: 'Executing', icon: 'Calendar' },
  { id: '3.3.1', title: 'Directory', parentId: 'executing-res', type: 'terminal', domain: 'resources', focusArea: 'Executing', icon: 'Users' },
  { id: '3.3.4', title: 'Suppliers', parentId: 'executing-res', type: 'terminal', domain: 'resources', focusArea: 'Executing', icon: 'Building2' },
  { id: 'contacts', title: 'Contacts', parentId: 'executing-res', type: 'terminal', domain: 'resources', focusArea: 'Executing', icon: 'Table' },
  { id: 'companies', title: 'Companies', parentId: 'executing-res', type: 'terminal', domain: 'resources', focusArea: 'Executing', icon: 'Briefcase' },
  { id: '3m_resources', title: '3M Res', parentId: 'executing-res', type: 'terminal', domain: 'resources', focusArea: 'Executing', icon: 'Package' },
  { id: '3.3.2', title: 'Performance', parentId: 'monitoring-res', type: 'terminal', domain: 'resources', focusArea: 'Monitoring', icon: 'User' },
  { id: '3.3.3', title: 'Reports', parentId: 'monitoring-res', type: 'terminal', domain: 'resources', focusArea: 'Monitoring', icon: 'FileText' },
  { id: '3.3.6', title: 'Assessment', parentId: 'monitoring-res', type: 'terminal', domain: 'resources', focusArea: 'Monitoring', icon: 'Users2' },

  // Risk
  { id: '2.1.5', title: 'Assumptions', parentId: 'planning-risk', type: 'terminal', domain: 'risk', focusArea: 'Planning', icon: 'List' },
  { id: '2.7.5', title: 'Register', parentId: 'planning-risk', type: 'terminal', domain: 'risk', focusArea: 'Planning', icon: 'ShieldAlert' },
  { id: '2.7.1', title: 'Impact', parentId: 'planning-risk', type: 'terminal', domain: 'risk', focusArea: 'Planning', icon: 'Activity' },
  { id: '2.7.2', title: 'Matrix', parentId: 'planning-risk', type: 'terminal', domain: 'risk', focusArea: 'Planning', icon: 'Grid' },
  { id: '2.7.3', title: 'Issues', parentId: 'executing-risk', type: 'terminal', domain: 'risk', focusArea: 'Executing', icon: 'AlertTriangle' },
  { id: '4.4.1', title: 'Audit', parentId: 'monitoring-risk', type: 'terminal', domain: 'risk', focusArea: 'Monitoring', icon: 'ShieldCheck' },

  // Management Plans (Root children of planning-gov or kept special)
  { id: '2.1.8', title: 'Req Plan', parentId: '2.1.2', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'ListChecks' },
  { id: '2.1.9', title: 'Scope Plan', parentId: '2.1.2', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'Target' },
  { id: '2.1.11', title: 'Sched Plan', parentId: '2.1.2', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'Clock' },
  { id: '2.1.12', title: 'Cost Plan', parentId: '2.1.2', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'DollarSign' },
  { id: '2.1.6', title: 'Comm Plan', parentId: '2.1.2', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'MessageSquare' },
  { id: '2.1.7', title: 'Stak Plan', parentId: '2.1.2', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'Users' },
  { id: '2.1.10', title: 'HR Plan', parentId: '2.1.2', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'Users2' },
  { id: '2.1.14', title: 'Risk Plan', parentId: '2.1.2', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'ShieldAlert' },
  { id: '2.1.13', title: 'Proc Plan', parentId: '2.1.2', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'ShoppingCart' },
  { id: '2.1.1', title: 'Change Plan', parentId: '2.1.2', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'GitBranch' },
  { id: '2.1.3', title: 'Quality Plan', parentId: '2.1.2', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'ShieldCheck' },
];

export const getChildren = (parentId: string) => {
  const phaseOrder = ['Initiating', 'Planning', 'Executing', 'Monitoring & Controlling', 'Closing'];
  
  return pages
    .filter(p => p.parentId === parentId)
    .sort((a, b) => {
      const phaseA = phaseOrder.findIndex(p => a.focusArea?.includes(p));
      const phaseB = phaseOrder.findIndex(p => b.focusArea?.includes(p));
      
      if (phaseA !== phaseB) {
        return (phaseA === -1 ? 99 : phaseA) - (phaseB === -1 ? 99 : phaseB);
      }
      
      // If same phase, sort by ID
      return a.id.localeCompare(b.id, undefined, { numeric: true });
    });
};

export const getParent = (id: string) => {
  const page = pages.find(p => p.id === id);
  return pages.find(p => p.id === page?.parentId);
};

export const getBreadcrumbs = (id: string): Page[] => {
  const crumbs: Page[] = [];
  let current = pages.find(p => p.id === id);
  while (current) {
    crumbs.unshift(current);
    current = pages.find(p => p.id === current?.parentId);
  }
  return crumbs;
};

export const masterFormatDivisions = [
  { id: '01', title: 'General Requirements' },
  { id: '02', title: 'Site Construction' },
  { id: '03', title: 'Concrete' },
  { id: '04', title: 'Masonry' },
  { id: '05', title: 'Metals' },
  { id: '06', title: 'Wood and Plastics' },
  { id: '07', title: 'Thermal and Moisture Protection' },
  { id: '08', title: 'Doors and Windows' },
  { id: '09', title: 'Finishes' },
  { id: '10', title: 'Specialties' },
  { id: '11', title: 'Equipment' },
  { id: '12', title: 'Furnishings' },
  { id: '13', title: 'Special Construction' },
  { id: '14', title: 'Conveying Systems' },
  { id: '15', title: 'Mechanical' },
  { id: '16', title: 'Electrical' },
];

export const boqData: BOQItem[] = [
  { id: 'b1', description: 'Excavation for foundations', unit: 'm3', quantity: 500, rate: 15, amount: 7500, division: '02', workPackage: 'Earthworks', location: 'Villa 2', completion: 100 },
  { id: 'b2', description: 'Concrete Grade C30', unit: 'm3', quantity: 200, rate: 120, amount: 24000, division: '03', workPackage: 'Concrete Structure', location: 'Villa 2', completion: 80 },
  { id: 'b3', description: 'Steel Reinforcement', unit: 'ton', quantity: 15, rate: 850, amount: 12750, division: '03', workPackage: 'Concrete Structure', location: 'Villa 2', completion: 90 },
  { id: 'b4', description: 'Ceramic Tiling', unit: 'm2', quantity: 450, rate: 25, amount: 11250, division: '09', workPackage: 'Flooring', location: 'Villa 2', completion: 0 },
  { id: 'b5', description: 'Garden Soil', unit: 'm3', quantity: 100, rate: 30, amount: 3000, division: '02', workPackage: 'Landscaping', location: 'Garden', completion: 50 },
];

export const purchaseOrders: PurchaseOrder[] = [
  {
    id: 'COS001649',
    projectId: 'p1',
    supplier: 'Fuad Hama Saed',
    date: '2023-05-11',
    status: 'Approved',
    amount: 8250,
    workPackageId: '6.1.3.1',
    lineItems: [
      { id: 'li1', description: 'Wooden Formwork Panels', quantity: 100, unit: 'pcs', rate: 50, amount: 5000, status: 'Received' },
      { id: 'li2', description: 'Nails and Accessories', quantity: 50, unit: 'kg', rate: 65, amount: 3250, status: 'Received' },
    ]
  },
  {
    id: 'COS001650',
    projectId: 'p1',
    supplier: 'Fuad Hama Saed',
    date: '2023-05-11',
    status: 'Approved',
    amount: 2560,
    workPackageId: '6.1.3.1',
    lineItems: [
      { id: 'li3', description: 'Formwork Labor', quantity: 1, unit: 'job', rate: 2560, amount: 2560, status: 'Completed' },
    ]
  },
  {
    id: 'COS001701',
    projectId: 'p1',
    supplier: 'Fuad Hama Saed',
    date: '2023-05-24',
    status: 'Approved',
    amount: 5500,
    workPackageId: '6.1.3.2',
    lineItems: [
      { id: 'li4', description: 'Reinforcement Steel 12mm', quantity: 5, unit: 'ton', rate: 800, amount: 4000, status: 'Received' },
      { id: 'li5', description: 'Binding Wire', quantity: 10, unit: 'roll', rate: 150, amount: 1500, status: 'Received' },
    ]
  }
];
