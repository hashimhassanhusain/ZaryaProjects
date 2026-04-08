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
    status: 'In Progress', 
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
    status: 'Todo', 
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
    status: 'Completed', 
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
    topic: 'Weekly Progress Meeting',
    date: '2026-04-02',
    attendeeIds: ['u1', 'u2', 'u4'],
    minutes: [
      { id: 'min1', text: 'Review Block A progress.', assignedToId: 'u1' },
      { id: 'min2', text: 'Order new safety gear.', assignedToId: 'u4', taskId: 't4' },
    ],
  },
];

export const projects: Project[] = [];

export const pages: Page[] = [
  // --- INITIATING FOCUS AREA ---
  { id: '1.0', title: 'Initiating Focus Area', type: 'hub', summary: 'Defining the project at a high level and obtaining authorization to start.' },
  { 
    id: '1.1', 
    title: 'Governance Domain', 
    parentId: '1.0', 
    type: 'hub', 
    domain: 'governance',
    summary: 'Initial project governance and chartering.',
    kpis: [
      { label: 'Charter Approval', value: 'Approved', status: 'success', icon: 'CheckCircle2' },
      { label: 'Strategic Alignment', value: 'High', status: 'success', icon: 'Target' }
    ],
    alerts: [
      { type: 'info', msg: 'Project Charter version 1.0 has been formally approved.' }
    ]
  },
  { id: '2.0.1', title: 'Project Management Plan', parentId: '1.1', type: 'terminal', content: 'Comprehensive document that defines how the project is executed, monitored, controlled, and closed.' },
  
  { 
    id: '1.2', 
    title: 'Stakeholders Domain', 
    parentId: '1.0', 
    type: 'hub', 
    domain: 'stakeholders',
    summary: 'Identifying and analyzing project stakeholders.',
    kpis: [
      { label: 'Stakeholders Identified', value: '12', status: 'info', icon: 'Users' },
      { label: 'Engagement Level', value: 'High', status: 'success', icon: 'TrendingUp' }
    ]
  },
  { id: '1.2.1', title: 'Stakeholder Management', parentId: '1.2', type: 'terminal', content: 'List of all parties interested in or affected by the project with assessment of influence and interest.', formFields: ['Name', 'Position', 'Role', 'Contact Information', 'Requirements', 'Expectations', 'Influence', 'Classification', 'Interest', 'Power'], details: { variance: 'N/A', performance: 'Active', documentation: 'Stakeholder List' } },
  
  // --- PLANNING FOCUS AREA ---
  { id: '2.0', title: 'Planning Focus Area', type: 'hub', summary: 'Establishing the total scope of the effort and defining the course of action.' },
  
  { 
    id: '2.1', 
    title: 'Governance Domain', 
    parentId: '2.0', 
    type: 'hub', 
    domain: 'governance',
    summary: 'Project management plans and quality standards.',
    kpis: [
      { label: 'Plan Integration', value: '85%', status: 'warning', trend: 'up', icon: 'Target' },
      { label: 'Quality Standards', value: 'Defined', status: 'success', icon: 'ShieldAlert' }
    ],
    alerts: [
      { type: 'warning', msg: 'Integration of Resource Management Plan is pending final review.' }
    ]
  },
  { id: '2.1.4', title: 'Quality Metrics', parentId: '2.1', type: 'terminal', content: 'Specific attributes to be measured and how.', formFields: ['ID', 'Item', 'Metric', 'Measurement Method'], details: { variance: 'N/A', performance: 'Defined', documentation: 'Metrics Log' } },

  { 
    id: '2.2', 
    title: 'Scope Domain', 
    parentId: '2.0', 
    type: 'hub', 
    domain: 'scope',
    summary: 'Defining and controlling what is and is not included in the project.',
    kpis: [
      { label: 'Scope Stability', value: '92%', status: 'success', icon: 'Target' },
      { label: 'Requirements Verified', value: '75%', status: 'info', icon: 'CheckCircle2' }
    ]
  },
  { id: '2.2.1', title: 'Assumption and Constraint Log', parentId: '2.2', type: 'terminal', content: 'Tracking all assumptions and constraints throughout the project.', formFields: ['ID', 'Category', 'Assumption/Constraint', 'Responsible Party', 'Due Date', 'Actions', 'Status', 'Comments'], details: { variance: 'N/A', performance: 'Active', documentation: 'Log v3' } },
  { id: '2.2.2', title: 'Inter Requirements Traceability Matrix', parentId: '2.2', type: 'terminal', content: 'Linking product requirements from their origin to the deliverables.', formFields: ['ID', 'Business Requirement', 'Priority', 'Source', 'Technical Requirement'], details: { variance: '0%', performance: 'Complete', documentation: 'RTM v1' } },
  { id: '2.2.3', title: 'Project Scope Statement', parentId: '2.2', type: 'terminal', content: 'Detailed description of the project scope and major deliverables.', formFields: ['Product Scope Description', 'Project Deliverables', 'Project Acceptance Criteria', 'Project Exclusions', 'Project Constraints', 'Project Assumptions'], details: { variance: 'None', performance: 'Approved', documentation: 'Scope Doc' } },
  { id: '2.2.4', title: 'Requirements Documentation', parentId: '2.2', type: 'terminal', content: 'Collection of all project requirements.', formFields: ['ID', 'Requirement', 'Stakeholder', 'Category', 'Priority', 'Acceptance Criteria', 'Validation Method'], details: { variance: 'N/A', performance: 'Stable', documentation: 'Req Doc' } },
  { id: '2.2.6', title: 'Requirements Traceability Matrix', parentId: '2.2', type: 'terminal', content: 'Tracing requirements to deliverables.', formFields: ['ID', 'Requirement', 'Priority', 'Category', 'Source', 'Objective', 'WBS Deliverable', 'Metric', 'Validation'], details: { variance: '0%', performance: 'Complete', documentation: 'RTM v2' } },
  { id: '2.2.9', title: 'WBS', parentId: '2.2', type: 'terminal', content: 'Hierarchical decomposition of the total scope of work.', formFields: ['Project', 'Major Deliverable', 'MasterFormat', 'Work package'], details: { variance: 'N/A', performance: 'Stable', documentation: 'WBS Chart' } },
  
  { id: '2.3', title: 'Schedule Domain', parentId: '2.0', type: 'hub', domain: 'schedule', summary: 'Managing the timely completion of the project.', kpis: [{ label: 'Schedule Health', value: 'Good', status: 'success', icon: 'Clock' }, { label: 'Milestones Defined', value: '100%', status: 'success', icon: 'Target' }] },
  { id: '2.3.3', title: 'Activity List', parentId: '2.3', type: 'terminal', content: 'Comprehensive list of all schedule activities required.', formFields: ['ID', 'Activity', 'Description of Work'], details: { variance: 'None', performance: 'On Time', documentation: 'Activities v2' } },
  { id: '2.3.5', title: 'Milestone List', parentId: '2.3', type: 'terminal', content: 'Significant points or events in the project.', formFields: ['Milestone', 'Milestone Description', 'Type'], details: { variance: 'On Track', performance: 'Stable', documentation: 'Milestones' } },
  { id: '2.3.7', title: 'Project Schedule', parentId: '2.3', type: 'terminal', content: 'Planned dates for performing activities and meeting milestones.', formFields: ['Gantt Chart', 'Milestone Chart', 'WBS', 'Task Name', 'Start', 'Finish'], details: { variance: 'Minimal', performance: 'High', documentation: 'Schedule v4' } },
  
  { 
    id: '2.4', 
    title: 'Finance Domain', 
    parentId: '2.0', 
    type: 'hub', 
    domain: 'finance',
    summary: 'Budgeting, cost estimating, and financial control.',
    kpis: [
      { label: 'Budget Accuracy', value: 'High', status: 'success', icon: 'DollarSign' },
      { label: 'Cost Estimates', value: 'Completed', status: 'success', icon: 'CheckCircle2' }
    ]
  },
  { id: '2.4.0', title: 'BOQ', parentId: '2.4', type: 'terminal', content: 'Detailed Bill of Quantities and cost tracking based on MasterFormat 16 Divisions.' },
  
  { 
    id: '2.5', 
    title: 'Stakeholders Domain', 
    parentId: '2.0', 
    type: 'hub', 
    domain: 'stakeholders',
    summary: 'Managing relationships and communication.',
    kpis: [
      { label: 'Engagement Plan', value: 'Approved', status: 'success', icon: 'Users' },
      { label: 'Comms Channels', value: 'Active', status: 'success', icon: 'TrendingUp' }
    ]
  },
  
  { 
    id: '2.6', 
    title: 'Resources Domain', 
    parentId: '2.0', 
    type: 'hub', 
    domain: 'resources',
    summary: 'Managing the project team and physical resources.',
    kpis: [
      { label: 'Team Capacity', value: '95%', status: 'success', icon: 'Users' },
      { label: 'Resource Plan', value: 'Completed', status: 'success', icon: 'CheckCircle2' }
    ]
  },
  { id: '2.6.1', title: 'Activity Resource Requirements', parentId: '2.6', type: 'terminal', content: 'Types and quantities of resources required.', formFields: ['WBS ID', 'Type of Resource', 'Quantity', 'Assumptions', 'Comments'], details: { variance: 'None', performance: 'Stable', documentation: 'Resource Req' } },
  { id: '2.6.21', title: 'Task Management', parentId: '2.6', type: 'terminal', content: 'Track personal and team tasks with Kanban and List views.' },
  { id: '2.6.22', title: 'Meetings & Minutes', parentId: '2.6', type: 'terminal', content: 'Schedule meetings and generate minutes with actionable tasks.' },
  { id: '2.6.4', title: 'Resource Breakdown Structure', parentId: '2.6', type: 'terminal', content: 'Hierarchical representation of resources.', formFields: ['Project', 'People', 'Quantity of Role', 'Quantity of Level', 'Equipment', 'Quantity of Type', 'Materials', 'Quantity of Material', 'Quantity of Grade', 'Supplies', 'Quantity of Supply', 'Locations', 'Location'], details: { variance: 'N/A', performance: 'Complete', documentation: 'RBS' } },
  { id: '2.6.5', title: 'Responsibility Assignment Matrix', parentId: '2.6', type: 'terminal', content: 'Mapping of project work to team members.', formFields: ['Work package', 'Person', 'R = Responsible', 'A = Accountable', 'C = Consult', 'I = Inform'], details: { variance: 'N/A', performance: 'Complete', documentation: 'RAM' } },
  { id: '2.6.6', title: 'Roles and Responsibilities', parentId: '2.6', type: 'terminal', content: 'Defining roles and responsibilities for team members.', formFields: ['Resource Role Description', 'Authority', 'Responsibility', 'Qualifications', 'Requirements'], details: { variance: 'None', performance: 'Stable', documentation: 'Roles' } },
  { id: '2.6.7', title: 'Source Selection Criteria', parentId: '2.6', type: 'terminal', content: 'Criteria for selecting vendors.', formFields: ['Criteria', 'Weight', 'Candidate Rating', 'Candidate Score', 'Totals'], details: { variance: 'None', performance: 'Stable', documentation: 'Selection' } },
  
  { 
    id: '2.7', 
    title: 'Risk Domain', 
    parentId: '2.0', 
    type: 'hub', 
    domain: 'risk',
    summary: 'Identifying, analyzing, and responding to project risks.',
    kpis: [
      { label: 'Risks Identified', value: '24', status: 'info', icon: 'ShieldAlert' },
      { label: 'Risk Plan', value: 'Approved', status: 'success', icon: 'CheckCircle2' }
    ]
  },
  { id: '2.7.5', title: 'Risk Management', parentId: '2.7', type: 'terminal', content: 'Repository for all identified risks with detailed assessment and response plans.', formFields: ['Risk ID', 'Risk Statement', 'Risk Description', 'Status', 'Risk Cause', 'Probability', 'Impact', 'Score', 'Response', 'Revised Probability', 'Revised Impact', 'Revised Score', 'Responsible Party', 'Actions', 'Secondary Risks', 'Residual Risk', 'Contingency Plan', 'Contingency Funds', 'Contingency Time', 'Fallback Plans', 'Comments'], details: { variance: 'Low', performance: 'Active', documentation: 'Risk Log' } },
  { id: '2.7.1', title: 'Probability and Impact Assessment', parentId: '2.7', type: 'terminal', content: 'Evaluating the likelihood and impact of risks.', formFields: ['Scope Impact', 'Quality Impact', 'Schedule Impact', 'Cost Impact', 'Probability', 'Risk Rating', 'Very High', 'High', 'Medium', 'Low', 'Very Low'], details: { variance: 'Low', performance: 'Active', documentation: 'Assessment' } },
  { id: '2.7.2', title: 'Probability and Impact Matrix', parentId: '2.7', type: 'terminal', content: 'Mapping risks based on probability and impact.', formFields: ['Probability', 'Impact', 'Very High', 'High', 'Medium', 'Low', 'Very Low'], details: { variance: 'N/A', performance: 'Complete', documentation: 'Matrix' } },

  // Hidden terminal pages (used by ProjectManagementPlanView)
  { id: '1.1.1', title: 'Project Charter', type: 'terminal', content: 'Official document that authorizes the existence of the project.', formFields: ['Project Title', 'Project Code', 'Project Sponsor', 'Date Prepared', 'Project Manager', 'Project Customer', 'Project Purpose or Justification', 'Project Description', 'High-Level Requirements', 'High-Level Risks', 'Project Objectives', 'Success Criteria', 'Person Approving', 'Scope', 'Time', 'Cost', 'Other', 'Summary Milestones', 'Due Date', 'Estimated Budget', 'Stakeholder(s)', 'Role', 'Project Manager Authority Level', 'Staffing Decisions', 'Budget Management and Variance', 'Technical Decisions', 'Conflict Resolution', 'Approvals'], details: { variance: 'None', performance: 'Approved', documentation: 'Charter v1.0' } },
  { id: '1.1.2', title: 'Policies & Procedures', type: 'terminal', content: 'Project Management Policies and Procedures Manual.', domain: 'governance', details: { variance: 'None', performance: 'Active', documentation: 'Manual v1.0' } },
  { id: '2.1.1', title: 'Change Management Plan', type: 'terminal', content: 'Process for managing changes to project baselines.', formFields: ['Change Management Approach', 'Definitions of Change', 'Schedule change', 'Budget change', 'Scope change', 'Project document changes', 'Change Control Board', 'Name', 'Role', 'Responsibility', 'Authority', 'Change Control Process', 'Change request submittal', 'Change request tracking', 'Change request review', 'Change request disposition'], details: { variance: 'Low', performance: 'Stable', documentation: 'CMP v2' } },
  { id: '2.1.3', title: 'Quality Management Plan', type: 'terminal', content: 'Standards and quality control measures.', formFields: ['Quality Roles and Responsibilities', 'Role', 'Responsibilities', 'Quality Planning Approach', 'Quality Assurance Approach', 'Quality Control Approach', 'Quality Improvement Approach'], details: { variance: 'None', performance: 'High', documentation: 'QMP v1' } },
  { id: '2.2.5', title: 'Requirements Management Plan', type: 'terminal', content: 'How requirements will be analyzed, documented, and managed.', formFields: ['Collection', 'Analysis', 'Categories', 'Documentation', 'Prioritization', 'Metrics', 'Traceability Structure', 'Tracking', 'Reporting', 'Validation', 'Configuration Management'], details: { variance: 'N/A', performance: 'Complete', documentation: 'Req Plan' } },
  { id: '2.2.7', title: 'Scope Management Plan', type: 'terminal', content: 'How scope will be defined, developed, monitored, and controlled.', formFields: ['Scope Statement Development', 'WBS Structure', 'WBS Dictionary', 'Scope Baseline Maintenance', 'Scope Change', 'Deliverable Acceptance', 'Scope and Requirements Integration'], details: { variance: 'None', performance: 'Stable', documentation: 'Scope Plan' } },
  { id: '2.3.8', title: 'Schedule Management Plan', type: 'terminal', content: 'How the project schedule will be planned, developed, and controlled.', formFields: ['Schedule Methodology', 'Schedule Tools', 'Level of Accuracy', 'Units of Measure', 'Variance Thresholds', 'Schedule Reporting and Format', 'Process Management', 'Activity identification', 'Activity sequencing', 'Estimating resources', 'Estimating effort and duration', 'Updating, monitoring, and controlling'], details: { variance: 'None', performance: 'Stable', documentation: 'Schedule Plan' } },
  { id: '2.4.5', title: 'Cost Management Plan', type: 'terminal', content: 'How project costs will be planned, structured, and controlled.', formFields: ['Level of Accuracy', 'Units of Measure', 'Control Thresholds', 'Rules for Performance Measurement', 'Cost Reporting and Format', 'Process Management', 'Estimating costs', 'Developing the budget', 'Updating, monitoring and controlling'], details: { variance: 'None', performance: 'Optimal', documentation: 'Cost Plan' } },
  { id: '2.4.6', title: 'Procurement Management Plan', type: 'terminal', content: 'How procurement processes will be managed.', formFields: ['Procurement Authority', 'Roles and Responsibilities', 'Project Manager', 'Procurement Department', 'Standard Procurement Documents', 'Contract Type', 'Bonding and Insurance Requirements', 'Selection Criteria', 'Weight', 'Criteria', 'Procurement Assumptions and Constraints', 'Integration Requirements', 'WBS', 'Schedule', 'Documentation', 'Risk', 'Performance Reporting', 'Performance Metrics', 'Domain', 'Metric Measurement'], details: { variance: 'None', performance: 'Stable', documentation: 'Proc Plan' } },
  { id: '2.5.1', title: 'Communications Management Plan', type: 'terminal', content: 'How project communications will be managed.', formFields: ['Stakeholder', 'Information', 'Method', 'Timing or Frequency', 'Sender', 'Assumptions', 'Constraints', 'Glossary of Terms or Acronyms'], details: { variance: 'None', performance: 'Stable', documentation: 'Comms Plan' } },
  { id: '2.5.2', title: 'Stakeholder Management Plan', type: 'terminal', content: 'How stakeholders will be engaged throughout the project.', formFields: ['Stakeholder', 'Unaware', 'Resistant', 'Neutral', 'Supportive', 'Leading', 'Communication Needs', 'Method/Medium', 'Timing/Frequency', 'Pending Stakeholder Changes', 'Stakeholder Relationships', 'Stakeholder Engagement Approach', 'Approach'], details: { variance: 'None', performance: 'Stable', documentation: 'Stakeholder Plan' } },
  { id: '2.6.2', title: 'Human Resource Management Plan', type: 'terminal', content: 'How human resources will be managed.', formFields: ['Roles, Responsibilities, and Authority', 'Role', 'Responsibility', 'Authority', 'Project Organizational Structure', 'Staffing Management Plan', 'Staff Acquisition', 'Staff Release', 'Resource Calendars', 'Training Requirements', 'Rewards and Recognition', 'Regulations, Standards, and Policy Compliance', 'Safety'], details: { variance: 'None', performance: 'Stable', documentation: 'HR Plan' } },
  { id: '2.6.3', title: 'Process Improvement Plan', type: 'terminal', content: 'How project processes will be improved.', formFields: ['Process Description', 'Process Boundaries', 'Process Starting Point', 'Process Ending Point', 'Inputs', 'Outputs', 'Stakeholders', 'Process Owner', 'Other Stakeholders', 'Process Metrics', 'Metric', 'Control Limit', 'Targets for Improvement', 'Process Improvement Approach'], details: { variance: 'None', performance: 'Stable', documentation: 'Process Plan' } },
  { id: '2.7.4', title: 'Risk Management Plan', type: 'terminal', content: 'How risk management activities will be performed.', formFields: ['Methodology', 'Roles and Responsibilities', 'Risk Categories', 'Risk Management Funding', 'Contingency Protocols', 'Frequency and Timing', 'Stakeholder Risk Tolerances', 'Tracking and Audit', 'Definitions of Probability', 'Definitions of Impact by Objective', 'Probability and Impact Matrix'], details: { variance: 'None', performance: 'Stable', documentation: 'Risk Plan' } },

  // --- EXECUTING FOCUS AREA ---
  { id: '3.0', title: 'Executing Focus Area', type: 'hub', summary: 'Completing the work defined in the project management plan.' },
  
  { 
    id: '3.1', 
    title: 'Governance Domain', 
    parentId: '3.0', 
    type: 'hub', 
    domain: 'governance',
    summary: 'Managing changes and quality during execution.',
    kpis: [
      { label: 'Changes Approved', value: '15', status: 'info', icon: 'Clock' },
      { label: 'Quality Audits', value: '2/3', status: 'warning', icon: 'ShieldAlert' }
    ],
    alerts: [
      { type: 'warning', msg: 'One Quality Audit is overdue for the Civil Works package.' }
    ]
  },
  { id: '3.1.1', title: 'Change Management', parentId: '3.1', type: 'terminal', content: 'Tracking all change requests and their status with formal proposal forms.', formFields: ['Change ID', 'Category', 'Description of Change', 'Submitted by', 'Submission Date', 'Status', 'Disposition', 'Project Title', 'Date Prepared', 'Person Requesting Change', 'Change Number', 'Category of Change', 'Detailed Description of Proposed Change', 'Justification for Proposed Change', 'Impacts of Change', 'Scope', 'Grade', 'Requirements', 'Cost', 'Schedule', 'Stakeholder Impact', 'Project Documents', 'Comments', 'Disposition', 'Justification', 'Change Control Board Signatures', 'Name', 'Role', 'Signature', 'Date'], details: { variance: 'Active', performance: 'Controlled', documentation: 'Log Q2' } },
  { id: '3.1.3', title: 'Decision Log', parentId: '3.1', type: 'terminal', content: 'Tracking all project decisions.', formFields: ['ID', 'Category', 'Decision', 'Responsible Party', 'Date', 'Comments'], details: { variance: 'N/A', performance: 'Active', documentation: 'Decision Log' } },
  { id: '3.1.4', title: 'Quality Audit', parentId: '3.1', type: 'terminal', content: 'Structured review of quality management activities.', formFields: ['Area Audited', 'Project', 'Product', 'Process', 'Good Practices to Share', 'Areas for Improvement', 'Deficiencies or Defects', 'ID', 'Defect', 'Action', 'Responsible Party', 'Due Date', 'Comments'], details: { variance: 'None', performance: 'Verified', documentation: 'Audit' } },

  { 
    id: '3.2', 
    title: 'Stakeholders Domain', 
    parentId: '3.0', 
    type: 'hub', 
    domain: 'stakeholders',
    summary: 'Managing stakeholder relationships.',
    kpis: [
      { label: 'Open Issues', value: '4', status: 'warning', icon: 'AlertTriangle' },
      { label: 'Engagement Score', value: '8.5', status: 'success', icon: 'TrendingUp' }
    ]
  },
  { id: '3.2.1', title: 'Issue Management', parentId: '3.2', type: 'terminal', content: 'Tracking all project issues and their resolution.', formFields: ['Issue ID', 'Category', 'Issue', 'Impact on Objectives', 'Urgency', 'Responsible Party', 'Actions', 'Status', 'Due Date', 'Comments'], details: { variance: 'Active', performance: 'Controlled', documentation: 'Issue Log' } },

  { 
    id: '3.3', 
    title: 'Resources Domain', 
    parentId: '3.0', 
    type: 'hub', 
    domain: 'resources',
    summary: 'Managing the project team and reporting progress.',
    kpis: [
      { label: 'Team Morale', value: 'High', status: 'success', icon: 'Users' },
      { label: 'Performance Reviews', value: '90%', status: 'success', icon: 'CheckCircle2' }
    ]
  },
  { id: '3.3.1', title: 'Team Directory', parentId: '3.3', type: 'terminal', content: 'Contact information for all team members.', formFields: ['Name', 'Role', 'Department', 'E-mail', 'Phone Numbers', 'Location', 'Work Hours'], details: { variance: 'N/A', performance: 'Updated', documentation: 'Directory' } },
  { id: '3.3.5', title: 'Team Operating Agreement', parentId: '3.3', type: 'terminal', content: 'Guidelines for team interaction.', formFields: ['Team Values and Principles', 'Meeting Guidelines', 'Communication Guidelines', 'Decision-Making Process', 'Conflict Management Approach', 'Other Agreements', 'Signature', 'Date'], details: { variance: 'None', performance: 'Stable', documentation: 'Agreement' } },
  { id: '3.3.2', title: 'Team Member Performance Assessment', parentId: '3.3', type: 'terminal', content: 'Evaluation of individual team member effectiveness.', formFields: ['Technical Performance', 'Interpersonal Competency', 'Leadership', 'Strengths', 'Weaknesses', 'Areas for Development', 'Additional Comments'], details: { variance: 'Positive', performance: 'High', documentation: 'Assessment' } },
  { id: '3.3.6', title: 'Team Performance Assessment', parentId: '3.3', type: 'terminal', content: 'Evaluation of the project team effectiveness.', formFields: ['Technical Performance', 'Scope', 'Quality', 'Schedule', 'Cost', 'Interpersonal Competency', 'Communication', 'Collaboration', 'Conflict Management', 'Decision Making', 'Team Morale', 'Areas for Development'], details: { variance: 'Positive', performance: 'High', documentation: 'Assessment Q1' } },
  { id: '3.3.4', title: 'Vendor Master Register', parentId: '3.3', type: 'terminal', content: 'Comprehensive database of all project vendors, contractors, and suppliers with financial performance tracking.', domain: 'resources', details: { variance: 'Real-time', performance: 'Active', documentation: 'Vendor DB' } },
  { id: '3.3.3', title: 'Progress Reports', parentId: '3.3', type: 'terminal', content: 'Daily, Weekly, and Monthly progress reporting for site activities.', details: { variance: 'None', performance: 'Daily', documentation: 'PR-2026' } },

  // --- MONITORING FOCUS AREA ---
  { id: '4.0', title: 'Monitoring Focus Area', type: 'hub', summary: 'Tracking, reviewing, and regulating the progress and performance.' },
  { id: 'files', title: 'Project Files', parentId: '4.0', type: 'terminal', content: 'Manage project documents and drawings in Google Drive.' },
  
  { 
    id: '4.1', 
    title: 'Governance Domain', 
    parentId: '4.0', 
    type: 'hub', 
    domain: 'governance',
    summary: 'Formal acceptance of deliverables.',
    kpis: [
      { label: 'Deliverables Accepted', value: '18/24', status: 'info', icon: 'CheckCircle2' },
      { label: 'Validation Rate', value: '75%', status: 'info', icon: 'Target' }
    ]
  },
  { id: '4.1.1', title: 'Deliverable Acceptance', parentId: '4.1', type: 'terminal', content: 'Official sign-off for project deliverables tracking.', formFields: ['ID', 'Requirement', 'Acceptance Criteria', 'Validation Method', 'Status', 'Comments', 'Signoff'], details: { variance: 'N/A', performance: 'Complete', documentation: 'Acceptance' } },

  { 
    id: '4.2', 
    title: 'Finance Domain', 
    parentId: '4.0', 
    type: 'hub', 
    domain: 'finance',
    summary: 'Monitoring project costs.',
    kpis: [
      { label: 'CPI', value: '1.05', status: 'success', icon: 'DollarSign' },
      { label: 'SPI', value: '0.98', status: 'warning', icon: 'Clock' },
      { label: 'CV', value: '+$12k', status: 'success', icon: 'TrendingUp' }
    ],
    alerts: [
      { type: 'info', msg: 'Earned Value analysis shows project is slightly under budget.' }
    ]
  },
  { id: '4.2.5', title: 'PO Control Dashboard', parentId: '4.2', type: 'terminal', content: 'Smart alerts and budget control for Zarya Purchase Orders.', formFields: ['Budget Utilization', 'Critical Alerts', 'Financial Summary'], details: { variance: 'Alerts', performance: 'Real-time', documentation: 'ZARYA-DASH' } },
  { id: '4.2.6', title: 'PO Management', parentId: '4.2', type: 'terminal', content: 'Comprehensive log of all project purchase orders with detailed financial and status tracking.', details: { variance: 'IQD', performance: 'Active', documentation: 'ZARYA-PO-LOG' } },
  { id: '4.2.4', title: 'Cumulative PO Tracking', parentId: '4.2', type: 'terminal', content: 'Zarya Master PO Tracking and Cumulative Expenditure.', formFields: ['Code', 'Description', 'Total PO Amount', 'Received Qty', 'Received Amount', 'MasterFormat Qty', 'MasterFormat Amount', 'Status'], details: { variance: 'IQD', performance: 'Critical', documentation: 'ZARYA-PO-MASTER' } },
  { id: '4.2.3', title: 'Payment Certificate', parentId: '4.2', type: 'terminal', content: 'Zarya Payment Certificate for current installments.', formFields: ['Supplier Name', 'PO Number', 'Payment Number', 'Project Name', 'Currency', 'Code', 'Description', 'Received Qty', 'Price', 'UOM', 'Net Amount'], automatedFields: ['Net Amount', 'PO Number', 'Supplier Name'], details: { variance: 'IQD', performance: 'Active', documentation: 'ZARYA-PC-001' } },
  { id: '4.2.1', title: 'Contractor Status Report', parentId: '4.2', type: 'terminal', content: 'Status updates from project contractors.', formFields: ['Scope Performance', 'Quality Performance', 'Schedule Performance', 'Cost Performance', 'Forecast Performance', 'Claims or Disputes', 'Risks', 'Planned Corrective or Preventive Action', 'Issues', 'Comments'], details: { variance: 'None', performance: 'Stable', documentation: 'Contractor Rep' } },
  { id: '4.2.2', title: 'Earned Value Status Report', parentId: '4.2', type: 'terminal', content: 'Analysis of project performance using EVM metrics.', formFields: ['Budget at Completion', 'Planned value', 'Earned value', 'Actual cost', 'Schedule variance', 'Cost variance', 'Schedule performance index', 'Cost performance index', 'Root Cause', 'Schedule Impact', 'Budget Impact', 'Percent planned', 'Percent earned', 'Percent spent', 'Estimates at Completion', 'TCPI'], details: { variance: '+2%', performance: 'On Target', documentation: 'EV Report' } },

  { 
    id: '4.3', 
    title: 'Stakeholders Domain', 
    parentId: '4.0', 
    type: 'hub', 
    domain: 'stakeholders',
    summary: 'Monitoring stakeholder relationships.',
    kpis: [
      { label: 'Reports Generated', value: '12', status: 'info', icon: 'CheckCircle2' },
      { label: 'Variance Analyzed', value: 'Active', status: 'success', icon: 'TrendingUp' }
    ]
  },
  { id: '4.3.1', title: 'Project Performance Report', parentId: '4.3', type: 'terminal', content: 'Status reports and progress updates.', formFields: ['Accomplishments for This Reporting Period', 'Accomplishments Planned but Not Completed', 'Root Cause of Variances', 'Impact to Upcoming Milestones', 'Planned Corrective or Preventive Action', 'Funds Spent This Reporting Period', 'Impact to Overall Budget', 'Accomplishments Planned for Next Reporting Period', 'Costs Planned for Next Reporting Period', 'New Risks Identified', 'Issues', 'Comments'], automatedFields: ['Funds Spent This Reporting Period', 'Impact to Overall Budget'], details: { variance: 'None', performance: 'Stable', documentation: 'Status v12' } },
  { id: '4.3.2', title: 'Variance Analysis', parentId: '4.3', type: 'terminal', content: 'Analysis of differences between planned and actual performance.', formFields: ['Schedule Variance', 'Planned Result', 'Actual Result', 'Variance', 'Root Cause', 'Planned Response', 'Cost Variance', 'Quality Variance'], automatedFields: ['Schedule Variance', 'Cost Variance', 'Variance'], details: { variance: 'Active', performance: 'Controlled', documentation: 'Variance' } },

  { 
    id: '4.4', 
    title: 'Risk Domain', 
    parentId: '4.0', 
    type: 'hub', 
    domain: 'risk',
    summary: 'Monitoring project risks.',
    kpis: [
      { label: 'Risks Audited', value: '100%', status: 'success', icon: 'ShieldAlert' },
      { label: 'Residual Risk', value: 'Low', status: 'success', icon: 'CheckCircle2' }
    ]
  },
  { id: '4.4.1', title: 'Risk Audit', parentId: '4.4', type: 'terminal', content: 'Structured review of risk management effectiveness.', formFields: ['Risk Event Audit', 'Event', 'Cause', 'Response', 'Comment', 'Risk Response Audit', 'Successful', 'Actions to Improve', 'Risk Management Process Audit', 'Process Followed', 'Tools and Techniques Used', 'Good Practices to Share', 'Areas for Improvement'], details: { variance: 'None', performance: 'Verified', documentation: 'Audit' } },

  // --- CLOSING FOCUS AREA ---
  { id: '5.0', title: 'Closing Focus Area', type: 'hub', summary: 'Finalizing all activities across all process groups.' },
  
  { 
    id: '5.1', 
    title: 'Governance Domain', 
    parentId: '5.0', 
    type: 'hub', 
    domain: 'governance',
    summary: 'Formal project closure.',
    kpis: [
      { label: 'Closure Status', value: 'In Progress', status: 'info', icon: 'Clock' },
      { label: 'Lessons Learned', value: 'Captured', status: 'success', icon: 'CheckCircle2' }
    ]
  },
  { id: '5.1.1', title: 'Lessons Learned', parentId: '5.1', type: 'terminal', content: 'Knowledge gained during the project.', formFields: ['Project Performance Analysis', 'What Worked Well', 'What Can Be Improved', 'Risks and Issues', 'Quality Defects', 'Vendor Management', 'Areas of Exceptional Performance', 'Areas for Improvement'], details: { variance: 'N/A', performance: 'High Value', documentation: 'Lessons Log' } },
  { id: '5.1.2', title: 'Project Close Out', parentId: '5.1', type: 'terminal', content: 'Finalizing all project activities.', formFields: ['Project Title', 'Date Prepared', 'Project Manager', 'Project Description', 'Scope - Project Objectives', 'Scope - Completion Criteria', 'Scope - How Met', 'Quality - Project Objectives', 'Quality - Completion Criteria', 'Quality - How Met', 'Time - Project Objectives', 'Time - Completion Criteria', 'Time - How Met', 'Cost - Project Objectives', 'Cost - Completion Criteria', 'How Met'], details: { variance: 'Final', performance: 'Complete', documentation: 'Closure Doc' } },

  { 
    id: '5.2', 
    title: 'Finance Domain', 
    parentId: '5.0', 
    type: 'hub', 
    domain: 'finance',
    summary: 'Financial closure.',
    kpis: [
      { label: 'Contracts Closed', value: '80%', status: 'warning', icon: 'CheckCircle2' },
      { label: 'Final Payments', value: 'Pending', status: 'info', icon: 'DollarSign' }
    ]
  },
  { id: '5.2.1', title: 'Contract Close Out', parentId: '5.2', type: 'terminal', content: 'Formal closure of all project contracts.', formFields: ['Vendor Performance Analysis', 'What Worked Well', 'What Can Be Improved', 'Record of Contract Changes', 'Record of Contract Disputes', 'Date of Contract Completion', 'Signed Off by', 'Date of Final Payment'], details: { variance: 'N/A', performance: 'Complete', documentation: 'Contract Final' } },
  { id: '5.2.2', title: 'Procurement Audit', parentId: '5.2', type: 'terminal', content: 'Structured review of the procurement process.', formFields: ['Vendor Performance Audit', 'What Worked Well', 'What Can Be Improved', 'Procurement Management Process Audit', 'Process Followed', 'Tools and Techniques Used', 'Description of Good Practices to Share', 'Description of Areas for Improvement'], details: { variance: 'None', performance: 'Verified', documentation: 'Audit Report' } },
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
    const parentId = current.parentId;
    current = pages.find(p => p.id === parentId);
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
  { id: 'b1', description: 'Excavation for foundations', unit: 'm3', quantity: 500, rate: 15, amount: 7500, division: 'Div. 02 - Sitework', workPackage: 'Earthworks', location: 'Villa 2', completion: 100 },
  { id: 'b2', description: 'Concrete Grade C30', unit: 'm3', quantity: 200, rate: 120, amount: 24000, division: 'Div. 03 - Concrete', workPackage: 'Concrete Structure', location: 'Villa 2', completion: 80 },
  { id: 'b3', description: 'Steel Reinforcement', unit: 'ton', quantity: 15, rate: 850, amount: 12750, division: 'Div. 03 - Concrete', workPackage: 'Concrete Structure', location: 'Villa 2', completion: 90 },
  { id: 'b4', description: 'Ceramic Tiling', unit: 'm2', quantity: 450, rate: 25, amount: 11250, division: 'Div. 09 - Finishes', workPackage: 'Flooring', location: 'Villa 2', completion: 0 },
  { id: 'b5', description: 'Garden Soil', unit: 'm3', quantity: 100, rate: 30, amount: 3000, division: 'Div. 02 - Sitework', workPackage: 'Landscaping', location: 'Garden', completion: 50 },
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
