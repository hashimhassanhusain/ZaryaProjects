export interface KPI {
  label: string;
  value: string;
  trend?: string;
  status?: 'success' | 'warning' | 'danger' | 'info';
  icon?: string;
}

export interface Alert {
  id?: string;
  type: 'info' | 'warning' | 'danger';
  msg: string;
}

export interface BOQItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  division: string; // Master Format 2024
  workPackage: string;
  location: string; // Area/Zone/Building
  wbsId?: string; // Reference to terminal WBS level
  poNumber?: string;
  completion: number; // 0-100
  inputCurrency?: 'USD' | 'IQD';
  inputRate?: number;
  exchangeRateUsed?: number;
}

export interface WBSLevel {
  id: string;
  projectId: string;
  parentId?: string;
  title: string;
  type: 'Zone' | 'Area' | 'Building' | 'Floor' | 'Division' | 'Cost Account' | 'Work Package' | 'Other';
  level: number; // 1, 2, 3...
  code: string; // e.g. Z1, Z1-A1
  status?: 'Not Started' | 'In Progress' | 'Completed' | 'Delayed';
  plannedStart?: string;
  plannedFinish?: string;
  plannedDuration?: number;
  actualStart?: string;
  actualFinish?: string;
  actualDuration?: number;
  plannedCost?: number;
  actualCost?: number;
  progress?: number;
  divisionCode?: string; // For Cost Account type levels
}

export interface POLineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  status: string;
  completion?: number; // 0-100
  inputCurrency?: 'USD' | 'IQD';
  inputRate?: number;
  exchangeRateUsed?: number;
}

export interface POActivity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
  changes?: { field: string; old: any; new: any }[];
}

export interface PurchaseOrder {
  id: string;
  projectId: string;
  wbsId?: string;
  activityId?: string;
  masterFormat?: string;
  supplier: string;
  date: string;
  status: string;
  amount: number;
  actualCost?: number;
  workPackageId: string;
  lineItems: POLineItem[];
  inputCurrency?: 'USD' | 'IQD';
  exchangeRateUsed?: number;
  history?: POActivity[];
  // Extra fields for PO Log
  company?: string;
  buyFromPartner?: string;
  purchaseOffice?: string;
  projectName?: string;
  buyer?: string;
  buyerName?: string;
  serAmount?: number;
  currency?: 'USD' | 'IQD';
  exchangeRate?: number;
  forCommingling?: string;
  workflowStatus?: string;
  divisions?: string;
  completion?: number;
  location?: string;
  actualStartDate?: string;
  actualFinishDate?: string;
  contractNumber?: string;
  contractDuration?: number;
  contractDurationType?: 'Work Days' | 'Calendar Days';
  contractDriveUrl?: string;
  changeOrdersUrl?: string;
  sowUrl?: string;
}

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export interface ActivityDependency {
  id: string; // The ID of the predecessor activity
  type: DependencyType;
  lag: number; // in days, can be negative for lead
}

export interface QualityDeficiency {
  id: string;
  defect: string;
  action: string;
  responsiblePartyId: string;
  dueDate: string;
  status: 'Open' | 'Resolved' | 'Converted to CR';
  attachments?: string[];
}

export interface QualityAudit {
  id: string;
  projectId: string;
  title: string;
  preparationDate: string;
  auditorId: string;
  auditDate: string;
  scope: {
    processes: boolean;
    requirements: boolean;
    changes: boolean;
    plan: boolean;
  };
  findings: {
    goodPractices: string;
    areasForImprovement: string;
  };
  deficiencies: QualityDeficiency[];
  complianceRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  projectId: string;
  wbsId: string; // This is the Floor ID
  divisionId?: string; // Link to Division WBS node
  boqItemId?: string; // Link to BOQ item
  workPackage: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number; // Manual Planned Cost
  plannedCost?: number; // Rolled up from POs
  actualAmount?: number; // Actual Cost (Rolled up from POs)
  division?: string; // Master Format 2024 Division Code (e.g. "01", "03")
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Converted to PO';
  activityType?: 'Task' | 'Milestone';
  charterMilestoneId?: string; // Link to milestone defined in Charter
  poId?: string;
  poLineItemId?: string;
  startDate?: string; // Planned Start
  duration?: number; // Planned Duration in days
  finishDate?: string; // Planned Finish
  actualStartDate?: string;
  actualFinishDate?: string;
  actualDuration?: number;
  percentComplete?: number;
  isCritical?: boolean;
  supplierId?: string;
  predecessors?: ActivityDependency[];
  predecessorId?: string; // Legacy field for simple FS
  successorId?: string; // Legacy field
  inputCurrency?: 'USD' | 'IQD';
  inputRate?: number;
  exchangeRateUsed?: number;
  assigneeId?: string;
  comments?: { id: string; userId: string; text: string; timestamp: string }[];
  attachments?: { id: string; name: string; url: string; timestamp: string }[];
}

export interface WorkPackage {
  id: string;
  projectId: string;
  wbsId: string;
  divisionId: string;
  code: string;
  title: string;
  description?: string;
  status?: 'Active' | 'Inactive';
  updatedAt?: string;
}

export interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
}

export interface DailyReportActivity {
  id: string;
  poLineItemId: string; // Can be empty for general activities
  activityName?: string; // Name for general activities
  description: string;
  progressUpdate: number; // 0-100
}

export interface SiteIssue {
  id: string;
  title: string;
  description: string;
  assignedToId: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'Resolved';
  isUrgent?: boolean;
  stakeholderId?: string;
}

export interface CommunicationPlanEntry {
  id: string;
  projectId: string;
  stakeholderId: string;
  stakeholderName: string;
  information: string;
  method: string;
  frequency: string;
  sender: string;
  status: 'Active' | 'Inactive';
}

export interface RiskEntry {
  id: string;
  riskId: string;
  description: string;
  category: 'Technical' | 'Management' | 'Commercial' | 'External' | 'Other';
  probability: number; // 1-5
  impact: number; // 1-5
  score: number;
  strategy: 'Avoid' | 'Mitigate' | 'Transfer' | 'Accept' | 'Escalate';
  ownerId: string;
  status: 'Draft' | 'Active' | 'Closed' | 'Occurred';
  projectId: string;
  version: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  sourceId?: string;
  // Detailed Assessment Fields
  impacts?: {
    scope: number;
    quality: number;
    schedule: number;
    cost: number;
  };
  responses?: string;
  revisedProbability?: number;
  revisedImpact?: number;
  revisedScore?: number;
  residualRisk?: string;
  secondaryRisks?: string;
  contingencyPlan?: string;
  contingencyFunds?: number;
  contingencyTime?: number;
  fallbackPlans?: string;
  comments?: string;
}

export interface RiskAuditEntry {
  id: string;
  projectId: string;
  type: 'Event' | 'Response' | 'Process';
  event?: string;
  cause?: string;
  response?: string;
  successful?: boolean;
  actionsToImprove?: string;
  process?: string;
  followed?: boolean;
  toolsUsed?: string;
  comment?: string;
  date: string;
  auditor: string;
}

export interface ProjectIssue {
  id: string;
  projectId: string;
  category: string;
  issue: string;
  impact: string;
  urgency: 'Low' | 'Medium' | 'High' | 'Urgent' | 'Critical';
  responsibleParty: string;
  actions: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  dueDate: string;
  comments: string;
  stakeholderId?: string;
  finalLessonLearned?: string;
  closedDate?: string;
}

export interface DailyReport {
  id: string;
  date: string;
  weather?: WeatherData;
  activities: DailyReportActivity[];
  generalWorks: string;
  deliverables: string;
  incidents: string;
  issues: SiteIssue[];
  photos: string[];
}

export interface ProjectFinance {
  id: string;
  projectId: string;
  totalBudget: number;
  contingency: number;
  managementReserve: number;
  actualCost: number;
  plannedValue: number;
  earnedValue: number;
  updatedAt: string;
  updatedBy: string;
}

export interface LessonEntry {
  id: string;
  lessonId: string;
  category: 'Technical' | 'Management' | 'Process' | 'Quality' | 'Safety' | 'Other';
  description: string;
  recommendation: string;
  impact: 'Positive' | 'Negative';
  ownerId: string;
  status: 'Draft' | 'Published' | 'Archived';
  projectId: string;
  version: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface TeamMember {
  id: string;
  projectId: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  location: string;
  workHours: string;
  status: 'Active' | 'On Leave' | 'Offboarded';
  createdAt: string;
  updatedAt: string;
}

export interface TeamOperatingAgreement {
  id: string;
  projectId: string;
  values: string[];
  meetingGuidelines: string[];
  communicationGuidelines: string[];
  decisionMakingProcess: string;
  conflictManagementApproach: string;
  otherAgreements: string;
  signatures: { name: string; date: string }[];
  updatedAt: string;
}

export interface PerformanceAssessment {
  id: string;
  projectId: string;
  memberId: string;
  memberName: string;
  memberRole: string;
  date: string;
  technicalPerformance: {
    scope: 'Exceeds' | 'Meets' | 'Needs Improvement';
    quality: 'Exceeds' | 'Meets' | 'Needs Improvement';
    schedule: 'Exceeds' | 'Meets' | 'Needs Improvement';
    cost: 'Exceeds' | 'Meets' | 'Needs Improvement';
    comments: string;
  };
  interpersonalCompetency: {
    communication: 'Exceeds' | 'Meets' | 'Needs Improvement';
    collaboration: 'Exceeds' | 'Meets' | 'Needs Improvement';
    conflictManagement: 'Exceeds' | 'Meets' | 'Needs Improvement';
    decisionMaking: 'Exceeds' | 'Meets' | 'Needs Improvement';
    leadership: 'Exceeds' | 'Meets' | 'Needs Improvement';
    comments: string;
  };
  strengths: string;
  weaknesses: string;
  areasForDevelopment: { area: string; approach: string; actions: string }[];
  additionalComments: string;
  moraleScore: number; // 1-10
  overallRating: 'Exceeds' | 'Meets' | 'Needs Improvement';
  version: number;
  updatedAt: string;
}

export interface TeamStatusReport {
  id: string;
  projectId: string;
  memberId: string;
  memberName: string;
  role: string;
  date: string;
  activitiesPlanned: string[];
  activitiesAccomplished: string[];
  activitiesNotAccomplished: string[];
  rootCauseOfVariances: string;
  fundsSpent: number;
  fundsPlanned: number;
  qualityVariances: string;
  plannedCorrectiveActions: string;
  activitiesPlannedNext: string[];
  costsPlannedNext: number;
  newRisksIdentified: string;
  issues: string;
  comments: string;
  updatedAt: string;
}

export interface Resource3M {
  id: string;
  projectId: string;
  type: 'Manpower' | 'Material' | 'Machine';
  name: string;
  unit: string;
  quantity: number;
  rate: number;
  companyId: string;
  companyName: string;
  description?: string;
  status: 'Available' | 'In Use' | 'Maintenance' | 'Out of Stock';
  userId?: string; // Link to User if type is Manpower
  createdAt?: string;
}

export interface ResourceRequirement {
  id: string;
  projectId: string;
  wbsId: string; // Zone > Area > Building > Floor
  activityId: string;
  resourceType: 'Labor' | 'Material' | 'Equipment';
  resourceName: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  status: 'Draft' | 'Approved';
  // Beta Distribution Fields
  optimisticDuration?: number;
  mostLikelyDuration?: number;
  pessimisticDuration?: number;
  estimatedDuration?: number;
  updatedAt: string;
}

export interface ResourceVersion {
  id: string;
  requirementId: string;
  projectId: string;
  data: any;
  version: number;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface RBSNode {
  id: string;
  projectId: string;
  parentId?: string;
  title: string;
  type: 'Category' | 'Resource';
  resourceType?: 'Labor' | 'Material' | 'Equipment';
  description: string;
}

export interface RoleResponsibility {
  id: string;
  projectId: string;
  position: string;
  authority: string;
  responsibility: string;
  qualifications: string;
  updatedAt: string;
}

export interface RoleResponsibilityVersion {
  id: string;
  roleId: string;
  projectId: string;
  data: any;
  version: number;
  userId: string;
  userName: string;
  timestamp: string;
}

export interface SelectionCriterion {
  id: string;
  projectId: string;
  criterion: string;
  weight: number; // 0-100
  description: string;
}

export interface SupplierEvaluation {
  id: string;
  projectId: string;
  supplierId: string;
  supplierName: string;
  criteriaScores: {
    criterionId: string;
    rating: number; // 1-5 or 1-10
    score: number; // weight * rating
  }[];
  totalScore: number;
  comments: string;
  updatedAt: string;
}

export interface ProcessImprovement {
  id: string;
  projectId: string;
  workflowName: string;
  currentProcess: string;
  improvedProcess: string;
  justification: string;
  status: 'Pending' | 'Approved' | 'Implemented';
  updatedAt: string;
}

import { DomainId, FocusAreaId } from './constants/navigation';

export interface Page {
  id: string;
  title: string;
  parentId?: string;
  domain: DomainId | string;
  focusArea: FocusAreaId | string;
  type: 'hub' | 'terminal';
  content?: string;
  status?: 'Not Started' | 'In Progress' | 'Completed' | 'Delayed';
  summary?: string;
  formFields?: string[];
  kpis?: KPI[];
  alerts?: Alert[];
  icon?: string;
  automatedFields?: string[]; // Fields that should be read-only and calculated
  details?: {
    inputs?: string[];
    tools?: string[];
    outputs?: string[];
    variance?: string;
    performance?: string;
    documentation?: string;
    [key: string]: any;
  };
}

export interface Company {
  id: string;
  name: string;
  type: 'Main' | 'Supplier' | 'Stakeholder' | 'Other';
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  status: 'Active' | 'Inactive';
  createdAt?: string;
  // Supplier specifics
  supplierCode?: string;
  discipline?: string;
}

export interface Contact {
  id: string;
  projectId: string;
  name: string;
  email: string;
  phone: string;
  companyId: string;
  companyName: string;
  type: 'Employee' | 'Supplier' | 'Stakeholder' | 'Other';
  role?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  uid: string;
  contactId?: string; // Link to Contact
  name: string;
  email: string;
  photoURL: string;
  role: 'admin' | 'project-manager' | 'engineer' | 'safety-officer' | 'technical-office' | 'stakeholder';
  companyId?: string;
  companyName?: string;
  accessiblePages?: string[];
  accessibleProjects?: string[];
  folderPermissions?: {
    [folderId: string]: 'view' | 'edit' | 'none';
  };
  assignedTasksCount?: number;
  favoritePages?: string[];
  groupIds?: string[];
}

export interface UserGroup {
  id: string;
  name: string;
  description: string;
  accessiblePages: string[];
  memberIds: string[];
  emailList?: string[]; // For notifications
}

export type TaskStatus = string;

export interface TaskNote {
  id: string;
  userId: string;
  text: string;
  timestamp: string;
}

export interface TaskActivity {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string;
  workspaceId: string;
  startDate: string;
  endDate: string;
  priority: 'Low' | 'Medium' | 'High';
  history?: TaskActivity[];
  notes?: TaskNote[];
  sourceType?: 'assumption_constraint' | 'meeting' | 'manual' | 'issue';
  sourceId?: string;
  projectId?: string;
}

export interface AssumptionConstraintEntry {
  id: string;
  projectId: string;
  category: string;
  description: string;
  responsiblePartyId: string;
  dueDate: string;
  actions: string;
  status: 'Pending' | 'Completed';
  comments: string;
  taskId?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
}

export interface MeetingAgendaItem {
  id: string;
  topic: string;
  isCompleted: boolean;
}

export interface MeetingTask {
  id: string;
  description: string;
  assigneeId: string;
  dueDate: string;
  wbsId?: string;
  status: 'Open' | 'Completed';
  taskId?: string; // Link to the created task in Task Management
}

export interface MeetingDecision {
  id: string;
  decision: string;
  category: 'Civil' | 'Technical Office' | 'Mechanical' | 'Electrical' | 'Administrative' | 'Other';
  responsibleParty: string;
  dueDate?: string;
  decisionLogId?: string; // Link to Decision Log entry
}

export interface Meeting {
  id: string;
  projectId: string;
  title: string;
  date: string;
  time: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  type: 'Risk Management' | 'Technical Review' | 'Owner Meeting' | 'General' | 'Kick-off' | 'Progress';
  attendeeIds: string[];
  agenda: MeetingAgendaItem[];
  decisions: MeetingDecision[];
  tasks: MeetingTask[];
  notes: string;
  status: 'Draft' | 'Published';
  meetingHealth?: number; // % of tasks completed
  createdAt: string;
  updatedAt: string;
}

export interface POItem {
  id: string;
  code: string;
  description: string;
  totalQty: number;
  previousQty: number;
  currentQty: number;
  price: number;
  uom: string;
}

export interface PageVersion {
  version: number;
  date: string;
  data: Record<string, string>;
  author: string;
}

export interface SavedDocument {
  id: string; // Drive File ID
  name: string;
  date: string;
  url: string;
  author: string;
  version: number;
  pageId: string;
}

export interface Project {
  id: string;
  name: string;
  code?: string;
  manager?: string;
  sponsor?: string;
  customer?: string;
  status: 'active' | 'archived';
  startDate?: string;
  endDate?: string;
  location?: string;
  description?: string;
  baseCurrency?: 'USD' | 'IQD';
  driveFolderId?: string;
  adminPin?: string;
  charterData?: Record<string, string>;
  charterHistory?: PageVersion[];
  policyData?: Record<string, any>;
  policyHistory?: PageVersion[];
  pmpData?: Record<string, any>;
  pmpHistory?: PageVersion[];
  cmpData?: Record<string, any>;
  cmpHistory?: PageVersion[];
  qmpData?: Record<string, any>;
  qmpHistory?: PageVersion[];
  commPlanData?: Record<string, any>;
  commPlanHistory?: PageVersion[];
  smpData?: Record<string, any>;
  smpHistory?: PageVersion[];
  rmpData?: Record<string, any>;
  rmpHistory?: PageVersion[];
  scopePlanData?: Record<string, any>;
  scopePlanHistory?: PageVersion[];
  hrmpData?: Record<string, any>;
  hrmpHistory?: PageVersion[];
  schedulePlanData?: Record<string, any>;
  schedulePlanHistory?: PageVersion[];
  costPlanData?: Record<string, any>;
  costPlanHistory?: PageVersion[];
  procurementPlanData?: Record<string, any>;
  procurementPlanHistory?: PageVersion[];
  riskPlanData?: Record<string, any>;
  riskPlanHistory?: PageVersion[];
  qualityMetricsData?: Record<string, any>;
  qualityMetricsHistory?: PageVersion[];
  qualityMetricEntriesData?: Record<string, any>;
  qualityMetricEntriesHistory?: PageVersion[];
  formalAcceptanceData?: Record<string, any>;
  formalAcceptanceHistory?: PageVersion[];
  decisionLogData?: Record<string, any>;
  decisionLogHistory?: PageVersion[];
  changeRequestData?: Record<string, any>;
  changeRequestHistory?: PageVersion[];
  changeLogData?: Record<string, any>;
  changeLogHistory?: PageVersion[];
  pageData?: Record<string, Record<string, string>>;
  pageHistory?: Record<string, PageVersion[]>;
  savedDocuments?: SavedDocument[];
  taskStatuses?: string[];
  masterPlanData?: Record<string, any>;
  masterPlanHistory?: PageVersion[];
  sourcingStrategyData?: Record<string, any>;
  sourcingStrategyHistory?: PageVersion[];
  executionQAData?: Record<string, any>;
  executionQAHistory?: PageVersion[];
  performanceMonitoringData?: Record<string, any>;
  performanceMonitoringHistory?: PageVersion[];
  evmData?: Record<string, any>;
  scheduleForecastingData?: Record<string, any>;
  scheduleForecastingHistory?: PageVersion[];
  cadenceData?: Record<string, any>;
  cadenceHistory?: PageVersion[];
}

export interface QualityMetricEntry {
  id: string;
  projectId: string;
  metricId: string; // e.g. ZRY-QUA-001
  item: string;
  masterFormatCode?: string;
  wbsId?: string;
  metric: string;
  measurementMethod: string;
  acceptanceCriteria: string;
  targetValue?: number;
  minValue?: number;
  maxValue?: number;
  unit?: string;
  status: 'Active' | 'Inactive';
  complianceStatus?: 'Compliant' | 'Non-Compliant' | 'Pending';
  version: number;
  updatedAt: string;
  updatedBy: string;
  createdAt: string;
  createdBy: string;
}

export interface QualityMetricVersion {
  id: string;
  metricEntryId: string;
  version: number;
  timestamp: string;
  userId: string;
  userName: string;
  data: Partial<QualityMetricEntry>;
  changeSummary: string;
}

export interface DecisionLogEntry {
  id: string;
  projectId: string;
  decisionId: string; // e.g. ZRY-DEC-001
  category: 'Schedule' | 'Cost/Price' | 'Quantity' | 'Quality' | 'Scope';
  decision: string;
  responsibleParty: string;
  date: string;
  comments: string;
  version: number;
  updatedAt: string;
  updatedBy: string;
  createdAt: string;
  createdBy: string;
}

export interface DecisionLogVersion {
  id: string;
  decisionId: string;
  version: number;
  timestamp: string;
  userId: string;
  userName: string;
  data: Partial<DecisionLogEntry>;
  changeSummary: string;
}

export interface FormalAcceptanceEntry {
  id: string;
  projectId: string;
  acceptanceId: string; // e.g. ZRY-ACC-001
  requirement: string;
  acceptanceCriteria: string;
  validationMethod: string;
  status: 'Accepted' | 'Rejected' | 'Pending' | 'In Progress';
  comments: string;
  signoffBy: string; // User ID or Name
  signoffDate?: string;
  version: number;
  updatedAt: string;
  updatedBy: string;
  createdAt: string;
  createdBy: string;
}

export interface FormalAcceptanceVersion {
  id: string;
  acceptanceEntryId: string;
  version: number;
  timestamp: string;
  userId: string;
  userName: string;
  data: Partial<FormalAcceptanceEntry>;
  changeSummary: string;
}

export interface BreadcrumbItem {
  title: string;
  path: string;
}

export interface Supplier {
  id: string;
  projectId: string;
  vendorCode: string; // Renamed to supplierCode in UI but id remains vendorCode in DB for now to avoid migration issues? No, let's rename it if possible.
  name: string;
  contactDetails: {
    address: string;
    phone: string;
    email: string;
  };
  discipline: string; // MasterFormat Division
  status: 'Active' | 'Contract Ended' | 'Suspended';
  contractUrl?: string;
}

export interface Stakeholder {
  id: string;
  projectId: string;
  name: string;
  position: string;
  role: string;
  contactInfo: string;
  classification: 'Internal' | 'External';
  influence: 'Low' | 'Medium' | 'High';
  interest: 'Low' | 'Medium' | 'High';
  expectations: string;
  requirements: string;
  priorityScore: number;
  influenceScore: number;
  criticalityIndex: number;
  communicationFrequency: string;
  engagementLevel: 'Green' | 'Amber' | 'Red';
  category?: string;
  version?: number;
  isSystemUser?: boolean;
  systemAccessLevel?: string;
  loginCredentials?: string;
}

export interface StakeholderAnalysis {
  id: string;
  projectId: string;
  stakeholderId: string;
  stakeholderName: string;
  power: number; // 1-10
  interest: number; // 1-10
  strategy: 'Manage Closely' | 'Keep Satisfied' | 'Keep Informed' | 'Monitor';
  version: number;
  lastUpdated: string;
  updatedBy: string;
}

export interface StakeholderAnalysisVersion {
  id: string;
  analysisId: string;
  version: number;
  timestamp: string;
  userId: string;
  actionType: 'Create' | 'Edit' | 'Delete';
  data: Partial<StakeholderAnalysis>;
  changeSummary: string;
}

export interface SystemAuditLog {
  id: string;
  projectId: string;
  module: string;
  versionNumber: string;
  editorName: string;
  timestamp: string;
  actionType: string;
  changeSummary: string;
  data?: any;
}

export interface StakeholderVersion {
  id: string;
  stakeholderId: string;
  version: number;
  timestamp: string;
  userId: string;
  actionType: 'Create' | 'Edit' | 'Delete';
  data: Partial<Stakeholder>;
}

export interface ProjectPhase {
  id: string;
  name: string;
  deliverables: string[];
}

export interface TailoringDecision {
  id: string;
  knowledgeArea: string;
  isTailoredOut: boolean;
  justification: string;
}

export interface ProjectBaselines {
  scope: string;
  schedule: string;
  cost: number;
}

export interface ProjectManagementPlan {
  id: string;
  projectId: string;
  phases: ProjectPhase[];
  tailoringDecisions: TailoringDecision[];
  baselines: ProjectBaselines;
  version: number;
  lastUpdated: string;
  updatedBy: string;
}

export interface ProjectManagementVersion {
  id: string;
  planId: string;
  version: number;
  timestamp: string;
  userId: string;
  userName: string;
  data: Partial<ProjectManagementPlan>;
  changeSummary: string;
}

export interface CCBMember {
  id: string;
  name: string;
  role: string;
  responsibility: string;
  authority: 'High' | 'Medium' | 'Low';
}

export interface ChangeManagementPlan {
  id: string;
  projectId: string;
  approach: string;
  definitions: string;
  budgetThreshold: number;
  scheduleThreshold: number;
  ccbMembers: CCBMember[];
  version: number;
  lastUpdated: string;
  updatedBy: string;
}

export interface ChangeManagementVersion {
  id: string;
  planId: string;
  version: number;
  timestamp: string;
  userId: string;
  userName: string;
  data: Partial<ChangeManagementPlan>;
  changeSummary: string;
}

export interface QualityRole {
  id: string;
  userId: string;
  userName: string;
  roleTitle: string;
  responsibilities: string;
  hasTechnicalApproverAuthority: boolean;
}

export interface QualityManagementPlan {
  id: string;
  projectId: string;
  planningApproach: string;
  assuranceApproach: string;
  controlApproach: string;
  improvementApproach: string;
  acceptanceCriteriaLogic: string;
  roles: QualityRole[];
  version: number;
  lastUpdated: string;
  updatedBy: string;
}

export interface QualityManagementVersion {
  id: string;
  planId: string;
  version: number;
  timestamp: string;
  userId: string;
  userName: string;
  data: Partial<QualityManagementPlan>;
  changeSummary: string;
}
