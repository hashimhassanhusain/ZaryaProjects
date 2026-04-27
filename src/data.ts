import { Page, User, Project, Workspace, Task, Meeting, BOQItem, PurchaseOrder, Institution, Company } from './types';

export const initialInstitutions: Institution[] = [
  {
    id: 'inst1',
    name: 'Zarya International Group',
    type: 'contractor',
    country: 'Iraq',
    createdAt: new Date().toISOString(),
    createdBy: 'system'
  }
];

export const initialCompanies: Company[] = [
  {
    id: 'comp1',
    institutionId: 'inst1',
    name: 'Zarya Civil Engineering Ltd',
    slug: 'zarya',
    registrationNumber: 'IQ-12345',
    address: 'Baghdad, Iraq',
    status: 'Active',
    createdAt: new Date().toISOString(),
    createdBy: 'system'
  }
];

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
  // --- HUBS (DOMAINS) ---
  { id: 'gov', title: 'Governance', type: 'hub', domain: 'governance', parentId: '', icon: 'Shield', focusArea: 'Planning' },
  { id: 'scope', title: 'Scope', type: 'hub', domain: 'delivery', parentId: '', icon: 'DraftingCompass', focusArea: 'Planning' },
  { id: 'sched', title: 'Schedule', type: 'hub', domain: 'schedule', parentId: '', icon: 'Calendar', focusArea: 'Planning' },
  { id: 'fin', title: 'Finance', type: 'hub', domain: 'finance', parentId: '', icon: 'Banknote', focusArea: 'Planning' },
  { id: 'stak', title: 'Stakeholders', type: 'hub', domain: 'stakeholders', parentId: '', icon: 'Users', focusArea: 'Planning' },
  { id: 'res', title: 'Resources', type: 'hub', domain: 'resources', parentId: '', icon: 'Package', focusArea: 'Planning' },
  { id: 'risk', title: 'Risk', type: 'hub', domain: 'risk', parentId: '', icon: 'AlertTriangle', focusArea: 'Planning' },

  // --- STAKEHOLDERS DOMAIN (REFINED PMBOK 8) ---
  { 
    id: '1.5.1', 
    title: 'Identify Stakeholders', 
    type: 'terminal', 
    domain: 'stakeholders', 
    focusArea: 'Initiating', 
    icon: 'UserSearch', 
    summary: 'Identify all individuals, groups, or organizations that could impact or be impacted by the project.',
    details: {
      inputs: ['business-case', 'project-charter', 'governance-framework', 'org-structure'],
      tools: ['Stakeholder Identification Techniques', 'Expert Judgment', 'Document Analysis'],
      outputs: ['stakeholder-register', 'stakeholder-list', 'stakeholder-classification']
    }
  },
  { 
    id: '1.5.2', 
    title: 'Analyze Stakeholders', 
    type: 'terminal', 
    domain: 'stakeholders', 
    focusArea: 'Initiating', 
    icon: 'Layout', 
    summary: 'Systematically gather and analyze stakeholders interests, expectations, and influence.',
    details: {
      inputs: ['stakeholder-register', 'stakeholder-list'],
      tools: ['Power-Interest Grid', 'Influence Analysis', 'Stakeholder Mapping'],
      outputs: ['stakeholder-analysis-matrix', 'stakeholder-prioritization', 'engagement-needs-overview']
    }
  },
  { 
    id: '2.5.1', 
    title: 'Develop Stakeholder Engagement Plan', 
    type: 'terminal', 
    domain: 'stakeholders', 
    focusArea: 'Planning', 
    icon: 'UserPlus', 
    summary: 'Define strategies to effectively engage stakeholders based on their needs, interests, and impact.',
    details: {
      inputs: ['stakeholder-register', 'stakeholder-analysis-matrix', 'comm-requirements', 'governance-management-plan'],
      tools: ['Engagement Planning Techniques', 'Communication Planning', 'Expert Judgment'],
      outputs: ['stakeholder-engagement-plan', 'communication-strategy', 'engagement-levels-definition']
    }
  },
  { 
    id: '2.5.2', 
    title: 'Define Communication Framework', 
    type: 'terminal', 
    domain: 'stakeholders', 
    focusArea: 'Planning', 
    icon: 'MessageSquare', 
    summary: 'Establish the project communication standards, channels, and reporting structures.',
    details: {
      inputs: ['stakeholder-engagement-plan', 'stakeholder-requirements', 'org-comm-policies', 'governance-management-plan'],
      tools: ['Communication Models', 'Information Distribution Planning', 'Technology Selection'],
      outputs: ['communication-plan', 'reporting-structure', 'comm-channels-matrix']
    }
  },
  { 
    id: '3.5.1', 
    title: 'Manage Stakeholder Engagement', 
    type: 'terminal', 
    domain: 'stakeholders', 
    focusArea: 'Executing', 
    icon: 'Handshake', 
    summary: 'Communicating and working with stakeholders to meet their needs and address issues as they occur.',
    details: {
      inputs: ['stakeholder-engagement-plan', 'communication-plan', 'stakeholder-register'],
      tools: ['Communication Tools', 'Conflict Management', 'Interpersonal Skills'],
      outputs: ['stakeholder-engagement-records', 'communication-logs', 'stakeholder-feedback-data']
    }
  },
  { 
    id: '3.5.2', 
    title: 'Facilitate Stakeholder Communication', 
    type: 'terminal', 
    domain: 'stakeholders', 
    focusArea: 'Executing', 
    icon: 'MessagesSquare', 
    summary: 'Execute the project communication plan to ensure timely distribution of project information.',
    details: {
      inputs: ['communication-plan', 'stakeholder-feedback-data', 'project-updates'],
      tools: ['Meetings', 'Reports', 'Collaboration Platforms'],
      outputs: ['stakeholder-updates', 'meeting-minutes', 'communication-records']
    }
  },
  { 
    id: '4.5.1', 
    title: 'Monitor Stakeholder Engagement', 
    type: 'terminal', 
    domain: 'stakeholders', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'Eye', 
    summary: 'Monitor project stakeholder relationships and tailor engagement strategies as needed.',
    details: {
      inputs: ['stakeholder-engagement-plan', 'communication-logs', 'stakeholder-feedback-data', 'work-performance-data'],
      tools: ['Engagement Assessment Matrix', 'Surveys', 'Performance Reviews'],
      outputs: ['stakeholder-engagement-reports', 'engagement-gap-analysis', 'engagement-improvement-actions']
    }
  },
  { 
    id: '4.5.2', 
    title: 'Manage Stakeholder Issues', 
    type: 'terminal', 
    domain: 'stakeholders', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'MessageCircleWarning', 
    summary: 'Identify and resolve project issues affecting stakeholder relationships and commitment.',
    details: {
      inputs: ['issue-logs', 'stakeholder-feedback-data', 'stakeholder-engagement-reports'],
      tools: ['Root Cause Analysis', 'Negotiation Techniques', 'Decision-Making Frameworks'],
      outputs: ['resolved-stakeholder-issues', 'stakeholder-issue-resolution-log', 'escalation-records']
    }
  },
  { 
    id: '5.5.1', 
    title: 'Evaluate Stakeholder Satisfaction', 
    type: 'terminal', 
    domain: 'stakeholders', 
    focusArea: 'Closing', 
    icon: 'Smile', 
    summary: 'Conduct end-of-project evaluations to assess stakeholder satisfaction and capture lessons learned.',
    details: {
      inputs: ['stakeholder-feedback-data', 'stakeholder-engagement-reports', 'accepted-deliverables'],
      tools: ['Surveys', 'Interviews', 'Lessons Learned Workshops'],
      outputs: ['stakeholder-satisfaction-report', 'stakeholder-lessons-learned', 'final-feedback-summary']
    }
  },
  { 
    id: '5.5.2', 
    title: 'Archive Stakeholder Records', 
    type: 'terminal', 
    domain: 'stakeholders', 
    focusArea: 'Closing', 
    icon: 'Archive', 
    summary: 'Securely archive all stakeholder records, communication logs, and feedback reports.',
    details: {
      inputs: ['stakeholder-documents', 'communication-logs', 'issue-logs', 'feedback-reports'],
      tools: ['Document Management Systems', 'Archiving Standards'],
      outputs: ['archived-stakeholder-records', 'stakeholder-archive-drive', 'final-stakeholder-documentation']
    }
  },
  { 
    id: '1.4.1', 
    title: 'Define Financial Feasibility', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Initiating', 
    icon: 'LineChart', 
    summary: 'Evaluate the economic viability of the project and define initial investment justifications.',
    details: {
      inputs: ['business-case', 'project-charter', 'org-strategy', 'high-level-scope-statement'],
      tools: ['Cost-Benefit Analysis', 'Financial Modeling', 'Expert Judgment'],
      outputs: ['financial-feasibility-report', 'initial-budget-range', 'investment-justification']
    }
  },
  { 
    id: '1.4.2', 
    title: 'Establish Funding Strategy', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Initiating', 
    icon: 'Wallet', 
    summary: 'Identify funding sources and establish the high-level budget allocation model.',
    details: {
      inputs: ['financial-feasibility-report', 'org-fin-policies', 'funding-sources-data'],
      tools: ['Funding Analysis', 'Scenario Analysis', 'Stakeholder Negotiation'],
      outputs: ['funding-strategy-plan', 'approved-budget-envelope', 'funding-allocation-model']
    }
  },
  { 
    id: '2.4.1', 
    title: 'Bill of Quantities (BOQ)', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Planning', 
    icon: 'Database', 
    summary: 'Centralized repository of all project quantities, units, and rates mapped to MasterFormat divisions.',
    details: {
      inputs: ['Approved Drawings', 'Technical Specifications'],
      tools: ['Quantity Take-off', 'Parametric Pricing'],
      outputs: ['BOQ Spreadsheet', 'Cost Estimate Basis']
    }
  },
  { 
    id: '2.4.2', 
    title: 'Develop Cost Estimates', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Planning', 
    icon: 'Calculator', 
    summary: 'Determine the specific costs for all project activities and resources.',
    details: {
      inputs: ['scope-baseline', 'wbs-structure', 'res-requirements', 'schedule-baseline'],
      tools: ['Parametric Estimation', 'Bottom-Up Estimation', 'Analogous Estimation'],
      outputs: ['cost-estimates', 'basis-of-estimates']
    }
  },
  { 
    id: '2.4.3', 
    title: 'Develop Project Budget', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Planning', 
    icon: 'Banknote', 
    summary: 'Aggregate cost estimates and reserves to establish the formal Cost Baseline.',
    details: {
      inputs: ['cost-estimates', 'funding-strategy-plan', 'schedule-baseline'],
      tools: ['Cost Aggregation', 'Reserve Analysis', 'Expert Judgment'],
      outputs: ['project-budget', 'cost-baseline', 'contingency-reserves']
    }
  },
  { 
    id: '2.4.4', 
    title: 'Define Financial Control Framework', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Planning', 
    icon: 'Lock', 
    summary: 'Establish the reporting and tracking mechanisms for financial monitoring.',
    details: {
      inputs: ['cost-baseline', 'governance-management-plan', 'org-fin-policies', 'governance-framework'],
      tools: ['Financial Control Systems', 'KPI Definition', 'Reporting Framework Design'],
      outputs: ['financial-control-plan', 'cost-tracking-system-structure', 'fin-reporting-templates']
    }
  },
  { 
    id: '3.4.1', 
    title: 'Manage Project Funding', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Executing', 
    icon: 'Coins', 
    summary: 'Coordinate fund disbursements and monitor project cash flow.',
    details: {
      inputs: ['project-budget', 'funding-strategy-plan', 'cash-flow-forecast'],
      tools: ['Financial Management Systems', 'Payment Scheduling', 'Fund Allocation Methods'],
      outputs: ['fund-disbursement-records', 'updated-cash-flow-data', 'fin-transactions-log']
    }
  },
  { 
    id: '3.4.2', 
    title: 'Record Project Costs', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Executing', 
    icon: 'Receipt', 
    summary: 'Maintain accurate ledgers of all project expenses and actual resource usage costs.',
    details: {
      inputs: ['actual-performance-data', 'res-usage-data', 'fin-transactions-log'],
      tools: ['Cost Tracking Systems', 'Accounting Tools', 'Time & Cost Logging'],
      outputs: ['actual-cost-data', 'cost-ledger', 'expense-reports']
    }
  },
  { 
    id: '4.4.1', 
    title: 'Monitor Financial Performance', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'PieChart', 
    summary: 'Perform EVM analysis to track cost variance and forecast final expenditure.',
    details: {
      inputs: ['cost-baseline', 'actual-cost-data', 'work-performance-data'],
      tools: ['Earned Value Analysis (EVM)', 'Variance Analysis', 'Trend Analysis'],
      outputs: ['cost-performance-reports', 'cost-variance-cv', 'financial-forecasts']
    }
  },
  { 
    id: '4.4.2', 
    title: 'Control Budget Changes', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'Scale', 
    summary: 'Manage budget modifications through controlled change requests and impact analysis.',
    details: {
      inputs: ['cost-baseline', 'change-requests', 'cost-performance-reports'],
      tools: ['Change Control System', 'Impact Analysis', 'What-if Analysis'],
      outputs: ['approved-budget-changes', 'updated-cost-baseline', 'budget-change-log']
    }
  },
  { 
    id: '3.4.3', 
    title: 'Purchase Order Tracking', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Executing', 
    icon: 'ShoppingCart', 
    summary: 'Tracking system for all project purchase orders from commitment to payment.',
    details: {
      inputs: ['Approved Requisitions', 'Vendor Contracts'],
      tools: ['ERP Connector', 'PO Management System'],
      outputs: ['Open PO Report', 'Committed Cost Variance']
    }
  },
  { 
    id: '3.4.4', 
    title: 'Sub-Contractor Advances', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Executing', 
    icon: 'Wallet', 
    summary: 'Manage contractor advance payments and retention release tracking.',
    details: {
      inputs: ['Contract Agreements', 'Advance Payment Bonds'],
      tools: ['Payment Milestone Tracker', 'Retention Management'],
      outputs: ['Advance Reconciliations', 'Retention Release Board']
    }
  },
  { 
    id: '5.4.1', 
    title: 'Final Financial Closure', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Closing', 
    icon: 'CheckCircle', 
    summary: 'Finalize financial reconciliations and obtain official cost closure approval.',
    details: {
      inputs: ['actual-cost-data', 'project-budget', 'cost-performance-reports', 'accepted-deliverables'],
      tools: ['Financial Reconciliation', 'Audit Procedures'],
      outputs: ['final-financial-report', 'budget-utilization-summary', 'fin-closure-approval']
    }
  },
  { 
    id: '5.4.2', 
    title: 'Archive Financial Records', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Closing', 
    icon: 'FolderArchive', 
    summary: 'Officially archive all financial ledgers, audit logs, and reports in the repository.',
    details: {
      inputs: ['financial-documents', 'cost-reports', 'budget-logs', 'audit-records'],
      tools: ['Document Management Systems', 'Archiving Standards'],
      outputs: ['archived-fin-records', 'fin-archive-drive', 'final-fin-documentation']
    }
  },
  { 
    id: '1.3.1', 
    title: 'Define High-Level Timeline', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Initiating', 
    icon: 'Clock', 
    summary: 'Establish the broad project timeline and identify critical milestones for the project lifecycle.',
    details: {
      inputs: ['business-case', 'project-charter', 'high-level-scope-statement', 'stakeholder-register'],
      tools: ['Expert Judgment', 'Analogous Estimation', 'Milestone Analysis'],
      outputs: ['high-level-timeline', 'key-milestones-list', 'initial-time-constraints']
    }
  },
  { 
    id: '1.3.2', 
    title: 'Identify Major Activities', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Initiating', 
    icon: 'ListTodo', 
    summary: 'Decompose core deliverables into the primary activities required for execution.',
    details: {
      inputs: ['high-level-scope-statement', 'initial-deliverables-list', 'wbs-structure'],
      tools: ['Decomposition', 'Expert Judgment', 'Rolling Wave Planning'],
      outputs: ['high-level-activity-list', 'initial-activity-attributes']
    }
  },
  { 
    id: '2.3.1', 
    title: 'Activity Definition Table', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Planning', 
    icon: 'List', 
    summary: 'Detailed list of activities, quantities, and attributes sorted by WBS structure.',
    details: {
      inputs: ['wbs-structure', 'work-packages-list', 'detailed-scope-statement'],
      tools: ['Decomposition', 'Rolling Wave Planning'],
      outputs: ['detailed-activity-list', 'activity-attributes']
    }
  },
  { 
    id: '2.3.2', 
    title: 'Sequence Activities (Network)', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Planning', 
    icon: 'ArrowRightLeft', 
    summary: 'Identify dependencies and establish the logical progression of tasks.',
    details: {
      inputs: ['detailed-activity-list', 'activity-attributes'],
      tools: ['Precedence Diagramming Method (PDM)', 'Dependency Determination', 'Network Analysis'],
      outputs: ['project-network-diagram', 'activity-sequencing-data']
    }
  },
  { 
    id: '2.3.3', 
    title: 'Master Schedule (Gantt)', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Planning', 
    icon: 'BarChart3', 
    summary: 'The master project schedule showing all activities, dependencies, and critical path in a Gantt view.',
    details: {
      inputs: ['Activity List', 'Activity Attributes', 'Project Network Diagram', 'Resource Calendars'],
      tools: ['Scheduling Software', 'Critical Path Method', 'Resource Leveling'],
      outputs: ['Project Schedule', 'Schedule Baseline', 'Schedule Data']
    }
  },
  { 
    id: '3.3.2', 
    title: 'Progress Update (Gantt)', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Executing', 
    icon: 'TrendingUp', 
    summary: 'Executive schedule view showing progress bars and updated actual dates against the baseline.',
    details: {
      inputs: ['Schedule Baseline', 'Actual Progress Data'],
      tools: ['Variance Visualization', 'Status Reporting'],
      outputs: ['Updated Project Schedule']
    }
  },
  { 
    id: '2.3.4', 
    title: 'Estimate Activity Durations', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Planning', 
    icon: 'History', 
    summary: 'Determine the time required to complete each activity using various estimation techniques.',
    details: {
      inputs: ['detailed-activity-list', 'res-requirements', 'historical-data', 'activity-sequencing-data'],
      tools: ['Three-Point Estimation', 'Parametric Estimation', 'Expert Judgment'],
      outputs: ['activity-duration-estimates', 'basis-of-estimates']
    }
  },
  { 
    id: '2.3.5', 
    title: 'Develop Schedule Baseline', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Planning', 
    icon: 'CalendarDays', 
    summary: 'Aggregate durations and sequences to create the formal Project Schedule and Baseline.',
    details: {
      inputs: ['activity-sequencing-data', 'activity-duration-estimates', 'resource-availability', 'detailed-scope-statement'],
      tools: ['Critical Path Method (CPM)', 'Schedule Compression', 'Scheduling Software'],
      outputs: ['project-schedule', 'schedule-baseline', 'schedule-model']
    }
  },
  { 
    id: '3.3.1', 
    title: 'Manage Schedule Execution', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Executing', 
    icon: 'Play', 
    summary: 'Coordinate team actions and track daily progress against the established schedule model.',
    details: {
      inputs: ['schedule-baseline', 'resource-assignments', 'resource-management-plan'],
      tools: ['Task Tracking Systems', 'Team Coordination', 'Progress Updates'],
      outputs: ['updated-schedule-data', 'work-performance-data', 'progress-reports']
    }
  },
  { 
    id: '3.3.3', 
    title: 'Daily Progress Reports', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Executing', 
    icon: 'FileText', 
    summary: 'Formal daily logs of site activities, manpower, equipment, and weather conditions.',
    details: {
      inputs: ['Schedule Baseline', 'Site Observation Logs', 'Manpower Logs'],
      tools: ['Daily Log Templates', 'Mobile Field Reporting'],
      outputs: ['Daily Progress Reports', 'Work Performance Data']
    }
  },
  { 
    id: '4.3.1', 
    title: 'Monitor Schedule Performance', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'Gauge', 
    summary: 'Analyze schedule variance and utilize EVM to ensure the project remains on track.',
    details: {
      inputs: ['work-performance-data', 'schedule-baseline', 'progress-reports'],
      tools: ['Schedule Variance Analysis', 'Earned Value Analysis (EVM)', 'Trend Analysis'],
      outputs: ['schedule-performance-reports', 'schedule-variance-reports', 'forecast-updates']
    }
  },
  { 
    id: '4.3.2', 
    title: 'Control Schedule Changes', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'Settings2', 
    summary: 'Formally manage modifications to the schedule baseline through impact analysis.',
    details: {
      inputs: ['schedule-baseline', 'change-requests', 'schedule-performance-reports'],
      tools: ['Change Control System', 'Impact Analysis', 'What-if Scenario Analysis'],
      outputs: ['approved-schedule-changes', 'updated-schedule-baseline', 'schedule-change-log']
    }
  },
  { 
    id: '5.3.1', 
    title: 'Final Schedule Validation', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Closing', 
    icon: 'CheckCircle2', 
    summary: 'Obtain stakeholder acceptance for the final schedule performance and project duration.',
    details: {
      inputs: ['final-schedule-data', 'accepted-deliverables', 'schedule-performance-reports'],
      tools: ['Final Analysis', 'Stakeholder Review Meetings'],
      outputs: ['final-approved-schedule', 'schedule-closure-report', 'schedule-lessons-learned']
    }
  },
  { 
    id: '5.3.2', 
    title: 'Archive Schedule Records', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Closing', 
    icon: 'Library', 
    summary: 'Consolidate and archive all schedule artifacts, baselines, and logs for future reference.',
    details: {
      inputs: ['schedule-baseline', 'schedule-performance-reports', 'schedule-change-log'],
      tools: ['Document Management Systems', 'Archiving Standards'],
      outputs: ['archived-schedule-records', 'schedule-archive-drive', 'final-schedule-documentation']
    }
  },
  { 
    id: '1.2.1', 
    title: 'Define High-Level Scope', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Initiating', 
    icon: 'DraftingCompass', 
    summary: 'Identify the broad boundaries, high-level deliverables, and initial scope constraints.',
    details: {
      inputs: ['business-case', 'project-charter', 'stakeholder-register', 'governance-framework'],
      tools: ['Expert Judgment', 'Stakeholder Workshops', 'Document Analysis'],
      outputs: ['high-level-scope-statement', 'initial-deliverables-list', 'scope-boundaries']
    }
  },
  { 
    id: '1.2.2', 
    title: 'Identify Key Requirements', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Initiating', 
    icon: 'ClipboardList', 
    summary: 'Gather and prioritize high-level stakeholder needs and project requirements.',
    details: {
      inputs: ['stakeholder-register', 'high-level-scope-statement', 'business-needs'],
      tools: ['Interviews', 'Brainstorming', 'Surveys & Questionnaires'],
      outputs: ['initial-requirements-list', 'stakeholder-needs-matrix']
    }
  },
  { 
    id: '2.2.1', 
    title: 'Develop Detailed Scope Baseline', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Planning', 
    icon: 'FileSearch', 
    summary: 'Expand high-level scope into a detailed baseline with firm assumptions and constraints.',
    details: {
      inputs: ['high-level-scope-statement', 'initial-requirements-list', 'stakeholder-needs-matrix'],
      tools: ['Requirements Analysis', 'Decomposition', 'Scope Modeling'],
      outputs: ['detailed-scope-statement', 'scope-baseline', 'scope-assumptions-log']
    }
  },
  { 
    id: '2.2.2', 
    title: 'Create Work Breakdown Structure (WBS)', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Planning', 
    icon: 'Network', 
    summary: 'Decompose project deliverables into manageable work packages.',
    details: {
      inputs: ['detailed-scope-statement', 'scope-baseline'],
      tools: ['Decomposition Techniques', 'WBS Templates', 'Expert Judgment'],
      outputs: ['wbs-structure', 'wbs-dictionary', 'work-packages-list']
    }
  },
  { 
    id: '2.2.3', 
    title: 'Define Scope Validation Criteria', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Planning', 
    icon: 'CheckSquare', 
    summary: 'Establish the formal acceptance criteria for all project deliverables.',
    details: {
      inputs: ['scope-baseline', 'initial-requirements-list'],
      tools: ['Acceptance Criteria Definition', 'Quality Planning Techniques'],
      outputs: ['acceptance-criteria', 'scope-validation-plan']
    }
  },
  { 
    id: '2.2.5', 
    title: 'WBS Explorer (Zones/Areas)', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Planning', 
    icon: 'Layers', 
    summary: 'Hierarchical view of the WBS divided by project Zones, Areas, Buildings, and Work Packages.',
    details: {
      inputs: ['WBS Dictionary', 'Project Layout'],
      tools: ['Hierarchical Visualization', 'Drill-down Analysis'],
      outputs: ['Spatial-WBS mapping', 'Cost Account Structure']
    }
  },
  { 
    id: '2.2.7', 
    title: 'Work Package Definitions', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Planning', 
    icon: 'Package', 
    summary: 'Detailed definitions and requirements for individual project work packages.',
    details: {
      inputs: ['WBS Structure', 'Scope Baseline'],
      tools: ['Decomposition', 'Rolling Wave Planning'],
      outputs: ['Work Package List', 'Work Package Dictionary']
    }
  },
  { 
    id: '3.2.1', 
    title: 'Manage Scope Execution', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Executing', 
    icon: 'ClipboardList', 
    summary: 'Directly manage the production of deliverables based on work package definitions.',
    details: {
      inputs: ['wbs-structure', 'work-packages-list', 'scope-baseline'],
      tools: ['Task Management Systems', 'Team Coordination', 'Work Authorization Systems'],
      outputs: ['completed-deliverables', 'scope-performance-data']
    }
  },
  { 
    id: '3.2.2', 
    title: 'Validate Deliverables', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Executing', 
    icon: 'ShieldCheck', 
    summary: 'Verify that completed deliverables meet the defined acceptance criteria.',
    details: {
      inputs: ['completed-deliverables', 'acceptance-criteria', 'scope-validation-plan'],
      tools: ['Inspections', 'Reviews', 'Testing'],
      outputs: ['accepted-deliverables', 'validation-records', 'rejected-deliverables']
    }
  },
  { 
    id: '4.2.1', 
    title: 'Control Scope Changes', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'GitBranch', 
    summary: 'Manage changes to the scope baseline through impact analysis and formal approvals.',
    details: {
      inputs: ['scope-baseline', 'change-requests', 'scope-performance-data'],
      tools: ['Change Control System', 'Impact Analysis', 'Decision Frameworks'],
      outputs: ['approved-scope-changes', 'updated-scope-baseline', 'scope-change-log']
    }
  },
  { 
    id: '4.2.2', 
    title: 'Monitor Scope Performance', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'Activity', 
    summary: 'Track scope variance and trend performance against the baseline.',
    details: {
      inputs: ['scope-performance-data', 'scope-baseline', 'validation-records'],
      tools: ['Variance Analysis', 'Trend Analysis', 'Performance Reviews'],
      outputs: ['scope-performance-reports', 'scope-variance-reports', 'corrective-actions']
    }
  },
  { 
    id: '5.2.1', 
    title: 'Final Scope Validation', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Closing', 
    icon: 'Flag', 
    summary: 'Obtain formal stakeholder sign-off for the completed project scope.',
    details: {
      inputs: ['accepted-deliverables', 'scope-baseline', 'scope-performance-reports'],
      tools: ['Final Inspection', 'Stakeholder Approval Meetings'],
      outputs: ['final-accepted-scope', 'accepted-deliverables', 'client-sign-off']
    }
  },
  { 
    id: '5.2.2', 
    title: 'Archive Scope Documentation', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Closing', 
    icon: 'Archive', 
    summary: 'Store all final scope records, WBS data, and validation logs in the project archive.',
    details: {
      inputs: ['detailed-scope-statement', 'wbs-structure', 'validation-records', 'scope-change-log'],
      tools: ['Document Management Systems', 'Archiving Standards'],
      outputs: ['archived-scope-records', 'scope-structured-folder', 'final-scope-documentation']
    }
  },
  { 
    id: '1.1.1', 
    title: 'Project Charter (Governance Framework)', 
    type: 'terminal', 
    domain: 'governance', 
    focusArea: 'Initiating', 
    icon: 'Shield', 
    summary: 'Define the governing framework, roles, and decision-making model for project oversight.',
    details: {
      inputs: ['org-strategy', 'business-case', 'eef', 'opa'],
      tools: ['Expert Judgment', 'Governance Framework Modeling', 'Stakeholder Alignment Workshops'],
      outputs: ['governance-framework', 'governance-structure', 'decision-making-model']
    }
  },
  { 
    id: '1.1.2', 
    title: 'Define Project Value Alignment', 
    type: 'terminal', 
    domain: 'governance', 
    focusArea: 'Initiating', 
    icon: 'Target', 
    summary: 'Ensure project objectives align with organizational value targets and strategic KPIs.',
    details: {
      inputs: ['business-case', 'strategic-objectives', 'stakeholder-expectations'],
      tools: ['Value Analysis', 'Benefit Mapping', 'Alignment Workshops'],
      outputs: ['value-alignment-statement', 'success-criteria-definition', 'high-level-kpis']
    }
  },
  { 
    id: '2.1.1', 
    title: 'Develop Governance Management Plan', 
    type: 'terminal', 
    domain: 'governance', 
    focusArea: 'Planning', 
    icon: 'FileText', 
    summary: 'Formalize the plan for managing governance, including escalation and approval workflows.',
    details: {
      inputs: ['governance-framework', 'value-alignment-statement', 'org-policies'],
      tools: ['Planning Workshops', 'Governance Templates', 'Expert Judgment'],
      outputs: ['governance-management-plan', 'escalation-procedures', 'approval-workflows']
    }
  },
  { 
    id: '2.1.2', 
    title: 'Project Management Plan (Metrics & Control)', 
    type: 'terminal', 
    domain: 'governance', 
    focusArea: 'Planning', 
    icon: 'Activity', 
    summary: 'Establish the KPIs and dashboard structures for governance monitoring.',
    details: {
      inputs: ['governance-management-plan', 'success-criteria-definition', 'org-kpis'],
      tools: ['KPI Definition Techniques', 'Performance Measurement Frameworks', 'Benchmarking'],
      outputs: ['gov-metrics-framework', 'perf-indicators-dashboard', 'reporting-templates']
    }
  },
  { 
    id: '3.1.1', 
    title: 'Implement Governance Framework', 
    type: 'terminal', 
    domain: 'governance', 
    focusArea: 'Executing', 
    icon: 'Zap', 
    summary: 'Activate the governance system and maintain records of decisions and meetings.',
    details: {
      inputs: ['governance-management-plan', 'governance-structure', 'approval-workflows'],
      tools: ['Communication Systems', 'Workflow Automation Tools', 'Collaboration Platforms'],
      outputs: ['active-governance-system', 'decision-logs', 'meeting-records']
    }
  },
  { 
    id: '3.1.2', 
    title: 'Enable Governance Communication', 
    type: 'terminal', 
    domain: 'governance', 
    focusArea: 'Executing', 
    icon: 'MessageSquare', 
    summary: 'Distribute governance reports and manage stakeholder updates.',
    details: {
      inputs: ['governance-management-plan', 'communication-requirements'],
      tools: ['Communication Planning', 'Reporting Systems', 'Dashboard Tools'],
      outputs: ['governance-reports', 'stakeholder-updates', 'communication-logs']
    }
  },
  { 
    id: '4.1.1', 
    title: 'Monitor Governance Performance', 
    type: 'terminal', 
    domain: 'governance', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'Activity', 
    summary: 'Analyze performance data and trends to identify governance deviations.',
    details: {
      inputs: ['gov-metrics-framework', 'governance-reports', 'decision-logs'],
      tools: ['Performance Analysis', 'Variance Analysis', 'Trend Analysis'],
      outputs: ['gov-performance-reports', 'deviation-analysis', 'gov-recommendations']
    }
  },
  { 
    id: '4.1.2', 
    title: 'Manage Governance Issues & Escalations', 
    type: 'terminal', 
    domain: 'governance', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'AlertCircle', 
    summary: 'Resolve governance conflicts and manage escalations through defined procedures.',
    details: {
      inputs: ['issue-logs', 'gov-performance-reports', 'escalation-procedures'],
      tools: ['Root Cause Analysis', 'Decision Frameworks', 'Escalation Models'],
      outputs: ['resolved-issues-log', 'escalation-records', 'corrective-actions']
    }
  },
  { 
    id: '5.1.1', 
    title: 'Evaluate Governance Effectiveness', 
    type: 'terminal', 
    domain: 'governance', 
    focusArea: 'Closing', 
    icon: 'Award', 
    summary: 'Conduct a final review of governance effectiveness and recommend future improvements.',
    details: {
      inputs: ['gov-performance-reports', 'lessons-learned-data', 'stakeholder-feedback'],
      tools: ['Performance Review', 'Lessons Learned Workshops', 'Benchmarking'],
      outputs: ['gov-evaluation-report', 'improvement-recommendations', 'gov-best-practices']
    }
  },
  { 
    id: '5.1.2', 
    title: 'Archive Governance Artifacts', 
    type: 'terminal', 
    domain: 'governance', 
    focusArea: 'Closing', 
    icon: 'Box', 
    summary: 'Officially archive all governance records and decision logs to the project repository.',
    details: {
      inputs: ['project-documents', 'governance-reports', 'decision-logs'],
      tools: ['Document Management Systems', 'Archiving Standards'],
      outputs: ['archived-gov-records', 'structured-folder-drive', 'final-gov-documentation']
    }
  },

  // --- RESOURCES DOMAIN (REFINED PMBOK 8) ---
  { 
    id: '1.6.1', 
    title: 'Identify Resource Requirements (High-Level)', 
    type: 'terminal', 
    domain: 'resources', 
    focusArea: 'Initiating', 
    icon: 'Search', 
    summary: 'Identify the broad types and categories of resources needed for the project lifecycle.',
    details: {
      inputs: ['business-case', 'project-charter', 'high-level-scope-statement', 'initial-stakeholder-requirements'],
      tools: ['Expert Judgment', 'Analogous Estimation', 'Stakeholder Workshops'],
      outputs: ['high-level-resource-requirements', 'initial-resource-categories', 'resource-constraints']
    }
  },
  { 
    id: '1.6.2', 
    title: 'Define Resource Strategy', 
    type: 'terminal', 
    domain: 'resources', 
    focusArea: 'Initiating', 
    icon: 'Compass', 
    summary: 'Establish the high-level sourcing and acquisition model for project resources.',
    details: {
      inputs: ['high-level-resource-requirements', 'org-resource-policies', 'market-availability-data'],
      tools: ['Resource Sourcing Analysis', 'Make-or-Buy Analysis', 'Capacity Planning'],
      outputs: ['resource-strategy-plan', 'sourcing-model', 'resource-acquisition-approach']
    }
  },
  { 
    id: '2.6.1', 
    title: 'Estimate Detailed Resource Requirements', 
    type: 'terminal', 
    domain: 'resources', 
    focusArea: 'Planning', 
    icon: 'Calculator', 
    summary: 'Analyze work packages and activities to determine specific resource needs.',
    details: {
      inputs: ['wbs-structure', 'work-packages-list', 'detailed-activity-list', 'resource-strategy-plan'],
      tools: ['Bottom-Up Estimation', 'Parametric Estimation', 'Expert Judgment'],
      outputs: ['detailed-resource-requirements', 'resource-breakdown-structure-rbs', 'resource-attributes']
    }
  },
  { 
    id: '2.6.2', 
    title: 'Develop Resource Plan', 
    type: 'terminal', 
    domain: 'resources', 
    focusArea: 'Planning', 
    icon: 'Briefcase', 
    summary: 'Create a formal plan for managing, allocating, and tracking project resources.',
    details: {
      inputs: ['detailed-resource-requirements', 'schedule-baseline', 'resource-availability'],
      tools: ['Resource Planning Techniques', 'Resource Calendars', 'Optimization Methods'],
      outputs: ['resource-management-plan', 'resource-allocation-matrix', 'resource-calendars']
    }
  },
  { 
    id: '2.6.3', 
    title: 'Define Resource Control Framework', 
    type: 'terminal', 
    domain: 'resources', 
    focusArea: 'Planning', 
    icon: 'ShieldCheck', 
    summary: 'Establish the KPIs and tracking systems for monitoring resource performance.',
    details: {
      inputs: ['resource-management-plan', 'governance-management-plan', 'org-policies', 'governance-framework'],
      tools: ['KPI Definition', 'Resource Tracking Systems', 'Performance Framework Design'],
      outputs: ['resource-control-plan', 'resource-tracking-structure', 'resource-performance-metrics']
    }
  },
  { 
    id: '3.3.4', 
    title: 'Vendor Master Register', 
    type: 'terminal', 
    domain: 'resources', 
    focusArea: 'Executing', 
    icon: 'Truck', 
    summary: 'Manage project-specific vendors, suppliers, and service providers.',
    details: {
      inputs: ['resource-management-plan', 'procurement-strategy', 'vendor-contracts'],
      tools: ['Vendor Management System', 'Rating & Assessment'],
      outputs: ['vendor-master-register', 'approved-vendor-list']
    }
  },
  { 
    id: '3.6.3', 
    title: 'Project Task Manager', 
    type: 'terminal', 
    domain: 'resources', 
    focusArea: 'Executing', 
    icon: 'CheckSquare', 
    summary: 'Comprehensive task management system for assigning and tracking work package execution.',
    details: {
      inputs: ['WBS Dictionary', 'Resource Management Plan'],
      tools: ['Kanban Boards', 'Agile Task Management'],
      outputs: ['Completed Tasks', 'Team Velocity Reports']
    }
  },
  { 
    id: '3.6.4', 
    title: 'Meetings & Minutes', 
    type: 'terminal', 
    domain: 'resources', 
    focusArea: 'Executing', 
    icon: 'MessagesSquare', 
    summary: 'Centralized repository for all project meetings, agendas, and formal minutes of meetings.',
    details: {
      inputs: ['Stakeholder Register', 'Project Charter'],
      tools: ['Meeting Management Systems', 'Transcription Tools'],
      outputs: ['Minutes of Meeting (MOM)', 'Action Items Log']
    }
  },
  { 
    id: '3.6.1', 
    title: 'Acquire Resources', 
    type: 'terminal', 
    domain: 'resources', 
    focusArea: 'Executing', 
    icon: 'UserPlus', 
    summary: 'Secure the necessary human, material, and equipment resources for execution.',
    details: {
      inputs: ['resource-management-plan', 'resource-strategy-plan', 'detailed-resource-requirements'],
      tools: ['Procurement Processes', 'Recruitment', 'Negotiation'],
      outputs: ['acquired-resources', 'resource-assignment-records', 'contracts']
    }
  },
  { 
    id: '3.6.2', 
    title: 'Develop and Manage Team / Resources', 
    type: 'terminal', 
    domain: 'resources', 
    focusArea: 'Executing', 
    icon: 'Users', 
    summary: 'Focus on improving team performance and managing resource utilization.',
    details: {
      inputs: ['acquired-resources', 'resource-management-plan', 'actual-performance-data'],
      tools: ['Training', 'Team Building', 'Performance Management'],
      outputs: ['team-performance-improvements', 'resource-utilization-data', 'updated-resource-assignments']
    }
  },
  { 
    id: '4.6.1', 
    title: 'Monitor Resource Performance', 
    type: 'terminal', 
    domain: 'resources', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'Activity', 
    summary: 'Analyze resource consumption and performance data against metrics.',
    details: {
      inputs: ['resource-utilization-data', 'resource-performance-metrics', 'actual-performance-data'],
      tools: ['Performance Analysis', 'Variance Analysis', 'Productivity Measurement'],
      outputs: ['resource-performance-reports', 'utilization-reports', 'efficiency-metrics']
    }
  },
  { 
    id: '4.6.2', 
    title: 'Control Resource Allocation', 
    type: 'terminal', 
    domain: 'resources', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'Settings', 
    summary: 'Ensure resource assignments are optimized through reallocation and balancing.',
    details: {
      inputs: ['resource-management-plan', 'resource-performance-reports', 'change-requests'],
      tools: ['Resource Optimization', 'Reallocation Techniques', 'What-if Analysis'],
      outputs: ['updated-resource-allocation', 'resource-change-log', 'corrective-actions']
    }
  },
  { 
    id: '5.6.1', 
    title: 'Release Resources', 
    type: 'terminal', 
    domain: 'resources', 
    focusArea: 'Closing', 
    icon: 'LogOut', 
    summary: 'Formal release and offboarding of resources upon project completion.',
    details: {
      inputs: ['resource-assignment-records', 'final-accepted-scope', 'contracts', 'accepted-deliverables'],
      tools: ['Resource Release Procedures', 'Contract Closure'],
      outputs: ['released-resources', 'resource-release-records', 'contract-closure-documents']
    }
  },
  { 
    id: '5.6.2', 
    title: 'Archive Resource Records', 
    type: 'terminal', 
    domain: 'resources', 
    focusArea: 'Closing', 
    icon: 'Box', 
    summary: 'Archive final utilization logs, performance reviews, and contract data.',
    details: {
      inputs: ['archived-resource-records', 'resource-performance-reports', 'contracts', 'resource-utilization-data'],
      tools: ['Document Management Systems', 'Archiving Standards'],
      outputs: ['final-archived-resource-records', 'resource-structured-folder', 'final-resource-documentation']
    }
  },

  // --- RISK DOMAIN (REFINED PMBOK 8) ---
  { 
    id: '1.7.1', 
    title: 'Identify High-Level Risks', 
    type: 'terminal', 
    domain: 'risk', 
    focusArea: 'Initiating', 
    icon: 'ShieldAlert', 
    summary: 'Identify broad project risks and opportunities early in the project initiation phase.',
    details: {
      inputs: ['business-case', 'project-charter', 'high-level-scope-statement', 'stakeholder-register', 'eef'],
      tools: ['Expert Judgment', 'Brainstorming', 'SWOT Analysis'],
      outputs: ['initial-risk-register', 'high-level-risk-list', 'initial-risk-categories']
    }
  },
  { 
    id: '1.7.2', 
    title: 'Define Risk Strategy', 
    type: 'terminal', 
    domain: 'risk', 
    focusArea: 'Initiating', 
    icon: 'Compass', 
    summary: 'Establish the methodology and appetite for project risk management.',
    details: {
      inputs: ['initial-risk-register', 'org-risk-policies', 'governance-framework'],
      tools: ['Risk Strategy Workshops', 'Expert Judgment', 'Policy Analysis'],
      outputs: ['risk-management-strategy', 'risk-appetite-thresholds', 'risk-categories-rbs']
    }
  },
  { 
    id: '2.7.1', 
    title: 'Identify Detailed Risks', 
    type: 'terminal', 
    domain: 'risk', 
    focusArea: 'Planning', 
    icon: 'Search', 
    summary: 'Conduct 360-degree risk identification sessions to capture all technical and organizational risks.',
    details: {
      inputs: ['scope-baseline', 'schedule-baseline', 'cost-baseline', 'stakeholder-analysis-matrix', 'risk-management-strategy'],
      tools: ['Brainstorming', 'Delphi Technique', 'Checklist Analysis'],
      outputs: ['updated-risk-register', 'detailed-risk-list', 'risk-descriptions']
    }
  },
  { 
    id: '2.7.2', 
    title: 'Perform Qualitative Risk Analysis', 
    type: 'terminal', 
    domain: 'risk', 
    focusArea: 'Planning', 
    icon: 'BarChart3', 
    summary: 'Prioritize risks for further analysis or action by assessing their probability and impact.',
    details: {
      inputs: ['updated-risk-register', 'risk-categories-rbs', 'risk-criteria'],
      tools: ['Probability-Impact Matrix', 'Expert Judgment', 'Risk Ranking Methods'],
      outputs: ['prioritized-risk-list', 'risk-scores', 'qualitative-risk-register']
    }
  },
  { 
    id: '2.7.3', 
    title: 'Perform Quantitative Risk Analysis', 
    type: 'terminal', 
    domain: 'risk', 
    focusArea: 'Planning', 
    icon: 'Calculator', 
    summary: 'Analyze the effect of identified risks on overall project objectives using statistical modeling.',
    details: {
      inputs: ['prioritized-risk-list', 'cost-baseline', 'schedule-baseline'],
      tools: ['Monte Carlo Simulation', 'Sensitivity Analysis', 'Decision Tree Analysis'],
      outputs: ['quant-risk-report', 'probability-of-success', 'cost-schedule-risk-impacts']
    }
  },
  { 
    id: '2.7.4', 
    title: 'Plan Risk Responses', 
    type: 'terminal', 
    domain: 'risk', 
    focusArea: 'Planning', 
    icon: 'ShieldCheck', 
    summary: 'Develop options and actions to enhance opportunities and reduce threats.',
    details: {
      inputs: ['prioritized-risk-list', 'quant-risk-report', 'risk-management-strategy'],
      tools: ['Response Strategies', 'Contingency Planning', 'Expert Judgment'],
      outputs: ['risk-response-plan', 'risk-action-plans', 'risk-contingency-reserves']
    }
  },
  { 
    id: '3.7.1', 
    title: 'Implement Risk Responses', 
    type: 'terminal', 
    domain: 'risk', 
    focusArea: 'Executing', 
    icon: 'Zap', 
    summary: 'Ensure that agreed-upon risk responses are executed as planned.',
    details: {
      inputs: ['risk-response-plan', 'updated-risk-register', 'resource-assignment-records'],
      tools: ['Task Management Systems', 'Coordination', 'Communication'],
      outputs: ['implemented-risk-actions', 'active-risk-register', 'residual-risks']
    }
  },
  { 
    id: '4.7.1', 
    title: 'Monitor Risks', 
    type: 'terminal', 
    domain: 'risk', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'Eye', 
    summary: 'Track identified risks, monitor residual risks, and identify new risks.',
    details: {
      inputs: ['updated-risk-register', 'actual-performance-data', 'risk-action-status'],
      tools: ['Risk Audits', 'Variance Analysis', 'Trend Analysis'],
      outputs: ['risk-performance-reports', 'new-risks-identified', 'monitored-risk-register']
    }
  },
  { 
    id: '4.7.2', 
    title: 'Control Risk Responses', 
    type: 'terminal', 
    domain: 'risk', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'Settings', 
    summary: 'Manage risk response adjustments and ensure effectiveness through change control.',
    details: {
      inputs: ['risk-performance-reports', 'updated-risk-register', 'change-requests'],
      tools: ['Change Control System', 'Root Cause Analysis', 'What-if Analysis'],
      outputs: ['updated-risk-responses', 'risk-change-log', 'risk-corrective-actions']
    }
  },
  { 
    id: '5.7.1', 
    title: 'Evaluate Risk Management Effectiveness', 
    type: 'terminal', 
    domain: 'risk', 
    focusArea: 'Closing', 
    icon: 'Award', 
    summary: 'Conduct a final audit on risk effectiveness and capture lessons learned.',
    details: {
      inputs: ['risk-performance-reports', 'final-risk-register', 'lessons-learned-data'],
      tools: ['Lessons Learned Workshops', 'Performance Review', 'Benchmarking'],
      outputs: ['risk-evaluation-report', 'risk-lessons-learned', 'risk-best-practices']
    }
  },
  { 
    id: '5.7.2', 
    title: 'Archive Risk Records', 
    type: 'terminal', 
    domain: 'risk', 
    focusArea: 'Closing', 
    icon: 'Archive', 
    summary: 'Archive final risk register and response logs in the project repository.',
    details: {
      inputs: ['risk-documents', 'final-risk-register', 'risk-performance-reports', 'risk-change-log'],
      tools: ['Document Management Systems', 'Archiving Standards'],
      outputs: ['archived-risk-records', 'risk-archive-drive', 'final-risk-documentation']
    }
  },
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
