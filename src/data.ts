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
  { id: 'gov', title: 'Governance', type: 'hub', domain: 'governance', icon: 'Shield', summary: 'Project authorization, policies, and integration management.' },
  { id: 'scope', title: 'Scope', type: 'hub', domain: 'scope', icon: 'DraftingCompass', summary: 'Defining and managing project scope and requirements.' },
  { id: 'sched', title: 'Schedule', type: 'hub', domain: 'schedule', icon: 'Calendar', summary: 'Timeline, milestones, and schedule management.',
    kpis: [
      { label: 'Schedule Performance', value: '0.92', icon: 'Clock', status: 'warning', trend: '-2%' },
      { label: 'Critical Path Tasks', value: '12', icon: 'AlertTriangle', status: 'danger' },
      { label: 'Milestones Achieved', value: '8/10', icon: 'CheckCircle2', status: 'success' },
      { label: 'Days to Next Milestone', value: '5', icon: 'Calendar', status: 'success' }
    ],
    alerts: [
      { id: 'a1', msg: 'Excavation is 3 days behind schedule.', type: 'danger' },
      { id: 'a2', msg: 'Foundation completion due in 5 days.', type: 'warning' }
    ]
  },
  { id: 'fin', title: 'Finance', type: 'hub', domain: 'finance', icon: 'Banknote', summary: 'Budgeting, cost control, and procurement.',
    kpis: [
      { label: 'Budget Utilization', value: '65%', icon: 'DollarSign', status: 'success', trend: '+5%' },
      { label: 'Cost Variance', value: '-$12k', icon: 'TrendingDown', status: 'danger' },
      { label: 'Pending Invoices', value: '8', icon: 'FileText', status: 'warning' },
      { label: 'Approved POs', value: '45', icon: 'CheckCircle2', status: 'success' }
    ]
  },
  { id: 'stak', title: 'Stakeholders', type: 'hub', domain: 'stakeholders', icon: 'Users', summary: 'Stakeholder identification and engagement.',
    kpis: [
      { label: 'Total Stakeholders', value: '24', icon: 'Users', status: 'success' },
      { label: 'Engagement Level', value: 'High', icon: 'Activity', status: 'success' },
      { label: 'Pending Actions', value: '3', icon: 'Clock', status: 'warning' },
      { label: 'Satisfaction Score', value: '4.8/5', icon: 'Star', status: 'success' }
    ]
  },
  { id: 'res', title: 'Resources', type: 'hub', domain: 'resources', icon: 'Package', summary: 'Human resources, materials, and equipment.',
    kpis: [
      { label: 'Labor Productivity', value: '94%', icon: 'Users', status: 'success', trend: '+3%' },
      { label: 'Material Availability', value: '82%', icon: 'Package', status: 'warning' },
      { label: 'Equipment Uptime', value: '98%', icon: 'Settings', status: 'success' },
      { label: 'Safety Incidents', value: '0', icon: 'ShieldCheck', status: 'success' }
    ],
    alerts: [
      { id: 'r1', msg: 'Cement supply running low for Block B.', type: 'warning' }
    ]
  },
  { id: 'risk', title: 'Risk', type: 'hub', domain: 'risk', icon: 'AlertTriangle', summary: 'Risk identification, analysis, and response planning.' },

  // --- GOVERNANCE DOMAIN PAGES ---
  { id: '1.1.1', title: 'Project Charter', parentId: 'gov', type: 'terminal', domain: 'governance', focusArea: 'Initiating', icon: 'FileText', content: 'Formal authorization of the project.' },
  { id: '1.1.2', title: 'Project Policies & Procedures', parentId: 'gov', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'BookOpen', content: 'Project constitution and standards.' },
  { id: '2.1.2', title: 'Project Management Plan', parentId: 'gov', type: 'hub', domain: 'governance', focusArea: 'Planning', icon: 'ClipboardList', content: 'Master integration plan.' },
  { id: '2.1.4', title: 'Quality Metrics', parentId: 'gov', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'BarChart3', content: 'Specific attributes to be measured.' },
  { id: '3.1.3', title: 'Decision Log', parentId: 'gov', type: 'terminal', domain: 'governance', focusArea: 'Executing', icon: 'CheckCircle2', content: 'Tracking all project decisions.' },
  { id: '4.1.2', title: 'Deliverable Acceptance', parentId: 'gov', type: 'terminal', domain: 'governance', focusArea: 'Monitoring & Controlling', icon: 'CheckCircle2', content: 'Official sign-off for project deliverables.' },
  { id: '3.1.4', title: 'Quality Audit', parentId: 'gov', type: 'terminal', domain: 'governance', focusArea: 'Monitoring & Controlling', icon: 'ShieldCheck', content: 'Review of quality management activities.' },
  { id: '5.1.1', title: 'Lessons Learned Register', parentId: 'gov', type: 'terminal', domain: 'governance', focusArea: 'Closing', icon: 'Award', content: 'Capturing project knowledge.' },
  { id: '5.1.2', title: 'Project Close Out', parentId: 'gov', type: 'terminal', domain: 'governance', focusArea: 'Closing', icon: 'Flag', content: 'Finalizing all project activities.' },

  // --- SCOPE DOMAIN PAGES ---
  { id: '2.2.3', title: 'Project Scope Statement', parentId: 'scope', type: 'terminal', domain: 'scope', focusArea: 'Planning', icon: 'FileText', content: 'Detailed description of project scope.' },
  { id: '2.2.4', title: 'Requirements Documentation', parentId: 'scope', type: 'terminal', domain: 'scope', focusArea: 'Planning', icon: 'FileText', content: 'Collection of all project requirements.' },
  { id: '2.2.6', title: 'Requirements Traceability Matrix', parentId: 'scope', type: 'terminal', domain: 'scope', focusArea: 'Planning', icon: 'Table', content: 'Tracing requirements to deliverables.' },
  { id: '2.2.9', title: 'WBS', parentId: 'scope', type: 'terminal', domain: 'scope', focusArea: 'Planning', icon: 'LayoutGrid', content: 'Hierarchical decomposition of work.' },
  { id: '2.2.10', title: 'Work Packages', parentId: 'scope', type: 'terminal', domain: 'scope', focusArea: 'Planning', icon: 'Layers', content: 'Detailed work packages for project execution.' },

  // --- SCHEDULE DOMAIN PAGES ---
  { id: '2.3', title: 'Project Schedule', parentId: 'sched', type: 'terminal', domain: 'schedule', focusArea: 'Planning + Executing', icon: 'Clock', content: 'Project timeline and milestones.' },

  // --- FINANCE DOMAIN PAGES ---
  { id: '2.4.0', title: 'BOQ', parentId: 'fin', type: 'terminal', domain: 'finance', focusArea: 'Planning', icon: 'FileText', content: 'Bill of Quantities and cost tracking.' },
  { id: '4.2.1', title: 'Contractor Status Report', parentId: 'fin', type: 'terminal', domain: 'finance', focusArea: 'Monitoring & Controlling', icon: 'FileText', content: 'Contractor performance updates.' },
  { id: '4.2.2', title: 'Earned Value Status Report', parentId: 'fin', type: 'terminal', domain: 'finance', focusArea: 'Monitoring & Controlling', icon: 'TrendingUp', content: 'EVM metrics analysis.' },
  { id: '4.2.3', title: 'Payment Certificate', parentId: 'fin', type: 'terminal', domain: 'finance', focusArea: 'Executing', icon: 'FileText', content: 'Installment certificates.' },
  { id: '4.2.4', title: 'Cumulative PO Tracking', parentId: 'fin', type: 'terminal', domain: 'finance', focusArea: 'Monitoring & Controlling', icon: 'BarChart3', content: 'Master PO tracking and expenditure.' },
  { id: '4.2.5', title: 'PO Control Dashboard', parentId: 'fin', type: 'terminal', domain: 'finance', focusArea: 'Monitoring & Controlling', icon: 'LayoutDashboard', content: 'Smart alerts and budget control.' },
  { id: '4.2.6', title: 'PO Management', parentId: 'fin', type: 'terminal', domain: 'finance', focusArea: 'Executing', icon: 'Package', content: 'Purchase order tracking.' },
  { id: '5.2.2', title: 'Procurement Audit', parentId: 'fin', type: 'terminal', domain: 'finance', focusArea: 'Monitoring & Controlling', icon: 'ShieldCheck', content: 'Review of the procurement process.' },
  { id: '5.2.1', title: 'Contract Close Out', parentId: 'fin', type: 'terminal', domain: 'finance', focusArea: 'Closing', icon: 'FileText', content: 'Formal closure of contracts.' },

  // --- STAKEHOLDERS DOMAIN PAGES ---
  { id: '1.2.1', title: 'Stakeholder Register', parentId: 'stak', type: 'terminal', domain: 'stakeholders', focusArea: 'Initiating', icon: 'Users', content: 'Identification and assessment of stakeholders.' },
  { id: '1.2.2', title: 'Stakeholder Analysis Matrix', parentId: 'stak', type: 'terminal', domain: 'stakeholders', focusArea: 'Initiating', icon: 'Grid', content: 'Evaluating stakeholder power and interest.' },
  { id: '4.3.1', title: 'Project Performance Report', parentId: 'stak', type: 'terminal', domain: 'stakeholders', focusArea: 'Monitoring & Controlling', icon: 'FileText', content: 'Status reports and updates.' },
  { id: '4.3.2', title: 'Variance Analysis', parentId: 'stak', type: 'terminal', domain: 'stakeholders', focusArea: 'Monitoring & Controlling', icon: 'Activity', content: 'Analysis of performance differences.' },

  // --- RESOURCES DOMAIN PAGES ---
  { id: '2.6.1', title: 'Activity Resource Requirements', parentId: 'res', type: 'terminal', domain: 'resources', focusArea: 'Planning', icon: 'Users2', content: 'Resources required for activities.' },
  { id: '2.6.4', title: 'Resource Breakdown Structure', parentId: 'res', type: 'terminal', domain: 'resources', focusArea: 'Planning', icon: 'Layers', content: 'Hierarchical resource representation.' },
  { id: '2.6.5', title: 'Responsibility Assignment Matrix', parentId: 'res', type: 'terminal', icon: 'Grid', domain: 'resources', focusArea: 'Planning', content: 'Mapping work to team members.' },
  { id: '2.6.6', title: 'Roles and Responsibilities', parentId: 'res', type: 'terminal', icon: 'Briefcase', domain: 'resources', focusArea: 'Planning', content: 'Defining team roles.' },
  { id: '2.6.7', title: 'Source Selection Criteria', parentId: 'res', type: 'terminal', icon: 'Target', domain: 'resources', focusArea: 'Planning', content: 'Criteria for selecting vendors.' },
  { id: '2.6.21', title: 'Task Management', parentId: 'res', type: 'terminal', icon: 'CheckSquare', domain: 'resources', focusArea: 'Executing', content: 'Kanban and List views.' },
  { id: '2.6.22', title: 'Meetings & Minutes', parentId: 'res', type: 'terminal', icon: 'Calendar', domain: 'resources', focusArea: 'Executing', content: 'Schedules and actionable tasks.' },
  { id: '3.3.1', title: 'Team Directory', parentId: 'res', type: 'terminal', icon: 'Users', domain: 'resources', focusArea: 'Executing', content: 'Team contact information.' },
  { id: '3.3.4', title: 'Vendor Master Register', parentId: 'res', type: 'terminal', icon: 'Building2', domain: 'resources', focusArea: 'Executing', content: 'Vendor and supplier database.' },
  { id: 'contacts', title: 'Contacts', parentId: 'res', type: 'terminal', icon: 'Users', domain: 'resources', focusArea: 'Executing', content: 'Project contact list.' },
  { id: 'companies', title: 'Companies', parentId: 'res', type: 'terminal', icon: 'Building2', domain: 'resources', focusArea: 'Executing', content: 'Company database.' },
  { id: '3m_resources', title: '3M Resources', parentId: 'res', type: 'terminal', icon: 'Package', domain: 'resources', focusArea: 'Executing', content: 'Manpower, Material, Machine tracking.' },
  { id: '3.3.5', title: 'Team Operating Agreement', parentId: 'res', type: 'terminal', icon: 'FileText', domain: 'resources', focusArea: 'Planning', content: 'Interaction guidelines.' },
  { id: '3.3.2', title: 'Team Member Performance Assessment', parentId: 'res', type: 'terminal', icon: 'User', domain: 'resources', focusArea: 'Monitoring & Controlling', content: 'Individual effectiveness evaluation.' },
  { id: '3.3.3', title: 'Progress Reports', parentId: 'res', type: 'terminal', icon: 'FileText', domain: 'resources', focusArea: 'Monitoring & Controlling', content: 'Daily, Weekly, Monthly reports.' },
  { id: '3.3.6', title: 'Team Performance Assessment', parentId: 'res', type: 'terminal', icon: 'Users2', domain: 'resources', focusArea: 'Monitoring & Controlling', content: 'Team effectiveness evaluation.' },

  // --- RISK DOMAIN PAGES ---
  { id: '2.7.5', title: 'Risk Register', parentId: 'risk', type: 'terminal', domain: 'risk', focusArea: 'Planning + Executing', icon: 'ShieldAlert', content: 'Repository for all identified risks.' },
  { id: '2.7.1', title: 'Probability and Impact Assessment', parentId: 'risk', type: 'terminal', domain: 'risk', focusArea: 'Planning', icon: 'Activity', content: 'Evaluating likelihood and impact.' },
  { id: '2.7.2', title: 'Probability and Impact Matrix', parentId: 'risk', type: 'terminal', domain: 'risk', focusArea: 'Planning', icon: 'Grid', content: 'Mapping risks.' },
  { id: '2.7.3', title: 'Project Issues', parentId: 'risk', type: 'terminal', domain: 'risk', focusArea: 'Executing', icon: 'AlertTriangle', content: 'Tracking and resolving project issues.' },
  { id: '2.1.5', title: 'Assumption and Constraint Log', parentId: 'risk', type: 'terminal', domain: 'risk', focusArea: 'Planning', icon: 'List', content: 'Tracking project assumptions.' },
  { id: '4.4.1', title: 'Risk Audit', parentId: 'risk', type: 'terminal', domain: 'risk', focusArea: 'Monitoring & Controlling', icon: 'ShieldCheck', content: 'Review of risk management effectiveness.' },

  // --- CONSOLIDATED MANAGEMENT PLANS (under Project Management Plan 2.1.2) ---
  { id: '2.1.8', title: 'Requirements Management Plan', parentId: '2.1.2', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'ListChecks', content: 'Planning and controlling requirements.' },
  { id: '2.1.9', title: 'Scope Management Plan', parentId: '2.1.2', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'Target', content: 'Defining and maintaining project scope.' },
  { id: '2.1.11', title: 'Schedule Management Plan', parentId: '2.1.2', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'Clock', content: 'Governance for timeline management.' },
  { id: '2.1.12', title: 'Cost Management Plan', parentId: '2.1.2', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'DollarSign', content: 'Financial governance rules.' },
  { id: '2.1.6', title: 'Communications Management Plan', parentId: '2.1.2', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'MessageSquare', content: 'Information distribution strategy.' },
  { id: '2.1.7', title: 'Stakeholder Management Plan', parentId: '2.1.2', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'Users', content: 'Engagement strategy.' },
  { id: '2.1.10', title: 'Human Resource Management Plan', parentId: '2.1.2', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'Users2', content: 'Managing roles and staffing.' },
  { id: '2.1.14', title: 'Risk Management Plan', parentId: '2.1.2', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'ShieldAlert', content: 'Governance for risk management.' },
  { id: '2.1.13', title: 'Procurement Management Plan', parentId: '2.1.2', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'ShoppingCart', content: 'Governance for procurement activities.' },
  { id: '2.1.1', title: 'Change Management Plan', parentId: '2.1.2', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'GitBranch', content: 'Governance for change control.' },
  { id: '2.1.3', title: 'Quality Management Plan', parentId: '2.1.2', type: 'terminal', domain: 'governance', focusArea: 'Planning', icon: 'ShieldCheck', content: 'Governance for quality management.' },
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
