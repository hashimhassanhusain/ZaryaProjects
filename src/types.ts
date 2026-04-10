export interface KPI {
  label: string;
  value: string;
  trend?: string;
  status?: 'success' | 'warning' | 'danger' | 'info';
  icon?: string;
}

export interface Alert {
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
}

export interface WBSLevel {
  id: string;
  projectId: string;
  parentId?: string;
  title: string;
  type: 'Zone' | 'Area' | 'Building' | 'Floor' | 'Division' | 'Other';
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
  // Extra fields for PO Log
  company?: string;
  buyFromPartner?: string;
  purchaseOffice?: string;
  projectName?: string;
  buyer?: string;
  buyerName?: string;
  serAmount?: number;
  currency?: string;
  forCommingling?: string;
  workflowStatus?: string;
  divisions?: string;
  completion?: number;
  location?: string;
  actualStartDate?: string;
  actualFinishDate?: string;
}

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export interface ActivityDependency {
  id: string; // The ID of the predecessor activity
  type: DependencyType;
  lag: number; // in days, can be negative for lead
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
  status: 'Planned' | 'In Progress' | 'Completed' | 'Converted to PO';
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
}

export interface WeatherData {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
}

export interface DailyReportActivity {
  id: string;
  poLineItemId: string;
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

export interface ProjectIssue {
  id: string;
  projectId: string;
  category: string;
  issue: string;
  impact: string;
  urgency: 'Low' | 'Medium' | 'High' | 'Urgent';
  responsibleParty: string;
  actions: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  dueDate: string;
  comments: string;
  stakeholderId?: string;
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

export interface Page {
  id: string;
  title: string;
  parentId?: string;
  domain?: 'governance' | 'scope' | 'schedule' | 'finance' | 'stakeholders' | 'resources' | 'risk';
  type: 'hub' | 'terminal';
  content?: string;
  status?: 'Not Started' | 'In Progress' | 'Completed' | 'Delayed';
  summary?: string;
  formFields?: string[];
  kpis?: KPI[];
  alerts?: Alert[];
  automatedFields?: string[]; // Fields that should be read-only and calculated
  details?: {
    variance?: string;
    performance?: string;
    documentation?: string;
  };
}

export interface User {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  role: 'admin' | 'project-manager' | 'engineer' | 'safety-officer' | 'technical-office';
  accessiblePages?: string[];
  accessibleProjects?: string[];
  assignedTasksCount?: number;
}

export type TaskStatus = 'Todo' | 'In Progress' | 'Completed' | 'Blocked';

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
  sourceType?: 'assumption_constraint' | 'meeting' | 'manual';
  sourceId?: string;
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

export interface MeetingMinute {
  id: string;
  text: string;
  assignedToId?: string;
  taskId?: string;
}

export interface Meeting {
  id: string;
  topic: string;
  date: string;
  attendeeIds: string[];
  minutes: MeetingMinute[];
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
  decisionLogData?: Record<string, any>;
  decisionLogHistory?: PageVersion[];
  changeRequestData?: Record<string, any>;
  changeRequestHistory?: PageVersion[];
  changeLogData?: Record<string, any>;
  changeLogHistory?: PageVersion[];
  pageData?: Record<string, Record<string, string>>;
  pageHistory?: Record<string, PageVersion[]>;
  savedDocuments?: SavedDocument[];
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

export interface BreadcrumbItem {
  title: string;
  path: string;
}

export interface Vendor {
  id: string;
  projectId: string;
  vendorCode: string;
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
