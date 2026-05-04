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
  { uid: 'u2', name: 'Ahmed Hassan', email: 'ahmed@pmis.com', photoURL: 'https://picsum.photos/seed/ahmed/200', role: 'engineer', accessiblePages: [], accessibleProjects: [] },
  { uid: 'u3', name: 'Sarah Jones', email: 'sarah@pmis.com', photoURL: 'https://picsum.photos/seed/sarah/200', role: 'engineer', accessiblePages: [], accessibleProjects: [] },
  { uid: 'u4', name: 'Michael Chen', email: 'michael@pmis.com', photoURL: 'https://picsum.photos/seed/michael/200', role: 'engineer', accessiblePages: [], accessibleProjects: [] },
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
  { id: 'foundation', title: 'Foundation Center', type: 'terminal', domain: 'governance', parentId: 'gov', icon: 'Database', focusArea: 'Initiating' },
  { id: 'scope', title: 'Scope', type: 'hub', domain: 'delivery', parentId: '', icon: 'DraftingCompass', focusArea: 'Planning' },
  { id: 'sched', title: 'Schedule', type: 'hub', domain: 'schedule', parentId: '', icon: 'Calendar', focusArea: 'Planning' },
  { id: 'fin', title: 'Finance', type: 'hub', domain: 'finance', parentId: '', icon: 'Banknote', focusArea: 'Planning' },
  { id: 'stak', title: 'Stakeholders', type: 'hub', domain: 'stakeholders', parentId: '', icon: 'Users', focusArea: 'Planning' },
  { id: 'res', title: 'Resources', type: 'hub', domain: 'resources', parentId: '', icon: 'Package', focusArea: 'Planning' },
  { id: 'risk', title: 'Risk', type: 'hub', domain: 'risk', parentId: '', icon: 'AlertTriangle', focusArea: 'Planning' },
  { id: 'design_hub', title: 'Design & Engineering', type: 'terminal', domain: 'delivery', parentId: 'scope', icon: 'DraftingCompass', focusArea: 'Planning', summary: 'Central repository for AutoCAD drawings, 3D models, and engineering specifications.' },

  // --- STAKEHOLDERS DOMAIN (ARTIFACT-CENTRIC) ---
  { 
    id: '1.5.1', 
    title: 'Stakeholder Register', 
    type: 'terminal', 
    parentId: 'stak',
    domain: 'stakeholders', 
    focusArea: 'Initiating', 
    icon: 'UserSearch', 
    collectionName: 'stakeholders',
    summary: 'The formal register identifying all project stakeholders, their roles, and basic requirements.',
    details: {
      inputs: ['business-case', 'project-charter', 'governance-framework', 'org-structure'],
      tools: ['Stakeholder Identification Techniques', 'Expert Judgment', 'Document Analysis'],
      outputs: ['stakeholder-register', 'stakeholder-list', 'stakeholder-classification']
    }
  },
  { 
    id: '1.5.2', 
    title: 'Stakeholder Analysis Matrix', 
    type: 'terminal', 
    parentId: 'stak',
    domain: 'stakeholders', 
    focusArea: 'Initiating', 
    icon: 'Layout', 
    summary: 'A detailed analysis matrix mapping stakeholder power, interest, and influence.',
    details: {
      inputs: ['stakeholder-register', 'stakeholder-list'],
      tools: ['Power-Interest Grid', 'Influence Analysis', 'Stakeholder Mapping'],
      outputs: ['stakeholder-analysis-matrix', 'stakeholder-prioritization', 'engagement-needs-overview']
    }
  },
  { 
    id: '2.5.1', 
    title: 'Stakeholder Engagement Plan', 
    type: 'terminal', 
    parentId: 'stak',
    domain: 'stakeholders', 
    focusArea: 'Planning', 
    icon: 'UserPlus', 
    summary: 'The formal plan defining strategies to effectively engage stakeholders throughout the project lifecycle.',
    details: {
      inputs: ['stakeholder-register', 'stakeholder-analysis-matrix', 'comm-requirements', 'governance-management-plan'],
      tools: ['Engagement Planning Techniques', 'Communication Planning', 'Expert Judgment'],
      outputs: ['stakeholder-engagement-plan', 'communication-strategy', 'engagement-levels-definition']
    }
  },
  { 
    id: '2.5.2', 
    title: 'Communications Management Plan', 
    type: 'terminal', 
    parentId: 'stak',
    domain: 'stakeholders', 
    focusArea: 'Planning', 
    icon: 'MessageSquare', 
    summary: 'Establishes project communication standards, channels, and reporting structures.',
    details: {
      inputs: ['stakeholder-engagement-plan', 'stakeholder-requirements', 'org-comm-policies', 'governance-management-plan'],
      tools: ['Communication Models', 'Information Distribution Planning', 'Technology Selection'],
      outputs: ['communication-plan', 'reporting-structure', 'comm-channels-matrix']
    }
  },
  { 
    id: '3.5.1', 
    title: 'Stakeholder Engagement Records', 
    type: 'terminal', 
    parentId: 'stak',
    domain: 'stakeholders', 
    focusArea: 'Executing', 
    icon: 'Handshake', 
    summary: 'Logs and records of all engagement activities and issues addressed with stakeholders.',
    details: {
      inputs: ['stakeholder-engagement-plan', 'communication-plan', 'stakeholder-register'],
      tools: ['Communication Tools', 'Conflict Management', 'Interpersonal Skills'],
      outputs: ['stakeholder-engagement-records', 'communication-logs', 'stakeholder-feedback-data']
    }
  },
  { 
    id: '3.5.2', 
    title: 'Project Communications Log', 
    type: 'terminal', 
    parentId: 'stak',
    domain: 'stakeholders', 
    focusArea: 'Executing', 
    icon: 'MessagesSquare', 
    summary: 'A comprehensive log of all formal project communications and distributed information.',
    details: {
      inputs: ['communication-plan', 'stakeholder-feedback-data', 'project-updates'],
      tools: ['Meetings', 'Reports', 'Collaboration Platforms'],
      outputs: ['stakeholder-updates', 'meeting-minutes', 'communication-records']
    }
  },
  { 
    id: '4.5.1', 
    title: 'Stakeholder Engagement Reports', 
    type: 'terminal', 
    parentId: 'stak',
    domain: 'stakeholders', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'Eye', 
    summary: 'Periodic reports monitoring the effectiveness of stakeholder engagement strategies.',
    details: {
      inputs: ['stakeholder-engagement-plan', 'communication-logs', 'stakeholder-feedback-data', 'work-performance-data'],
      tools: ['Engagement Assessment Matrix', 'Surveys', 'Performance Reviews'],
      outputs: ['stakeholder-engagement-reports', 'engagement-gap-analysis', 'engagement-improvement-actions']
    }
  },
  { 
    id: '4.5.2', 
    title: 'Stakeholder Issue Log', 
    type: 'terminal', 
    parentId: 'stak',
    domain: 'stakeholders', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'MessageCircleWarning', 
    summary: 'A register of all stakeholder-related issues and their resolution status.',
    details: {
      inputs: ['issue-logs', 'stakeholder-feedback-data', 'stakeholder-engagement-reports'],
      tools: ['Root Cause Analysis', 'Negotiation Techniques', 'Decision-Making Frameworks'],
      outputs: ['resolved-stakeholder-issues', 'stakeholder-issue-resolution-log', 'escalation-records']
    }
  },
  { 
    id: '5.5.1', 
    title: 'Stakeholder Satisfaction Surveys', 
    type: 'terminal', 
    parentId: 'stak',
    domain: 'stakeholders', 
    focusArea: 'Closing', 
    icon: 'Smile', 
    summary: 'End-of-project surveys assessing stakeholder satisfaction and capturing final feedback.',
    details: {
      inputs: ['stakeholder-feedback-data', 'stakeholder-engagement-reports', 'accepted-deliverables'],
      tools: ['Surveys', 'Interviews', 'Lessons Learned Workshops'],
      outputs: ['stakeholder-satisfaction-report', 'stakeholder-lessons-learned', 'final-feedback-summary']
    }
  },
  { 
    id: '5.5.2', 
    title: 'Stakeholder Project Archive', 
    type: 'terminal', 
    parentId: 'stak',
    domain: 'stakeholders', 
    focusArea: 'Closing', 
    icon: 'Archive', 
    summary: 'Final collection of all stakeholder-related documentation and records archived for closure.',
    details: {
      inputs: ['stakeholder-documents', 'communication-logs', 'issue-logs', 'feedback-reports'],
      tools: ['Document Management Systems', 'Archiving Standards'],
      outputs: ['archived-stakeholder-records', 'stakeholder-archive-drive', 'final-stakeholder-documentation']
    }
  },
  { 
    id: '1.4.1', 
    title: 'Financial Feasibility Report', 
    type: 'terminal', 
    parentId: 'fin',
    domain: 'finance', 
    focusArea: 'Planning', 
    icon: 'LineChart', 
    summary: 'A formal report evaluating the economic viability and investment justification of the project.',
    details: {
      inputs: ['business-case', 'project-charter', 'org-strategy', 'high-level-scope-statement'],
      tools: ['Cost-Benefit Analysis', 'Financial Modeling', 'Expert Judgment'],
      outputs: ['financial-feasibility-report', 'initial-budget-range', 'investment-justification']
    }
  },
  { 
    id: '1.4.2', 
    title: 'Funding Strategy Plan', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Planning', 
    icon: 'Wallet', 
    summary: 'The formal plan identifying funding sources and budget allocation models for project execution.',
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
    collectionName: 'boq_items',
    summary: 'Centralized repository of all project quantities, units, and rates mapped to MasterFormat divisions.',
    details: {
      inputs: ['Approved Drawings', 'Technical Specifications'],
      tools: ['Quantity Take-off', 'Parametric Pricing'],
      outputs: ['BOQ Spreadsheet', 'Cost Estimate Basis']
    }
  },
  { 
    id: '2.4.2', 
    title: 'Cost Estimates & Basis', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Planning', 
    icon: 'Calculator', 
    summary: 'Detailed financial documentation of estimated costs and the assumptions behind them.',
    details: {
      inputs: ['scope-baseline', 'wbs-structure', 'res-requirements', 'schedule-baseline'],
      tools: ['Parametric Estimation', 'Bottom-Up Estimation', 'Analogous Estimation'],
      outputs: ['cost-estimates', 'basis-of-estimates']
    }
  },
  { 
    id: '2.1.12', 
    title: 'Financial Management Plan', 
    type: 'terminal', 
    parentId: 'fin',
    domain: 'finance', 
    focusArea: 'Planning', 
    icon: 'Banknote', 
    summary: 'Establishes financial control thresholds, reporting units, and variance levels.',
    details: {
      inputs: ['project-charter', 'cost-estimates', 'org-fin-policies'],
      tools: ['Expert Judgment', 'Meetings'],
      outputs: ['financial-management-plan', 'control-thresholds']
    }
  },
  { 
    id: '2.4.3', 
    title: 'Cost Baseline', 
    type: 'terminal', 
    parentId: 'fin',
    domain: 'finance', 
    focusArea: 'Planning', 
    icon: 'Target', 
    summary: 'The approved version of time-phased project budget, excluding management reserves.',
    details: {
      inputs: ['cost-estimates', 'basis-of-estimates', 'schedule-baseline'],
      tools: ['Cost Aggregation', 'Reserve Analysis'],
      outputs: ['project-cost-baseline']
    }
  },
  { 
    id: '2.4.5', 
    title: 'Project Funding Requirements', 
    type: 'terminal', 
    parentId: 'fin',
    domain: 'finance', 
    focusArea: 'Planning', 
    icon: 'Landmark', 
    summary: 'Total funding requirements and periodic requirements derived from the cost baseline.',
    details: {
      inputs: ['cost-baseline', 'cash-flow-forecast'],
      tools: ['Funding Requirement Analysis'],
      outputs: ['project-funding-requirements']
    }
  },
  { 
    id: '2.4.4', 
    title: 'Financial Control Plan', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Planning', 
    icon: 'Lock', 
    summary: 'A formal document establishing the reporting, tracking, and control mechanisms for project finances.',
    details: {
      inputs: ['cost-baseline', 'governance-management-plan', 'org-fin-policies', 'governance-framework'],
      tools: ['Financial Control Systems', 'KPI Definition', 'Reporting Framework Design'],
      outputs: ['financial-control-plan', 'cost-tracking-system-structure', 'fin-reporting-templates']
    }
  },
  { 
    id: '3.4.1', 
    title: 'Funding Disbursement Records', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Executing', 
    icon: 'Coins', 
    summary: 'Formal records of all fund disbursements and cash flow tracking against the funding plan.',
    details: {
      inputs: ['project-budget', 'funding-strategy-plan', 'cash-flow-forecast'],
      tools: ['Financial Management Systems', 'Payment Scheduling', 'Fund Allocation Methods'],
      outputs: ['fund-disbursement-records', 'updated-cash-flow-data', 'fin-transactions-log']
    }
  },
  { 
    id: '3.4.2', 
    title: 'Project Cost Ledger', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Executing', 
    icon: 'Receipt', 
    summary: 'An accurate ledger recording all actual project expenses and resource costs.',
    details: {
      inputs: ['actual-performance-data', 'res-usage-data', 'fin-transactions-log'],
      tools: ['Cost Tracking Systems', 'Accounting Tools', 'Time & Cost Logging'],
      outputs: ['actual-cost-data', 'cost-ledger', 'expense-reports']
    }
  },
  { 
    id: '4.4.1', 
    title: 'Cost Performance Reports (EVM)', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'PieChart', 
    summary: 'Comprehensive performance reports using EVM to track status and forecast final expenditure.',
    details: {
      inputs: ['cost-baseline', 'actual-cost-data', 'work-performance-data'],
      tools: ['Earned Value Analysis (EVM)', 'Variance Analysis', 'Trend Analysis'],
      outputs: ['cost-performance-reports', 'cost-variance-cv', 'financial-forecasts']
    }
  },
  { 
    id: '4.4.2', 
    title: 'Budget Change Log', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'Scale', 
    summary: 'A formal log tracking all approved budget modifications and their impact on the baseline.',
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
    collectionName: 'purchase_orders',
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
    title: 'Final Financial Reconciliation', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Closing', 
    icon: 'CheckCircle', 
    summary: 'The final reconciliation report obtaining formal financial closure and audit approval.',
    details: {
      inputs: ['actual-cost-data', 'project-budget', 'cost-performance-reports', 'accepted-deliverables'],
      tools: ['Financial Reconciliation', 'Audit Procedures'],
      outputs: ['final-financial-report', 'budget-utilization-summary', 'fin-closure-approval']
    }
  },
  { 
    id: '5.4.2', 
    title: 'Financial Document Archive', 
    type: 'terminal', 
    domain: 'finance', 
    focusArea: 'Closing', 
    icon: 'FolderArchive', 
    summary: 'The final repository of all archived financial ledgers, audit logs, and reports.',
    details: {
      inputs: ['financial-documents', 'cost-reports', 'budget-logs', 'audit-records'],
      tools: ['Document Management Systems', 'Archiving Standards'],
      outputs: ['archived-fin-records', 'fin-archive-drive', 'final-fin-documentation']
    }
  },
  { 
    id: '1.3.1', 
    title: 'High-Level Project Timeline', 
    type: 'terminal', 
    parentId: 'sched',
    domain: 'schedule', 
    focusArea: 'Planning', 
    icon: 'Clock', 
    summary: 'The preliminary project timeline identifying critical milestones and time constraints phase-by-phase.',
    details: {
      inputs: ['business-case', 'project-charter', 'high-level-scope-statement', 'stakeholder-register'],
      tools: ['Expert Judgment', 'Analogous Estimation', 'Milestone Analysis'],
      outputs: ['high-level-timeline', 'key-milestones-list', 'initial-time-constraints']
    }
  },
  { 
    id: '1.3.2', 
    title: 'Preliminary Activity List', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Planning', 
    icon: 'ListTodo', 
    summary: 'An initial list of major project activities required to deliver high-level project outcomes.',
    details: {
      inputs: ['high-level-scope-statement', 'initial-deliverables-list', 'wbs-structure'],
      tools: ['Decomposition', 'Expert Judgment', 'Rolling Wave Planning'],
      outputs: ['high-level-activity-list', 'initial-activity-attributes']
    }
  },
  { 
    id: '2.3.1', 
    title: 'Detailed Activity Registry', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Planning', 
    icon: 'List', 
    collectionName: 'activities',
    summary: 'A comprehensive registry of activities, quantities, and attributes mapped to the WBS structure.',
    details: {
      inputs: ['wbs-structure', 'work-packages-list', 'detailed-scope-statement'],
      tools: ['Decomposition', 'Rolling Wave Planning'],
      outputs: ['detailed-activity-list', 'activity-attributes']
    }
  },
  { 
    id: '2.3.2', 
    title: 'Project Network Diagram', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Planning', 
    icon: 'ArrowRightLeft', 
    summary: 'A visual representation of activity dependencies and the logical flow of project work.',
    details: {
      inputs: ['detailed-activity-list', 'activity-attributes'],
      tools: ['Precedence Diagramming Method (PDM)', 'Dependency Determination', 'Network Analysis'],
      outputs: ['project-network-diagram', 'activity-sequencing-data']
    }
  },
  { 
    id: '2.3.3', 
    title: 'Baseline Master Schedule', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Planning', 
    icon: 'BarChart3', 
    summary: 'The formal, approved project master schedule including Gantt view and critical path analysis.',
    details: {
      inputs: ['Activity List', 'Activity Attributes', 'Project Network Diagram', 'Resource Calendars'],
      tools: ['Scheduling Software', 'Critical Path Method', 'Resource Leveling'],
      outputs: ['Project Schedule', 'Schedule Baseline', 'Schedule Data']
    }
  },
  { 
    id: '3.3.2', 
    title: 'Current Schedule Status (Gantt)', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Executing', 
    icon: 'TrendingUp', 
    summary: 'A real-time Gantt view showing actual progress against the approved schedule baseline.',
    details: {
      inputs: ['Schedule Baseline', 'Actual Progress Data'],
      tools: ['Variance Visualization', 'Status Reporting'],
      outputs: ['Updated Project Schedule']
    }
  },
  { 
    id: '2.3.4', 
    title: 'Activity Duration Estimates', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Planning', 
    icon: 'History', 
    summary: 'Formal documentation of time estimates for each activity and the basis for those estimates.',
    details: {
      inputs: ['detailed-activity-list', 'res-requirements', 'historical-data', 'activity-sequencing-data'],
      tools: ['Three-Point Estimation', 'Parametric Estimation', 'Expert Judgment'],
      outputs: ['activity-duration-estimates', 'basis-of-estimates']
    }
  },
  { 
    id: '2.3.5', 
    title: 'Schedule Baseline Document', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Planning', 
    icon: 'CalendarDays', 
    summary: 'The formal document aggregating durations and sequences as the project time baseline.',
    details: {
      inputs: ['activity-sequencing-data', 'activity-duration-estimates', 'resource-availability', 'detailed-scope-statement'],
      tools: ['Critical Path Method (CPM)', 'Schedule Compression', 'Scheduling Software'],
      outputs: ['project-schedule', 'schedule-baseline', 'schedule-model']
    }
  },
  { 
    id: '3.3.1', 
    title: 'Schedule Execution Log', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Executing', 
    icon: 'Play', 
    summary: 'A record of daily execution data and task tracking against the schedule baseline.',
    details: {
      inputs: ['schedule-baseline', 'resource-assignments', 'resource-management-plan'],
      tools: ['Task Tracking Systems', 'Team Coordination', 'Progress Updates'],
      outputs: ['updated-schedule-data', 'work-performance-data', 'progress-reports']
    }
  },
  { 
    id: '3.3.3', 
    title: 'Daily Progress Report Log', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Executing', 
    icon: 'FileText', 
    summary: 'A repository for all formal daily site logs, manpower data, and weather reports.',
    details: {
      inputs: ['Schedule Baseline', 'Site Observation Logs', 'Manpower Logs'],
      tools: ['Daily Log Templates', 'Mobile Field Reporting'],
      outputs: ['Daily Progress Reports', 'Work Performance Data']
    }
  },
  { 
    id: '4.3.1', 
    title: 'Schedule Performance Report', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'Gauge', 
    summary: 'A formal report analyzing schedule variance, trends, and SPI performance metrics.',
    details: {
      inputs: ['work-performance-data', 'schedule-baseline', 'progress-reports'],
      tools: ['Schedule Variance Analysis', 'Earned Value Analysis (EVM)', 'Trend Analysis'],
      outputs: ['schedule-performance-reports', 'schedule-variance-reports', 'forecast-updates']
    }
  },
  { 
    id: '4.3.2', 
    title: 'Schedule Change Log', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'Settings2', 
    summary: 'A formal log tracking all schedule modifications, impact assessments, and approvals.',
    details: {
      inputs: ['schedule-baseline', 'change-requests', 'schedule-performance-reports'],
      tools: ['Change Control System', 'Impact Analysis', 'What-if Scenario Analysis'],
      outputs: ['approved-schedule-changes', 'updated-schedule-baseline', 'schedule-change-log']
    }
  },
  { 
    id: '5.3.1', 
    title: 'Schedule Evaluation Report', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Closing', 
    icon: 'CheckCircle2', 
    summary: 'A final evaluation of project schedule performance and formal acceptance record.',
    details: {
      inputs: ['final-schedule-data', 'accepted-deliverables', 'schedule-performance-reports'],
      tools: ['Final Analysis', 'Stakeholder Review Meetings'],
      outputs: ['final-approved-schedule', 'schedule-closure-report', 'schedule-lessons-learned']
    }
  },
  { 
    id: '5.3.2', 
    title: 'Schedule Project Archive', 
    type: 'terminal', 
    domain: 'schedule', 
    focusArea: 'Closing', 
    icon: 'Library', 
    summary: 'The final repository of all schedule artifacts, baselines, and logs archived for record.',
    details: {
      inputs: ['schedule-baseline', 'schedule-performance-reports', 'schedule-change-log'],
      tools: ['Document Management Systems', 'Archiving Standards'],
      outputs: ['archived-schedule-records', 'schedule-archive-drive', 'final-schedule-documentation']
    }
  },
  { 
    id: '1.2.1', 
    title: 'Project Scope Statement', 
    type: 'terminal', 
    parentId: 'scope',
    domain: 'delivery', 
    focusArea: 'Planning', 
    icon: 'DraftingCompass', 
    summary: 'Detailed description of the project scope, major deliverables, assumptions, and constraints.',
    details: {
      inputs: ['business-case', 'project-charter', 'stakeholder-register', 'governance-framework'],
      tools: ['Expert Judgment', 'Stakeholder Workshops', 'Document Analysis'],
      outputs: ['project-scope-statement', 'deliverables-list', 'exclusions-list']
    }
  },
  { 
    id: '2.2.0', 
    title: 'Scope Baseline', 
    type: 'terminal', 
    parentId: 'scope',
    domain: 'delivery', 
    focusArea: 'Planning', 
    icon: 'Layers', 
    summary: 'The approved version of the scope statement, WBS, and its associated WBS dictionary.',
    details: {
      inputs: ['project-scope-statement', 'wbs-structure', 'wbs-dictionary'],
      tools: ['Scope Management Techniques'],
      outputs: ['scope-baseline']
    }
  },
  { 
    id: '1.2.2', 
    title: 'Requirements Documentation', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Planning', 
    icon: 'ClipboardList', 
    summary: 'A record of prioritized stakeholder needs and project technical requirements.',
    details: {
      inputs: ['stakeholder-register', 'high-level-scope-statement', 'business-needs'],
      tools: ['Interviews', 'Brainstorming', 'Surveys & Questionnaires'],
      outputs: ['initial-requirements-list', 'stakeholder-needs-matrix']
    }
  },
  { 
    id: '2.2.1', 
    title: 'Detailed Scope Statement', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Planning', 
    icon: 'FileSearch', 
    summary: 'The comprehensive document defining project scope, deliverables, assumptions, and constraints.',
    details: {
      inputs: ['high-level-scope-statement', 'initial-requirements-list', 'stakeholder-needs-matrix'],
      tools: ['Requirements Analysis', 'Decomposition', 'Scope Modeling'],
      outputs: ['detailed-scope-statement', 'scope-baseline', 'scope-assumptions-log']
    }
  },
  { 
    id: '2.2.2', 
    title: 'WBS Dictionary', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Planning', 
    icon: 'Network', 
    summary: 'The formal decomposition of project deliverables into manageable work packages and descriptions.',
    details: {
      inputs: ['detailed-scope-statement', 'scope-baseline'],
      tools: ['Decomposition Techniques', 'WBS Templates', 'Expert Judgment'],
      outputs: ['wbs-structure', 'wbs-dictionary', 'work-packages-list']
    }
  },
  { 
    id: '2.2.3', 
    title: 'Scope Validation Criteria', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Planning', 
    icon: 'CheckSquare', 
    summary: 'Documented acceptance criteria for formal project deliverable verification and validation.',
    details: {
      inputs: ['scope-baseline', 'initial-requirements-list'],
      tools: ['Acceptance Criteria Definition', 'Quality Planning Techniques'],
      outputs: ['acceptance-criteria', 'scope-validation-plan']
    }
  },
  { 
    id: '2.2.5', 
    title: 'WBS Structure (Zones/Areas)', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Planning', 
    icon: 'Layers', 
    summary: 'The hierarchical spatial-WBS mapping by Zones, Areas, and Buildings.',
    details: {
      inputs: ['WBS Dictionary', 'Project Layout'],
      tools: ['Hierarchical Visualization', 'Drill-down Analysis'],
      outputs: ['Spatial-WBS mapping', 'Cost Account Structure']
    }
  },
  { 
    id: '2.2.7', 
    title: 'Work Package Dictionary', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Planning', 
    icon: 'Package', 
    summary: 'Detailed definitions and technical requirements for each individual work package.',
    details: {
      inputs: ['WBS Structure', 'Scope Baseline'],
      tools: ['Decomposition', 'Rolling Wave Planning'],
      outputs: ['Work Package List', 'Work Package Dictionary']
    }
  },
  { 
    id: '3.2.1', 
    title: 'Scope Performance Data', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Executing', 
    icon: 'ClipboardList', 
    summary: 'Real-time performance data tracking the production of project deliverables.',
    details: {
      inputs: ['wbs-structure', 'work-packages-list', 'scope-baseline'],
      tools: ['Task Management Systems', 'Team Coordination', 'Work Authorization Systems'],
      outputs: ['completed-deliverables', 'scope-performance-data']
    }
  },
  { 
    id: '3.2.2', 
    title: 'Deliverable Validation Records', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Executing', 
    icon: 'ShieldCheck', 
    summary: 'Official records of technical verification and validation for project deliverables.',
    details: {
      inputs: ['completed-deliverables', 'acceptance-criteria', 'scope-validation-plan'],
      tools: ['Inspections', 'Reviews', 'Testing'],
      outputs: ['accepted-deliverables', 'validation-records', 'rejected-deliverables']
    }
  },
  { 
    id: '4.2.1', 
    title: 'Scope Change Log', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'GitBranch', 
    summary: 'A register tracking all changes to the scope baseline and their approval status.',
    details: {
      inputs: ['scope-baseline', 'change-requests', 'scope-performance-data'],
      tools: ['Change Control System', 'Impact Analysis', 'Decision Frameworks'],
      outputs: ['approved-scope-changes', 'updated-scope-baseline', 'scope-change-log']
    }
  },
  { 
    id: '4.2.2', 
    title: 'Scope Performance Report', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'Activity', 
    summary: 'Analytical report monitoring scope variance and trend performance against the baseline.',
    details: {
      inputs: ['scope-performance-data', 'scope-baseline', 'validation-records'],
      tools: ['Variance Analysis', 'Trend Analysis', 'Performance Reviews'],
      outputs: ['scope-performance-reports', 'scope-variance-reports', 'corrective-actions']
    }
  },
  { 
    id: '5.2.1', 
    title: 'Scope Acceptance Certificate', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Closing', 
    icon: 'Flag', 
    summary: 'The formal certificate for client sign-off and acceptance of project scope.',
    details: {
      inputs: ['accepted-deliverables', 'scope-baseline', 'scope-performance-reports'],
      tools: ['Final Inspection', 'Stakeholder Approval Meetings'],
      outputs: ['final-accepted-scope', 'accepted-deliverables', 'client-sign-off']
    }
  },
  { 
    id: '5.2.2', 
    title: 'Scope Project Archive', 
    type: 'terminal', 
    domain: 'delivery', 
    focusArea: 'Closing', 
    icon: 'Archive', 
    summary: 'The final repository of scope statements, WBS data, and validation logs archived for record.',
    details: {
      inputs: ['detailed-scope-statement', 'wbs-structure', 'validation-records', 'scope-change-log'],
      tools: ['Document Management Systems', 'Archiving Standards'],
      outputs: ['archived-scope-records', 'scope-structured-folder', 'final-scope-documentation']
    }
  },
  { 
    id: '1.1.1', 
    title: 'Project Charter', 
    type: 'terminal', 
    domain: 'governance', 
    parentId: 'gov',
    focusArea: 'Initiating', 
    icon: 'Shield', 
    collectionName: 'charter_entries',
    summary: 'The formal document that authorizes the project and defines initial governance structure.',
    details: {
      inputs: ['business-case', 'strategic-objectives', 'eef', 'opa'],
      tools: ['Charter Template', 'Expert Judgment', 'Stakeholder Alignment'],
      outputs: ['project-charter', 'signed-approval']
    }
  },
  { 
    id: '1.1.3', 
    title: 'Assumption Log', 
    type: 'terminal', 
    domain: 'governance', 
    parentId: 'gov',
    focusArea: 'Initiating', 
    icon: 'ListChecks', 
    collectionName: 'assumptions',
    summary: 'A dynamic log tracking all project assumptions and constraints from initiation through closure.',
    details: {
      inputs: ['business-case', 'project-charter', 'stakeholder-feedback', 'org-policies'],
      tools: ['Assumption Analysis', 'Constraint Identification', 'Impact Mapping'],
      outputs: ['assumption-log', 'constraint-register', 'risk-inputs']
    }
  },
  { 
    id: '1.1.2', 
    title: 'Business Case', 
    type: 'terminal', 
    domain: 'governance', 
    focusArea: 'Initiating', 
    icon: 'Target', 
    collectionName: 'business_cases',
    summary: 'Justification for the project based on business needs, cost-benefit analysis, and strategic alignment.',
    details: {
      inputs: ['strategic-plan', 'market-analysis', 'customer-needs'],
      tools: ['Cost-Benefit Analysis', 'NPV/ROI Calculation', 'Business Modeling'],
      outputs: ['business-case-document', 'value-alignment-map']
    }
  },
  { 
    id: '2.1.15', 
    title: 'Sourcing Strategy Plan', 
    type: 'terminal', 
    parentId: 'gov',
    domain: 'governance', 
    focusArea: 'Planning', 
    icon: 'ShoppingCart', 
    summary: 'Defines the methodology for outsourcing and supplier selection criteria.',
    details: {
      inputs: ['project-charter', 'market-research', 'budget'],
      tools: ['Make-or-Buy Analysis', 'Selection Criteria Matrix'],
      outputs: ['sourcing-strategy-plan', 'vendor-selection-criteria']
    }
  },
  { 
    id: '3.1.1', 
    title: 'Change Requests', 
    type: 'terminal', 
    domain: 'governance', 
    focusArea: 'Executing', 
    icon: 'MessageSquare', 
    collectionName: 'change_requests',
    summary: 'Official record of meeting minutes, attendance, decisions, and action items.',
    details: {
      inputs: ['meeting-agenda', 'recorded-notes', 'atttendance-list'],
      tools: ['MOM Template', 'Decision Recording', 'Task Assignment'],
      outputs: ['minutes-of-meeting', 'action-item-log']
    }
  },
  { 
    id: '3.1.2', 
    title: 'Official Correspondence Log', 
    type: 'terminal', 
    domain: 'governance', 
    focusArea: 'Executing', 
    icon: 'FilePlus', 
    collectionName: 'correspondence_log',
    summary: 'Centralized registry of all incoming and outgoing official letters, memos, and transmittals.',
    details: {
      inputs: ['incoming-letters', 'draft-responses', 'transmittal-slips'],
      tools: ['Registry System', 'Numbering Convention', 'Status Tracking'],
      outputs: ['correspondence-register', 'archived-letters']
    }
  },
  { 
    id: '4.1.1', 
    title: 'Project Performance Reports', 
    type: 'terminal', 
    domain: 'governance', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'BarChart3', 
    summary: 'Executive dashboards and reports reflecting the overall status and governance health of the project.',
    details: {
      inputs: ['work-performance-data', 'kpi-baselines', 'variance-data'],
      tools: ['Reporting Automation', 'Dashboard Aggregation', 'Trend Analysis'],
      outputs: ['executive-report', 'health-dashboard']
    }
  },
  { 
    id: '4.1.2', 
    title: 'Change Management Log', 
    type: 'terminal', 
    domain: 'governance', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'GitBranch', 
    collectionName: 'change_requests',
    summary: 'Log of all change requests, their analysis, and official approval/rejection status.',
    details: {
      inputs: ['change-requests', 'impact-analysis', 'contract-terms'],
      tools: ['CCB Review', 'Status Tracking', 'Financial Impact Analysis'],
      outputs: ['change-register', 'approved-changes']
    }
  },
  { 
    id: '5.1.1', 
    title: 'Lessons Learned Register', 
    type: 'terminal', 
    domain: 'governance', 
    focusArea: 'Closing', 
    icon: 'Library', 
    collectionName: 'lessons_learned',
    summary: 'Continuous registry of project insights, challenges, and solutions for future reference.',
    details: {
      inputs: ['issue-logs', 'qa-records', 'stakeholder-feedback'],
      tools: ['Lessons Learned Workshops', 'Categorization'],
      outputs: ['lessons-learned-db', 'final-knowledge-transfer']
    }
  },
  { 
    id: '5.1.2', 
    title: 'Closure Report', 
    type: 'terminal', 
    domain: 'governance', 
    focusArea: 'Closing', 
    icon: 'Flag', 
    collectionName: 'closure_reports',
    summary: 'Final administrative and financial report confirming project completion and handover.',
    details: {
      inputs: ['accepted-deliverables', 'final-budget-audit', 'contract-closure-docs'],
      tools: ['Final Reconciliation', 'Stakeholder Evaluation'],
      outputs: ['closure-report', 'official-handover-cert']
    }
  },

  // --- RESOURCES DOMAIN (ARTIFACT-CENTRIC) ---
  { 
    id: '1.6.1', 
    title: 'High-Level Resource Strategy', 
    type: 'terminal', 
    domain: 'resources', 
    focusArea: 'Planning', 
    icon: 'Search', 
    summary: 'Preliminary strategy identifying broad project resource requirements and sourcing categories.',
    details: {
      inputs: ['business-case', 'project-charter', 'high-level-scope-statement', 'initial-stakeholder-requirements'],
      tools: ['Expert Judgment', 'Analogous Estimation', 'Stakeholder Workshops'],
      outputs: ['high-level-resource-requirements', 'initial-resource-categories', 'resource-constraints']
    }
  },
  { 
    id: '1.6.2', 
    title: 'Resource Acquisition Strategy', 
    type: 'terminal', 
    domain: 'resources', 
    focusArea: 'Planning', 
    icon: 'Compass', 
    summary: 'The documented approach for acquiring project-specific technical and human resources.',
    details: {
      inputs: ['high-level-resource-requirements', 'org-resource-policies', 'market-availability-data'],
      tools: ['Resource Sourcing Analysis', 'Make-or-Buy Analysis', 'Capacity Planning'],
      outputs: ['resource-strategy-plan', 'sourcing-model', 'resource-acquisition-approach']
    }
  },
  { 
    id: '2.6.1', 
    title: 'Resource Requirements Matrix', 
    type: 'terminal', 
    parentId: 'res',
    domain: 'resources', 
    focusArea: 'Planning', 
    icon: 'Calculator', 
    summary: 'A detailed matrix mapping resource requirements to specific project work packages.',
    details: {
      inputs: ['wbs-structure', 'work-packages-list', 'detailed-activity-list', 'resource-strategy-plan'],
      tools: ['Bottom-Up Estimation', 'Parametric Estimation', 'Expert Judgment'],
      outputs: ['detailed-resource-requirements', 'resource-breakdown-structure-rbs', 'resource-attributes']
    }
  },
  { 
    id: '2.6.8', 
    title: 'Team Charter', 
    type: 'terminal', 
    parentId: 'res',
    domain: 'resources', 
    focusArea: 'Planning', 
    icon: 'Handshake', 
    summary: 'Establishes team values, communication guidelines, and decision-making processes.',
    details: {
      inputs: ['resource-management-plan', 'resource-assignment-records'],
      tools: ['Team Workshops', 'Conflict Management'],
      outputs: ['team-charter', 'team-norms']
    }
  },
  { 
    id: '2.6.3', 
    title: 'Resource Control Framework', 
    type: 'terminal', 
    parentId: 'res',
    domain: 'resources', 
    focusArea: 'Planning', 
    icon: 'ShieldCheck', 
    summary: 'The established KPIs and tracking systems for monitoring physical and human resource usage.',
    details: {
      inputs: ['resource-management-plan', 'governance-management-plan', 'org-policies', 'governance-framework'],
      tools: ['KPI Definition', 'Resource Tracking Systems', 'Performance Framework Design'],
      outputs: ['resource-control-plan', 'resource-tracking-structure', 'resource-performance-metrics']
    }
  },
  { 
    id: '3.6.3', 
    title: 'Project Task Manager', 
    type: 'terminal', 
    parentId: 'res',
    domain: 'resources', 
    focusArea: 'Executing', 
    icon: 'CheckSquare', 
    summary: 'The central system for assigning work tasks and tracking real-time completion status.',
    details: {
      inputs: ['WBS Dictionary', 'Resource Management Plan'],
      tools: ['Kanban Boards', 'Agile Task Management'],
      outputs: ['Completed Tasks', 'Team Velocity Reports']
    }
  },
  { 
    id: '3.6.4', 
    title: 'Minutes of Meeting (MOM)', 
    type: 'terminal', 
    parentId: 'res',
    domain: 'resources', 
    focusArea: 'Executing', 
    icon: 'MessagesSquare', 
    summary: 'Formal documentation of meeting discussions, decisions, and assigned actions.',
    details: {
      inputs: ['Stakeholder Register', 'Project Charter'],
      tools: ['Meeting Management Systems', 'Transcription Tools'],
      outputs: ['Minutes of Meeting (MOM)', 'Action Items Log']
    }
  },
  { 
    id: '3.6.1', 
    title: 'Resource Assignment Records', 
    type: 'terminal', 
    parentId: 'res',
    domain: 'resources', 
    focusArea: 'Executing', 
    icon: 'UserPlus', 
    summary: 'Official records of resources assigned to technical roles and work activities.',
    details: {
      inputs: ['resource-management-plan', 'resource-strategy-plan', 'detailed-resource-requirements'],
      tools: ['Procurement Processes', 'Recruitment', 'Negotiation'],
      outputs: ['acquired-resources', 'resource-assignment-records', 'contracts']
    }
  },
  { 
    id: '3.6.2', 
    title: 'Team Performance Assessments', 
    type: 'terminal', 
    parentId: 'res',
    domain: 'resources', 
    focusArea: 'Executing', 
    icon: 'Users', 
    summary: 'Formal assessment reports on team efficiency and resource utilization performance.',
    details: {
      inputs: ['acquired-resources', 'resource-management-plan', 'actual-performance-data'],
      tools: ['Training', 'Team Building', 'Performance Management'],
      outputs: ['team-performance-improvements', 'resource-utilization-data', 'updated-resource-assignments']
    }
  },
  { 
    id: '4.6.1', 
    title: 'Resource Performance Reports', 
    type: 'terminal', 
    parentId: 'res',
    domain: 'resources', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'Activity', 
    summary: 'Analytical reports mapping actual resource consumption against baseline metrics.',
    details: {
      inputs: ['resource-utilization-data', 'resource-performance-metrics', 'actual-performance-data'],
      tools: ['Performance Analysis', 'Variance Analysis', 'Productivity Measurement'],
      outputs: ['resource-performance-reports', 'utilization-reports', 'efficiency-metrics']
    }
  },
  { 
    id: '4.6.2', 
    title: 'Resource Change Log', 
    type: 'terminal', 
    parentId: 'res',
    domain: 'resources', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'Settings', 
    summary: 'A register tracking all changes to resource assignments and allocation plans.',
    details: {
      inputs: ['resource-management-plan', 'resource-performance-reports', 'change-requests'],
      tools: ['Resource Optimization', 'Reallocation Techniques', 'What-if Analysis'],
      outputs: ['updated-resource-allocation', 'resource-change-log', 'corrective-actions']
    }
  },
  { 
    id: '5.6.1', 
    title: 'Resource Release Records', 
    type: 'terminal', 
    parentId: 'res',
    domain: 'resources', 
    focusArea: 'Closing', 
    icon: 'LogOut', 
    summary: 'Official documentation for the offboarding and release of project resources.',
    details: {
      inputs: ['resource-assignment-records', 'final-accepted-scope', 'contracts', 'accepted-deliverables'],
      tools: ['Resource Release Procedures', 'Contract Closure'],
      outputs: ['released-resources', 'resource-release-records', 'contract-closure-documents']
    }
  },
  { 
    id: '5.6.2', 
    title: 'Resource Project Archive', 
    type: 'terminal', 
    parentId: 'res',
    domain: 'resources', 
    focusArea: 'Closing', 
    icon: 'Box', 
    summary: 'The final repository of resource-related logs, reviews, and contract closure data.',
    details: {
      inputs: ['archived-resource-records', 'resource-performance-reports', 'contracts', 'resource-utilization-data'],
      tools: ['Document Management Systems', 'Archiving Standards'],
      outputs: ['final-archived-resource-records', 'resource-structured-folder', 'final-resource-documentation']
    }
  },

  // --- RISK DOMAIN (REFINED PMBOK 8) ---
  { 
    id: '1.7.1', 
    title: 'Initial Risk Register', 
    type: 'terminal', 
    parentId: 'risk',
    domain: 'risk', 
    focusArea: 'Planning', 
    icon: 'ShieldAlert', 
    summary: 'The preliminary registry capturing high-level project risks and opportunities.',
    details: {
      inputs: ['business-case', 'project-charter', 'high-level-scope-statement', 'stakeholder-register', 'eef'],
      tools: ['Expert Judgment', 'Brainstorming', 'SWOT Analysis'],
      outputs: ['initial-risk-register', 'high-level-risk-list', 'initial-risk-categories']
    }
  },
  { 
    id: '1.7.2', 
    title: 'Risk Management Strategy', 
    type: 'terminal', 
    parentId: 'risk',
    domain: 'risk', 
    focusArea: 'Planning', 
    icon: 'Compass', 
    summary: 'The formal strategy defining methodology and appetite for project risk management.',
    details: {
      inputs: ['initial-risk-register', 'org-risk-policies', 'governance-framework'],
      tools: ['Risk Strategy Workshops', 'Expert Judgment', 'Policy Analysis'],
      outputs: ['risk-management-strategy', 'risk-appetite-thresholds', 'risk-categories-rbs']
    }
  },
  { 
    id: '2.1.14', 
    title: 'Risk Management Plan', 
    type: 'terminal', 
    parentId: 'risk',
    domain: 'risk', 
    focusArea: 'Planning', 
    icon: 'ShieldCheck', 
    summary: 'The formal plan defining risk management methodologies, roles, and matrices.',
    details: {
      inputs: ['project-charter', 'stakeholder-register', 'org-policies'],
      tools: ['Expert Judgment', 'Meetings', 'Analytical Techniques'],
      outputs: ['risk-management-plan', 'risk-categories-rbs', 'p-i-matrix']
    }
  },
  { 
    id: '2.7.1', 
    title: 'Risk Register', 
    type: 'terminal', 
    parentId: 'risk',
    domain: 'risk', 
    focusArea: 'Planning', 
    icon: 'Search', 
    summary: 'Central repository capturing individual project risks and potential responses.',
    details: {
      inputs: ['risk-management-plan', 'scope-baseline', 'schedule-baseline'],
      tools: ['Brainstorming', 'Checklist Analysis', 'Swot Analysis'],
      outputs: ['risk-register', 'risk-list', 'identified-potential-responses']
    }
  },
  { 
    id: '2.7.6', 
    title: 'Risk Report', 
    type: 'terminal', 
    parentId: 'risk',
    domain: 'risk', 
    focusArea: 'Planning', 
    icon: 'BarChart', 
    summary: 'Summary report providing information on overall project risk sources.',
    details: {
      inputs: ['risk-register', 'risk-analysis-results'],
      tools: ['Data Analysis', 'Reporting Tools'],
      outputs: ['risk-report', 'overall-risk-summary']
    }
  },
  { 
    id: '2.7.2', 
    title: 'Qualitative Risk Analysis Matrix', 
    type: 'terminal', 
    parentId: 'risk',
    domain: 'risk', 
    focusArea: 'Planning', 
    icon: 'BarChart3', 
    summary: 'A matrix prioritizing risks based on probability-impact scores and rankings.',
    details: {
      inputs: ['updated-risk-register', 'risk-categories-rbs', 'risk-criteria'],
      tools: ['Probability-Impact Matrix', 'Expert Judgment', 'Risk Ranking Methods'],
      outputs: ['prioritized-risk-list', 'risk-scores', 'qualitative-risk-register']
    }
  },
  { 
    id: '2.7.3', 
    title: 'Quantitative Risk Report', 
    type: 'terminal', 
    parentId: 'risk',
    domain: 'risk', 
    focusArea: 'Planning', 
    icon: 'Calculator', 
    summary: 'A statistical report analyzing risk impact on project objectives through modeling.',
    details: {
      inputs: ['prioritized-risk-list', 'cost-baseline', 'schedule-baseline'],
      tools: ['Monte Carlo Simulation', 'Sensitivity Analysis', 'Decision Tree Analysis'],
      outputs: ['quant-risk-report', 'probability-of-success', 'cost-schedule-risk-impacts']
    }
  },
  { 
    id: '2.7.4', 
    title: 'Risk Response Plan', 
    type: 'terminal', 
    parentId: 'risk',
    domain: 'risk', 
    focusArea: 'Planning', 
    icon: 'ShieldCheck', 
    summary: 'The formal plan defining actions and strategies for risk mitigation and opportunities.',
    details: {
      inputs: ['prioritized-risk-list', 'quant-risk-report', 'risk-management-strategy'],
      tools: ['Response Strategies', 'Contingency Planning', 'Expert Judgment'],
      outputs: ['risk-response-plan', 'risk-action-plans', 'risk-contingency-reserves']
    }
  },
  { 
    id: '3.7.1', 
    title: 'Risk Response Implementation Log', 
    type: 'terminal', 
    parentId: 'risk',
    domain: 'risk', 
    focusArea: 'Executing', 
    icon: 'Zap', 
    summary: 'A log tracking the execution and effectiveness of agreed-upon risk responses.',
    details: {
      inputs: ['risk-response-plan', 'updated-risk-register', 'resource-assignment-records'],
      tools: ['Task Management Systems', 'Coordination', 'Communication'],
      outputs: ['implemented-risk-actions', 'active-risk-register', 'residual-risks']
    }
  },
  { 
    id: '4.7.1', 
    title: 'Risk Performance Reports', 
    type: 'terminal', 
    parentId: 'risk',
    domain: 'risk', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'Eye', 
    summary: 'Analytical reports monitoring risk status, trends, and new emerging risks.',
    details: {
      inputs: ['updated-risk-register', 'actual-performance-data', 'risk-action-status'],
      tools: ['Risk Audits', 'Variance Analysis', 'Trend Analysis'],
      outputs: ['risk-performance-reports', 'new-risks-identified', 'monitored-risk-register']
    }
  },
  { 
    id: '4.7.2', 
    title: 'Risk Change Log', 
    type: 'terminal', 
    parentId: 'risk',
    domain: 'risk', 
    focusArea: 'Monitoring & Controlling', 
    icon: 'Settings', 
    summary: 'A register tracking all modifications and adjustments to risk responses.',
    details: {
      inputs: ['risk-performance-reports', 'updated-risk-register', 'change-requests'],
      tools: ['Change Control System', 'Root Cause Analysis', 'What-if Analysis'],
      outputs: ['updated-risk-responses', 'risk-change-log', 'risk-corrective-actions']
    }
  },
  { 
    id: '5.7.1', 
    title: 'Risk Management Evaluation Report', 
    type: 'terminal', 
    parentId: 'risk',
    domain: 'risk', 
    focusArea: 'Closing', 
    icon: 'Award', 
    summary: 'A final assessment report of the overall effectiveness of project risk management.',
    details: {
      inputs: ['risk-performance-reports', 'final-risk-register', 'lessons-learned-data'],
      tools: ['Lessons Learned Workshops', 'Performance Review', 'Benchmarking'],
      outputs: ['risk-evaluation-report', 'risk-lessons-learned', 'risk-best-practices']
    }
  },
  { 
    id: '5.7.2', 
    title: 'Risk Project Archive', 
    type: 'terminal', 
    parentId: 'risk',
    domain: 'risk', 
    focusArea: 'Closing', 
    icon: 'Archive', 
    summary: 'The final repository of risk registers, logs, and evaluation reports archived for closure.',
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
