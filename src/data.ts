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
      { id: 'd1', decision: 'Approved overtime for concrete pour', category: 'Administrative', responsibleParty: 'Hashim Husain' }
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
  // --- GOVERNANCE ---
  { id: '1.1.1', title: 'Project Initiation', type: 'terminal', domain: 'governance', focusArea: 'initiating', icon: 'FileText', summary: 'Develop Project Charter, Canvas, and establish the initial project baseline.' },
  { id: '2.1.2', title: 'Master Plan Assembly', type: 'terminal', domain: 'governance', focusArea: 'planning', icon: 'Layers', summary: 'Aggregate all subsidiary plans into the comprehensive Master Project Management Plan.' },
  { id: '2.1.13', title: 'Sourcing Strategy', type: 'terminal', domain: 'governance', focusArea: 'planning', icon: 'ShoppingCart', summary: 'Develop procurement strategy, conduct make-or-buy analysis, and select source criteria.' },
  { id: '3.1.3', title: 'Project Execution & QA', type: 'terminal', domain: 'governance', focusArea: 'executing', icon: 'Zap', summary: 'Direct project work, manage daily syncs, and execute quality assurance audits.' },
  { id: '4.1.1', title: 'Performance Monitoring', type: 'terminal', domain: 'governance', focusArea: 'monitoring', icon: 'Activity', summary: 'Monitor work performance, track EVM metrics, and generate status reports.' },
  { id: '3.4', title: 'Integrated Change Control', type: 'terminal', domain: 'governance', focusArea: 'monitoring', icon: 'GitBranch', summary: 'Review all change requests, analyze impacts, and manage approvals.' },
  { id: '5.1.1', title: 'Knowledge Management', type: 'terminal', domain: 'governance', focusArea: 'closing', icon: 'Award', summary: 'Finalize lessons learned register and corporate knowledge transfer.' },
  { id: '5.1.2', title: 'Project Closure', type: 'terminal', domain: 'governance', focusArea: 'closing', icon: 'Flag', summary: 'Verify deliverables, complete financial close-out, and generate Final Project Report.' },

  // --- STAKEHOLDERS ---
  { id: '1.2.1', title: 'Stakeholder Analysis', type: 'terminal', domain: 'stakeholders', focusArea: 'initiating', icon: 'LayoutGrid', summary: 'Identify stakeholders and prioritize them using the Power/Interest Matrix.' },
  { id: '1.2.5', title: 'Stakeholder Register', type: 'terminal', domain: 'stakeholders', focusArea: 'initiating', icon: 'Users', summary: 'Centralized database of all project stakeholders and their contact details.' },
  { id: '2.5.1', title: 'Engagement Strategy', type: 'terminal', domain: 'stakeholders', focusArea: 'planning', icon: 'Target', summary: 'Define engagement levels (Current vs Desired) and mitigation strategies.' },
  { id: '2.5.2', title: 'Communications Plan', type: 'terminal', domain: 'stakeholders', focusArea: 'planning', icon: 'MessageSquare', summary: 'Establish frequency, methods, and responsibilities for stakeholder communication.' },
  { id: '3.5.1_sh', title: 'Relationships & Sentiment', type: 'terminal', domain: 'stakeholders', focusArea: 'executing', icon: 'Activity', summary: 'Monitor real-time sentiment and manage ongoing relationship health.' },
  { id: '4.5.1_sh', title: 'Satisfaction Trends', type: 'terminal', domain: 'stakeholders', focusArea: 'monitoring', icon: 'TrendingUp', summary: 'Track Net Promoter Score (NPS) and high-power engagement metrics.' },

  // --- RESOURCES ---
  { id: '2.1.10', title: 'Resources Management Plan', type: 'terminal', domain: 'resources', focusArea: 'planning', icon: 'Settings', summary: 'Develop the approach for identifying, acquiring, and managing human and physical resources.' },
  { id: '2.6.5', title: 'Interactive RACI Matrix', type: 'terminal', domain: 'resources', focusArea: 'planning', icon: 'Grid', summary: 'Assign Responsibility, Accountability, Consultation, and Information roles for work packages.' },
  { id: '2.6.6', title: 'Resource Breakdown (RBS)', type: 'terminal', domain: 'resources', focusArea: 'planning', icon: 'Layers', summary: 'Hierarchical representation of resources by category and type.' },
  { id: '3.3.1', title: 'Resource Acquisition', type: 'terminal', domain: 'resources', focusArea: 'executing', icon: 'UserPlus', summary: 'Process of securing human and physical resources required for project execution.' },
  { id: '3.3.4_res', title: 'Assignments & Calendars', type: 'terminal', domain: 'resources', focusArea: 'executing', icon: 'Calendar', summary: 'Assign resources to specific tasks and manage their availability calendars.' },
  { id: '3.3.6', title: 'Utilization Tracker', type: 'terminal', domain: 'resources', focusArea: 'monitoring', icon: 'Activity', summary: 'Monitor resource consumption and track variances between planned and actual use.' },
  { id: '5.3.1', title: 'Resource Release', type: 'terminal', domain: 'resources', focusArea: 'closing', icon: 'CheckCircle', summary: 'Verification and formal release of project staff and equipment.' },

  // --- PLANNING ---
  { id: '2.1.2_old', title: 'Project Management Plan', type: 'terminal', domain: 'planning', focusArea: 'planning', icon: 'ClipboardList' },
  { id: '2.1.8', title: 'Requirements Management Plan', type: 'terminal', domain: 'planning', focusArea: 'planning', icon: 'ListChecks' },
  { id: '2.1.9', title: 'Scope Management Plan', type: 'terminal', domain: 'planning', focusArea: 'planning', icon: 'Target' },
  { id: '2.1.11', title: 'Schedule Management Plan', type: 'terminal', domain: 'planning', focusArea: 'planning', icon: 'Clock' },
  { id: '2.1.3', title: 'Quality Management Plan', type: 'terminal', domain: 'planning', focusArea: 'planning', icon: 'ShieldCheck' },
  { id: '2.1.13_old', title: 'Procurement Management Plan', type: 'terminal', domain: 'planning', focusArea: 'planning', icon: 'ShoppingCart' },
  { id: '2.1.1', title: 'Change Management Plan', type: 'terminal', domain: 'planning', focusArea: 'planning', icon: 'GitBranch' },
  // --- PROJECT WORK ---
  { id: '2.1.6', title: 'Communications Plan', type: 'terminal', domain: 'project-work', focusArea: 'planning', icon: 'MessageSquare' },
  { id: '2.6.21', title: 'Task Tracking', type: 'terminal', domain: 'project-work', focusArea: 'executing', icon: 'CheckSquare' },
  { id: '2.6.22', title: 'Meeting Minutes', type: 'terminal', domain: 'project-work', focusArea: 'executing', icon: 'Calendar' },
  { id: '3.3.4', title: 'Supplier Directory', type: 'terminal', domain: 'project-work', focusArea: 'executing', icon: 'Building2' },
  { id: '4.2.3', title: 'Payment Certificates', type: 'terminal', domain: 'project-work', focusArea: 'executing', icon: 'FileText' },

  // --- DELIVERY ---
  { id: '2.2.3', title: 'Project Scope Statement', type: 'terminal', domain: 'delivery', focusArea: 'planning', icon: 'FileText' },
  { id: '2.2.4', title: 'Requirements Documentation', type: 'terminal', domain: 'delivery', focusArea: 'planning', icon: 'FileText' },
  { id: '2.2.9', title: 'Work Breakdown Structure (WBS)', type: 'terminal', domain: 'delivery', focusArea: 'planning', icon: 'LayoutGrid' },
  { id: '2.2.10', title: 'Work Packages', type: 'terminal', domain: 'delivery', focusArea: 'planning', icon: 'Layers' },
  { id: '2.2.6', title: 'Requirements Traceability Matrix', type: 'terminal', domain: 'delivery', focusArea: 'planning', icon: 'Table' },

  // --- MEASUREMENT ---
  { id: '2.1.4', title: 'Performance Metrics', type: 'terminal', domain: 'measurement', focusArea: 'planning', icon: 'BarChart3' },
  { id: '4.3.1', title: 'Performance Reports', type: 'terminal', domain: 'measurement', focusArea: 'monitoring', icon: 'FileText' },
  { id: '4.3.2', title: 'Variance Analysis', type: 'terminal', domain: 'measurement', focusArea: 'monitoring', icon: 'Activity' },
  // --- SCHEDULE ---
  { id: '1.3.1', title: 'Milestone Overview', type: 'terminal', domain: 'schedule', focusArea: 'initiating', icon: 'Flag', summary: 'High-level project milestones derived from the Project Charter.' },
  { id: '2.3.1', title: 'Define Activities', type: 'terminal', domain: 'schedule', focusArea: 'planning', icon: 'List', summary: 'Decompose work packages into detailed activities for scheduling.' },
  { id: '2.3.2', title: 'Sequence & Estimate', type: 'terminal', domain: 'schedule', focusArea: 'planning', icon: 'GitBranch', summary: 'Establish logical relationships and estimate durations for activities.' },
  { id: '2.3.3', title: 'Schedule Baseline', type: 'terminal', domain: 'schedule', focusArea: 'planning', icon: 'Clock', summary: 'Develop and approve the Master Project Schedule (Gantt Chart).' },
  { id: '3.5.1', title: 'Cadence Dashboard', type: 'terminal', domain: 'schedule', focusArea: 'executing', icon: 'Zap', summary: 'Daily work flow monitoring and task synchronization.' },
  { id: '4.5.1', title: 'Progress Tracking', type: 'terminal', domain: 'schedule', focusArea: 'monitoring', icon: 'Activity', summary: 'Track actual vs. planned progress and calculate time variances.' },
  { id: '4.5.2', title: 'Schedule Forecasting', type: 'terminal', domain: 'schedule', focusArea: 'monitoring', icon: 'TrendingUp', summary: 'Predict future completion dates based on current performance.' },
  { id: '5.5.1', title: 'Schedule Lessons Learned', type: 'terminal', domain: 'schedule', focusArea: 'closing', icon: 'BookOpen', summary: 'Analyze schedule performance and document time-related improvements.' },

  // --- FINANCE ---
  { id: '1.4.1', title: 'Financial Feasibility', type: 'terminal', domain: 'finance', focusArea: 'initiating', icon: 'Calculator', summary: 'Conduct initial financial appraisal and funding requirement analysis.' },
  { id: '2.4.1', title: 'Cost Plan', type: 'terminal', domain: 'finance', focusArea: 'planning', icon: 'Settings', summary: 'Define criteria and activities for cost planning, structuring, and controlling.' },
  { id: '2.4.2', title: 'Budgeting (BOQ)', type: 'terminal', domain: 'finance', focusArea: 'planning', icon: 'FileText', summary: 'Develop detailed cost estimates using the Bill of Quantities.' },
  { id: '2.4.3', title: 'Reserve Analysis', type: 'terminal', domain: 'finance', focusArea: 'planning', icon: 'ShieldCheck', summary: 'Determine contingency and management reserves for the project budget.' },
  { id: '4.4.1', title: 'EVM Dashboard', type: 'terminal', domain: 'finance', focusArea: 'monitoring', icon: 'TrendingUp', summary: 'Analyze Planned Value, Earned Value, and Actual Cost metrics.' },
  { id: '4.4.2', title: 'PO Tracking', type: 'terminal', domain: 'finance', focusArea: 'monitoring', icon: 'Package', summary: 'Monitor actual spending through approved purchase orders (AC).' },
  { id: '5.4.1', title: 'Financial Close-Out', type: 'terminal', domain: 'finance', focusArea: 'closing', icon: 'Banknote', summary: 'Verify final payments, close the account, and issue closure certificate.' },

  // --- RISK & OPPORTUNITY ---
  { id: '2.1.14', title: 'Risk Management Plan', type: 'terminal', domain: 'risk', focusArea: 'planning', icon: 'Settings', summary: 'Defines the methodology for risk identification, analysis, and response planning.' },
  { id: '2.1.5', title: 'Assumptions & Constraints', type: 'terminal', domain: 'risk', focusArea: 'planning', icon: 'List', summary: 'Logs and tracks project assumptions and internal/external constraints.' },
  { id: '2.7.5', title: 'Risk Register', type: 'terminal', domain: 'risk', focusArea: 'planning', icon: 'ShieldAlert', summary: 'Central hub for tracking identified risks, their owners (from Resources), and linked WBS elements.' },
  { id: '2.7.6', title: 'P&I Matrix', type: 'terminal', domain: 'risk', focusArea: 'planning', icon: 'Grid', summary: 'Quantitative tool for mapping Probability vs Impact scores (P × I).' },
  { id: '4.7.1', title: 'Reserve Burn-down', type: 'terminal', domain: 'risk', focusArea: 'monitoring', icon: 'TrendingDown', summary: 'Visual tracking of Contingency Reserves usage vs. active risk status.' },
  { id: '4.7.2', title: 'Trend Analysis', type: 'terminal', domain: 'risk', focusArea: 'monitoring', icon: 'LineChart', summary: 'AI-driven prediction of emerging risks based on site performance trends.' },
  { id: '5.7.1', title: 'Risk Closure', type: 'terminal', domain: 'risk', focusArea: 'closing', icon: 'Lock', summary: 'Formal retirement of expired risks and archival of the Risk Lessons Learned.' },
  { id: '2.7.3', title: 'Issue Log', type: 'terminal', domain: 'risk', focusArea: 'executing', icon: 'AlertTriangle', summary: 'Capture and track blockers that have already occurred.' },
  { id: '4.4.1', title: 'Risk Audit', type: 'terminal', domain: 'risk', focusArea: 'monitoring', icon: 'ShieldCheck', summary: 'Periodic verification of the effectiveness of risk responses.' },

  // --- ADDITIONAL ---
  { id: '2.3', title: 'Project Schedule', type: 'terminal', domain: 'planning', focusArea: 'planning', icon: 'Clock' },
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
