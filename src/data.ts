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
  // --- DOMAIN HUBS (TOP LEVEL) ---
  { id: 'gov', title: 'Governance Domain', type: 'hub', domain: 'governance', icon: 'Shield', summary: 'Project authorization, policies, and integration management.' },
  { id: 'scope', title: 'Scope Domain', type: 'hub', domain: 'scope', icon: 'DraftingCompass', summary: 'Defining and managing project scope and requirements.' },
  { id: 'sched', title: 'Schedule Domain', type: 'hub', domain: 'schedule', icon: 'Calendar', summary: 'Timeline, milestones, and schedule management.' },
  { id: 'fin', title: 'Finance Domain', type: 'hub', domain: 'finance', icon: 'Banknote', summary: 'Budgeting, cost control, and procurement.' },
  { id: 'stak', title: 'Stakeholders Domain', type: 'hub', domain: 'stakeholders', icon: 'Users', summary: 'Stakeholder identification and engagement.' },
  { id: 'res', title: 'Resources Domain', type: 'hub', domain: 'resources', icon: 'Package', summary: 'Human resources, materials, and equipment.' },
  { id: 'risk', title: 'Risk Domain', type: 'hub', domain: 'risk', icon: 'AlertTriangle', summary: 'Risk identification, analysis, and response planning.' },

  // --- GOVERNANCE DOMAIN PAGES ---
  { id: '1.1.1', title: 'Project Charter', parentId: 'gov', type: 'terminal', domain: 'governance', icon: 'FileText', content: 'Formal authorization of the project.' },
  { id: '1.1.2', title: 'Project Policies & Procedures', parentId: 'gov', type: 'terminal', domain: 'governance', icon: 'BookOpen', content: 'Project constitution and standards.' },
  { id: '2.1.2', title: 'Project Management Plan', parentId: 'gov', type: 'terminal', domain: 'governance', icon: 'ClipboardList', content: 'Master integration plan.' },
  { id: '2.1.4', title: 'Quality Metrics', parentId: 'gov', type: 'terminal', domain: 'governance', icon: 'BarChart3', content: 'Specific attributes to be measured.' },
  { id: '3.1.3', title: 'Decision Log', parentId: 'gov', type: 'terminal', domain: 'governance', icon: 'CheckCircle2', content: 'Tracking all project decisions.' },
  { id: '4.1.2', title: 'Deliverable Acceptance', parentId: 'gov', type: 'terminal', domain: 'governance', icon: 'CheckCircle2', content: 'Official sign-off for project deliverables.' },
  { id: '3.1.4', title: 'Quality Audit', parentId: 'gov', type: 'terminal', domain: 'governance', icon: 'ShieldCheck', content: 'Review of quality management activities.' },
  { id: '5.1.1', title: 'Lessons Learned', parentId: 'gov', type: 'terminal', domain: 'governance', icon: 'Award', content: 'Capturing project knowledge.' },
  { id: '5.1.2', title: 'Project Close Out', parentId: 'gov', type: 'terminal', domain: 'governance', icon: 'Flag', content: 'Finalizing all project activities.' },

  // --- SCOPE DOMAIN PAGES ---
  { id: '2.1.8', title: 'Requirements Management Plan', parentId: 'scope', type: 'terminal', domain: 'scope', icon: 'ListChecks', content: 'Planning and controlling requirements.' },
  { id: '2.1.9', title: 'Scope Management Plan', parentId: 'scope', type: 'terminal', domain: 'scope', icon: 'Target', content: 'Defining and maintaining project scope.' },
  { id: '2.2.3', title: 'Project Scope Statement', parentId: 'scope', type: 'terminal', domain: 'scope', icon: 'FileText', content: 'Detailed description of project scope.' },
  { id: '2.2.4', title: 'Requirements Documentation', parentId: 'scope', type: 'terminal', domain: 'scope', icon: 'FileText', content: 'Collection of all project requirements.' },
  { id: '2.2.6', title: 'Requirements Traceability Matrix', parentId: 'scope', type: 'terminal', domain: 'scope', icon: 'Table', content: 'Tracing requirements to deliverables.' },
  { id: '2.2.9', title: 'WBS', parentId: 'scope', type: 'terminal', domain: 'scope', icon: 'LayoutGrid', content: 'Hierarchical decomposition of work.' },

  // --- SCHEDULE DOMAIN PAGES ---
  { id: '2.1.11', title: 'Schedule Management Plan', parentId: 'sched', type: 'terminal', domain: 'schedule', icon: 'Clock', content: 'Governance for timeline management.' },
  { id: '2.3', title: 'Schedule', parentId: 'sched', type: 'terminal', domain: 'schedule', icon: 'Clock', content: 'Project timeline and milestones.' },

  // --- FINANCE DOMAIN PAGES ---
  { id: '2.1.12', title: 'Cost Management Plan', parentId: 'fin', type: 'terminal', domain: 'finance', icon: 'DollarSign', content: 'Financial governance rules.' },
  { id: '2.4.0', title: 'BOQ', parentId: 'fin', type: 'terminal', domain: 'finance', icon: 'FileText', content: 'Bill of Quantities and cost tracking.' },
  { id: '4.2.1', title: 'Contractor Status Report', parentId: 'fin', type: 'terminal', domain: 'finance', icon: 'FileText', content: 'Contractor performance updates.' },
  { id: '4.2.2', title: 'Earned Value Status Report', parentId: 'fin', type: 'terminal', domain: 'finance', icon: 'TrendingUp', content: 'EVM metrics analysis.' },
  { id: '4.2.3', title: 'Payment Certificate', parentId: 'fin', type: 'terminal', domain: 'finance', icon: 'FileText', content: 'Installment certificates.' },
  { id: '4.2.4', title: 'Cumulative PO Tracking', parentId: 'fin', type: 'terminal', domain: 'finance', icon: 'BarChart3', content: 'Master PO tracking and expenditure.' },
  { id: '4.2.5', title: 'PO Control Dashboard', parentId: 'fin', type: 'terminal', domain: 'finance', icon: 'LayoutDashboard', content: 'Smart alerts and budget control.' },
  { id: '4.2.6', title: 'PO Management', parentId: 'fin', type: 'terminal', domain: 'finance', icon: 'Package', content: 'Purchase order tracking.' },
  { id: '5.2.2', title: 'Procurement Audit', parentId: 'fin', type: 'terminal', domain: 'finance', icon: 'ShieldCheck', content: 'Review of the procurement process.' },
  { id: '5.2.1', title: 'Contract Close Out', parentId: 'fin', type: 'terminal', domain: 'finance', icon: 'FileText', content: 'Formal closure of contracts.' },

  // --- STAKEHOLDERS DOMAIN PAGES ---
  { id: '1.2.1', title: 'Stakeholder Register', parentId: 'stak', type: 'terminal', domain: 'stakeholders', icon: 'Users', content: 'Identification and assessment of stakeholders.' },
  { id: '1.2.2', title: 'Stakeholder Analysis Matrix', parentId: 'stak', type: 'terminal', domain: 'stakeholders', icon: 'Grid', content: 'Evaluating stakeholder power and interest.' },
  { id: '2.1.6', title: 'Communications Management Plan', parentId: 'stak', type: 'terminal', domain: 'stakeholders', icon: 'MessageSquare', content: 'Information distribution strategy.' },
  { id: '2.1.7', title: 'Stakeholder Management Plan', parentId: 'stak', type: 'terminal', domain: 'stakeholders', icon: 'Users', content: 'Engagement strategy.' },
  { id: '4.3.1', title: 'Project Performance Report', parentId: 'stak', type: 'terminal', domain: 'stakeholders', icon: 'FileText', content: 'Status reports and updates.' },
  { id: '4.3.2', title: 'Variance Analysis', parentId: 'stak', type: 'terminal', domain: 'stakeholders', icon: 'Activity', content: 'Analysis of performance differences.' },

  // --- RESOURCES DOMAIN PAGES ---
  { id: '2.1.10', title: 'Human Resource Management Plan', parentId: 'res', type: 'terminal', domain: 'resources', icon: 'Users2', content: 'Managing roles and staffing.' },
  { id: '2.6.1', title: 'Activity Resource Requirements', parentId: 'res', type: 'terminal', domain: 'resources', icon: 'Users2', content: 'Resources required for activities.' },
  { id: '2.6.4', title: 'Resource Breakdown Structure', parentId: 'res', type: 'terminal', domain: 'resources', icon: 'Layers', content: 'Hierarchical resource representation.' },
  { id: '2.6.5', title: 'Responsibility Assignment Matrix', parentId: 'res', type: 'terminal', icon: 'Grid', domain: 'resources', content: 'Mapping work to team members.' },
  { id: '2.6.6', title: 'Roles and Responsibilities', parentId: 'res', type: 'terminal', icon: 'Briefcase', domain: 'resources', content: 'Defining team roles.' },
  { id: '2.6.7', title: 'Source Selection Criteria', parentId: 'res', type: 'terminal', icon: 'Target', domain: 'resources', content: 'Criteria for selecting vendors.' },
  { id: '2.6.21', title: 'Task Management', parentId: 'res', type: 'terminal', icon: 'CheckSquare', domain: 'resources', content: 'Kanban and List views.' },
  { id: '2.6.22', title: 'Meetings & Minutes', parentId: 'res', type: 'terminal', icon: 'Calendar', domain: 'resources', content: 'Schedules and actionable tasks.' },
  { id: '3.3.1', title: 'Team Directory', parentId: 'res', type: 'terminal', icon: 'Users', domain: 'resources', content: 'Team contact information.' },
  { id: '3.3.4', title: 'Vendor Master Register', parentId: 'res', type: 'terminal', icon: 'Building2', domain: 'resources', content: 'Vendor and supplier database.' },
  { id: '3.3.5', title: 'Team Operating Agreement', parentId: 'res', type: 'terminal', icon: 'FileText', domain: 'resources', content: 'Interaction guidelines.' },
  { id: '3.3.2', title: 'Team Member Performance Assessment', parentId: 'res', type: 'terminal', icon: 'User', domain: 'resources', content: 'Individual effectiveness evaluation.' },
  { id: '3.3.3', title: 'Progress Reports', parentId: 'res', type: 'terminal', icon: 'FileText', domain: 'resources', content: 'Daily, Weekly, Monthly reports.' },
  { id: '3.3.6', title: 'Team Performance Assessment', parentId: 'res', type: 'terminal', icon: 'Users2', domain: 'resources', content: 'Team effectiveness evaluation.' },

  // --- RISK DOMAIN PAGES ---
  { id: '2.1.14', title: 'Risk Management Plan', parentId: 'risk', type: 'terminal', domain: 'risk', icon: 'ShieldAlert', content: 'Governance for risk management.' },
  { id: '2.7.5', title: 'Risk Register', parentId: 'risk', type: 'terminal', domain: 'risk', icon: 'ShieldAlert', content: 'Repository for all identified risks.' },
  { id: '2.7.1', title: 'Probability and Impact Assessment', parentId: 'risk', type: 'terminal', domain: 'risk', icon: 'Activity', content: 'Evaluating likelihood and impact.' },
  { id: '2.7.2', title: 'Probability and Impact Matrix', parentId: 'risk', type: 'terminal', domain: 'risk', icon: 'Grid', content: 'Mapping risks.' },
  { id: '2.1.5', title: 'Assumption and Constraint Log', parentId: 'risk', type: 'terminal', domain: 'risk', icon: 'List', content: 'Tracking project assumptions.' },
  { id: '4.4.1', title: 'Risk Audit', parentId: 'risk', type: 'terminal', domain: 'risk', icon: 'ShieldCheck', content: 'Review of risk management effectiveness.' },
];

export const getChildren = (parentId: string) => pages.filter(p => p.parentId === parentId);

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

export const getFocusArea = (id: string): Page | undefined => {
  let current = pages.find(p => p.id === id);
  while (current && current.parentId) {
    current = pages.find(p => p.id === current.parentId);
  }
  return current;
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
